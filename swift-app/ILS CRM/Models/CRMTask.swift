import Foundation
import SwiftData

/// Task model — mirrors schema/Tasks.json (12 Airtable fields)
/// Airtable table: tblwEt5YsYDP22qrr
///
/// Named "CRMTask" to avoid conflict with Swift's built-in Task type.
///
/// Key lesson from Electron:
/// - due_date stored as full ISO string in SQLite → use date(due_date) for comparisons
/// - SwiftData handles Date natively, so this is a non-issue in Swift
@Model
final class CRMTask {
    @Attribute(.unique) var id: String

    var task: String?              // fldfYqgokx0nP9jrq (primary — task title)
    var notes: String?             // fldwi4Fm7aOdyh7R3
    var dueDate: Date?             // fldrV9zjZGNlm2znw
    var completedDate: Date?       // fldOE0MEitlXCeC5e

    // Single Selects — options have emoji prefixes (e.g. "🔴 High")
    var status: String?            // fld5j051j1H7rPmbw
    var type: String?              // fldXcqtkVSh60H20b
    var priority: String?          // fldREFoOWpRN4Ejfg

    // Collaborator
    var assignedTo: String?        // fldtfWkEqvv5YHODj (display name)
    var assignedToData: String?    // full collaborator JSON: {"id":"usrXXX","email":"...","name":"..."}

    // Linked Record IDs
    var salesOpportunitiesIds: [String]  // fldhzkBEvT2UlcW7g → Opportunities
    var contactsIds: [String]            // fldyzxf3dGGCT02t0 → Contacts
    var projectsIds: [String]            // fldtxrwOzmkpjVtdj → Projects
    var proposalIds: [String]            // fldB9nEqdI6EZMfPo → Proposals

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, task: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.task = task
        self.salesOpportunitiesIds = []
        self.contactsIds = []
        self.projectsIds = []
        self.proposalIds = []
        self.isPendingPush = isPendingPush
    }
}
