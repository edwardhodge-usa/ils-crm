import Foundation
import SwiftData

/// Contact model — mirrors schema/Contacts.json (57 Airtable fields)
/// Airtable table: tbl9Q8m06ivkTYyvR
///
/// Key relationships:
/// - Contact ↔ Company (many-to-many via companiesIds)
/// - Contact → Opportunities, Projects, Proposals, Tasks, Interactions
/// - Contact ↔ Specialties (linked records, NOT multi-select)
@Model
final class Contact {
    // MARK: - Identity
    @Attribute(.unique) var id: String  // Airtable record ID

    // MARK: - Text Fields
    var contactName: String?          // fldMkz6x5i8YaofZj (primary)
    var firstName: String?            // fldBzVPUdMy99vfvp
    var lastName: String?             // fldq4VxEf0jJgi6O5
    var jobTitle: String?             // fldvecarEW7fx90Ci
    var importedContactName: String?  // fldnukky57mRgMpxv
    var addressLine: String?          // fldxn8YVJ1pWGkaF8
    var city: String?                 // fldAoanFJ1Fmrzkx5
    var state: String?                // fld1qq6PMLW6Ytbig
    var country: String?              // fldnTdpTO4njtc4gZ
    var postalCode: String?           // fldGgFJJ7XeLAR17a

    // MARK: - Multi-line Text
    var notes: String?                // fldfbmMsacAKerGek
    var reviewNotes: String?          // fldB5b9qTiIUkdiLk
    var reasonForRejection: String?   // fldDwXhduziJxKyCx
    var rateInfo: String?             // fldFX8WvENPPkN6g1
    var leadNote: String?             // fldWtoMSWdFla3dII
    var eventTags: String?            // fld1D4u2KbIk0aUPR

    // MARK: - Contact Info
    var email: String?                // fldBjSvbdd5WXmoIG
    var mobilePhone: String?          // fldwULn4qSjwzSOTj
    var workPhone: String?            // fldueNgIMN0Ui5MWw
    var linkedInUrl: String?          // fldWrrBfD7aLxsXT4
    var website: String?              // fldnWic86lLjcF9MR

    // MARK: - Numbers & Dates
    var leadScore: Int?               // fldxNhfwoMf7UWVoT
    var lastContactDate: Date?        // fldoILwnnEloVrzLk
    var importDate: Date?             // fldoeYmeSZDrd7Y25
    var reviewCompletionDate: Date?   // fld6gBrJu9XCGAIll

    // MARK: - Single Selects
    // IMPORTANT: Options may have emoji prefixes (e.g. "🔴 High").
    // Always fetch exact names from Airtable metadata API.
    var qualificationStatus: String?  // fld5Ed1Gg51xRBIrm
    var leadSource: String?           // fldxxbhPmFaJ7xZeK
    var industry: String?             // fldHoIj9zCNB15avX
    var importSource: String?         // fldZG5LYBnFcEwhyw
    var onboardingStatus: String?     // fldbCsU8sEBNRm1kX
    var categorization: [String]       // fldofD9DQHfugTxsC (primary classification — multi-select)
    var qualityRating: String?        // fldz86orj3p0ynZGB
    var reliabilityRating: String?    // fldgIuvazBCfLa7Wu
    var partnerStatus: String?        // fldIEgv4HtZTr57AX
    var partnerType: String?          // fldvehyP9Y3Ra2wUM

    // MARK: - Checkbox
    var syncToContacts: Bool          // fldxbLMAKgqeawWkw

    // MARK: - Attachment URLs (read-only, extracted from Airtable attachment arrays)
    var contactPhotoUrl: String?      // fldl1WOfz7vHNSOUd

    // MARK: - Linked Record IDs (stored as [String] — Airtable record IDs)
    var specialtiesIds: [String]             // fldPgiO2nKgcujeXz → Specialties
    var proposalsIds: [String]               // fldPxLDh74yCpYwuF → Proposals
    var salesOpportunitiesIds: [String]      // fldYhB3vDq28worr9 → Opportunities
    var importedContactsIds: [String]        // fldj08SdhFcsYpRva → ImportedContacts
    var interactionsIds: [String]            // fldgWTSW7dKdCZPFl → Interactions
    var tasksIds: [String]                   // fldsWpetRKu2E4e9U → Tasks
    var projectsIds: [String]                // fldtExCKnttD4XsMe → Projects
    var companiesIds: [String]               // fldYXDUc9YKKsGTBt → Companies
    var projectsAsPartnerVendorIds: [String] // fldOOrElk4KRkSxcG → Projects
    var portalAccessIds: [String]            // fld0W66oRTQwvb9Nq → PortalAccess

    // MARK: - Read-only (computed by Airtable)
    var lastInteractionDate: Date?    // fldptkl81ex4SvQYN (rollup)

    // MARK: - Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool           // mirrors _pending_push in SQLite

    init(
        id: String,
        contactName: String? = nil,
        categorization: [String] = [],
        syncToContacts: Bool = false,
        isPendingPush: Bool = false
    ) {
        self.id = id
        self.contactName = contactName
        self.categorization = categorization
        self.syncToContacts = syncToContacts
        self.specialtiesIds = []
        self.proposalsIds = []
        self.salesOpportunitiesIds = []
        self.importedContactsIds = []
        self.interactionsIds = []
        self.tasksIds = []
        self.projectsIds = []
        self.companiesIds = []
        self.projectsAsPartnerVendorIds = []
        self.portalAccessIds = []
        self.isPendingPush = isPendingPush
    }
}
