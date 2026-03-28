import Foundation
import SwiftData

private enum F {
    static let autoId = "fldZ9kEv2VoSs6Zhm"       // autoNumber — read-only
    static let clientEmail = "fldbRGSVQ234FhLl5"
    static let clientName = "fld09uABu5pMflwqw"
    static let company = "fldHKPjjjj5qJ4jKj"
    static let ipAddress = "fldD4kj0jIVeJ7Xjn"
    static let city = "fldvJWb179RimoEVP"
    static let region = "fldW4wHM9wNIap0Vf"
    static let country = "fld2gGOgdCs4OZORY"
    static let userAgent = "fldKPYPCJ8a77TiSZ"
    static let claritySession = "fldlawC5fpW6SC7YJ"
    static let pageUrl = "fldA8GMWwQMthnnta"
    static let timestamp = "fldtntKgWXKanYEWZ"
}

extension PortalLog: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.portalLogs

    static func from(record: AirtableRecord, context: ModelContext) -> PortalLog {
        let f = record.fields
        let model = PortalLog(id: record.id)
        model.autoId = f.int(for: F.autoId)
        model.clientEmail = f.string(for: F.clientEmail)
        model.clientName = f.string(for: F.clientName)
        model.company = f.string(for: F.company)
        model.ipAddress = f.string(for: F.ipAddress)
        model.city = f.string(for: F.city)
        model.region = f.string(for: F.region)
        model.country = f.string(for: F.country)
        model.userAgent = f.string(for: F.userAgent)
        model.claritySession = f.string(for: F.claritySession)
        model.pageUrl = f.string(for: F.pageUrl)
        model.timestamp = f.date(for: F.timestamp)
        return model
    }

    static func updateFields(of existing: PortalLog, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.autoId = f.int(for: F.autoId)
        existing.clientEmail = f.string(for: F.clientEmail)
        existing.clientName = f.string(for: F.clientName)
        existing.company = f.string(for: F.company)
        existing.ipAddress = f.string(for: F.ipAddress)
        existing.city = f.string(for: F.city)
        existing.region = f.string(for: F.region)
        existing.country = f.string(for: F.country)
        existing.userAgent = f.string(for: F.userAgent)
        existing.claritySession = f.string(for: F.claritySession)
        existing.pageUrl = f.string(for: F.pageUrl)
        existing.timestamp = f.date(for: F.timestamp)
        existing.isPendingPush = false
    }

    /// Portal Logs is READ-ONLY — never push.
    func toAirtableFields() -> [String: Any] {
        [:]  // Read-only table — no push
    }
}
