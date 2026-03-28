import Foundation
import SwiftData

private enum F {
    static let opportunityName = "fldsvZbiY3YFK2Ocp"
    static let referredBy = "fldZ3V2AL5IFj6W1G"
    static let notesAbout = "fldLZDfABWEJ9fCyZ"
    static let contractMilestones = "fldLjPejA0TcYj8R8"
    static let lossNotes = "fldVOzXUQ5lMYzcVp"
    static let dealValue = "fld1y3pUaljvn2nF5"
    static let expectedCloseDate = "fldpSYPc9Mf1hRhdU"
    static let nextMeetingDate = "fld7ZbwNVRSKCOly8"
    static let salesStage = "fldMV4ZUWb0h1pyPN"
    static let probability = "fld4oRQmcZ3VaQeUP"      // prefixed: "01 High", "02 Medium"
    static let qualsType = "fldhJn8M3xeQYdPHG"
    static let leadSource = "fldDr4GsoxjnNmpo1"
    static let winLossReason = "fldEkMImrxZQMnuCJ"
    static let engagementType = "fldYvZ8T1Iy7r91z5"   // multipleSelects
    static let qualificationsSent = "flda4mTsRoIiFqVZL"
    static let company = "fldYyFlO4LavZM5gI"
    static let associatedContact = "fldit4f09UfFrzSUB"
    static let tasks = "fldBGsrhhPk7egFL1"
    static let interactions = "fldyL4Obl1EfVvpVU"
    static let project = "fldrOFbZgxZ6izAla"
    static let proposals = "fldQNa9p8jAEnrZB2"
    static let probabilityValue = "flda4MrS0FecCa4TO"  // formula — READ-ONLY
    static let attachments = "fldVld8A8bfeyPnJG"       // attachments — read-only for push
}

extension Opportunity: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.opportunities

    static func from(record: AirtableRecord, context: ModelContext) -> Opportunity {
        let f = record.fields
        let model = Opportunity(id: record.id)
        model.opportunityName = f.string(for: F.opportunityName)
        model.referredBy = f.string(for: F.referredBy)
        model.notesAbout = f.string(for: F.notesAbout)
        model.contractMilestones = f.string(for: F.contractMilestones)
        model.lossNotes = f.string(for: F.lossNotes)
        model.dealValue = f.double(for: F.dealValue)
        model.expectedCloseDate = f.date(for: F.expectedCloseDate)
        model.nextMeetingDate = f.date(for: F.nextMeetingDate)
        model.salesStage = f.string(for: F.salesStage)
        model.probability = f.string(for: F.probability)        // stored with prefix
        model.qualsType = f.string(for: F.qualsType)
        model.leadSource = f.string(for: F.leadSource)
        model.winLossReason = f.string(for: F.winLossReason)
        model.engagementType = f.stringArray(for: F.engagementType)
        model.qualificationsSent = f.bool(for: F.qualificationsSent)
        model.companyIds = f.stringArray(for: F.company)
        model.associatedContactIds = f.stringArray(for: F.associatedContact)
        model.tasksIds = f.stringArray(for: F.tasks)
        model.interactionsIds = f.stringArray(for: F.interactions)
        model.projectIds = f.stringArray(for: F.project)
        model.proposalsIds = f.stringArray(for: F.proposals)
        model.probabilityValue = f.double(for: F.probabilityValue)  // read-only but stored
        return model
    }

    static func updateFields(of existing: Opportunity, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.opportunityName = f.string(for: F.opportunityName)
        existing.referredBy = f.string(for: F.referredBy)
        existing.notesAbout = f.string(for: F.notesAbout)
        existing.contractMilestones = f.string(for: F.contractMilestones)
        existing.lossNotes = f.string(for: F.lossNotes)
        existing.dealValue = f.double(for: F.dealValue)
        existing.expectedCloseDate = f.date(for: F.expectedCloseDate)
        existing.nextMeetingDate = f.date(for: F.nextMeetingDate)
        existing.salesStage = f.string(for: F.salesStage)
        existing.probability = f.string(for: F.probability)        // stored with prefix
        existing.qualsType = f.string(for: F.qualsType)
        existing.leadSource = f.string(for: F.leadSource)
        existing.winLossReason = f.string(for: F.winLossReason)
        existing.engagementType = f.stringArray(for: F.engagementType)
        existing.qualificationsSent = f.bool(for: F.qualificationsSent)
        existing.companyIds = f.stringArray(for: F.company)
        existing.associatedContactIds = f.stringArray(for: F.associatedContact)
        existing.tasksIds = f.stringArray(for: F.tasks)
        existing.interactionsIds = f.stringArray(for: F.interactions)
        existing.projectIds = f.stringArray(for: F.project)
        existing.proposalsIds = f.stringArray(for: F.proposals)
        existing.probabilityValue = f.double(for: F.probabilityValue)  // read-only but stored
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.opportunityName, opportunityName)
        b.set(F.referredBy, referredBy)
        b.set(F.notesAbout, notesAbout)
        b.set(F.contractMilestones, contractMilestones)
        b.set(F.lossNotes, lossNotes)
        b.set(F.dealValue, dealValue)
        b.setDate(F.expectedCloseDate, expectedCloseDate)
        b.setDate(F.nextMeetingDate, nextMeetingDate)
        b.set(F.salesStage, salesStage)
        b.set(F.probability, probability)
        b.set(F.qualsType, qualsType)
        b.set(F.leadSource, leadSource)
        b.set(F.winLossReason, winLossReason)
        b.setMultiSelect(F.engagementType, engagementType)
        b.setBool(F.qualificationsSent, qualificationsSent)
        b.setLinkedIds(F.company, companyIds)
        b.setLinkedIds(F.associatedContact, associatedContactIds)
        b.setLinkedIds(F.tasks, tasksIds)
        b.setLinkedIds(F.interactions, interactionsIds)
        b.setLinkedIds(F.project, projectIds)
        b.setLinkedIds(F.proposals, proposalsIds)
        // probabilityValue (formula) excluded — read-only
        // attachments excluded
        return b.fields
    }
}
