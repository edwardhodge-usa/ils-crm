import Foundation
import SwiftData

/// Company model — mirrors schema/Companies.json (24 Airtable fields)
/// Airtable table: tblEauAm0ZYuMbHUa
@Model
final class Company {
    @Attribute(.unique) var id: String

    var companyName: String?      // fldVYiMOLq3LJgbZ3 (primary)
    var address: String?          // fldyd3pnfJ5PCwwQD
    var city: String?             // fldJGkGiCoxduD4sg
    var stateRegion: String?      // fldNekCaGCR56MLcJ
    var country: String?          // fldjvoxUo8iuKITjB
    var referredBy: String?       // fldLLGU72wwf7LxEf
    var naicsCode: String?        // fldL93N86XiMu5sUn
    var postalCode: String?       // fldqa7L8FPSeSQ9xG
    var notes: String?            // flddUZDFk4l9f377V
    var companyDescription: String? // fldIDywGKU18pEndd
    var website: String?          // fldVBnFiEeyDf9oCg
    var linkedInUrl: String?      // fldVt6tIj1DrT85cd
    var foundingYear: Int?        // fldZaxAXqeImQcuzW
    var createdDate: Date?        // fldxQpzFGadejLLVp

    // Single Selects
    var companyType: String?      // fldSgiy8i2QUTmZbX
    var companySize: String?      // fld0FFqLVasuvG9Uf
    var annualRevenue: String?    // fldMaVs106qf6Gmqp
    var type: String?             // fldtLJxxK5oT6Nzjn
    var industry: String?         // fldPz4rknFpmEXZAD
    var leadSource: String?       // fldSPGKJKbHclLzoD

    // Attachment URLs (read-only)
    var logoUrl: String?              // fldhCu5ooToK84g4G

    // Linked Record IDs
    var salesOpportunitiesIds: [String]  // fldbvXQ26UDd3SHAB → Opportunities
    var projectsIds: [String]            // fldtgQEptCxvaaAzk → Projects
    var contactsIds: [String]            // fldQ2RK3PeAPMzkJB → Contacts
    var proposalsIds: [String]           // fld8pQnDzVmyonJ45 → Proposals

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, companyName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.companyName = companyName
        self.salesOpportunitiesIds = []
        self.projectsIds = []
        self.contactsIds = []
        self.proposalsIds = []
        self.isPendingPush = isPendingPush
    }
}
