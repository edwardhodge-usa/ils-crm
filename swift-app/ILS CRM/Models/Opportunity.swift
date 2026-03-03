import Foundation
import SwiftData

/// Opportunity model — mirrors schema/Opportunities.json (23 Airtable fields)
/// Airtable table: tblsalt5lmHlh4s7z
///
/// Drives the Pipeline/Kanban view. salesStage determines column placement.
@Model
final class Opportunity {
    @Attribute(.unique) var id: String

    var opportunityName: String?      // fldsvZbiY3YFK2Ocp (primary)
    var referredBy: String?           // fldZ3V2AL5IFj6W1G
    var notesAbout: String?           // fldLZDfABWEJ9fCyZ
    var contractMilestones: String?   // fldLjPejA0TcYj8R8
    var lossNotes: String?            // fldVOzXUQ5lMYzcVp
    var dealValue: Double?            // fld1y3pUaljvn2nF5 (currency)
    var expectedCloseDate: Date?      // fldpSYPc9Mf1hRhdU
    var nextMeetingDate: Date?        // fld7ZbwNVRSKCOly8

    // Single Selects
    var salesStage: String?           // fldMV4ZUWb0h1pyPN (Kanban column)
    var probability: String?          // fld4oRQmcZ3VaQeUP (prefixed: "01 High", "02 Medium")
    var qualsType: String?            // fldhJn8M3xeQYdPHG
    var leadSource: String?           // fldDr4GsoxjnNmpo1
    var winLossReason: String?        // fldEkMImrxZQMnuCJ

    // Multi-select — NOTE: This is multipleSelects, NOT singleSelect
    var engagementType: [String]      // fldYvZ8T1Iy7r91z5

    // Checkbox
    var qualificationsSent: Bool      // flda4mTsRoIiFqVZL

    // Linked Record IDs
    var companyIds: [String]          // fldYyFlO4LavZM5gI → Companies
    var associatedContactIds: [String] // fldit4f09UfFrzSUB → Contacts
    var tasksIds: [String]            // fldBGsrhhPk7egFL1 → Tasks
    var interactionsIds: [String]     // fldyL4Obl1EfVvpVU → Interactions
    var projectIds: [String]          // fldrOFbZgxZ6izAla → Projects
    var proposalsIds: [String]        // fldQNa9p8jAEnrZB2 → Proposals

    // Formula (read-only)
    var probabilityValue: Double?     // flda4MrS0FecCa4TO

    // Sync Metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String, opportunityName: String? = nil, isPendingPush: Bool = false) {
        self.id = id
        self.opportunityName = opportunityName
        self.engagementType = []
        self.qualificationsSent = false
        self.companyIds = []
        self.associatedContactIds = []
        self.tasksIds = []
        self.interactionsIds = []
        self.projectIds = []
        self.proposalsIds = []
        self.isPendingPush = isPendingPush
    }
}
