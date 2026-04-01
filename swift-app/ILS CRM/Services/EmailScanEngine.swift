import Foundation
import Observation
import SwiftData
import os

// MARK: - Scan Progress

/// Published progress state for UI binding during email scans.
struct ScanProgress: Sendable {
    enum Status: String, Sendable {
        case idle
        case scanning
        case complete
        case error
    }

    var status: Status = .idle
    var processed: Int = 0
    var total: Int = 0
    var candidatesFound: Int = 0
    var error: String?
}

// MARK: - Email Scan Engine

/// Main orchestrator for Gmail email scanning.
///
/// Scans the user's Gmail archive, builds a candidate map of email addresses,
/// evaluates rules, classifies candidates, extracts signatures, and writes
/// results to SwiftData as ImportedContact records.
///
/// Respects the cross-app sync lock pattern from SyncEngine and writes
/// in batches to avoid SwiftData contention.
@Observable
@MainActor
final class EmailScanEngine {

    // MARK: - Published State

    /// Current scan progress for UI binding.
    private(set) var progress = ScanProgress()

    /// Whether a scan is currently in progress.
    var isScanning: Bool { progress.status == .scanning }

    // MARK: - Dependencies

    private let modelContainer: ModelContainer
    private let gmailClient: GmailAPIClient
    private let oAuthService: GmailOAuthService

    // MARK: - Private

    private static let logger = Logger(subsystem: "com.ils-crm", category: "EmailScan")
    private static let lockFilePath = "/tmp/ils-crm-sync.lock"
    private static let batchSize = 50

    private var pollingTask: Task<Void, Never>?

    // MARK: - Init

    init(modelContainer: ModelContainer, gmailClient: GmailAPIClient, oAuthService: GmailOAuthService) {
        self.modelContainer = modelContainer
        self.gmailClient = gmailClient
        self.oAuthService = oAuthService
    }

    // MARK: - Public API

    /// User-triggered scan -- runs an incremental scan (or full if no history).
    func scanNow() async {
        await scanIncremental()
    }

    /// Full archive scan -- pages through all messages, builds candidate map,
    /// applies rules, classifies, extracts signatures, writes to SwiftData.
    func scanFull() async {
        guard !isScanning else { return }
        guard oAuthService.isConnected else {
            progress = ScanProgress(status: .error, error: "Gmail not connected")
            return
        }

        guard acquireScanLock() else {
            progress = ScanProgress(status: .error, error: "Another scan is in progress")
            return
        }

        progress = ScanProgress(status: .scanning)
        defer {
            releaseScanLock()
        }

        do {
            let ownEmail = oAuthService.connectedEmail ?? ""
            var candidateMap: [String: EmailCandidateData] = [:]
            var pageToken: String?
            var totalProcessed = 0

            // Page through all messages
            repeat {
                let result = try await gmailClient.listMessages(pageToken: pageToken, maxResults: 100)
                progress.total = result.total

                // Process messages in this page
                for msg in result.messages {
                    do {
                        let headers = try await gmailClient.getMessageHeaders(messageId: msg.id)
                        processCandidatesFromHeaders(
                            headers: headers,
                            threadId: msg.threadId,
                            candidateMap: &candidateMap,
                            ownEmail: ownEmail
                        )
                    } catch {
                        // Skip individual message failures
                        Self.logger.warning("Failed to fetch message \(msg.id): \(error.localizedDescription)")
                    }

                    totalProcessed += 1
                    progress.processed = totalProcessed
                }

                pageToken = result.nextPageToken

                // Yield to avoid blocking the main thread too long
                try await Task.sleep(for: .milliseconds(50))
            } while pageToken != nil

            // Apply rules, classify, and write candidates
            let rules = loadRules()
            let candidates = Array(candidateMap.values)
            progress.candidatesFound = candidates.count

            try await writeCandidates(
                candidates: candidates,
                rules: rules,
                ownEmail: ownEmail
            )

            // Update scan state with current historyId
            try await updateScanState(ownEmail: ownEmail, totalProcessed: totalProcessed)

            progress.status = .complete
            Self.logger.info("Full scan complete: \(totalProcessed) messages, \(candidates.count) candidates")

        } catch {
            progress.status = .error
            progress.error = error.localizedDescription
            Self.logger.error("Full scan failed: \(error.localizedDescription)")
        }
    }

    /// Incremental scan -- uses historyId to fetch only new messages since last scan.
    /// Falls back to full scan if the historyId is expired.
    func scanIncremental() async {
        guard !isScanning else { return }
        guard oAuthService.isConnected else {
            progress = ScanProgress(status: .error, error: "Gmail not connected")
            return
        }

        let ownEmail = oAuthService.connectedEmail ?? ""

        // Load scan state to get historyId
        let context = modelContainer.mainContext
        let scanStates = (try? context.fetch(FetchDescriptor<EmailScanState>())) ?? []
        let scanState = scanStates.first(where: {
            $0.userEmail?.lowercased() == ownEmail.lowercased()
        })

        guard let historyId = scanState?.gmailHistoryId, !historyId.isEmpty else {
            Self.logger.info("No historyId found -- falling back to full scan")
            await scanFull()
            return
        }

        guard acquireScanLock() else {
            progress = ScanProgress(status: .error, error: "Another scan is in progress")
            return
        }

        progress = ScanProgress(status: .scanning)
        defer {
            releaseScanLock()
        }

        do {
            let messageIds: [String]
            do {
                messageIds = try await gmailClient.listHistory(startHistoryId: historyId)
            } catch GmailError.historyExpired {
                Self.logger.warning("History expired -- falling back to full scan")
                releaseScanLock()
                await scanFull()
                return
            }

            guard !messageIds.isEmpty else {
                progress.status = .complete
                Self.logger.info("Incremental scan: no new messages")
                return
            }

            var candidateMap: [String: EmailCandidateData] = [:]
            progress.total = messageIds.count

            for (index, messageId) in messageIds.enumerated() {
                do {
                    let headers = try await gmailClient.getMessageHeaders(messageId: messageId)
                    processCandidatesFromHeaders(
                        headers: headers,
                        threadId: "", // threadId not available from history
                        candidateMap: &candidateMap,
                        ownEmail: ownEmail
                    )
                } catch {
                    Self.logger.warning("Failed to fetch message \(messageId): \(error.localizedDescription)")
                }

                progress.processed = index + 1
            }

            let rules = loadRules()
            let candidates = Array(candidateMap.values)
            progress.candidatesFound = candidates.count

            try await writeCandidates(
                candidates: candidates,
                rules: rules,
                ownEmail: ownEmail
            )

            try await updateScanState(ownEmail: ownEmail, totalProcessed: messageIds.count)

            progress.status = .complete
            Self.logger.info("Incremental scan complete: \(messageIds.count) messages, \(candidates.count) candidates")

        } catch {
            progress.status = .error
            progress.error = error.localizedDescription
            Self.logger.error("Incremental scan failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Polling

    /// Starts Timer-based background polling at the given interval.
    func startPolling(interval: TimeInterval) {
        stopPolling()
        guard interval > 0 else { return }

        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(interval))
                guard !Task.isCancelled else { break }
                await self?.scanIncremental()
            }
        }
    }

    /// Stops background polling.
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    // MARK: - Candidate Extraction

    /// Processes email headers from a single message and updates the candidate map.
    private func processCandidatesFromHeaders(
        headers: EmailHeadersData,
        threadId: String,
        candidateMap: inout [String: EmailCandidateData],
        ownEmail: String
    ) {
        let ownNormalized = EmailUtils.normalizeEmail(ownEmail)

        // Process From
        updateCandidate(
            candidateMap: &candidateMap,
            name: headers.from.name,
            email: headers.from.email,
            date: headers.date,
            threadId: threadId,
            discoveredVia: "From",
            field: .from,
            ownNormalized: ownNormalized
        )

        // Process To
        for addr in headers.to {
            updateCandidate(
                candidateMap: &candidateMap,
                name: addr.name,
                email: addr.email,
                date: headers.date,
                threadId: threadId,
                discoveredVia: "To",
                field: .to,
                ownNormalized: ownNormalized
            )
        }

        // Process CC
        for addr in headers.cc {
            updateCandidate(
                candidateMap: &candidateMap,
                name: addr.name,
                email: addr.email,
                date: headers.date,
                threadId: threadId,
                discoveredVia: "CC",
                field: .cc,
                ownNormalized: ownNormalized
            )
        }
    }

    private enum AddressField {
        case from, to, cc
    }

    /// Updates or creates a candidate entry in the candidate map.
    private func updateCandidate(
        candidateMap: inout [String: EmailCandidateData],
        name: String?,
        email: String,
        date: Date,
        threadId: String,
        discoveredVia: String,
        field: AddressField,
        ownNormalized: String
    ) {
        let normalized = EmailUtils.normalizeEmail(email)

        // Skip own email
        guard normalized != ownNormalized else { return }
        // Skip empty emails
        guard !email.isEmpty else { return }

        if var existing = candidateMap[normalized] {
            // Update existing candidate
            existing.threadCount += 1
            if date < existing.firstSeenDate { existing.firstSeenDate = date }
            if date > existing.lastSeenDate { existing.lastSeenDate = date }

            switch field {
            case .from: existing.fromCount += 1
            case .to: existing.toCount += 1
            case .cc: existing.ccCount += 1
            }

            // Prefer a display name if we don't have one yet
            if existing.displayName == nil, let name, !name.isEmpty {
                existing.displayName = name
                let parsed = EmailUtils.parseDisplayName(name)
                existing.firstName = parsed.first
                existing.lastName = parsed.last
            }

            candidateMap[normalized] = existing
        } else {
            // Create new candidate
            let parsed = name.map { EmailUtils.parseDisplayName($0) }
            candidateMap[normalized] = EmailCandidateData(
                email: email,
                normalizedEmail: normalized,
                displayName: name,
                firstName: parsed?.first,
                lastName: parsed?.last,
                threadCount: 1,
                firstSeenDate: date,
                lastSeenDate: date,
                discoveredVia: discoveredVia,
                fromCount: field == .from ? 1 : 0,
                toCount: field == .to ? 1 : 0,
                ccCount: field == .cc ? 1 : 0
            )
        }
    }

    // MARK: - Rules Loading

    /// Loads scan rules from SwiftData (Airtable-synced) + defaults.
    private func loadRules() -> [ScanRule] {
        let context = modelContainer.mainContext
        let airtableRules: [EmailScanRule] = (try? context.fetch(FetchDescriptor<EmailScanRule>())) ?? []

        let parsed = airtableRules.compactMap { EmailRulesEngine.parseAirtableRule(from: $0) }

        // Use Airtable rules if any are active, otherwise fall back to defaults
        return parsed.isEmpty ? EmailRulesEngine.defaultRules : parsed
    }

    // MARK: - Write Candidates to SwiftData

    /// Evaluates rules, classifies, and writes passing candidates as ImportedContact records.
    /// Checks for CRM dedup against existing Contact records.
    private func writeCandidates(
        candidates: [EmailCandidateData],
        rules: [ScanRule],
        ownEmail: String
    ) async throws {
        let context = modelContainer.mainContext

        // Load existing contacts for dedup -- fetch all + filter in memory
        // (SwiftData #Predicate crash workaround on macOS 26.4 beta)
        let existingContacts = (try? context.fetch(FetchDescriptor<Contact>())) ?? []
        let existingEmails = Set(existingContacts.compactMap { contact -> String? in
            guard let email = contact.email, !email.isEmpty else { return nil }
            return EmailUtils.normalizeEmail(email)
        })

        // Load existing imported contacts for dedup
        let existingImports = (try? context.fetch(FetchDescriptor<ImportedContact>())) ?? []
        let existingImportEmails = Set(existingImports.compactMap { imported -> String? in
            guard let email = imported.email, !email.isEmpty else { return nil }
            return EmailUtils.normalizeEmail(email)
        })

        var written = 0

        for candidate in candidates {
            // Evaluate rules
            let result = EmailRulesEngine.evaluateRules(
                candidate: candidate,
                rules: rules,
                ownEmail: ownEmail
            )

            guard result != .reject else { continue }

            // CRM dedup: skip if already in Contacts table
            guard !existingEmails.contains(candidate.normalizedEmail) else { continue }

            // ImportedContact dedup: skip if already imported
            guard !existingImportEmails.contains(candidate.normalizedEmail) else { continue }

            // Classify
            let classification = EmailClassifier.classifyCandidate(candidate)

            // Create ImportedContact record
            let localId = "local_\(UUID().uuidString)"
            let imported = ImportedContact(id: localId, isPendingPush: true)
            imported.firstName = candidate.firstName
            imported.lastName = candidate.lastName
            imported.email = candidate.email
            imported.importedContactName = [candidate.firstName, candidate.lastName]
                .compactMap { $0 }
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)
            imported.importDate = Date()
            imported.importSource = "Email Scan"
            imported.onboardingStatus = "Ready"
            imported.source = "Email Scan"
            imported.relationshipType = classification.relationshipType
            imported.confidenceScore = Double(classification.confidence)
            imported.emailThreadCount = candidate.threadCount
            imported.firstSeenDate = candidate.firstSeenDate
            imported.lastSeenDate = candidate.lastSeenDate
            imported.discoveredVia = candidate.discoveredVia

            context.insert(imported)
            written += 1

            // Batch save every batchSize records
            if written % Self.batchSize == 0 {
                try context.save()
            }
        }

        // Final save
        if written % Self.batchSize != 0 {
            try context.save()
        }

        Self.logger.info("Wrote \(written) new imported contacts from email scan")
    }

    // MARK: - Scan State Management

    /// Updates or creates the EmailScanState record for the current user.
    private func updateScanState(ownEmail: String, totalProcessed: Int) async throws {
        let context = modelContainer.mainContext
        let allStates = (try? context.fetch(FetchDescriptor<EmailScanState>())) ?? []
        var scanState = allStates.first(where: {
            $0.userEmail?.lowercased() == ownEmail.lowercased()
        })

        if scanState == nil {
            let newState = EmailScanState(id: "local_\(UUID().uuidString)", isPendingPush: true)
            newState.userEmail = ownEmail
            context.insert(newState)
            scanState = newState
        }

        // Get current historyId from Gmail profile
        // The profile response includes historyId which is the cursor for incremental sync
        let profileHistoryId = try? await fetchProfileHistoryId()

        scanState?.gmailHistoryId = profileHistoryId
        scanState?.lastScanDate = Date()
        scanState?.scanStatus = "Complete"
        scanState?.totalProcessed = (scanState?.totalProcessed ?? 0) + totalProcessed
        scanState?.isPendingPush = true

        try context.save()
    }

    /// Fetches the current historyId from the Gmail profile endpoint.
    private func fetchProfileHistoryId() async throws -> String? {
        // The Gmail profile endpoint returns emailAddress and historyId
        // We need to make a raw request since getProfile() only returns email
        let accessToken = try await oAuthService.getAccessToken()
        let url = URL(string: "https://www.googleapis.com/gmail/v1/users/me/profile")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return nil
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        // historyId comes as a string in the profile response
        if let historyId = json["historyId"] as? String {
            return historyId
        }
        // It may also come as a number
        if let historyId = json["historyId"] as? Int {
            return String(historyId)
        }

        return nil
    }

    // MARK: - Scan Lock

    /// Acquires a file-based lock to prevent concurrent scans.
    private func acquireScanLock() -> Bool {
        if FileManager.default.fileExists(atPath: Self.lockFilePath) {
            if let attrs = try? FileManager.default.attributesOfItem(atPath: Self.lockFilePath),
               let modified = attrs[.modificationDate] as? Date,
               abs(modified.timeIntervalSinceNow) < 300 {
                return false // Fresh lock held
            }
            // Stale lock -- remove it
            try? FileManager.default.removeItem(atPath: Self.lockFilePath)
        }

        let fd = Darwin.open(Self.lockFilePath, O_WRONLY | O_CREAT | O_EXCL, 0o644)
        guard fd >= 0 else { return false }

        let timestamp = Date().ISO8601Format()
        timestamp.withCString { ptr in
            _ = Darwin.write(fd, ptr, strlen(ptr))
        }
        Darwin.close(fd)
        return true
    }

    /// Releases the scan lock file.
    private func releaseScanLock() {
        try? FileManager.default.removeItem(atPath: Self.lockFilePath)
    }
}
