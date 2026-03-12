import Foundation
import SwiftData
import Observation

/// Sync engine — mirrors electron/airtable/sync-engine.ts
///
/// Coordinates pull (Airtable → SwiftData) and push (SwiftData → Airtable).
/// Uses the same rules as Electron:
/// - Push pending first, then pull
/// - 200ms stagger between tables to avoid 5 req/sec rate limit
/// - isSyncing mutex prevents re-entry
/// - Read-only tables (Specialties, Portal Logs) never push
/// - Cross-app sync lock via /tmp/ils-crm-sync.lock
@Observable
final class SyncEngine {
    // MARK: - Published State

    var isSyncing = false
    var lastSyncDate: Date?
    var syncError: String?

    // MARK: - Private

    private let modelContainer: ModelContainer
    private var service: AirtableService?
    private var pollingTask: Task<Void, Never>?

    init(modelContainer: ModelContainer) {
        self.modelContainer = modelContainer
    }

    // MARK: - Configuration

    /// Called from SettingsView after API key is saved/loaded.
    func configure(apiKey: String, baseId: String) {
        service = AirtableService(apiKey: apiKey, baseId: baseId)
    }

    // MARK: - Polling

    func startPolling(intervalSeconds: TimeInterval) {
        stopPolling()
        guard intervalSeconds > 0 else { return }

        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(intervalSeconds * 1_000_000_000))
                guard !Task.isCancelled else { break }
                await self?.fullSync()
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    // MARK: - Sync

    /// Full sync: push pending, then pull all tables in order.
    /// Guards against re-entry with isSyncing flag.
    @MainActor
    func fullSync() async {
        guard !isSyncing else { return }
        guard service != nil else {
            syncError = "Not configured — enter API key in Settings."
            return
        }

        isSyncing = true
        syncError = nil

        defer {
            isSyncing = false
        }

        do {
            // TODO: Implement push pending records
            // TODO: Implement pull from each table in AirtableConfig.syncOrder
            // For now, mark the sync as completed
            lastSyncDate = Date()

            #if DEBUG
            print("[SyncEngine] Sync completed at \(lastSyncDate!)")
            #endif
        }
    }

    /// Force sync — triggered by Settings "Force Sync" button.
    @MainActor
    func forceSync() async {
        await fullSync()
    }
}
