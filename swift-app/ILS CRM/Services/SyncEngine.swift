import Foundation
import SwiftData
import Observation
import os

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

    private static let logger = Logger(subsystem: "com.ils-crm", category: "sync")

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
        guard let service else {
            syncError = "Not configured — enter API key in Settings."
            return
        }

        isSyncing = true
        syncError = nil

        defer {
            isSyncing = false
        }

        let context = modelContainer.mainContext

        do {
            // TODO: Implement push pending records

            // Pull each table in sync order with 200ms stagger
            for (index, tableId) in AirtableConfig.syncOrder.enumerated() {
                if index > 0 {
                    try await Task.sleep(nanoseconds: AirtableConfig.tableSyncStaggerMs)
                }
                try await pullTable(tableId: tableId, service: service, context: context)
            }

            try context.save()
            lastSyncDate = Date()
            Self.logger.info("Sync completed — all tables pulled")
        } catch {
            syncError = error.localizedDescription
            Self.logger.error("Sync failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Pull

    /// Routes a table ID to the correct typed pull call.
    @MainActor
    private func pullTable(tableId: String, service: AirtableService, context: ModelContext) async throws {
        switch tableId {
        case AirtableConfig.Tables.contacts:
            try await pullRecords(Contact.self, service: service, context: context)
        case AirtableConfig.Tables.companies:
            try await pullRecords(Company.self, service: service, context: context)
        case AirtableConfig.Tables.opportunities:
            try await pullRecords(Opportunity.self, service: service, context: context)
        case AirtableConfig.Tables.projects:
            try await pullRecords(Project.self, service: service, context: context)
        case AirtableConfig.Tables.proposals:
            try await pullRecords(Proposal.self, service: service, context: context)
        case AirtableConfig.Tables.tasks:
            try await pullRecords(CRMTask.self, service: service, context: context)
        case AirtableConfig.Tables.interactions:
            try await pullRecords(Interaction.self, service: service, context: context)
        case AirtableConfig.Tables.importedContacts:
            try await pullRecords(ImportedContact.self, service: service, context: context)
        case AirtableConfig.Tables.specialties:
            try await pullRecords(Specialty.self, service: service, context: context)
        case AirtableConfig.Tables.portalAccess:
            try await pullRecords(PortalAccessRecord.self, service: service, context: context)
        case AirtableConfig.Tables.portalLogs:
            try await pullRecords(PortalLog.self, service: service, context: context)
        default:
            Self.logger.warning("Unknown table ID: \(tableId)")
        }
    }

    /// Generic pull: fetches all records of a type from Airtable, upserts into SwiftData,
    /// and removes records no longer in Airtable (unless pending push).
    @MainActor
    private func pullRecords<T: AirtableConvertible>(_ type: T.Type, service: AirtableService, context: ModelContext) async throws {
        let rawRecords = try await service.fetchAllRecords(tableId: T.airtableTableId)
        let records = rawRecords.compactMap { AirtableRecord(json: $0) }
        let fetchedIds = Set(records.map(\.id))

        // Fetch all existing records of this type
        let existing = try context.fetch(FetchDescriptor<T>())
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        // Upsert: delete-then-insert for each record (simplest correct approach
        // that avoids SwiftData @Attribute(.unique) constraint violations)
        for record in records {
            if let old = existingById[record.id] {
                context.delete(old)
            }
            let model = T.from(record: record, context: context)
            context.insert(model)
        }

        // Delete records not in Airtable (unless pending push)
        for model in existing where !fetchedIds.contains(model.id) {
            if !model.isPendingPush {
                context.delete(model)
            }
        }

        let typeName = String(describing: T.self)
        Self.logger.info("Pulled \(records.count) \(typeName) records")
    }

    /// Force sync — triggered by Settings "Force Sync" button.
    @MainActor
    func forceSync() async {
        await fullSync()
    }
}
