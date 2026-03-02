import Foundation
import SwiftData

/// Interaction model — mirrors schema/Interactions.json (9 Airtable fields)
/// Airtable table: tblTUNClZpfFjhFVm
///
/// Communication log — emails, calls, meetings.
/// NOTE from Electron: When this table was promoted from read-only to full CRUD,
/// it was accidentally left in READ_ONLY_TABLES, silently orphaning locally-created
/// records. Ensure this is NOT in readOnlyTables.
@Model
final class Interaction {
    @Attribute(.unique) var id: String

    var subject: String?       // fldMog5p49xWLD5Zb (primary)
    var summary: String?       // fldqqHNLs8mXW2RRA
    var nextSteps: String?     // fldyh8QUnhF3hUsBV
    var date: Date?            // fldOTeAY7Y0JDnaMF

    // Single Selects
    var type: String?          // fldsdGx3u8RPS8GrH
    var direction: String?     // fld9d6pw2GM3Syhag

    // Linked Record IDs
    var contactsIds: [String]            // fldNz08up6Zcn3HjK → Contacts
    var salesOpportunitiesIds: [String]  // fldgRf0WkgdcMLseJ → Opportunities

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, subject: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.subject = subject
        self.contactsIds = []
        self.salesOpportunitiesIds = []
        self.isPendingPush = isPendingPush
    }
}
