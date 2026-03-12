import SwiftUI
import SwiftData

/// Proposals list — mirrors src/components/proposals/ProposalListPage.tsx
///
/// Features:
/// - Searchable list with proposal name, status badges, approval status
/// - Color-coded status/approval badges
/// - Proposed value, version, and date sent metadata
/// - Detail sheet on selection
struct ProposalsView: View {
    @Query(sort: \Proposal.proposalName) private var proposals: [Proposal]

    @State private var searchText = ""
    @State private var selectedProposal: Proposal?

    private var filteredProposals: [Proposal] {
        guard !searchText.isEmpty else { return proposals }
        let query = searchText.lowercased()
        return proposals.filter { proposal in
            (proposal.proposalName?.lowercased().contains(query) ?? false)
                || (proposal.notes?.lowercased().contains(query) ?? false)
        }
    }

    var body: some View {
        Group {
            if proposals.isEmpty {
                EmptyStateView(
                    title: "No Proposals",
                    description: "Proposals will appear here once synced from Airtable.",
                    systemImage: "doc.text"
                )
            } else if filteredProposals.isEmpty {
                EmptyStateView(
                    title: "No Results",
                    description: "No proposals match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                List(filteredProposals, id: \.id) { proposal in
                    ProposalRow(proposal: proposal)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedProposal = proposal
                        }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search proposals...")
        .navigationTitle("Proposals")
        .toolbar {
            Button { /* TODO: new proposal */ } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(item: $selectedProposal) { proposal in
            NavigationStack {
                ProposalDetailView(proposal: proposal)
                    .navigationTitle("Proposal")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedProposal = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 500, minHeight: 600)
        }
    }
}

// MARK: - Proposal Row

private struct ProposalRow: View {
    let proposal: Proposal

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Proposal name
            Text(proposal.proposalName ?? "Untitled")
                .font(.body)
                .fontWeight(.medium)

            // Status + Approval badges
            let hasStatus = proposal.status != nil
            let hasApproval = proposal.approvalStatus != nil
            if hasStatus || hasApproval {
                HStack(spacing: 8) {
                    if let status = proposal.status {
                        BadgeView(text: status, color: statusColor(for: status))
                    }
                    if let approval = proposal.approvalStatus {
                        BadgeView(text: approval, color: approvalColor(for: approval))
                    }
                }
            }

            // Metadata row: version, value, date sent
            let hasVersion = proposal.version != nil
            let hasValue = (proposal.proposedValue ?? 0) > 0
            let hasDate = proposal.dateSent != nil
            if hasVersion || hasValue || hasDate {
                HStack(spacing: 8) {
                    if let version = proposal.version {
                        Text("v\(version)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let value = proposal.proposedValue, value > 0 {
                        Text(Self.currencyFormatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let dateSent = proposal.dateSent {
                        Text("Sent \(Self.dateFormatter.string(from: dateSent))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Color Mappings

    private func statusColor(for status: String) -> Color {
        switch status {
        case "Draft": return .gray
        case "Sent": return .blue
        case "Accepted": return .green
        case "Rejected": return .red
        case "Revised": return .orange
        default: return .secondary
        }
    }

    private func approvalColor(for approval: String) -> Color {
        switch approval {
        case "Approved": return .green
        case "Pending": return .orange
        case "Rejected": return .red
        default: return .secondary
        }
    }
}

/// Mirrors src/components/proposals/ProposalForm.tsx
struct ProposalFormView: View {
    let proposalId: String?

    var body: some View {
        Form {
            Text("Proposal form — coming soon")
        }
        .navigationTitle(proposalId == nil ? "New Proposal" : "Edit Proposal")
    }
}
