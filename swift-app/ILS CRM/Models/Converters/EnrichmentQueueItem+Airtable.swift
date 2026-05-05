import Foundation
import SwiftData

private enum F {
    static let fieldName = "fldoUsfLV43KF0n0U"
    static let currentValue = "fld5p9Wdv3mIPbKGT"
    static let suggestedValue = "fldMpA7t7WhXTIUIK"
    static let sourceEmailDate = "fldZ7zeBrsRndA1SY"
    static let status = "fldybd6l0RMMV70qR"
    static let confidenceScore = "fldApRf3M38HZdf8D"
    static let contact = "fldw3AfIZ6WUbMnw0"
    static let sourceEmailSubject = "fldB9YiGiXV24wazb"
    static let sourceEmailFrom = "fldQ6NmkWYkHubaKh"
    static let sourceEmailSnippet = "fldCBoaFjVHCBaXRp"
    static let discoveredBy = "fldtEMkqcUGs6GlKX"
}


extension EnrichmentQueueItem: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.enrichmentQueue

    static func from(record: AirtableRecord, context: ModelContext) -> EnrichmentQueueItem {
        let f = record.fields
        let model = EnrichmentQueueItem(id: record.id)
        model.fieldName = f.string(for: F.fieldName)
        model.currentValue = f.string(for: F.currentValue)
        model.suggestedValue = f.string(for: F.suggestedValue)
        model.sourceEmailDate = f.date(for: F.sourceEmailDate)
        model.status = f.string(for: F.status)
        model.confidenceScore = f.double(for: F.confidenceScore)
        model.contactIds = f.stringArray(for: F.contact)
        model.sourceEmailSubject = f.string(for: F.sourceEmailSubject)
        model.sourceEmailFrom = f.string(for: F.sourceEmailFrom)
        model.sourceEmailSnippet = f.string(for: F.sourceEmailSnippet)
        model.discoveredBy = f.collaboratorName(for: F.discoveredBy)
        return model
    }

    static func updateFields(of existing: EnrichmentQueueItem, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.fieldName = f.string(for: F.fieldName)
        existing.currentValue = f.string(for: F.currentValue)
        existing.suggestedValue = f.string(for: F.suggestedValue)
        existing.sourceEmailDate = f.date(for: F.sourceEmailDate)
        existing.status = f.string(for: F.status)
        existing.confidenceScore = f.double(for: F.confidenceScore)
        existing.contactIds = f.stringArray(for: F.contact)
        existing.sourceEmailSubject = f.string(for: F.sourceEmailSubject)
        existing.sourceEmailFrom = f.string(for: F.sourceEmailFrom)
        existing.sourceEmailSnippet = f.string(for: F.sourceEmailSnippet)
        existing.discoveredBy = f.collaboratorName(for: F.discoveredBy)
        existing.isPendingPush = false
    }

    /// Enrichment Queue supports approve/reject workflow — push status changes.
    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.status, status)
        return b.fields
    }
}
