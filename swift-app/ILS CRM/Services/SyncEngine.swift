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
                    let records = try await service.fetchAllRecords(tableId: tableId)
                    // TODO: Convert Airtable records → SwiftData models using field converters
                    // This is where converters.ts logic maps to Swift Codable transforms
                    tableStatus[tableId]?.recordCount = records.count
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

        // TODO: For each CRUD table, fetch records where isPendingPush == true
        // For each pending record:
        //   1. Convert SwiftData model → Airtable fields (exclude formula/lookup/rollup)
        //   2. If record has no Airtable ID → batchCreate
        //   3. If record has Airtable ID → batchUpdate
        //   4. On success, set isPendingPush = false
        //   5. On 422 error, check if it's INVALID_MULTIPLE_CHOICE_OPTIONS
        //      (emoji prefix mismatch) and log detailed error

        _ = context // suppress unused warning until implemented
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
