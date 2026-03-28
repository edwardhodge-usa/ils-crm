import Foundation
import SwiftData

private enum F {
    static let task = "fldfYqgokx0nP9jrq"
    static let notes = "fldwi4Fm7aOdyh7R3"
    static let dueDate = "fldrV9zjZGNlm2znw"
    static let completedDate = "fldOE0MEitlXCeC5e"
    static let status = "fld5j051j1H7rPmbw"         // emoji prefixed
    static let type = "fldXcqtkVSh60H20b"
    static let priority = "fldREFoOWpRN4Ejfg"       // emoji prefixed (e.g. "🔴 High")
    static let salesOpportunities = "fldhzkBEvT2UlcW7g"
    static let contacts = "fldyzxf3dGGCT02t0"
    static let projects = "fldtxrwOzmkpjVtdj"
    static let proposal = "fldB9nEqdI6EZMfPo"
    static let assignedTo = "fldtfWkEqvv5YHODj"     // collaborator
}

extension CRMTask: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.tasks

    static func from(record: AirtableRecord, context: ModelContext) -> CRMTask {
        let f = record.fields
        let model = CRMTask(id: record.id)
        model.task = f.string(for: F.task)
        model.notes = f.string(for: F.notes)
        model.dueDate = f.date(for: F.dueDate)
        model.completedDate = f.date(for: F.completedDate)
        model.status = f.string(for: F.status)          // stored with emoji prefix
        model.type = f.string(for: F.type)
        model.priority = f.string(for: F.priority)      // stored with emoji prefix
        model.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        model.contactsIds = f.stringArray(for: F.contacts)
        model.projectsIds = f.stringArray(for: F.projects)
        model.proposalIds = f.stringArray(for: F.proposal)
        model.assignedTo = f.collaboratorName(for: F.assignedTo)
        model.assignedToData = f.collaboratorData(for: F.assignedTo)
        return model
    }

    static func updateFields(of existing: CRMTask, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.task = f.string(for: F.task)
        existing.notes = f.string(for: F.notes)
        existing.dueDate = f.date(for: F.dueDate)
        existing.completedDate = f.date(for: F.completedDate)
        existing.status = f.string(for: F.status)          // stored with emoji prefix
        existing.type = f.string(for: F.type)
        existing.priority = f.string(for: F.priority)      // stored with emoji prefix
        existing.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        existing.contactsIds = f.stringArray(for: F.contacts)
        existing.projectsIds = f.stringArray(for: F.projects)
        existing.proposalIds = f.stringArray(for: F.proposal)
        existing.assignedTo = f.collaboratorName(for: F.assignedTo)
        existing.assignedToData = f.collaboratorData(for: F.assignedTo)
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.task, task)
        b.set(F.notes, notes)
        b.setDate(F.dueDate, dueDate)
        b.setDate(F.completedDate, completedDate)
        b.set(F.status, status)
        b.set(F.type, type)
        b.set(F.priority, priority)
        b.setLinkedIds(F.salesOpportunities, salesOpportunitiesIds)
        b.setLinkedIds(F.contacts, contactsIds)
        b.setLinkedIds(F.projects, projectsIds)
        b.setLinkedIds(F.proposal, proposalIds)
        b.setCollaborator(F.assignedTo, assignedToData)
        return b.fields
    }
}
