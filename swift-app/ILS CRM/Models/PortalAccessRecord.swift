import Foundation
import SwiftData

/// PortalAccess model — mirrors schema/PortalAccess.json (37 Airtable fields)
/// Airtable table: tblN1jruT8VeucPKa
///
/// Named "PortalAccessRecord" to avoid conflict with SwiftUI's accessibility APIs.
/// Contains 12 lookup fields (all read-only) and 1 formula field.
///
/// Known Electron bug: Name/Email/Company show empty because the sync engine
/// doesn't resolve linked record lookups. Store resolved values from Airtable API.
@Model
final class PortalAccessRecord {
    @Attribute(.unique) var id: String

    // Direct fields (writable)
    var name: String?                    // fldqnVE5ppj8ACyf3 (primary)
    var email: String?                   // fldU70JpJQ1GpbRNQ
    var pageAddress: String?             // fldkAjPIMUMlHNT2A
    var decisionMaker: String?           // fldn0nMxnqpHkLykk
    var address: String?                 // fldvaQB8wzgaLLn2Y
    var primaryContact: String?          // fldqESjieqvuj1k4P
    var positionTitle: String?           // fld2UX68BMEk768Ao
    var industry: String?                // fld8JNk7r3mQvco7V
    var notes: String?                   // fldiOyYVt4QN8Yon4
    var phoneNumber: String?             // fldHVA9pJd2j2bJNi
    var website: String?                 // fldJhqz0wngVDNxwt
    var projectBudget: Double?           // fldQisibz3rZaC4mi (currency)
    var dateAdded: Date?                 // fld8m3xt2QOi2EF3b
    var expectedProjectStartDate: Date?  // flduKP6vlsDlxZuGW
    var followUpDate: Date?              // fldvhmfQXneMvWXD1

    // Single Selects
    var status: String?                  // fldqbzNiTFt7jpdyW
    var leadSource: String?              // fldnIkdS9MSewsUqy
    var stage: String?                   // fldYrwOrTeimfHC5c

    // Multi-select
    var servicesInterestedIn: [String]   // fldcBIAHs2jpNkQbD

    // Linked Record IDs
    var contactIds: [String]             // fld1tMK48dxrLU9R4 → Contacts

    // Formula (read-only)
    var framerPageUrl: String?           // fldzVcWNLBnNQjwQ6

    // Lookup fields (all read-only — resolved from linked Contact)
    var contactNameLookup: String?       // fldwGCWvBs8GCz5ka
    var contactCompanyLookup: String?    // fldbeA6Zdgcf6k4Si
    var contactEmailLookup: String?      // fldtZJw7XdUeVGNcA
    var contactPhoneLookup: String?      // fldH8ZDUC4l0vKXpV
    var contactJobTitleLookup: String?   // fldQbVqtuSO4KXgg9
    var contactIndustryLookup: String?   // fldqTLSogKYG6wIwI
    var contactTagsLookup: String?       // fldM8HUiHkQy7tOFx
    var contactWebsiteLookup: String?    // fldX1QmphBEEZX7hr
    var contactAddressLineLookup: String? // fld55H7Qh189M9nTc
    var contactCityLookup: String?       // fldocH6IhXiWnS1O9
    var contactStateLookup: String?      // fld95YpyLfDuEtgHQ
    var contactCountryLookup: String?    // fldb9Nsoynf3zrZGr

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, name: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.name = name
        self.servicesInterestedIn = []
        self.contactIds = []
        self.isPendingPush = isPendingPush
    }
}
