import Foundation
import SwiftData

/// EmailScanState model — mirrors Airtable Email Scan State table
/// Airtable table: tblLxTKPq10pyu4Tc
///
/// Tracks the Gmail scan cursor (history ID) and processing status per user email.
/// Read-only from Swift app — state is managed by the scan automation.
@Model
final class EmailScanState {
    @Attribute(.unique) var id: String

    var userEmail: String?         // fldIwjUn6mD8MTCyg (primary)
    var gmailHistoryId: String?    // fld4omaKICcnHqqon
    var lastScanDate: Date?        // fldCuCDhj1gL0iZ7s
    var scanStatus: String?        // fldIpRB4NQXRcv7TP (single select)
    var totalProcessed: Int?       // fldljrn2FA8yLrrzb

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, userEmail: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.userEmail = userEmail
        self.isPendingPush = isPendingPush
    }
}
