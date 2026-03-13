import SwiftUI
import SwiftData

/// Proposal detail pane — mirrors src/components/proposals/Proposal360Page.tsx
///
/// Renders inline in the split-view right panel (not as a sheet).
/// Uses shared DetailSection / DetailFieldRow / RelatedRecordRow components.
struct ProposalDetailView: View {
    @Environment(\.modelContext) private var modelContext

    let proposal: Proposal

    @State private var showEditSheet = false
    @State private var showDeleteConfirm = false

    // MARK: - Formatters

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    // MARK: - Helpers

    private func formatted(_ date: Date?) -> String {
        guard let date else { return "—" }
        return Self.dateFormatter.string(from: date)
    }

    private func formattedCurrency(_ value: Double?) -> String {
        guard let value, value > 0 else { return "—" }
        return Self.currencyFormatter.string(from: NSNumber(value: value)) ?? "—"
    }

    private func statusColor(for status: String) -> Color {
        switch status {
        case "Draft":    return .gray
        case "Sent":     return .blue
        case "Accepted": return .green
        case "Rejected": return .red
        case "Revised":  return .orange
        default:         return .secondary
        }
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // ── Header ────────────────────────────────────────────
                VStack(alignment: .leading, spacing: 8) {
                    Text(proposal.proposalName ?? "Untitled")
                        .font(.title2)
                        .fontWeight(.bold)

                    if let status = proposal.status, !status.isEmpty {
                        StatusBadge(text: status, color: statusColor(for: status))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 8)

                // ── Proposal Info ─────────────────────────────────────
                DetailSection(title: "PROPOSAL INFO") {
                    DetailFieldRow(label: "Proposal Date", value: formatted(proposal.dateSent))
                    DetailFieldRow(label: "Expiration Date", value: formatted(proposal.validUntil))
                    DetailFieldRow(label: "Amount", value: formattedCurrency(proposal.proposedValue))
                    DetailFieldRow(label: "Currency", value: "USD")
                    DetailFieldRow(label: "Sent To", value: proposal.clientIds.isEmpty ? "—" : "\(proposal.clientIds.count) contact(s)")
                    DetailFieldRow(label: "Status", value: proposal.status ?? "—", showChevron: true)
                }
                .padding(.horizontal, 20)

                // ── Related ───────────────────────────────────────────
                DetailSection(title: "RELATED") {
                    RelatedRecordRow(
                        label: "Companies",
                        items: [],
                        onAdd: nil
                    )
                    RelatedRecordRow(
                        label: "Contacts",
                        items: [],
                        onAdd: nil
                    )
                    RelatedRecordRow(
                        label: "Opportunities",
                        items: [],
                        onAdd: nil
                    )
                }
                .padding(.horizontal, 20)

                // ── Notes ─────────────────────────────────────────────
                DetailSection(title: "NOTES") {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(proposal.notes?.isEmpty == false ? proposal.notes! : "—")
                            .font(.system(size: 13))
                            .foregroundStyle(proposal.notes?.isEmpty == false ? .primary : .secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .textSelection(.enabled)
                        Divider()
                    }
                }
                .padding(.horizontal, 20)

                // ── Actions ───────────────────────────────────────────
                HStack(spacing: 12) {
                    Button {
                        showEditSheet = true
                    } label: {
                        Text("Edit")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.accentColor)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)

                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Text("Delete")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.12))
                            .foregroundStyle(.red)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 20)
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
                modelContext.delete(proposal)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }
}
