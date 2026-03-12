import SwiftUI
import SwiftData

/// Opportunity detail view — displays all key fields organized in sections.
///
/// Mirrors the Electron Pipeline detail pane. Takes a non-optional
/// Opportunity (parent view resolves selection before presenting this view).
///
/// Sections shown only when they contain non-nil, non-empty data.
struct OpportunityDetailView: View {
    let opportunity: Opportunity

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: - Header
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                // MARK: - Form Sections
                Form {
                    dealInfoSection
                    stageSection
                    engagementSection
                    notesSection
                    contractMilestonesSection
                    linkedRecordsSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
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

    // MARK: - Deal Info

    @ViewBuilder
    private var dealInfoSection: some View {
        let hasDealValue = opportunity.dealValue != nil && opportunity.dealValue! > 0
        let hasProbability = opportunity.probability?.isEmpty == false
        let hasProbabilityValue = opportunity.probabilityValue != nil
        let hasExpectedClose = opportunity.expectedCloseDate != nil
        let hasNextMeeting = opportunity.nextMeetingDate != nil
        let hasLeadSource = opportunity.leadSource?.isEmpty == false
        let hasQualsType = opportunity.qualsType?.isEmpty == false

        if hasDealValue || hasProbability || hasProbabilityValue
            || hasExpectedClose || hasNextMeeting || hasLeadSource || hasQualsType {
            Section("Deal Info") {
                if let dealValue = opportunity.dealValue, dealValue > 0 {
                    FieldRow(label: "Deal Value", value: formatCurrency(dealValue))
                }

                if let probability = opportunity.probability, !probability.isEmpty {
                    FieldRow(label: "Probability", value: probability)
                }

                if let probabilityValue = opportunity.probabilityValue {
                    FieldRow(label: "Probability Value", value: formatPercentage(probabilityValue))
                }

                if let expectedClose = opportunity.expectedCloseDate {
                    FieldRow(label: "Expected Close", value: formatDate(expectedClose))
                }

                if let nextMeeting = opportunity.nextMeetingDate {
                    FieldRow(label: "Next Meeting", value: formatDate(nextMeeting))
                }

                if let leadSource = opportunity.leadSource, !leadSource.isEmpty {
                    FieldRow(label: "Lead Source", value: leadSource)
                }

                if let qualsType = opportunity.qualsType, !qualsType.isEmpty {
                    FieldRow(label: "Quals Type", value: qualsType)
                }
            }
        }
    }

    // MARK: - Stage

    @ViewBuilder
    private var stageSection: some View {
        let hasStage = opportunity.salesStage?.isEmpty == false
        let hasWinLoss = opportunity.winLossReason?.isEmpty == false
            && isClosedStage
        let hasLossNotes = opportunity.lossNotes?.isEmpty == false
            && isClosedStage

        if hasStage || hasWinLoss || hasLossNotes || opportunity.qualificationsSent {
            Section("Stage") {
                if let stage = opportunity.salesStage, !stage.isEmpty {
                    HStack {
                        Text("Sales Stage")
                            .foregroundStyle(.secondary)
                        Spacer()
                        BadgeView(text: stage, color: stageColor(stage))
                    }
                    .frame(minHeight: 28)
                }

                if isClosedStage, let reason = opportunity.winLossReason, !reason.isEmpty {
                    FieldRow(label: "Win/Loss Reason", value: reason)
                }

                if isClosedStage, let lossNotes = opportunity.lossNotes, !lossNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Loss Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(lossNotes)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                HStack {
                    Text("Qualifications Sent")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(opportunity.qualificationsSent ? "Yes" : "No")
                        .foregroundStyle(.primary)
                }
                .frame(minHeight: 28)
            }
        }
    }

    // MARK: - Engagement

    @ViewBuilder
    private var engagementSection: some View {
        if !opportunity.engagementType.isEmpty {
            Section("Engagement") {
                FlowLayout(spacing: 6) {
                    ForEach(opportunity.engagementType, id: \.self) { type in
                        BadgeView(text: type, color: .purple)
                    }
                }
            }
        }
    }

    // MARK: - Notes

    @ViewBuilder
    private var notesSection: some View {
        if let notes = opportunity.notesAbout, !notes.isEmpty {
            Section("Notes") {
                VStack(alignment: .leading, spacing: 4) {
                    Text(notes)
                        .font(.body)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    // MARK: - Contract Milestones

    @ViewBuilder
    private var contractMilestonesSection: some View {
        if let milestones = opportunity.contractMilestones, !milestones.isEmpty {
            Section("Contract Milestones") {
                VStack(alignment: .leading, spacing: 4) {
                    Text(milestones)
                        .font(.body)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    // MARK: - Linked Records

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
            Section("Linked Records") {
                if hasCompanies {
                    FieldRow(label: "Companies", value: "\(opportunity.companyIds.count)")
                }

                if hasContacts {
                    FieldRow(label: "Contacts", value: "\(opportunity.associatedContactIds.count)")
                }

                if hasTasks {
                    FieldRow(label: "Tasks", value: "\(opportunity.tasksIds.count)")
                }

                if hasProjects {
                    FieldRow(label: "Projects", value: "\(opportunity.projectIds.count)")
                }

                if hasProposals {
                    FieldRow(label: "Proposals", value: "\(opportunity.proposalsIds.count)")
                }

                if hasInteractions {
                    FieldRow(label: "Interactions", value: "\(opportunity.interactionsIds.count)")
                }
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let referredBy = opportunity.referredBy, !referredBy.isEmpty {
                FieldRow(label: "Referred By", value: referredBy)
            }

            if let modified = opportunity.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            if let localModified = opportunity.localModifiedAt {
                FieldRow(label: "Local Modified", value: localModified.formatted(date: .abbreviated, time: .shortened))
            }

            // Airtable record ID — small, for debugging
            Text(opportunity.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
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
        if lower.contains("prospecting") { return .yellow }
        if lower.contains("qualified") { return .orange }
        if lower.contains("business development") { return .purple }
        if lower.contains("proposal sent") { return .indigo }
        if lower.contains("negotiation") { return .teal }
        if lower.contains("closed won") { return .green }
        if lower.contains("closed lost") { return .red }
        return .gray
    }

    /// Formats a Double as currency ("$1,234.00").
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }

    /// Formats a Double as a percentage ("75%").
    private func formatPercentage(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 0
        // probabilityValue is already 0-1 range from Airtable formula
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value * 100))%"
    }

    /// Formats a Date using medium date style ("Mar 5, 2026").
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
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
    opportunity.qualsType = "RFP"
    opportunity.engagementType = ["Consulting", "Creative Services", "Strategy"]
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
