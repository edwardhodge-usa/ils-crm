import SwiftUI
import SwiftData

/// Proposal detail pane — bento box layout.
///
/// Mirrors src/components/proposals/Proposal360Page.tsx
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

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
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

    private func approvalColor(for status: String) -> Color {
        switch status {
        case "Approved":        return .green
        case "Rejected":        return .red
        case "Submitted",
             "Under Review":    return .orange
        case "Pending":         return .yellow
        default:                return .secondary
        }
    }

    /// True if validUntil is within 14 days from today (or already past).
    private var isNearExpiry: Bool {
        guard let until = proposal.validUntil else { return false }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: until).day ?? 0
        return days <= 14
    }

    private func formatDate(_ date: Date) -> String {
        Self.dateFormatter.string(from: date)
    }

    private func formatCurrency(_ value: Double) -> String {
        Self.currencyFormatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
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
        case "scopeSummary":     proposal.scopeSummary = str
        case "clientFeedback":   proposal.clientFeedback = str
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

    // MARK: - Computed Display Values

    private var heroSubtitle: String? {
        let company = resolvedCompanyNames.first
        let contact = resolvedClientNames.first
        let parts = [company, contact].compactMap { $0 }.filter { !$0.isEmpty }
        guard !parts.isEmpty else { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    private var formattedValue: String {
        guard let v = proposal.proposedValue, v > 0 else { return "—" }
        return formatCurrency(v)
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // ── Hero Card ──────────────────────────────────────────
                BentoHeroCard(
                    name: proposal.proposalName ?? "Untitled",
                    subtitle: heroSubtitle,
                    avatarSize: 48,
                    avatarShape: .roundedRect
                ) {
                    // Status pill
                    if let status = proposal.status, !status.isEmpty {
                        BentoPill(text: status, color: statusColor(for: status))
                    }
                    // Expiry pill — orange if within 14 days
                    if let until = proposal.validUntil {
                        BentoPill(
                            text: "Expires \(formatDate(until))",
                            color: isNearExpiry ? .orange : .secondary
                        )
                    }
                    // Version pill — only if non-empty
                    if let ver = proposal.version, !ver.isEmpty {
                        BentoPill(text: "v\(ver)", color: .purple)
                    }
                } stats: {
                    BentoHeroStat(value: formattedValue, label: "VALUE")
                }

                // ── Row 1: Stat cells ─────────────────────────────────
                BentoGrid(columns: 3) {
                    // SENT
                    BentoCell(title: "SENT") {
                        if let sent = proposal.dateSent {
                            Text(formatDate(sent))
                                .font(.system(size: 13))
                                .foregroundStyle(.primary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("—")
                                .font(.system(size: 13))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }

                    // EXPIRES
                    BentoCell(title: "EXPIRES") {
                        if let until = proposal.validUntil {
                            Text(formatDate(until))
                                .font(.system(size: 13))
                                .foregroundStyle(isNearExpiry ? .orange : .primary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("—")
                                .font(.system(size: 13))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }

                    // APPROVAL
                    BentoCell(title: "APPROVAL") {
                        if let approval = proposal.approvalStatus, !approval.isEmpty {
                            BentoPill(text: approval, color: approvalColor(for: approval))
                                .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("—")
                                .font(.system(size: 13))
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                }
                .padding(.horizontal, 16)

                // ── Row 2: Notes / Scope / Linked ─────────────────────
                BentoGrid(columns: 3) {
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

                    // SCOPE SUMMARY
                    BentoCell(title: "SCOPE SUMMARY") {
                        EditableFieldRow(
                            label: "",
                            key: "scopeSummary",
                            type: .textarea,
                            value: proposal.scopeSummary,
                            onSave: saveField
                        )
                    }

                    // LINKED
                    BentoCell(title: "LINKED") {
                        VStack(alignment: .leading, spacing: 6) {
                            if !resolvedOpportunityNames.isEmpty {
                                ForEach(resolvedOpportunityNames, id: \.self) { name in
                                    BentoChip(text: name)
                                }
                            }
                            if !resolvedCompanyNames.isEmpty {
                                ForEach(resolvedCompanyNames, id: \.self) { name in
                                    BentoChip(text: name)
                                }
                            }
                            if !resolvedClientNames.isEmpty {
                                ForEach(resolvedClientNames, id: \.self) { name in
                                    BentoChip(text: name)
                                }
                            }
                            if resolvedOpportunityNames.isEmpty &&
                               resolvedCompanyNames.isEmpty &&
                               resolvedClientNames.isEmpty {
                                Text("—")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)

                // ── Row 3: Client Feedback (full-width) ───────────────
                BentoGrid(columns: 1) {
                    BentoCell(title: "CLIENT FEEDBACK") {
                        EditableFieldRow(
                            label: "",
                            key: "clientFeedback",
                            type: .textarea,
                            value: proposal.clientFeedback,
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
