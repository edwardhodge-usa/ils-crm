import Foundation
import SwiftData

private enum F {
    static let proposalName = "fld5Y8fCuS1jhkWF2"
    static let version = "fldQ8g5iqtMPHxb8S"
    static let clientFeedback = "fldhUnP1A7gxJNaxe"
    static let performanceMetrics = "fldZeAOE1WpLOY3aH"
    static let notes = "fldryZ3MW513WcmrK"
    static let status = "fldBzyWMITVJdZyRl"
    static let templateUsed = "fldAOt35mhF1ne0UK"
    static let approvalStatus = "fldwWCRdvqYVTXZ12"
    static let client = "fldoz0V3WTPup4zv8"
    static let company = "fldxxsjKV66IhPKzL"
    static let relatedOpportunity = "fldPs5pFveiqZbpnn"
    static let tasks = "fldQARjLcMpanbY6m"
    static let createdBy = "fld9TDETWFG7tFusb"       // collaborator — read-only for push
    // Migrated fields — no Airtable field IDs yet (local-only from schema migration)
}

extension Proposal: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.proposals

    static func from(record: AirtableRecord, context: ModelContext) -> Proposal {
        let f = record.fields
        let model = Proposal(id: record.id)
        model.proposalName = f.string(for: F.proposalName)
        model.version = f.string(for: F.version)
        model.clientFeedback = f.string(for: F.clientFeedback)
        model.performanceMetrics = f.string(for: F.performanceMetrics)
        model.notes = f.string(for: F.notes)
        model.status = f.string(for: F.status)
        model.templateUsed = f.string(for: F.templateUsed)
        model.approvalStatus = f.string(for: F.approvalStatus)
        model.clientIds = f.stringArray(for: F.client)
        model.companyIds = f.stringArray(for: F.company)
        model.relatedOpportunityIds = f.stringArray(for: F.relatedOpportunity)
        model.tasksIds = f.stringArray(for: F.tasks)
        // Migrated fields: scopeSummary, proposedValue, dateSent, validUntil
        // These exist in SQLite schema but may not have Airtable field IDs
        return model
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.proposalName, proposalName)
        b.set(F.version, version)
        b.set(F.clientFeedback, clientFeedback)
        b.set(F.performanceMetrics, performanceMetrics)
        b.set(F.notes, notes)
        b.set(F.status, status)
        b.set(F.templateUsed, templateUsed)
        b.set(F.approvalStatus, approvalStatus)
        b.setLinkedIds(F.client, clientIds)
        b.setLinkedIds(F.company, companyIds)
        b.setLinkedIds(F.relatedOpportunity, relatedOpportunityIds)
        b.setLinkedIds(F.tasks, tasksIds)
        // createdBy excluded — collaborator field
        return b.fields
    }
}
