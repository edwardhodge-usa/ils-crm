import Foundation
import SwiftData

/// EmailScanRule model — mirrors Airtable Email Scan Rules table
/// Airtable table: tblU4KmCS24s36r1L
///
/// Defines rules for which emails to scan (sender domains, keywords, etc.)
/// and what action to take (enrich, flag, ignore). Read-only from Swift app.
@Model
final class EmailScanRule {
    @Attribute(.unique) var id: String

    var ruleName: String?          // fldwaine7l24qIemY (primary)
    var ruleType: String?          // fldhAEzf3IpTkpebu (single select)
    var ruleValue: String?         // fldJJpQphiPXUIwhR
    var action: String?            // fldCvZPjvVNBEOp0M (single select)
    var isActive: Bool             // fldlsq8iueIWhMOXd (checkbox)

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, ruleName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.ruleName = ruleName
        self.isActive = false
        self.isPendingPush = isPendingPush
    }
}
