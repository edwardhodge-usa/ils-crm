import SwiftUI
import SwiftData

/// Proposal detail pane — bento box layout.
///
/// Mirrors the approved "Proposed Bento" mockup from current-vs-proposed.html.
/// Renders inline in the split-view right panel (not as a sheet).
/// Uses @Bindable for direct SwiftData mutation with pending-push tracking.
struct ProposalDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @Bindable var proposal: Proposal

    @State private var showEditSheet = false
    @State private var showDeleteConfirm = false

    init(proposal: Proposal) {
        self.proposal = proposal
    }

    // MARK: - Formatters

    private static let shortMonthDay: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    private static let yearOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy"
        return f
    }()

    // MARK: - Helpers

    private func statusColor(for status: String) -> Color {
        switch status {
        case "Draft":           return .gray
        case "Sent to Client":  return .blue
        case "Approved",
             "Closed Won":      return .green
        case "Rejected",
             "Closed Lost":     return .red
        case "Pending Approval",
             "In Review":       return .orange
        case "Submitted":       return .purple
        default:                return .secondary
        }
    }

    /// True if validUntil is within 14 days from today (or already past).
    private var isNearExpiry: Bool {
        guard let until = proposal.validUntil else { return false }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: until).day ?? 0
        return days <= 14
    }

    /// Days remaining until validUntil. Negative if past.
    private var daysRemaining: Int? {
        guard let until = proposal.validUntil else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: until).day
    }

    /// Abbreviated currency: "$185K" for values >= 1000, "$500" for smaller.
    private func abbreviatedCurrency(_ value: Double) -> String {
        if value >= 1_000 {
            return "$\(Int(value / 1_000))K"
        } else {
            return "$\(Int(value))"
        }
    }

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "status":           proposal.status = str
        case "approvalStatus":   proposal.approvalStatus = str
        case "proposedValue":
            if let s = str, let d = Double(s) { proposal.proposedValue = d }
            else { proposal.proposedValue = nil }
        case "version":          proposal.version = str
        case "templateUsed":     proposal.templateUsed = str
        case "notes":            proposal.notes = str
        case "performanceMetrics": proposal.performanceMetrics = str
        default: break
        }
        proposal.localModifiedAt = Date()
        proposal.isPendingPush = true
    }

    // MARK: - Linked Record Resolvers

    private var resolvedCompanyNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveCompanies(ids: proposal.companyIds)
    }

    private var resolvedClientNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveContacts(ids: proposal.clientIds)
    }

    private var resolvedOpportunityNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveOpportunities(ids: proposal.relatedOpportunityIds)
    }

    private var resolvedTaskNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveTasks(ids: proposal.tasksIds)
    }

    // MARK: - Computed Display Values

    private var heroSubtitle: String? {
        let company = resolvedCompanyNames.first
        let contact = resolvedClientNames.first
        let parts = [company, contact].compactMap { $0 }.filter { !$0.isEmpty }
        guard !parts.isEmpty else { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    private var formattedValue: String {
        guard let v = proposal.proposedValue, v > 0 else { return "\u{2014}" }
        return abbreviatedCurrency(v)
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // ── Hero Card ──────────────────────────────────────────
                BentoHeroCard(
                    name: proposal.proposalName ?? "Untitled",
                    subtitle: heroSubtitle,
                    avatarSize: 0,
                    avatarShape: .roundedRect
                ) {
                    // Status pill
                    if let status = proposal.status, !status.isEmpty {
                        BentoPill(text: status, color: statusColor(for: status))
                    }
                    // Days remaining pill
                    if let days = daysRemaining {
                        if days > 0 {
                            BentoPill(text: "\(days) days remaining", color: .green)
                        } else if days == 0 {
                            BentoPill(text: "Expires today", color: .orange)
                        } else {
                            BentoPill(text: "Expired", color: .red)
                        }
                    }
                } stats: {
                    BentoHeroStat(
                        value: formattedValue,
                        label: "VALUE"
                    )
                }

                // ── Row 1: Date Sent | Valid Until | Opportunity ─────
                BentoGrid(columns: 3) {
                    // DATE SENT
                    BentoCell(title: "DATE SENT") {
                        if let sent = proposal.dateSent {
                            VStack(spacing: 2) {
                                Text(Self.shortMonthDay.string(from: sent))
                                    .font(.system(size: 16))
                                    .foregroundStyle(.primary)
                                Text(Self.yearOnly.string(from: sent))
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("\u{2014}")
                                .font(.system(size: 16))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }

                    // VALID UNTIL
                    BentoCell(title: "VALID UNTIL") {
                        if let until = proposal.validUntil {
                            VStack(spacing: 2) {
                                Text(Self.shortMonthDay.string(from: until))
                                    .font(.system(size: 16))
                                    .foregroundStyle(isNearExpiry ? .orange : .primary)
                                Text(Self.yearOnly.string(from: until))
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("\u{2014}")
                                .font(.system(size: 16))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }

                    // OPPORTUNITY
                    BentoCell(title: "OPPORTUNITY") {
                        if let name = resolvedOpportunityNames.first {
                            BentoChip(text: name)
                                .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("\u{2014}")
                                .font(.system(size: 13))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                }
                .padding(.horizontal, 16)

                // ── Row 2: Linked Tasks | Notes ─────────────────────
                BentoGrid(columns: 2) {
                    // LINKED TASKS
                    BentoCell(title: "LINKED TASKS") {
                        if resolvedTaskNames.isEmpty {
                            Text("No linked tasks")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        } else {
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(resolvedTaskNames, id: \.self) { name in
                                    BentoChip(text: name)
                                }
                            }
                        }
                    }

                    // NOTES
                    BentoCell(title: "NOTES") {
                        EditableFieldRow(
                            label: "",
                            key: "notes",
                            type: .textarea,
                            value: proposal.notes,
                            onSave: saveField
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    showEditSheet = true
                } label: {
                    Image(systemName: "pencil")
                }
                .help("Edit Proposal")
            }
            ToolbarItem(placement: .automatic) {
                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "trash")
                }
                .help("Delete Proposal")
            }
        }
        .sheet(isPresented: $showEditSheet) {
            NavigationStack {
                ProposalFormView(proposal: proposal)
            }
            .frame(minWidth: 480, minHeight: 560)
        }
        .confirmationDialog(
            "Delete Proposal?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Proposal.airtableTableId, recordId: proposal.id)
                modelContext.delete(proposal)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }
}
