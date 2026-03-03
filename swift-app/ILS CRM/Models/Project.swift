import Foundation
import SwiftData

/// Project model — mirrors schema/Projects.json (18 Airtable fields)
/// Airtable table: tbll416ZwFACYQSm4
@Model
final class Project {
    @Attribute(.unique) var id: String

    var projectName: String?        // fldkrhZTZ6pFweiBx (primary)
    var location: String?           // fldFwzNbpWAL9tV8R
    var projectDescription: String? // fldr8mgLCY9ISv4Bd (renamed to avoid Swift keyword)
    var keyMilestones: String?      // fld19Ezi7Md5PPWxQ
    var lessonsLearned: String?     // fldKxqY5ZYIrCIOgU
    var contractValue: Double?      // fld4J4KCazP7C1IMC (currency)
    var startDate: Date?            // fldTOw6VgwsvJXW7O
    var targetCompletion: Date?     // fldID5gpDgtmQDVUd
    var actualCompletion: Date?     // fldKc3rU95N8sCDdg

    // Single Select
    var status: String?             // fld4Pv2FM3skC3chQ

    // Multi-select
    var engagementType: [String]    // fld5nII1Fq8N1LVEO

    // Linked Record IDs
    var salesOpportunitiesIds: [String]  // fldUKkazQiEmhIH4E → Opportunities
    var clientIds: [String]              // fldMMHrrBsAHvyQ0e → Companies
    var tasksIds: [String]               // fldizOqFE6ParTzho → Tasks
    var primaryContactIds: [String]      // fld5uAeJxjSB3WCqs → Contacts
    var contactsIds: [String]            // fldTphE0ecQivlxxD → Contacts

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, projectName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.projectName = projectName
        self.engagementType = []
        self.salesOpportunitiesIds = []
        self.clientIds = []
        self.tasksIds = []
        self.primaryContactIds = []
        self.contactsIds = []
        self.isPendingPush = isPendingPush
    }
}
