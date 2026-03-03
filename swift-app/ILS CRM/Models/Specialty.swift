import Foundation
import SwiftData

/// Specialty model — mirrors schema/Specialties.json (3 Airtable fields)
/// Airtable table: tblysTixdxGQQntHO
///
/// Lookup table — 70 canonical entries. READ-ONLY (no push to Airtable).
/// isPendingPush included for schema consistency but never set true.
///
/// Lesson from Electron: Migrated from multi-select to linked records because
/// multi-select fields allow duplicates; lookup tables don't.
@Model
final class Specialty {
    @Attribute(.unique) var id: String

    var specialty: String?          // fldLVp1uePoKCuJlM (primary)
    var importedContactsIds: [String]  // fldPQWyanCOcXVxmL → ImportedContacts
    var contactsIds: [String]          // fldVtUb9RqF03Ubq7 → Contacts

    // Sync Metadata
    var isPendingPush: Bool = false
    var airtableModifiedAt: Date?

    init(id: String, specialty: String? = nil) {
        self.id = id
        self.specialty = specialty
        self.importedContactsIds = []
        self.contactsIds = []
    }
}
