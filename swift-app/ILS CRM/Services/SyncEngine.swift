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
    private static let lockFilePath = "/tmp/ils-crm-sync.lock"

    private let modelContainer: ModelContainer
    private var service: AirtableService?
    private var pollingTask: Task<Void, Never>?

    /// Tracks record IDs deleted locally that need DELETE requests sent to Airtable.
    /// Key: tableId, Value: set of Airtable record IDs (not local_ prefixed)
    private var pendingDeletes: [String: Set<String>] = [:]

    /// Call this before deleting a record from SwiftData to queue the Airtable DELETE.
    /// Skips local-only records (local_ prefix) since they don't exist in Airtable.
    func trackDeletion(tableId: String, recordId: String) {
        guard !recordId.hasPrefix("local_") else { return }
        pendingDeletes[tableId, default: []].insert(recordId)
    }

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

    // MARK: - Cross-App Sync Lock

    /// Acquires the `/tmp/ils-crm-sync.lock` file to prevent simultaneous sync
    /// from both the Electron and Swift apps against the same Airtable base.
    /// Returns `true` if the lock was acquired, `false` if another app holds it.
    private func acquireSyncLock() -> Bool {
        // Check for stale lock first
        if FileManager.default.fileExists(atPath: Self.lockFilePath) {
            if let attrs = try? FileManager.default.attributesOfItem(atPath: Self.lockFilePath),
               let modified = attrs[.modificationDate] as? Date,
               abs(modified.timeIntervalSinceNow) < 120 {
                return false // Fresh lock held by another app
            }
            // Stale lock — remove it
            try? FileManager.default.removeItem(atPath: Self.lockFilePath)
        }

        // Atomic create: O_CREAT|O_EXCL fails if file already exists (no TOCTOU race)
        let fd = Darwin.open(Self.lockFilePath, O_WRONLY | O_CREAT | O_EXCL, 0o644)
        guard fd >= 0 else { return false }

        let timestamp = Date().ISO8601Format()
        timestamp.withCString { ptr in
            _ = Darwin.write(fd, ptr, strlen(ptr))
        }
        Darwin.close(fd)
        return true
    }

    /// Releases the cross-app sync lock by deleting the lock file.
    private func releaseSyncLock() {
        try? FileManager.default.removeItem(atPath: Self.lockFilePath)
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

        guard acquireSyncLock() else {
            syncError = "Another app is syncing. Try again shortly."
            Self.logger.warning("Sync skipped — lock held by another app")
            return
        }
        Self.logger.info("Acquired sync lock")

        isSyncing = true
        syncError = nil

        defer {
            isSyncing = false
            releaseSyncLock()
        }

        let context = modelContainer.mainContext

        do {
            // Push pending records before pulling
            try await pushPendingRecords(context: context, service: service)
            try context.save()

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

    // MARK: - Push

    /// Pushes all pending local changes to Airtable before pulling.
    /// Iterates syncOrder, skipping read-only tables. 200ms stagger between tables.
    @MainActor
    private func pushPendingRecords(context: ModelContext, service: AirtableService) async throws {
        // Process pending deletes first
        for (tableId, recordIds) in pendingDeletes {
            guard !recordIds.isEmpty else { continue }
            let ids = Array(recordIds)
            Self.logger.info("Deleting \(ids.count) records from \(tableId)")
            try await service.batchDelete(tableId: tableId, recordIds: ids)
            pendingDeletes[tableId] = nil
        }

        var isFirst = true

        for tableId in AirtableConfig.syncOrder {
            // Never push to read-only tables (Specialties, Portal Logs)
            guard !AirtableConfig.readOnlyTables.contains(tableId) else { continue }

            if !isFirst {
                try await Task.sleep(nanoseconds: AirtableConfig.tableSyncStaggerMs)
            }
            isFirst = false

            switch tableId {
            case AirtableConfig.Tables.contacts:
                try await pushRecords(Contact.self, service: service, context: context)
            case AirtableConfig.Tables.companies:
                try await pushRecords(Company.self, service: service, context: context)
            case AirtableConfig.Tables.opportunities:
                try await pushRecords(Opportunity.self, service: service, context: context)
            case AirtableConfig.Tables.projects:
                try await pushRecords(Project.self, service: service, context: context)
            case AirtableConfig.Tables.proposals:
                try await pushRecords(Proposal.self, service: service, context: context)
            case AirtableConfig.Tables.tasks:
                try await pushRecords(CRMTask.self, service: service, context: context)
            case AirtableConfig.Tables.interactions:
                try await pushRecords(Interaction.self, service: service, context: context)
            case AirtableConfig.Tables.importedContacts:
                try await pushRecords(ImportedContact.self, service: service, context: context)
            case AirtableConfig.Tables.portalAccess:
                try await pushRecords(PortalAccessRecord.self, service: service, context: context)
            case AirtableConfig.Tables.clientPages:
                try await pushRecords(ClientPage.self, service: service, context: context)
            case AirtableConfig.Tables.enrichmentQueue:
                try await pushRecords(EnrichmentQueueItem.self, service: service, context: context)
            default:
                break
            }
        }
    }

    /// Generic push: finds records with isPendingPush == true, separates into creates
    /// (id starts with "local_") and updates, sends to Airtable, then clears the flag.
    @MainActor
    private func pushRecords<T: AirtableConvertible>(_ type: T.Type, service: AirtableService, context: ModelContext) async throws {
        // TODO: Revert to #Predicate when SwiftData crash is fixed (macOS 26.4 beta, 25E5233c)
        let pending = try context.fetch(FetchDescriptor<T>()).filter { $0.isPendingPush }

        guard !pending.isEmpty else { return }

        // Separate creates (local_ prefix) from updates (existing Airtable IDs)
        var creates: [T] = []
        var updates: [T] = []

        for record in pending {
            if record.id.hasPrefix("local_") {
                creates.append(record)
            } else {
                updates.append(record)
            }
        }

        let typeName = String(describing: T.self)

        // Handle creates — send fields, get back records with real Airtable IDs
        if !creates.isEmpty {
            let fieldsArray = creates.map { $0.toAirtableFields() }
            let createdRecords = try await service.batchCreate(
                tableId: T.airtableTableId,
                records: fieldsArray
            )

            // Update local records with real Airtable IDs
            // batchCreate returns records in the same order as the input
            for (index, airtableRecord) in createdRecords.enumerated() where index < creates.count {
                if airtableRecord["id"] as? String != nil {
                    // Delete old local record and insert fresh from Airtable response
                    context.delete(creates[index])
                    if let record = AirtableRecord(json: airtableRecord) {
                        let model = T.from(record: record, context: context)
                        context.insert(model)
                    }
                }
            }
        }

        // Handle updates — send id + fields, then clear isPendingPush
        if !updates.isEmpty {
            let updateTuples = updates.map { (id: $0.id, fields: $0.toAirtableFields()) }
            try await service.batchUpdate(
                tableId: T.airtableTableId,
                records: updateTuples
            )

            // Clear pending flag on successfully pushed updates
            for record in updates {
                record.isPendingPush = false
            }
        }

        Self.logger.info("Pushed \(creates.count) creates + \(updates.count) updates for \(typeName)")
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
        case AirtableConfig.Tables.clientPages:
            try await pullRecords(ClientPage.self, service: service, context: context)
        case AirtableConfig.Tables.emailScanRules:
            try await pullRecords(EmailScanRule.self, service: service, context: context)
        case AirtableConfig.Tables.emailScanState:
            try await pullRecords(EmailScanState.self, service: service, context: context)
        case AirtableConfig.Tables.enrichmentQueue:
            try await pullRecords(EnrichmentQueueItem.self, service: service, context: context)
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
        let existingById = Dictionary(existing.map { ($0.id, $0) }, uniquingKeysWith: { _, last in last })

        // Upsert: update existing in-place to preserve SwiftData object identity,
        // or insert new records that don't exist locally yet.
        for record in records {
            if let old = existingById[record.id] {
                if old.isPendingPush { continue }
                T.updateFields(of: old, from: record, context: context)
            } else {
                let model = T.from(record: record, context: context)
                context.insert(model)
            }
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

    // MARK: - Attachment Upload

    /// Uploads an image to an Airtable attachment field.
    /// Called from detail views when the user selects a new photo/logo.
    @MainActor
    func uploadAttachment(
        tableId: String,
        recordId: String,
        fieldId: String,
        imageData: Data,
        filename: String
    ) async throws -> String {
        guard let service else {
            throw AirtableError.attachmentUploadFailed(reason: "Not configured")
        }
        let contentType = filename.hasSuffix(".png") ? "image/png" : "image/jpeg"
        return try await service.uploadAttachment(
            tableId: tableId,
            recordId: recordId,
            fieldId: fieldId,
            imageData: imageData,
            filename: filename,
            contentType: contentType
        )
    }

    /// Removes an attachment from an Airtable field.
    @MainActor
    func removeAttachment(tableId: String, recordId: String, fieldId: String) async throws {
        guard let service else {
            throw AirtableError.attachmentUploadFailed(reason: "Not configured")
        }
        try await service.removeAttachment(tableId: tableId, recordId: recordId, fieldId: fieldId)
    }
}
