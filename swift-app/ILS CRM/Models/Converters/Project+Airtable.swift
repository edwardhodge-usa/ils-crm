import Foundation
import SwiftData

private enum F {
    static let projectName = "fldkrhZTZ6pFweiBx"
    static let location = "fldFwzNbpWAL9tV8R"
    static let description = "fldr8mgLCY9ISv4Bd"
    static let keyMilestones = "fld19Ezi7Md5PPWxQ"
    static let lessonsLearned = "fldKxqY5ZYIrCIOgU"
    static let contractValue = "fld4J4KCazP7C1IMC"
    static let startDate = "fldTOw6VgwsvJXW7O"
    static let targetCompletion = "fldID5gpDgtmQDVUd"
    static let actualCompletion = "fldKc3rU95N8sCDdg"
    static let status = "fld4Pv2FM3skC3chQ"
    static let engagementType = "fld5nII1Fq8N1LVEO"  // multipleSelects
    static let salesOpportunities = "fldUKkazQiEmhIH4E"
    static let client = "fldMMHrrBsAHvyQ0e"
    static let tasks = "fldizOqFE6ParTzho"
    static let primaryContact = "fld5uAeJxjSB3WCqs"
    static let contacts = "fldTphE0ecQivlxxD"
    static let projectLead = "fldDKZQgxaaAej7mU"     // collaborator
    static let projectFiles = "fld2qAFRKhP3v5js2"    // attachments — read-only for push
}

extension Project: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.projects

    static func from(record: AirtableRecord, context: ModelContext) -> Project {
        let f = record.fields
        let model = Project(id: record.id)
        model.projectName = f.string(for: F.projectName)
        model.location = f.string(for: F.location)
        model.projectDescription = f.string(for: F.description)
        model.keyMilestones = f.string(for: F.keyMilestones)
        model.lessonsLearned = f.string(for: F.lessonsLearned)
        model.contractValue = f.double(for: F.contractValue)
        model.startDate = f.date(for: F.startDate)
        model.targetCompletion = f.date(for: F.targetCompletion)
        model.actualCompletion = f.date(for: F.actualCompletion)
        model.status = f.string(for: F.status)
        model.engagementType = f.stringArray(for: F.engagementType)
        model.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        model.clientIds = f.stringArray(for: F.client)
        model.tasksIds = f.stringArray(for: F.tasks)
        model.primaryContactIds = f.stringArray(for: F.primaryContact)
        model.contactsIds = f.stringArray(for: F.contacts)
        return model
    }

    static func updateFields(of existing: Project, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.projectName = f.string(for: F.projectName)
        existing.location = f.string(for: F.location)
        existing.projectDescription = f.string(for: F.description)
        existing.keyMilestones = f.string(for: F.keyMilestones)
        existing.lessonsLearned = f.string(for: F.lessonsLearned)
        existing.contractValue = f.double(for: F.contractValue)
        existing.startDate = f.date(for: F.startDate)
        existing.targetCompletion = f.date(for: F.targetCompletion)
        existing.actualCompletion = f.date(for: F.actualCompletion)
        existing.status = f.string(for: F.status)
        existing.engagementType = f.stringArray(for: F.engagementType)
        existing.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        existing.clientIds = f.stringArray(for: F.client)
        existing.tasksIds = f.stringArray(for: F.tasks)
        existing.primaryContactIds = f.stringArray(for: F.primaryContact)
        existing.contactsIds = f.stringArray(for: F.contacts)
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.projectName, projectName)
        b.set(F.location, location)
        b.set(F.description, projectDescription)
        b.set(F.keyMilestones, keyMilestones)
        b.set(F.lessonsLearned, lessonsLearned)
        b.set(F.contractValue, contractValue)
        b.setDate(F.startDate, startDate)
        b.setDate(F.targetCompletion, targetCompletion)
        b.setDate(F.actualCompletion, actualCompletion)
        b.set(F.status, status)
        b.setMultiSelect(F.engagementType, engagementType)
        b.setLinkedIds(F.salesOpportunities, salesOpportunitiesIds)
        b.setLinkedIds(F.client, clientIds)
        b.setLinkedIds(F.tasks, tasksIds)
        b.setLinkedIds(F.primaryContact, primaryContactIds)
        b.setLinkedIds(F.contacts, contactsIds)
        // projectLead (collaborator), projectFiles (attachments) excluded
        return b.fields
    }
}
