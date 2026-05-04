import Foundation
import SwiftData

/// RateCard model — mirrors schema/RateCard (Airtable tblayIzbtJobsKvNe)
///
/// Canonical rate table — defines standard, retainer, remote, and weekly rates
/// per role. READ-ONLY from Swift; managed exclusively in Airtable.
/// isPendingPush included for schema consistency but never set true.
@Model
final class RateCard {
    @Attribute(.unique) var id: String

    var role: String?                // fld0uPj94enOSXPGY (primary)
    var standardHourly: Double?      // fldUxknmv6AjeCT8Z
    var standardDay: Double?         // flduKbbtO4P0gmuYm
    var retainerHourly: Double?      // fldGIBlOMzq7br1hx
    var retainerDay: Double?         // fldZZOf9RBfWjLdjV
    var remoteDayRate: Double?       // fld91PHPDmrK5trxh
    var weeklyRate: Double?          // fldCX0DhJDQh9w4ez
    var dayRateHours: Double?        // fldkItVfiAuFr3nM9
    var active: Bool                 // fldVbepnZgSZWsGmF
    var sortOrder: Double?           // fldUeC4YTfs2WRUUR
    var notes: String?               // fldGsHbfMb6xbdmXx
    var personRateIds: [String]      // fldTLQxOn60iV9mPz → PersonRates

    // Sync Metadata
    var isPendingPush: Bool = false
    var airtableModifiedAt: Date?

    init(id: String, role: String? = nil) {
        self.id = id
        self.role = role
        self.active = false
        self.personRateIds = []
    }
}
