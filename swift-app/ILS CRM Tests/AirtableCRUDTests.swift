import Testing
import Foundation
@testable import ILS_CRM

/// Integration tests that verify CRUD operations flow through to Airtable.
/// Requires AIRTABLE_API_KEY environment variable to be set.
struct AirtableCRUDTests {
    let service: AirtableService
    let ts: String

    init() throws {
        guard let apiKey = ProcessInfo.processInfo.environment["AIRTABLE_API_KEY"],
              !apiKey.isEmpty else {
            throw TestError.missingAPIKey
        }
        service = AirtableService(apiKey: apiKey, baseId: AirtableConfig.baseId)
        ts = String(Int(Date().timeIntervalSince1970))
    }

    enum TestError: Error {
        case missingAPIKey
        case noRecordCreated
    }

    // MARK: - Helpers

    private func createRecord(tableId: String, fields: [String: Any]) async throws -> String {
        let created = try await service.batchCreate(tableId: tableId, records: [fields])
        guard let first = created.first, let id = first["id"] as? String else {
            throw TestError.noRecordCreated
        }
        return id
    }

    private func fetchFields(tableId: String, recordId: String) async throws -> [String: Any] {
        let record = try await service.fetchRecord(tableId: tableId, recordId: recordId)
        return record["fields"] as? [String: Any] ?? [:]
    }

    private func cleanup(tableId: String, ids: [String]) async {
        try? await service.batchDelete(tableId: tableId, recordIds: ids)
    }

    // MARK: - Contacts

    @Test("Create, update, delete Contact in Airtable")
    func contactsCRUD() async throws {
        let tableId = AirtableConfig.Tables.contacts
        var createdIds: [String] = []

        defer { Task { await cleanup(tableId: tableId, ids: createdIds) } }

        // Create — send field IDs (Airtable accepts both IDs and names for writes)
        let fields: [String: Any] = [
            "fldBzVPUdMy99vfvp": "__TEST_\(ts)_SwiftJohn",   // First Name
            "fldq4VxEf0jJgi6O5": "SwiftTestContact",          // Last Name
            "fldBjSvbdd5WXmoIG": "__test_swift_\(ts)@test.invalid", // Email
            "fldHoIj9zCNB15avX": "Technology",                 // Industry
        ]
        let contactId = try await createRecord(tableId: tableId, fields: fields)
        createdIds.append(contactId)

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify create — fetchRecord returns field NAMES (no returnFieldsByFieldId param)
        var fetched = try await fetchFields(tableId: tableId, recordId: contactId)
        #expect(fetched["First Name"] as? String == "__TEST_\(ts)_SwiftJohn")
        #expect(fetched["Last Name"] as? String == "SwiftTestContact")
        #expect(fetched["Email"] as? String == "__test_swift_\(ts)@test.invalid")
        #expect(fetched["Industry"] as? String == "Technology")

        // Update
        try await service.batchUpdate(tableId: tableId, records: [(
            id: contactId,
            fields: [
                "fldBjSvbdd5WXmoIG": "__test_swift_\(ts)_updated@test.invalid",
                "fldHoIj9zCNB15avX": "Healthcare",
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify update
        fetched = try await fetchFields(tableId: tableId, recordId: contactId)
        #expect(fetched["Email"] as? String == "__test_swift_\(ts)_updated@test.invalid")
        #expect(fetched["Industry"] as? String == "Healthcare")
        #expect(fetched["First Name"] as? String == "__TEST_\(ts)_SwiftJohn")

        // Delete
        try await service.batchDelete(tableId: tableId, recordIds: [contactId])
        createdIds.removeAll { $0 == contactId }

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify delete — fetch should throw (Airtable returns 404/403 for deleted records)
        do {
            _ = try await service.fetchRecord(tableId: tableId, recordId: contactId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            // Expected — record should be gone
        }
    }

    // MARK: - Companies

    @Test("Create, update, delete Company in Airtable")
    func companiesCRUD() async throws {
        let tableId = AirtableConfig.Tables.companies
        var createdIds: [String] = []

        defer { Task { await cleanup(tableId: tableId, ids: createdIds) } }

        let fields: [String: Any] = [
            "fldVYiMOLq3LJgbZ3": "__TEST_\(ts)_SwiftCorp",  // Company Name
            "fldtLJxxK5oT6Nzjn": "Prospect",                 // Type
            "fldPz4rknFpmEXZAD": "Technology",                // Industry
        ]
        let companyId = try await createRecord(tableId: tableId, fields: fields)
        createdIds.append(companyId)

        try await Task.sleep(nanoseconds: 500_000_000)

        var fetched = try await fetchFields(tableId: tableId, recordId: companyId)
        #expect(fetched["Company Name"] as? String == "__TEST_\(ts)_SwiftCorp")
        #expect(fetched["Type"] as? String == "Prospect")
        #expect(fetched["Industry"] as? String == "Technology")

        try await service.batchUpdate(tableId: tableId, records: [(
            id: companyId,
            fields: [
                "fldtLJxxK5oT6Nzjn": "Active Client",
                "fldPz4rknFpmEXZAD": "Entertainment",
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        fetched = try await fetchFields(tableId: tableId, recordId: companyId)
        #expect(fetched["Type"] as? String == "Active Client")
        #expect(fetched["Industry"] as? String == "Entertainment")

        try await service.batchDelete(tableId: tableId, recordIds: [companyId])
        createdIds.removeAll { $0 == companyId }

        try await Task.sleep(nanoseconds: 500_000_000)

        do {
            _ = try await service.fetchRecord(tableId: tableId, recordId: companyId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            // Expected
        }
    }

    // MARK: - Portal Access

    @Test("Create, update, delete Portal Access in Airtable")
    func portalAccessCRUD() async throws {
        let contactTableId = AirtableConfig.Tables.contacts
        let portalTableId = AirtableConfig.Tables.portalAccess
        var contactIds: [String] = []
        var portalIds: [String] = []

        defer {
            Task {
                await cleanup(tableId: portalTableId, ids: portalIds)
                await cleanup(tableId: contactTableId, ids: contactIds)
            }
        }

        // Create a contact first (portal access requires linked contact)
        let contactFields: [String: Any] = [
            "fldBzVPUdMy99vfvp": "__TEST_\(ts)_SwiftPortalLink",  // First Name
            "fldq4VxEf0jJgi6O5": "PortalTest",                     // Last Name
        ]
        let contactId = try await createRecord(tableId: contactTableId, fields: contactFields)
        contactIds.append(contactId)

        try await Task.sleep(nanoseconds: 300_000_000)

        // Create portal access
        let portalFields: [String: Any] = [
            "fldqnVE5ppj8ACyf3": "__TEST_\(ts)_SwiftPortal",     // Name
            "fldkAjPIMUMlHNT2A": "__test-swift-\(ts)",            // Page Address
            "fldqbzNiTFt7jpdyW": "ACTIVE",                        // Status
            "fld1tMK48dxrLU9R4": [contactId],                     // Contact (linked record)
        ]
        let portalId = try await createRecord(tableId: portalTableId, fields: portalFields)
        portalIds.append(portalId)

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify create
        var fetched = try await fetchFields(tableId: portalTableId, recordId: portalId)
        #expect(fetched["Name"] as? String == "__TEST_\(ts)_SwiftPortal")
        #expect(fetched["Page Address"] as? String == "__test-swift-\(ts)")
        #expect(fetched["Status"] as? String == "ACTIVE")
        let linked = fetched["Contact"] as? [String] ?? []
        #expect(linked.contains(contactId))

        // Update
        try await service.batchUpdate(tableId: portalTableId, records: [(
            id: portalId,
            fields: [
                "fldqbzNiTFt7jpdyW": "IN-ACTIVE",                // Status
                "flddcfM0XRw309R9P": "Updated Test Page",        // Page Title
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify update
        fetched = try await fetchFields(tableId: portalTableId, recordId: portalId)
        #expect(fetched["Status"] as? String == "IN-ACTIVE")
        #expect(fetched["Page Title"] as? String == "Updated Test Page")

        // Delete portal (keep contact for cleanup)
        try await service.batchDelete(tableId: portalTableId, recordIds: [portalId])
        portalIds.removeAll { $0 == portalId }

        try await Task.sleep(nanoseconds: 500_000_000)

        do {
            _ = try await service.fetchRecord(tableId: portalTableId, recordId: portalId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            // Expected
        }
    }
}
