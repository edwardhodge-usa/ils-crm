import Foundation
import SwiftData

private enum F {
    static let ruleName = "fldwaine7l24qIemY"
    static let ruleType = "fldhAEzf3IpTkpebu"
    static let ruleValue = "fldJJpQphiPXUIwhR"
    static let action = "fldCvZPjvVNBEOp0M"
    static let isActive = "fldlsq8iueIWhMOXd"
}

extension EmailScanRule: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.emailScanRules

    static func from(record: AirtableRecord, context: ModelContext) -> EmailScanRule {
        let f = record.fields
        let model = EmailScanRule(id: record.id)
        model.ruleName = f.string(for: F.ruleName)
        model.ruleType = f.string(for: F.ruleType)
        model.ruleValue = f.string(for: F.ruleValue)
        model.action = f.string(for: F.action)
        model.isActive = f.bool(for: F.isActive)
        return model
    }

    static func updateFields(of existing: EmailScanRule, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.ruleName = f.string(for: F.ruleName)
        existing.ruleType = f.string(for: F.ruleType)
        existing.ruleValue = f.string(for: F.ruleValue)
        existing.action = f.string(for: F.action)
        existing.isActive = f.bool(for: F.isActive)
        existing.isPendingPush = false
    }

    /// Read-only table — return empty dict.
    func toAirtableFields() -> [String: Any] {
        [:]
    }
}
