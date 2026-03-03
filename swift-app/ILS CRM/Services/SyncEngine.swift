import Foundation
import SwiftData
import Observation

/// Sync engine — mirrors electron/airtable/sync-engine.ts
///
/// Architecture (same as Electron):
/// 1. Push pending local changes to Airtable first
/// 2. Then pull all 11 tables in SYNC_ORDER
/// 3. Stagger 200ms between tables to avoid rate limits
/// 4. "Airtable wins" conflict resolution — except for isPendingPush records
/// 5. Actor-based isSyncing guard prevents overlapping syncs
/// 6. Cross-app sync lock via /tmp/ils-crm-sync.lock prevents Electron + Swift
///    from syncing simultaneously against the same Airtable base
///
/// Key lessons from Electron build:
/// - Polling sync with no mutex causes race conditions → actor isolation solves this
/// - Pull sync must NOT delete locally-created records with isPendingPush = true
/// - saveDatabase() after every write = excessive I/O → SwiftData handles this natively
/// - Read-only tables (specialties, portalLogs) must never push
/// - When promoting a table from read-only to CRUD, remove from readOnlyTables set
@Observable
final class SyncEngine {
    // MARK: - Observable State

    private(set) var isSyncing = false
    private(set) var lastSyncDate: Date?
    private(set) var syncError: String?
    private(set) var tableStatus: [String: TableSyncStatus] = [:]

    // MARK: - Private

    private let modelContainer: ModelContainer
    private var airtableService: AirtableService?
    private var pollingTask: Task<Void, Never>?
    private var syncLock = false // actor-style guard for non-reentrant sync

    // MARK: - Cross-App Sync Lock

    /// Both Electron and Swift apps check this file before syncing.
    /// Only one app should sync at a time against the same Airtable base.
    private static let syncLockPath = "/tmp/ils-crm-sync.lock"

    /// Maximum age of a lock file before it's considered stale (e.g. crashed process).
    /// If a lock file is older than this, we delete it and proceed.
    private static let staleLockThresholdSeconds: TimeInterval = 120

    struct TableSyncStatus {
        var lastSync: Date?
        var recordCount: Int = 0
        var status: SyncState = .idle
        var error: String?
    }

    enum SyncState: String {
        case idle, syncing, error, complete
    }

    init(modelContainer: ModelContainer) {
        self.modelContainer = modelContainer
    }

    // MARK: - Configuration

    func configure(apiKey: String, baseId: String = AirtableConfig.baseId) {
        self.airtableService = AirtableService(apiKey: apiKey, baseId: baseId)
    }

    // MARK: - Cross-App Sync Lock Helpers

    /// Acquires the cross-app sync lock by writing a lock file.
    /// Returns false if another app already holds the lock (and it's not stale).
    private func acquireSyncLock() -> Bool {
        let fm = FileManager.default
        let path = Self.syncLockPath

        // Check if lock file already exists
        if fm.fileExists(atPath: path) {
            // Check if it's stale (crashed process left it behind)
            if let attrs = try? fm.attributesOfItem(atPath: path),
               let modified = attrs[.modificationDate] as? Date,
               Date().timeIntervalSince(modified) > Self.staleLockThresholdSeconds {
                // Stale lock — remove it and proceed
                try? fm.removeItem(atPath: path)
            } else {
                // Active lock held by another process
                return false
            }
        }

        // Write our lock file with PID + app identifier
        let lockContent = "swift-app:\(ProcessInfo.processInfo.processIdentifier):\(ISO8601DateFormatter().string(from: Date()))"
        fm.createFile(atPath: path, contents: lockContent.data(using: .utf8))
        return true
    }

    /// Releases the cross-app sync lock by deleting the lock file.
    private func releaseSyncLock() {
        try? FileManager.default.removeItem(atPath: Self.syncLockPath)
    }

    // MARK: - Full Sync

    /// Runs a full sync cycle: push pending → pull all tables.
    /// Guarded by isSyncing flag to prevent overlapping syncs.
    /// Also checks /tmp/ils-crm-sync.lock to prevent Electron + Swift collision.
    /// Mirrors: sync-engine.ts → fullSync()
    @MainActor
    func fullSync() async {
        // isSyncing mutex — same pattern as Electron's guard flag
        guard !syncLock else {
            syncError = "Sync already in progress"
            return
        }

        // Cross-app lock — prevents Electron and Swift from syncing simultaneously
        guard acquireSyncLock() else {
            syncError = "Another ILS CRM instance is syncing — waiting for it to finish"
            return
        }

        syncLock = true
        isSyncing = true
        syncError = nil

        defer {
            releaseSyncLock()
            syncLock = false
            isSyncing = false
        }

        guard let service = airtableService else {
            syncError = "Airtable not configured — set API key in Settings"
            return
        }

        do {
            // Phase 1: Push pending local changes
            try await pushPendingChanges(service: service)

            // Phase 2: Pull all tables in order, staggered
            for tableId in AirtableConfig.syncOrder {
                tableStatus[tableId] = TableSyncStatus(status: .syncing)

                do {
                    let count = try await pullTableByType(tableId: tableId, service: service)
                    tableStatus[tableId]?.recordCount = count
                    tableStatus[tableId]?.status = .complete
                    tableStatus[tableId]?.lastSync = Date()
                } catch {
                    tableStatus[tableId]?.status = .error
                    tableStatus[tableId]?.error = error.localizedDescription
                }

                // Stagger between tables to respect Airtable rate limits
                try? await Task.sleep(nanoseconds: AirtableConfig.tableSyncStaggerMs)
            }

            lastSyncDate = Date()
        } catch {
            syncError = error.localizedDescription
        }
    }

    // MARK: - Pull Table (Airtable → SwiftData)

    /// Pulls all records from a single Airtable table and reconciles with local SwiftData models.
    /// Mirrors: sync-engine.ts → pullTable()
    ///
    /// Conflict resolution (same as Electron):
    /// - Record exists locally AND is NOT isPendingPush → overwrite from Airtable (Airtable wins)
    /// - Record exists locally AND IS isPendingPush → skip (preserve local changes)
    /// - Record in Airtable but not local → create via T.from(record:context:) and insert
    /// - Record in local but not Airtable AND NOT isPendingPush → delete (Airtable is source of truth)
    /// - Record in local but not Airtable AND IS isPendingPush → keep (hasn't been pushed yet)
    ///
    /// Uses delete-and-reinsert for updates since converters only have `from(record:)` (no `update(from:)`).
    /// This is safe because SwiftData's @Attribute(.unique) on `id` handles identity correctly,
    /// and we explicitly delete before insert to avoid unique constraint violations.
    ///
    /// - Parameters:
    ///   - type: The SwiftData model type conforming to AirtableSyncable
    ///   - tableId: The Airtable table ID to pull from
    ///   - service: The AirtableService actor instance
    /// - Returns: The number of records pulled from Airtable
    @discardableResult
    private func pullTable<T: AirtableSyncable>(
        _ type: T.Type,
        tableId: String,
        service: AirtableService
    ) async throws -> Int {
        let context = ModelContext(modelContainer)

        // 1. Fetch all records from Airtable
        let rawRecords = try await service.fetchAllRecords(tableId: tableId)
        let airtableRecords = AirtableRecord.fromArray(dicts: rawRecords)

        // 2. Get existing local records and build O(1) lookup by Airtable ID
        let descriptor = FetchDescriptor<T>()
        let localRecords = (try? context.fetch(descriptor)) ?? []

        var localById: [String: T] = [:]
        for local in localRecords {
            localById[local.id] = local
        }

        // 3. Track which Airtable IDs we see (for orphan detection)
        var seenIds = Set<String>()

        // 4. Process each Airtable record
        for record in airtableRecords {
            seenIds.insert(record.id)

            if let existing = localById[record.id] {
                // Record exists locally
                if existing.isPendingPush {
                    // Skip — local changes waiting to be pushed. Don't overwrite.
                    continue
                }

                // Airtable wins: delete old, insert fresh from Airtable data
                context.delete(existing)
                let updated = T.from(record: record, context: context)
                updated.airtableModifiedAt = Date()
                context.insert(updated)
            } else {
                // New record from Airtable — create locally
                let newModel = T.from(record: record, context: context)
                newModel.airtableModifiedAt = Date()
                context.insert(newModel)
            }
        }

        // 5. Delete local records that no longer exist in Airtable
        //    EXCEPT records with isPendingPush (they haven't been pushed yet)
        for local in localRecords {
            if !seenIds.contains(local.id) {
                if local.isPendingPush {
                    // Keep — hasn't been pushed to Airtable yet
                    continue
                }
                context.delete(local)
            }
        }

        // 6. Save context
        try context.save()

        return airtableRecords.count
    }

    // MARK: - Pull Dispatcher (Table ID → Model Type)

    /// Routes a table ID to the correct generic pullTable<T> invocation.
    /// Mirrors: sync-engine.ts → TABLE_NAME_TO_ID / TABLE_CONVERTERS dispatch.
    ///
    /// This is necessary because Swift generics are resolved at compile time,
    /// so we need an explicit switch to map each runtime table ID to its model type.
    private func pullTableByType(tableId: String, service: AirtableService) async throws -> Int {
        switch tableId {
        case AirtableConfig.Tables.contacts:
            return try await pullTable(Contact.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.companies:
            return try await pullTable(Company.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.opportunities:
            return try await pullTable(Opportunity.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.projects:
            return try await pullTable(Project.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.proposals:
            return try await pullTable(Proposal.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.tasks:
            return try await pullTable(CRMTask.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.interactions:
            return try await pullTable(Interaction.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.importedContacts:
            return try await pullTable(ImportedContact.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.specialties:
            return try await pullTable(Specialty.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.portalAccess:
            return try await pullTable(PortalAccessRecord.self, tableId: tableId, service: service)
        case AirtableConfig.Tables.portalLogs:
            return try await pullTable(PortalLog.self, tableId: tableId, service: service)
        default:
            throw SyncError.unknownTable(tableId)
        }
    }

    // MARK: - Push Pending Changes

    /// Pushes all locally-modified records (isPendingPush = true) to Airtable.
    /// Mirrors: sync-engine.ts → pushPendingRecords()
    ///
    /// IMPORTANT: Read-only tables (specialties, portalLogs) are skipped.
    /// When promoting a table from read-only to CRUD, remove it from
    /// AirtableConfig.readOnlyTables — this was a bug in the Electron build
    /// where interactions were left in READ_ONLY_TABLES after CRUD was shipped.
    private func pushPendingChanges(service: AirtableService) async throws {
        let context = ModelContext(modelContainer)

        // Push each CRUD table in sync order (skip read-only: Specialties, Portal Logs).
        // Each call is wrapped in do/catch so one table failure doesn't abort the rest.
        // Mirrors: sync-engine.ts → pushTable() called for each table in SYNC_ORDER.

        await pushTable(Contact.self, context: context, service: service)
        await pushTable(Company.self, context: context, service: service)
        await pushTable(Opportunity.self, context: context, service: service)
        await pushTable(Project.self, context: context, service: service)
        await pushTable(Proposal.self, context: context, service: service)
        await pushTable(CRMTask.self, context: context, service: service)
        await pushTable(Interaction.self, context: context, service: service)
        await pushTable(ImportedContact.self, context: context, service: service)
        await pushTable(PortalAccessRecord.self, context: context, service: service)

        // Save all changes (isPendingPush = false, updated IDs from creates) in one batch
        try context.save()
    }

    // MARK: - Push Helpers

    /// Generic push for a single table. Fetches pending records, splits into
    /// creates vs updates, sends to Airtable, and marks as pushed on success.
    ///
    /// - **Creates:** records whose `id` is empty or starts with "local-" (no Airtable ID yet)
    /// - **Updates:** records whose `id` starts with "rec" (valid Airtable record ID)
    ///
    /// Airtable constraints:
    /// - Max 10 records per batch request
    /// - 200ms stagger between batch requests to stay under 5 req/sec rate limit
    ///
    /// On create success, the model's `id` is NOT updated here because SwiftData's
    /// @Attribute(.unique) makes `id` effectively immutable once inserted. Instead,
    /// we delete the local-ID model and insert a fresh one with the real Airtable ID.
    /// This matches the delete-and-reinsert pattern from pullTable().
    private func pushTable<T: AirtableSyncable>(
        _ type: T.Type,
        context: ModelContext,
        service: AirtableService
    ) async {
        let tableId = T.airtableTableId

        // Skip read-only tables (Specialties, Portal Logs)
        guard !AirtableConfig.readOnlyTables.contains(tableId) else { return }

        do {
            // Fetch ALL records and filter to isPendingPush in memory.
            // SwiftData #Predicate requires concrete types at compile time,
            // so we filter in Swift to keep the generic constraint clean.
            // Record counts are small (< 100 per table) so this is fine.
            let descriptor = FetchDescriptor<T>()
            let allRecords = (try? context.fetch(descriptor)) ?? []
            let pending = allRecords.filter { $0.isPendingPush }

            guard !pending.isEmpty else { return }

            // Separate creates (no Airtable ID) from updates (has Airtable ID)
            var toCreate: [T] = []
            var toUpdate: [T] = []

            for record in pending {
                let recordId = record.id
                if recordId.isEmpty || recordId.hasPrefix("local-") {
                    toCreate.append(record)
                } else {
                    // Has an Airtable ID (starts with "rec") or some other format — update
                    toUpdate.append(record)
                }
            }

            // ── Batch Create (max 10 per request) ──

            if !toCreate.isEmpty {
                let fieldsList = toCreate.map { $0.toAirtableFields() }

                for (chunkIndex, chunk) in fieldsList.chunked(into: 10).enumerated() {
                    // Rate limit stagger between batch requests
                    if chunkIndex > 0 {
                        try? await Task.sleep(nanoseconds: AirtableConfig.tableSyncStaggerMs)
                    }

                    let created = try await service.batchCreate(tableId: tableId, records: chunk)

                    // Match created records back to local models by position within chunk.
                    // Airtable returns records in the same order they were submitted.
                    let chunkStartIndex = chunkIndex * 10
                    for (i, createdDict) in created.enumerated() {
                        let localIndex = chunkStartIndex + i
                        guard localIndex < toCreate.count else { break }

                        guard let airtableRecord = AirtableRecord.from(dict: createdDict) else {
                            continue
                        }

                        let localModel = toCreate[localIndex]

                        // SwiftData @Attribute(.unique) var id can't be mutated safely.
                        // Delete the local-ID model, then insert a fresh one with the
                        // real Airtable ID — same delete-and-reinsert pattern as pullTable.
                        context.delete(localModel)
                        let newModel = T.from(record: airtableRecord, context: context)
                        newModel.isPendingPush = false
                        newModel.airtableModifiedAt = Date()
                        context.insert(newModel)
                    }
                }
            }

            // ── Batch Update (max 10 per request) ──

            if !toUpdate.isEmpty {
                let updatePayloads: [(id: String, fields: [String: Any])] = toUpdate.map { record in
                    (id: record.id, fields: record.toAirtableFields())
                }

                for (chunkIndex, chunk) in updatePayloads.chunked(into: 10).enumerated() {
                    // Rate limit stagger between batch requests
                    if chunkIndex > 0 {
                        try? await Task.sleep(nanoseconds: AirtableConfig.tableSyncStaggerMs)
                    }

                    try await service.batchUpdate(tableId: tableId, records: chunk)
                }

                // Mark all updated records as pushed
                for record in toUpdate {
                    record.isPendingPush = false
                    record.airtableModifiedAt = Date()
                }
            }
        } catch {
            // Log error but don't abort push for other tables.
            // Common failure: 422 INVALID_MULTIPLE_CHOICE_OPTIONS (emoji prefix mismatch).
            // This means a select option value like "High" was sent but Airtable expects
            // "🔴 High". The converters should handle this, but log details for debugging.
            print("[SyncEngine] Push failed for table \(tableId): \(error.localizedDescription)")
        }
    }

    // MARK: - Polling

    /// Starts background polling at the configured interval.
    /// Mirrors: sync-engine.ts → startPolling()
    @MainActor
    func startPolling(intervalSeconds: TimeInterval = AirtableConfig.defaultSyncIntervalSeconds) {
        stopPolling()

        pollingTask = Task {
            while !Task.isCancelled {
                await fullSync()
                try? await Task.sleep(for: .seconds(intervalSeconds))
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    // MARK: - Force Sync (user-triggered)

    /// Force sync — same guard as fullSync prevents double-trigger.
    /// Mirrors the "Force Sync" button behavior in the Electron app.
    @MainActor
    func forceSync() async {
        await fullSync()
    }
}

// MARK: - AirtableSyncable Protocol

/// Combines AirtableConvertible + PersistentModel with the sync metadata properties
/// that all 11 models share: `id`, `isPendingPush`, and `airtableModifiedAt`.
///
/// This protocol lets `pullTable<T>()` access these properties generically without
/// resorting to key-value coding or runtime casts. Every @Model class in the project
/// already has these properties — the extensions below just declare the conformance.
protocol AirtableSyncable: AirtableConvertible, PersistentModel {
    var id: String { get }
    var isPendingPush: Bool { get set }
    var airtableModifiedAt: Date? { get set }
}

// MARK: - AirtableSyncable Conformances (all 11 model types)

// Each model already has `id: String`, `isPendingPush: Bool`, and
// `airtableModifiedAt: Date?` — these extensions just declare the protocol match.
extension Contact: AirtableSyncable {}
extension Company: AirtableSyncable {}
extension Opportunity: AirtableSyncable {}
extension Project: AirtableSyncable {}
extension Proposal: AirtableSyncable {}
extension CRMTask: AirtableSyncable {}
extension Interaction: AirtableSyncable {}
extension ImportedContact: AirtableSyncable {}
extension Specialty: AirtableSyncable {}
extension PortalAccessRecord: AirtableSyncable {}
extension PortalLog: AirtableSyncable {}

// MARK: - Sync Errors

enum SyncError: LocalizedError {
    case unknownTable(String)

    var errorDescription: String? {
        switch self {
        case .unknownTable(let tableId):
            return "Unknown table ID in sync order: \(tableId)"
        }
    }
}
