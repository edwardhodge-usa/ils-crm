import Foundation
import SwiftData

private enum F {
    static let userEmail = "fldIwjUn6mD8MTCyg"
    static let gmailHistoryId = "fld4omaKICcnHqqon"
    static let lastScanDate = "fldCuCDhj1gL0iZ7s"
    static let scanStatus = "fldIpRB4NQXRcv7TP"
    static let totalProcessed = "fldljrn2FA8yLrrzb"
}

extension EmailScanState: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.emailScanState

    static func from(record: AirtableRecord, context: ModelContext) -> EmailScanState {
        let f = record.fields
        let model = EmailScanState(id: record.id)
        model.userEmail = f.string(for: F.userEmail)
        model.gmailHistoryId = f.string(for: F.gmailHistoryId)
        model.lastScanDate = f.date(for: F.lastScanDate)
        model.scanStatus = f.string(for: F.scanStatus)
        model.totalProcessed = f.int(for: F.totalProcessed)
        return model
    }

    static func updateFields(of existing: EmailScanState, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.userEmail = f.string(for: F.userEmail)
        existing.gmailHistoryId = f.string(for: F.gmailHistoryId)
        existing.lastScanDate = f.date(for: F.lastScanDate)
        existing.scanStatus = f.string(for: F.scanStatus)
        existing.totalProcessed = f.int(for: F.totalProcessed)
        existing.isPendingPush = false
    }

    /// Read-only table — return empty dict.
    func toAirtableFields() -> [String: Any] {
        [:]
    }
}
