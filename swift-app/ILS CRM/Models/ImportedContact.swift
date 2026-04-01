import Foundation
import SwiftData

/// ImportedContact model — mirrors schema/ImportedContacts.json (48 Airtable fields)
/// Airtable table: tblribgEf5RENNDQW
///
/// Staging area for bulk imports. Contacts are reviewed here then approved/rejected.
/// Sync mode: read + approve/reject (not general CRUD push).
@Model
final class ImportedContact {
    @Attribute(.unique) var id: String

    // Contact fields
    var importedContactName: String?  // fldKc8P6eYXjMpAJ6 (primary)
    var company: String?              // fld31Zl7X7DBZdL9K
    var firstName: String?            // fld7c1acCh17aOi0p
    var lastName: String?             // fldICvkgNbRG9dpqm
    var jobTitle: String?             // fldTHA6J24XaECMsz
    var email: String?                // fld9ejqJy5wjBqvrx
    var eventTags: String?            // fldwI75ClzRJ7lli0
    var addressLine: String?          // fld1Zpkm1Kms9XvRv
    var city: String?                 // fldfS2EeVb5l3ic5h
    var state: String?                // fldIoe4TldH0WJUZj
    var country: String?              // fldljgJjsqMkpMbkc
    var postalCode: String?           // fldIsJaEWbMOb2juI

    // Company fields (embedded, not linked)
    var companyFoundingYear: String?      // fldCgacbjwFoRlHIp
    var companyNaicsCode: String?         // fldehmtkMRlb4M5Zi
    var companyType: String?              // fldiB3195PfAK7Wfg
    var companySize: String?              // fldsJURWi2VvrvN2v
    var companyIndustry: String?          // fldiFajpEd7M14YBF
    var companyAnnualRevenue: String?     // fldLJr6gTu9zTeo0r
    var companyStreetAddress: String?     // fldwAf4k6bsI922O4
    var companyStreetAddress2: String?    // fldXhL0dxuxXxDnti
    var companyCity: String?              // fld4tMsuM8QhnhuZm
    var companyState: String?             // fldv9qnkGC3pnZQnv
    var companyCountry: String?           // fld4YLilZ2HdhmCse
    var companyPostalCode: String?        // fldamMPu4kkZGugZn
    var companyDescription: String?       // fldc5Aj4hRRZ4tIgE

    // Notes
    var note: String?                 // fldMsJukGZt02TYVu
    var reasonForRejection: String?   // fld1A8rCPjuXYSGp1
    var reviewNotes: String?          // fldKYaclj13Bmut7D

    // Phone numbers
    var phone: String?                // fldZfFoFsOrIW2wQZ
    var mobilePhone: String?          // fldm8LaalVz7l38PS
    var otherPhone: String?           // fld9wvepdWiVG4i70
    var workPhone: String?            // fld8MuOecNSVON5rD
    var officePhone: String?          // fldUkm871jdjXQloI
    var fax: String?                  // fldBl4gTpGGFVEJOB

    // URLs
    var linkedInUrl: String?          // fldzikDES0UdCd4FQ
    var website: String?              // fld57XgOQ9sFJOfof
    var contactPhotoUrl: String?      // fldNdNyWMAGEOfOyH
    var businessCardImageUrl: String? // flduCN8BdOUkZeTTJ

    // Date
    var importDate: Date?             // fldNa8uThfClQFB79

    // Single Selects
    var categorization: String?       // fldrYKTLd2HnL7GSe
    var onboardingStatus: String?     // fldncdRP37p6BB9UX (Approved/Rejected via actions)
    var importSource: String?         // fld1fDiNE3vhoyi3P

    // Multi-select
    var tags: [String]                // fldn2bUb5Khf7iumL

    // Checkbox
    var syncToContacts: Bool          // fldjm5mEIT25nlWjT

    // Linked Record IDs
    var specialtiesIds: [String]         // fldlkF1wlCbxBQ3KJ → Specialties
    var relatedCrmContactIds: [String]   // fldDq3cetx5nrVqGo → Contacts

    // Email Intelligence fields
    var source: String?                  // fldvGMPt6P73gAVcX
    var relationshipType: String?        // fldzYctwWVqOAOjOa
    var confidenceScore: Double?         // fldzB1hYo8JFK7KXL
    var aiReasoning: String?             // flda0hjnGygmCl6L3
    var emailThreadCount: Int?           // fldhWoDXNTqOsXZ22
    var firstSeenDate: Date?             // fldA7MZYLyWEJNGVx
    var lastSeenDate: Date?              // fldS0wOkNWu8SQnSO
    var discoveredVia: String?           // fldCUcYTkPATWE97N
    var suggestedCompanyName: String?    // fldSCvoQayABYZqL5
    var suggestedCompanyLink: [String]   // fldLGvhdrydRxH5EU → Companies (linked record IDs)

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, importedContactName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.importedContactName = importedContactName
        self.tags = []
        self.syncToContacts = false
        self.specialtiesIds = []
        self.relatedCrmContactIds = []
        self.suggestedCompanyLink = []
        self.isPendingPush = isPendingPush
    }
}
