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
        case classifying
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
    var isScanning: Bool { progress.status == .scanning || progress.status == .classifying }

    // MARK: - Dependencies

    private let modelContainer: ModelContainer
    private let gmailClient: GmailAPIClient
    private let oAuthService: GmailOAuthService

    // MARK: - Private

    private static let logger = Logger(subsystem: "com.ils-crm", category: "EmailScan")
    private static let lockFilePath = "/tmp/ils-crm-sync.lock"
    private static let batchSize = 50
    private static let maxBodyFetchCandidates = 200

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

                        // Skip marketing messages entirely
                        if isMarketingMessage(headers) {
                            totalProcessed += 1
                            if totalProcessed % 50 == 0 {
                                progress.processed = totalProcessed
                                progress.candidatesFound = candidateMap.count
                            }
                            continue
                        }

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

            // Apply rules, filter, and classify candidates
            let rules = loadRules()
            let candidates = Array(candidateMap.values)
            progress.candidatesFound = candidates.count

            let survivors = try await writeCandidates(
                candidates: candidates,
                rules: rules,
                ownEmail: ownEmail
            )

            // Update scan state with current historyId
            try await updateScanState(ownEmail: ownEmail, totalProcessed: totalProcessed)

            progress.status = .complete
            progress.candidatesFound = survivors
            Self.logger.info("Full scan complete: \(totalProcessed) messages, \(survivors) candidates")

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

                    // Skip marketing messages entirely
                    if isMarketingMessage(headers) {
                        progress.processed = index + 1
                        continue
                    }

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

            let survivors = try await writeCandidates(
                candidates: candidates,
                rules: rules,
                ownEmail: ownEmail
            )

            try await updateScanState(ownEmail: ownEmail, totalProcessed: messageIds.count)

            progress.status = .complete
            progress.candidatesFound = survivors
            Self.logger.info("Incremental scan complete: \(messageIds.count) messages, \(survivors) candidates")

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

    /// Evaluates rules, classifies with Claude + heuristic fallback, and writes
    /// passing candidates as ImportedContact records.
    /// Checks for CRM dedup against existing Contact records.
    /// Returns the number of candidates written.
    @discardableResult
    private func writeCandidates(
        candidates: [EmailCandidateData],
        rules: [ScanRule],
        ownEmail: String
    ) async throws -> Int {
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

        // Build survivors list (rules + dedup filtering)
        var enriched: [EnrichedCandidate] = []

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

            // Pre-classify with heuristic for sorting
            let heuristic = EmailClassifier.classifyCandidate(candidate)
            var ec = EnrichedCandidate(candidate: candidate)
            ec.confidence = heuristic.confidence
            enriched.append(ec)
        }

        // Run Claude classification pipeline (upgrades heuristic results with AI when API key available)
        let ownDisplayName = ownEmail.split(separator: "@").first.map(String.init)
        if !enriched.isEmpty {
            await classifyCandidates(
                candidates: &enriched,
                ownEmail: ownEmail,
                ownDisplayName: ownDisplayName
            )
        }

        // Write to SwiftData
        var written = 0

        for ec in enriched {
            let candidate = ec.candidate

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
            imported.importSource = "Integration"
            imported.onboardingStatus = "Review"
            imported.source = "Email Scan"
            imported.relationshipType = ec.relationshipType
            imported.confidenceScore = Double(ec.confidence)
            imported.emailThreadCount = candidate.threadCount
            imported.firstSeenDate = candidate.firstSeenDate
            imported.lastSeenDate = candidate.lastSeenDate
            imported.discoveredVia = candidate.discoveredVia
            imported.classificationSource = ec.classificationSource
            imported.aiReasoning = ec.aiReasoning

            // Apply signature-extracted fields if present
            if let title = ec.extractedTitle, !title.isEmpty { imported.jobTitle = title }
            if let phone = ec.extractedPhone, !phone.isEmpty { imported.phone = phone }
            if let company = ec.extractedCompany, !company.isEmpty { imported.suggestedCompanyName = company }

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
        return written
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

    // MARK: - Marketing Detection

    /// Known Email Service Provider names for X-Mailer header detection.
    private static let espNames = ["mailchimp", "hubspot", "constant contact", "brevo", "klaviyo", "sendgrid", "mailgun"]

    /// Checks whether an email is a marketing/bulk message based on headers.
    /// Port of `isMarketingMessage()` from electron/gmail/scanner.ts.
    private func isMarketingMessage(_ headers: EmailHeadersData) -> Bool {
        let raw = headers.rawHeaders

        // Precedence: bulk or list
        let precedence = (raw["Precedence"] ?? "").lowercased()
        if precedence == "bulk" || precedence == "list" { return true }

        // List-Id present
        if raw["List-Id"] != nil { return true }

        // List-Unsubscribe present
        if raw["List-Unsubscribe"] != nil { return true }

        // X-Mailer matches known ESPs
        let mailer = (raw["X-Mailer"] ?? "").lowercased()
        if !mailer.isEmpty, Self.espNames.contains(where: { mailer.contains($0) }) { return true }

        return false
    }

    // MARK: - Own-Signature Stripping

    /// Strips lines containing the user's own email domain or display name from a body.
    /// Port of `stripOwnSignatureLines()` from electron/gmail/scanner.ts.
    private func stripOwnSignatureLines(_ body: String, userEmail: String, userDisplayName: String?) -> String {
        guard let atIndex = userEmail.firstIndex(of: "@") else { return body }
        let userDomain = String(userEmail[userEmail.index(after: atIndex)...]).lowercased()
        guard !userDomain.isEmpty else { return body }

        let nameLower = userDisplayName?.lowercased().trimmingCharacters(in: .whitespaces)

        // Escape domain for regex
        let escapedDomain = NSRegularExpression.escapedPattern(for: userDomain)
        let domainPattern = try? NSRegularExpression(
            pattern: "\\b[a-z0-9._%+-]+@\(escapedDomain)\\b"
        )

        return body.components(separatedBy: "\n").filter { line in
            let lineLower = line.lowercased()
            let lineRange = NSRange(lineLower.startIndex..., in: lineLower)

            // Strip lines containing an email @userDomain
            if let domainPattern, domainPattern.firstMatch(in: lineLower, range: lineRange) != nil {
                return false
            }

            // Strip lines containing the exact full display name (word-boundary match)
            if let nameLower, nameLower.count > 3 {
                let escapedName = NSRegularExpression.escapedPattern(for: nameLower)
                if let namePattern = try? NSRegularExpression(pattern: "\\b\(escapedName)\\b"),
                   namePattern.firstMatch(in: lineLower, range: lineRange) != nil {
                    return false
                }
            }

            return true
        }.joined(separator: "\n")
    }

    // MARK: - Claude Classification Pipeline

    /// Enriched candidate data with fields set during the classification pipeline.
    private struct EnrichedCandidate {
        var candidate: EmailCandidateData
        var extractedTitle: String?
        var extractedPhone: String?
        var extractedCompany: String?
        var confidence: Int = 0
        var classificationSource: String = "heuristic"
        var relationshipType: String = "Unknown"
        var aiReasoning: String?
    }

    /// Runs Claude classification (with body fetch + scoring) on surviving candidates.
    /// Falls back to heuristic classification when no API key is available.
    /// Port of `classifyCandidates()` from electron/gmail/scanner.ts.
    private func classifyCandidates(
        candidates: inout [EnrichedCandidate],
        ownEmail: String,
        ownDisplayName: String?
    ) async {
        let apiKey = KeychainService.read(key: ClaudeClient.anthropicApiKeyAccount)
        let hasApiKey = apiKey != nil && !(apiKey?.isEmpty ?? true)

        // Sort by heuristic confidence (descending) for top-N body fetch cutoff
        candidates.sort { $0.confidence > $1.confidence }

        let bodyFetchCount = min(candidates.count, Self.maxBodyFetchCandidates)

        progress.status = .classifying
        progress.processed = 0
        progress.total = candidates.count

        for i in 0..<candidates.count {
            let candidate = candidates[i].candidate

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"

            let meta = CandidateMetadata(
                email: candidate.email,
                threadCount: candidate.threadCount,
                fromCount: candidate.fromCount,
                toCount: candidate.toCount,
                ccCount: candidate.ccCount,
                firstSeen: dateFormatter.string(from: candidate.firstSeenDate),
                lastSeen: dateFormatter.string(from: candidate.lastSeenDate)
            )

            var classification: ClaudeClassification?

            if hasApiKey, let key = apiKey, i < bodyFetchCount {
                // Top-N: fetch bodies, score, pick best, send to Claude with body
                do {
                    let searchResult = try await gmailClient.searchMessages(
                        query: "from:\(candidate.email)", maxResults: 5
                    )

                    var bestBody: String?
                    var bestScore = Int.min

                    for (j, msg) in searchResult.enumerated() {
                        let fullMsg = try await gmailClient.getMessageFull(messageId: msg.id)
                        let rawBody = fullMsg.bodyPlainText ?? ""
                        let isHtml = fullMsg.bodyPlainText == nil
                        let stripped = EmailUtils.stripQuotedContent(rawBody, isHtml: isHtml)
                        let guardedBody = stripped.map {
                            stripOwnSignatureLines($0, userEmail: ownEmail, userDisplayName: ownDisplayName)
                        }
                        let score = EmailUtils.scoreMessageForSignature(guardedBody, recencyIndex: j)

                        if score > bestScore {
                            bestScore = score
                            bestBody = guardedBody
                        }
                    }

                    if let bestBody, bestScore >= 0 {
                        let prompt = ClaudeClient.buildExtractionPrompt(strippedBody: bestBody, meta: meta)
                        classification = await ClaudeClient.classifyWithClaude(prompt: prompt, apiKey: key)
                    } else {
                        // No usable body -- metadata only
                        let prompt = ClaudeClient.buildMetadataOnlyPrompt(meta: meta)
                        classification = await ClaudeClient.classifyWithClaude(prompt: prompt, apiKey: key)
                    }
                } catch {
                    Self.logger.warning("Body fetch failed for \(candidate.email): \(error.localizedDescription)")
                }
            } else if hasApiKey, let key = apiKey {
                // Beyond top-N: metadata-only Claude classification
                let prompt = ClaudeClient.buildMetadataOnlyPrompt(meta: meta)
                classification = await ClaudeClient.classifyWithClaude(prompt: prompt, apiKey: key)
            }

            // Apply Claude results or fall back to heuristic
            if let classification {
                if let firstName = classification.firstName { candidates[i].candidate.firstName = firstName }
                if let lastName = classification.lastName { candidates[i].candidate.lastName = lastName }
                candidates[i].extractedTitle = classification.jobTitle
                candidates[i].extractedCompany = classification.companyName
                candidates[i].extractedPhone = classification.phone
                candidates[i].confidence = classification.confidence
                candidates[i].classificationSource = "AI"
                candidates[i].relationshipType = classification.relationshipType
                candidates[i].aiReasoning = classification.reasoning
            } else {
                // Heuristic fallback
                let result = EmailClassifier.classifyCandidate(candidate)
                candidates[i].confidence = result.confidence
                candidates[i].classificationSource = "Heuristic"
                candidates[i].relationshipType = result.relationshipType
            }

            if (i + 1) % 10 == 0 || i == candidates.count - 1 {
                progress.processed = i + 1
            }
        }
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
