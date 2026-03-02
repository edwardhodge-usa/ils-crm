import SwiftUI
import SwiftData

/// Proposals list — mirrors src/components/proposals/ProposalListPage.tsx
///
/// Features to implement:
/// - List with proposal name, status, approval status
/// - Detail view with linked opportunity, client, tasks
struct ProposalsView: View {
    @Query(sort: \Proposal.proposalName) private var proposals: [Proposal]

    var body: some View {
        List(proposals, id: \.id) { proposal in
            VStack(alignment: .leading) {
                Text(proposal.proposalName ?? "—")
                    .fontWeight(.medium)
                if let status = proposal.status {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Proposals")
        .toolbar {
            Button { /* TODO: new proposal */ } label: {
                Image(systemName: "plus")
            }
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
