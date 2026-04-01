import Foundation
import SwiftData

/// EnrichmentQueueItem model — mirrors Airtable Enrichment Queue table
/// Airtable table: tbliKcirq0FuQloJH
///
/// Holds field-level suggestions extracted from email scans, pending human review.
/// Each row is a single suggested field update for an imported contact.
@Model
final class EnrichmentQueueItem {
    @Attribute(.unique) var id: String

    var fieldName: String?             // fldoUsfLV43KF0n0U (primary)
    var currentValue: String?          // fld5p9Wdv3mIPbKGT
    var suggestedValue: String?        // fldMpA7t7WhXTIUIK
    var sourceEmailDate: Date?         // fldZ7zeBrsRndA1SY
    var status: String?                // fldybd6l0RMMV70qR (single select)
    var confidenceScore: Double?       // fldApRf3M38HZdf8D
    var contactIds: [String]           // fldw3AfIZ6WUbMnw0 → Imported Contacts (linked record IDs)

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, fieldName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.fieldName = fieldName
        self.contactIds = []
        self.isPendingPush = isPendingPush
    }
}
