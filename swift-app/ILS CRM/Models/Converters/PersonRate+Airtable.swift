import Foundation
import SwiftData

// Airtable field IDs for PersonRates (tblx4FLX4QBwocggm)
private enum F {
    static let label = "fld5a05LBh8RnFmKt"
    static let agreedHourly = "fld00Y55wWAKn1ipD"
    static let agreedDayRate = "fldrCMFxEhMvGyw6i"
    static let agreedRemoteDayRate = "fldbvT9QwSvzuDbQR"
    static let agreedRetainerHourly = "fldYN6jFDMNv72gGX"
    static let agreedRetainerDay = "fldAZhxX0lGTqKIEp"
    static let agreedWeekly = "fldtnlrZSDmFY7orx"
    static let agreedAnnualSalary = "fldiLrW8TxSZq3nrZ"
    static let effectiveDate = "fldKrHU5YRZhPGQKE"
    static let expiryDate = "fldNGXvJcXhMR2MSM"
    static let status = "fldtR5hAIYTO6kx5I"
    static let contractReference = "fldwpSljCyzcRsUPo"
    static let notes = "fld7XMDeERJ6PV5QK"
    static let contact = "fldTZJIHLOq8eKvbn"
    static let role = "fldex5lq6sayq6h86"
}

extension PersonRate: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.personRates

    static func from(record: AirtableRecord, context: ModelContext) -> PersonRate {
        let f = record.fields
        let model = PersonRate(id: record.id)
        model.label = f.string(for: F.label)
        model.agreedHourly = f.double(for: F.agreedHourly)
        model.agreedDayRate = f.double(for: F.agreedDayRate)
        model.agreedRemoteDayRate = f.double(for: F.agreedRemoteDayRate)
        model.agreedRetainerHourly = f.double(for: F.agreedRetainerHourly)
        model.agreedRetainerDay = f.double(for: F.agreedRetainerDay)
        model.agreedWeekly = f.double(for: F.agreedWeekly)
        model.agreedAnnualSalary = f.double(for: F.agreedAnnualSalary)
        model.effectiveDate = f.string(for: F.effectiveDate)
        model.expiryDate = f.string(for: F.expiryDate)
        model.status = f.string(for: F.status)
        model.contractReference = f.string(for: F.contractReference)
        model.notes = f.string(for: F.notes)
        model.contactIds = f.stringArray(for: F.contact)
        model.roleIds = f.stringArray(for: F.role)
        return model
    }

    static func updateFields(of existing: PersonRate, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.label = f.string(for: F.label)
        existing.agreedHourly = f.double(for: F.agreedHourly)
        existing.agreedDayRate = f.double(for: F.agreedDayRate)
        existing.agreedRemoteDayRate = f.double(for: F.agreedRemoteDayRate)
        existing.agreedRetainerHourly = f.double(for: F.agreedRetainerHourly)
        existing.agreedRetainerDay = f.double(for: F.agreedRetainerDay)
        existing.agreedWeekly = f.double(for: F.agreedWeekly)
        existing.agreedAnnualSalary = f.double(for: F.agreedAnnualSalary)
        existing.effectiveDate = f.string(for: F.effectiveDate)
        existing.expiryDate = f.string(for: F.expiryDate)
        existing.status = f.string(for: F.status)
        existing.contractReference = f.string(for: F.contractReference)
        existing.notes = f.string(for: F.notes)
        existing.contactIds = f.stringArray(for: F.contact)
        existing.roleIds = f.stringArray(for: F.role)
        existing.isPendingPush = false
    }

    /// Converts writable fields to Airtable API format.
    /// Only includes non-nil/non-empty fields; uses NSNull for intentionally cleared fields.
    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.label, label)
        b.set(F.agreedHourly, agreedHourly)
        b.set(F.agreedDayRate, agreedDayRate)
        b.set(F.agreedRemoteDayRate, agreedRemoteDayRate)
        b.set(F.agreedRetainerHourly, agreedRetainerHourly)
        b.set(F.agreedRetainerDay, agreedRetainerDay)
        b.set(F.agreedWeekly, agreedWeekly)
        b.set(F.agreedAnnualSalary, agreedAnnualSalary)
        b.set(F.effectiveDate, effectiveDate)
        b.set(F.expiryDate, expiryDate)
        b.set(F.status, status)
        b.set(F.contractReference, contractReference)
        b.set(F.notes, notes)
        b.setLinkedIds(F.contact, contactIds)
        b.setLinkedIds(F.role, roleIds)
        return b.fields
    }
}
