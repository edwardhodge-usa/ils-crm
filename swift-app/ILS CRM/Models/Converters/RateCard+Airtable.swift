import Foundation
import SwiftData

// Airtable field IDs for RateCard (tblayIzbtJobsKvNe)
private enum F {
    static let role = "fld0uPj94enOSXPGY"
    static let standardHourly = "fldUxknmv6AjeCT8Z"
    static let standardDay = "flduKbbtO4P0gmuYm"
    static let retainerHourly = "fldGIBlOMzq7br1hx"
    static let retainerDay = "fldZZOf9RBfWjLdjV"
    static let remoteDayRate = "fld91PHPDmrK5trxh"
    static let weeklyRate = "fldCX0DhJDQh9w4ez"
    static let dayRateHours = "fldkItVfiAuFr3nM9"
    static let active = "fldVbepnZgSZWsGmF"
    static let sortOrder = "fldUeC4YTfs2WRUUR"
    static let notes = "fldGsHbfMb6xbdmXx"
    static let personRates = "fldTLQxOn60iV9mPz"
}

extension RateCard: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.rateCard

    static func from(record: AirtableRecord, context: ModelContext) -> RateCard {
        let f = record.fields
        let model = RateCard(id: record.id)
        model.role = f.string(for: F.role)
        model.standardHourly = f.double(for: F.standardHourly)
        model.standardDay = f.double(for: F.standardDay)
        model.retainerHourly = f.double(for: F.retainerHourly)
        model.retainerDay = f.double(for: F.retainerDay)
        model.remoteDayRate = f.double(for: F.remoteDayRate)
        model.weeklyRate = f.double(for: F.weeklyRate)
        model.dayRateHours = f.double(for: F.dayRateHours)
        model.active = f.bool(for: F.active)
        model.sortOrder = f.double(for: F.sortOrder)
        model.notes = f.string(for: F.notes)
        model.personRateIds = f.stringArray(for: F.personRates)
        return model
    }

    static func updateFields(of existing: RateCard, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.role = f.string(for: F.role)
        existing.standardHourly = f.double(for: F.standardHourly)
        existing.standardDay = f.double(for: F.standardDay)
        existing.retainerHourly = f.double(for: F.retainerHourly)
        existing.retainerDay = f.double(for: F.retainerDay)
        existing.remoteDayRate = f.double(for: F.remoteDayRate)
        existing.weeklyRate = f.double(for: F.weeklyRate)
        existing.dayRateHours = f.double(for: F.dayRateHours)
        existing.active = f.bool(for: F.active)
        existing.sortOrder = f.double(for: F.sortOrder)
        existing.notes = f.string(for: F.notes)
        existing.personRateIds = f.stringArray(for: F.personRates)
        existing.isPendingPush = false
    }

    /// RateCard is READ-ONLY — never push. Returns empty dict.
    func toAirtableFields() -> [String: Any] {
        [:]
    }
}
