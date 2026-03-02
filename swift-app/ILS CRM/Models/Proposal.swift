import Foundation
import SwiftData

/// Proposal model — mirrors schema/Proposals.json (13 Airtable fields + 4 migrated)
/// Airtable table: tblODEy2pLlfrz0lz
///
/// Note: Inline task fields were removed from Airtable. Uses linked Tasks instead.
@Model
final class Proposal {
    @Attribute(.unique) var id: String

    var proposalName: String?        // fld5Y8fCuS1jhkWF2 (primary)
    var version: String?             // fldQ8g5iqtMPHxb8S
    var clientFeedback: String?      // fldhUnP1A7gxJNaxe
    var performanceMetrics: String?  // fldZeAOE1WpLOY3aH
    var notes: String?               // fldryZ3MW513WcmrK
    var scopeSummary: String?        // (migrated field)
    var proposedValue: Double?       // (migrated field)
    var dateSent: Date?              // (migrated field)
    var validUntil: Date?            // (migrated field)

    // Single Selects
    var status: String?              // fldBzyWMITVJdZyRl
    var templateUsed: String?        // fldAOt35mhF1ne0UK
    var approvalStatus: String?      // fldwWCRdvqYVTXZ12

    // Linked Record IDs
    var clientIds: [String]              // fldoz0V3WTPup4zv8 → Contacts
    var companyIds: [String]             // fldxxsjKV66IhPKzL → Companies
    var relatedOpportunityIds: [String]  // fldPs5pFveiqZbpnn → Opportunities
    var tasksIds: [String]               // fldQARjLcMpanbY6m → Tasks

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, proposalName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.proposalName = proposalName
        self.clientIds = []
        self.companyIds = []
        self.relatedOpportunityIds = []
        self.tasksIds = []
        self.isPendingPush = isPendingPush
    }
}
