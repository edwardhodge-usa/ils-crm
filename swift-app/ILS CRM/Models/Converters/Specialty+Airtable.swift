import Foundation
import SwiftData

// Airtable field IDs from schema/Specialties.json
private enum F {
    static let specialty = "fldLVp1uePoKCuJlM"
    static let importedContacts = "fldPQWyanCOcXVxmL"
    static let contacts = "fldVtUb9RqF03Ubq7"
}

extension Specialty: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.specialties

    static func from(record: AirtableRecord, context: ModelContext) -> Specialty {
        let f = record.fields
        let model = Specialty(id: record.id)
        model.specialty = f.string(for: F.specialty)
        model.importedContactsIds = f.stringArray(for: F.importedContacts)
        model.contactsIds = f.stringArray(for: F.contacts)
        return model
    }

    static func updateFields(of existing: Specialty, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.specialty = f.string(for: F.specialty)
        existing.importedContactsIds = f.stringArray(for: F.importedContacts)
        existing.contactsIds = f.stringArray(for: F.contacts)
        existing.isPendingPush = false
    }

    /// Specialties is READ-ONLY — never push. Returns empty dict.
    func toAirtableFields() -> [String: Any] {
        [:]  // Read-only table — no push
    }
}
