import SwiftUI
import SwiftData

/// Opportunity detail view — inline editing with EditableFieldRow components.
///
/// Mirrors the Electron Pipeline detail pane. Takes a non-optional
/// Opportunity (parent view resolves selection before presenting this view).
/// Uses @Bindable for direct SwiftData mutation with pending-push tracking.
struct OpportunityDetailView: View {
    @Bindable var opportunity: Opportunity
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var showDeleteConfirm = false

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    init(opportunity: Opportunity) {
        self.opportunity = opportunity
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: - Header
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                // MARK: - Deal Info
                DetailSection(title: "DEAL INFO") {
                    VStack(spacing: 0) {
                        EditableFieldRow(
                            label: "Stage",
                            key: "salesStage",
                            type: .singleSelect(options: [
                                "Initial Contact", "Qualification", "Meeting Scheduled",
                                "Proposal Sent", "Contract Sent", "Negotiation",
                                "Development", "Investment", "Future Client",
                                "Closed Won", "Closed Lost"
                            ]),
                            value: opportunity.salesStage,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Value",
                            key: "dealValue",
                            type: .number(prefix: "$"),
                            value: opportunity.dealValue.map { String(format: "%.0f", $0) },
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Probability",
                            key: "probability",
                            type: .singleSelect(options: [
                                "Cold", "Low", "02 Medium", "01 High", "04 FUTURE ROADMAP"
                            ]),
                            value: opportunity.probability,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Engagement Type",
                            key: "engagementType",
                            type: .multiSelect(options: [
                                "Strategy/Consulting", "Design/Concept Development",
                                "Production/Fabrication Oversight", "Opening/Operations Support",
                                "Executive Producing"
                            ]),
                            value: opportunity.engagementType.joined(separator: ", "),
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Quals Type",
                            key: "qualsType",
                            type: .singleSelect(options: [
                                "Standard Capabilities Deck", "Customized Quals", "Both"
                            ]),
                            value: opportunity.qualsType,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Lead Source",
                            key: "leadSource",
                            type: .singleSelect(options: [
                                "Referral", "Website", "Inbound", "Outbound", "Event",
                                "Social Media", "Other", "LinkedIn", "Cold Call"
                            ]),
                            value: opportunity.leadSource,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Referred By",
                            key: "referredBy",
                            type: .text,
                            value: opportunity.referredBy,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Quals Sent",
                            key: "qualificationsSent",
                            type: .checkbox,
                            value: opportunity.qualificationsSent ? "true" : "false",
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Expected Close",
                            key: "expectedCloseDate",
                            type: .date,
                            value: opportunity.expectedCloseDate.map {
                                Self.isoFormatter.string(from: $0)
                            },
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Next Meeting",
                            key: "nextMeetingDate",
                            type: .date,
                            value: opportunity.nextMeetingDate.map {
                                Self.isoFormatter.string(from: $0)
                            },
                            onSave: saveField
                        )
                    }
                    .background(Color.platformControlBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.horizontal, 16)

                // MARK: - Win/Loss (shown only for closed stages)
                if isClosedStage {
                    DetailSection(title: "WIN/LOSS") {
                        VStack(spacing: 0) {
                            EditableFieldRow(
                                label: "Win/Loss Reason",
                                key: "winLossReason",
                                type: .singleSelect(options: [
                                    "Price", "Timing", "Scope Mismatch", "Competitor",
                                    "Budget Constraints", "Champion Left", "No Decision",
                                    "Won - Best Fit", "Won - Relationship", "Won - Price"
                                ]),
                                value: opportunity.winLossReason,
                                onSave: saveField
                            )
                            EditableFieldRow(
                                label: "Loss Notes",
                                key: "lossNotes",
                                type: .textarea,
                                value: opportunity.lossNotes,
                                onSave: saveField
                            )
                        }
                        .background(Color.platformControlBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .padding(.horizontal, 16)
                }

                // MARK: - Notes
                DetailSection(title: "NOTES") {
                    VStack(spacing: 0) {
                        EditableFieldRow(
                            label: "",
                            key: "notesAbout",
                            type: .textarea,
                            value: opportunity.notesAbout,
                            onSave: saveField
                        )
                    }
                    .background(Color.platformControlBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.horizontal, 16)

                // MARK: - Contract Milestones
                if let milestones = opportunity.contractMilestones, !milestones.isEmpty {
                    DetailSection(title: "CONTRACT MILESTONES") {
                        VStack(spacing: 0) {
                            EditableFieldRow(
                                label: "",
                                key: "contractMilestones",
                                type: .textarea,
                                value: opportunity.contractMilestones,
                                onSave: saveField
                            )
                        }
                        .background(Color.platformControlBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .padding(.horizontal, 16)
                }

                // MARK: - Linked Records
                linkedRecordsSection
                    .padding(.horizontal, 16)

                // MARK: - Details
                detailsSection
                    .padding(.horizontal, 16)

                // MARK: - Delete Button
                Button {
                    showDeleteConfirm = true
                } label: {
                    Text("Delete")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.red)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.red.opacity(0.4), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.top, 20)
                .padding(.bottom, 24)
            }
        }
        .confirmationDialog(
            "Delete this opportunity?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Opportunity.airtableTableId, recordId: opportunity.id)
                modelContext.delete(opportunity)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            Text(opportunity.opportunityName ?? "Untitled Opportunity")
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let stage = opportunity.salesStage, !stage.isEmpty {
                BadgeView(text: stage, color: stageColor(stage))
            }

            if let dealValue = opportunity.dealValue, dealValue > 0 {
                Text(formatCurrency(dealValue))
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Save Field

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "salesStage":
            opportunity.salesStage = str
        case "dealValue":
            if let s = str, let d = Double(s) {
                opportunity.dealValue = d
            } else {
                opportunity.dealValue = nil
            }
        case "probability":
            opportunity.probability = str
        case "engagementType":
            opportunity.engagementType = str?.components(separatedBy: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty } ?? []
        case "qualsType":
            opportunity.qualsType = str
        case "leadSource":
            opportunity.leadSource = str
        case "referredBy":
            opportunity.referredBy = str
        case "winLossReason":
            opportunity.winLossReason = str
        case "lossNotes":
            opportunity.lossNotes = str
        case "qualificationsSent":
            opportunity.qualificationsSent = (str == "true")
        case "expectedCloseDate":
            if let s = str {
                opportunity.expectedCloseDate = Self.isoFormatter.date(from: s)
            } else {
                opportunity.expectedCloseDate = nil
            }
        case "nextMeetingDate":
            if let s = str {
                opportunity.nextMeetingDate = Self.isoFormatter.date(from: s)
            } else {
                opportunity.nextMeetingDate = nil
            }
        case "notesAbout":
            opportunity.notesAbout = str
        case "contractMilestones":
            opportunity.contractMilestones = str
        default:
            break
        }
        opportunity.localModifiedAt = Date()
        opportunity.isPendingPush = true
    }

    // MARK: - Linked Records

    // Linked record ID arrays resolved to display names via SwiftData lookups.
    private var resolvedCompanyNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveCompanies(ids: opportunity.companyIds)
    }
    private var resolvedContactNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveContacts(ids: opportunity.associatedContactIds)
    }
    private var resolvedTaskNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveTasks(ids: opportunity.tasksIds)
    }
    private var resolvedProjectNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProjects(ids: opportunity.projectIds)
    }
    private var resolvedProposalNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProposals(ids: opportunity.proposalsIds)
    }
    private var resolvedInteractionNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveInteractions(ids: opportunity.interactionsIds)
    }

    @ViewBuilder
    private var linkedRecordsSection: some View {
        let hasCompanies = !opportunity.companyIds.isEmpty
        let hasContacts = !opportunity.associatedContactIds.isEmpty
        let hasTasks = !opportunity.tasksIds.isEmpty
        let hasProjects = !opportunity.projectIds.isEmpty
        let hasProposals = !opportunity.proposalsIds.isEmpty
        let hasInteractions = !opportunity.interactionsIds.isEmpty

        if hasCompanies || hasContacts || hasTasks || hasProjects
            || hasProposals || hasInteractions {
            DetailSection(title: "LINKED RECORDS") {
                VStack(spacing: 0) {
                    if hasCompanies {
                        RelatedRecordRow(
                            label: "Companies",
                            items: resolvedCompanyNames
                        )
                    }
                    if hasContacts {
                        RelatedRecordRow(
                            label: "Contacts",
                            items: resolvedContactNames
                        )
                    }
                    if hasTasks {
                        RelatedRecordRow(
                            label: "Tasks",
                            items: resolvedTaskNames
                        )
                    }
                    if hasProjects {
                        RelatedRecordRow(
                            label: "Projects",
                            items: resolvedProjectNames
                        )
                    }
                    if hasProposals {
                        RelatedRecordRow(
                            label: "Proposals",
                            items: resolvedProposalNames
                        )
                    }
                    if hasInteractions {
                        RelatedRecordRow(
                            label: "Interactions",
                            items: resolvedInteractionNames
                        )
                    }
                }
            }
        }
    }

    // MARK: - Details

    private var detailsSection: some View {
        DetailSection(title: "DETAILS") {
            VStack(spacing: 0) {
                if let modified = opportunity.airtableModifiedAt {
                    DetailFieldRow(
                        label: "Last Modified",
                        value: modified.formatted(date: .abbreviated, time: .shortened)
                    )
                }
                if let localModified = opportunity.localModifiedAt {
                    DetailFieldRow(
                        label: "Local Modified",
                        value: localModified.formatted(date: .abbreviated, time: .shortened)
                    )
                }
                // Airtable record ID — small, for debugging
                HStack {
                    Text(opportunity.id)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .textSelection(.enabled)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 28)
            }
            .background(Color.platformControlBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Helpers

    /// Whether the current stage is Closed Won or Closed Lost.
    private var isClosedStage: Bool {
        guard let stage = opportunity.salesStage else { return false }
        let lower = stage.lowercased()
        return lower.contains("closed won") || lower.contains("closed lost")
    }

    /// Maps sales stage to an appropriate badge color.
    private func stageColor(_ stage: String) -> Color {
        let lower = stage.lowercased()
        if lower.contains("initial contact") { return .blue }
        if lower.contains("qualification") { return .cyan }
        if lower.contains("meeting scheduled") { return .teal }
        if lower.contains("proposal sent") { return .indigo }
        if lower.contains("contract sent") { return .purple }
        if lower.contains("negotiation") { return .orange }
        if lower.contains("development") { return .mint }
        if lower.contains("investment") { return .yellow }
        if lower.contains("future client") { return .gray }
        if lower.contains("closed won") { return .green }
        if lower.contains("closed lost") { return .red }
        return .gray
    }

    /// Formats a Double as currency ("$1,234").
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }
}

// MARK: - Preview

#Preview {
    let opportunity = Opportunity(
        id: "recOPP123",
        opportunityName: "Website Redesign Project"
    )
    opportunity.salesStage = "Proposal Sent"
    opportunity.dealValue = 25000
    opportunity.probability = "02 Medium"
    opportunity.probabilityValue = 0.5
    opportunity.expectedCloseDate = Calendar.current.date(byAdding: .month, value: 1, to: Date())
    opportunity.nextMeetingDate = Calendar.current.date(byAdding: .day, value: 3, to: Date())
    opportunity.leadSource = "Referral"
    opportunity.qualsType = "Standard Capabilities Deck"
    opportunity.engagementType = ["Strategy/Consulting", "Design/Concept Development"]
    opportunity.notesAbout = "Client interested in a full brand overhaul including website, collateral, and digital strategy."
    opportunity.contractMilestones = "Phase 1: Discovery (2 weeks)\nPhase 2: Design (4 weeks)\nPhase 3: Development (6 weeks)"
    opportunity.qualificationsSent = true
    opportunity.companyIds = ["recCOMP1"]
    opportunity.associatedContactIds = ["recCON1", "recCON2"]
    opportunity.tasksIds = ["recTASK1", "recTASK2", "recTASK3"]
    opportunity.projectIds = ["recPROJ1"]
    opportunity.proposalsIds = ["recPROP1"]

    return OpportunityDetailView(opportunity: opportunity)
        .frame(width: 500, height: 800)
}
