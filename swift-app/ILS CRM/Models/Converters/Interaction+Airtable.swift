import Foundation
import SwiftData

private enum F {
    static let subject = "fldMog5p49xWLD5Zb"
    static let summary = "fldqqHNLs8mXW2RRA"
    static let nextSteps = "fldyh8QUnhF3hUsBV"
    static let date = "fldOTeAY7Y0JDnaMF"
    static let type = "fldsdGx3u8RPS8GrH"
    static let direction = "fld9d6pw2GM3Syhag"
    static let contacts = "fldNz08up6Zcn3HjK"
    static let salesOpportunities = "fldgRf0WkgdcMLseJ"
    static let loggedBy = "fldn0mHhKfd88K6z8" // collaborator — read-only for push
}

extension Interaction: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.interactions

    static func from(record: AirtableRecord, context: ModelContext) -> Interaction {
        let f = record.fields
        let model = Interaction(id: record.id)
        model.subject = f.string(for: F.subject)
        model.summary = f.string(for: F.summary)
        model.nextSteps = f.string(for: F.nextSteps)
        model.date = f.date(for: F.date)
        model.type = f.string(for: F.type)
        model.direction = f.string(for: F.direction)
        model.contactsIds = f.stringArray(for: F.contacts)
        model.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        return model
    }

    static func updateFields(of existing: Interaction, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.subject = f.string(for: F.subject)
        existing.summary = f.string(for: F.summary)
        existing.nextSteps = f.string(for: F.nextSteps)
        existing.date = f.date(for: F.date)
        existing.type = f.string(for: F.type)
        existing.direction = f.string(for: F.direction)
        existing.contactsIds = f.stringArray(for: F.contacts)
        existing.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.subject, subject)
        b.set(F.summary, summary)
        b.set(F.nextSteps, nextSteps)
        b.setDate(F.date, date)
        b.set(F.type, type)
        b.set(F.direction, direction)
        b.setLinkedIds(F.contacts, contactsIds)
        b.setLinkedIds(F.salesOpportunities, salesOpportunitiesIds)
        // loggedBy (collaborator) excluded — set by Airtable
        return b.fields
    }
}
