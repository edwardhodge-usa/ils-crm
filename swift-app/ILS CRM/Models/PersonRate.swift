import Foundation
import SwiftData

/// PersonRate model — mirrors schema/PersonRates (Airtable tblx4FLX4QBwocggm)
///
/// Junction table between Contacts and RateCard — stores the agreed rates
/// negotiated for a specific person. Supports full CRUD.
@Model
final class PersonRate {
    @Attribute(.unique) var id: String

    var label: String?                 // fld5a05LBh8RnFmKt (primary)
    var agreedHourly: Double?          // fld00Y55wWAKn1ipD
    var agreedDayRate: Double?         // fldrCMFxEhMvGyw6i
    var agreedRemoteDayRate: Double?   // fldbvT9QwSvzuDbQR
    var agreedRetainerHourly: Double?  // fldYN6jFDMNv72gGX
    var agreedRetainerDay: Double?     // fldAZhxX0lGTqKIEp
    var agreedWeekly: Double?          // fldtnlrZSDmFY7orx
    var agreedAnnualSalary: Double?    // fldiLrW8TxSZq3nrZ
    var effectiveDate: String?         // fldKrHU5YRZhPGQKE (YYYY-MM-DD string)
    var expiryDate: String?            // fldNGXvJcXhMR2MSM (YYYY-MM-DD string)
    var status: String?                // fldtR5hAIYTO6kx5I (singleSelect)
    var contractReference: String?     // fldwpSljCyzcRsUPo
    var notes: String?                 // fld7XMDeERJ6PV5QK
    var contactIds: [String]           // fldTZJIHLOq8eKvbn → Contacts
    var roleIds: [String]              // fldex5lq6sayq6h86 → RateCard

    // Sync Metadata
    var isPendingPush: Bool = false
    var airtableModifiedAt: Date?

    init(id: String, label: String? = nil) {
        self.id = id
        self.label = label
        self.contactIds = []
        self.roleIds = []
    }
}
