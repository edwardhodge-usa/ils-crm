import Foundation
import SwiftData

/// PortalLog model — mirrors schema/PortalLogs.json (12 Airtable fields)
/// Airtable table: tblj70XPHI7wnUmxO
///
/// READ-ONLY. Written by imaginelab-portal (Next.js), consumed here.
/// isPendingPush included for schema consistency but never set true.
@Model
final class PortalLog {
    @Attribute(.unique) var id: String

    var autoId: Int?              // fldZ9kEv2VoSs6Zhm (auto-number, primary)
    var clientEmail: String?      // fldbRGSVQ234FhLl5
    var clientName: String?       // fld09uABu5pMflwqw
    var company: String?          // fldHKPjjjj5qJ4jKj
    var ipAddress: String?        // fldD4kj0jIVeJ7Xjn
    var city: String?             // fldvJWb179RimoEVP
    var region: String?           // fldW4wHM9wNIap0Vf
    var country: String?          // fld2gGOgdCs4OZORY
    var userAgent: String?        // fldKPYPCJ8a77TiSZ
    var claritySession: String?   // fldlawC5fpW6SC7YJ
    var pageUrl: String?          // fldA8GMWwQMthnnta
    var timestamp: Date?          // fldtntKgWXKanYEWZ

    // Sync Metadata
    var isPendingPush: Bool = false
    var airtableModifiedAt: Date?

    init(id: String) {
        self.id = id
    }
}
