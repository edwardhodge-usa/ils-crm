import SwiftUI
import SwiftData

/// Proposal detail pane — mirrors src/components/proposals/Proposal360Page.tsx
///
/// Renders inline in the split-view right panel (not as a sheet).
/// Uses shared DetailSection / DetailFieldRow / EditableFieldRow / RelatedRecordRow components.
/// Uses @Bindable for direct SwiftData mutation with pending-push tracking.
struct ProposalDetailView: View {
    @Environment(\.modelContext) private var modelContext

    @Bindable var proposal: Proposal

    @State private var showEditSheet = false
    @State private var showDeleteConfirm = false

    init(proposal: Proposal) {
        self.proposal = proposal
    }

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

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "status": proposal.status = str
        case "approvalStatus": proposal.approvalStatus = str
        case "proposedValue":
            if let s = str, let d = Double(s) { proposal.proposedValue = d }
            else { proposal.proposedValue = nil }
        case "version": proposal.version = str
        case "templateUsed": proposal.templateUsed = str
        case "notes": proposal.notes = str
        case "scopeSummary": proposal.scopeSummary = str
        case "clientFeedback": proposal.clientFeedback = str
        case "performanceMetrics": proposal.performanceMetrics = str
        default: break
        }
        proposal.localModifiedAt = Date()
        proposal.isPendingPush = true
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
                    VStack(spacing: 0) {
                        DetailFieldRow(label: "Proposal Date", value: proposal.dateSent.map {
                            DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
                        } ?? "—")
                        DetailFieldRow(label: "Expiration", value: proposal.validUntil.map {
                            DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
                        } ?? "—")
                        EditableFieldRow(
                            label: "Value",
                            key: "proposedValue",
                            type: .number(prefix: "$"),
                            value: proposal.proposedValue.map { String(format: "%.0f", $0) },
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Status",
                            key: "status",
                            type: .singleSelect(options: [
                                "Draft", "Pending Approval", "Approved", "Sent to Client",
                                "Closed Won", "Closed Lost", "Submitted", "In Review", "Rejected"
                            ]),
                            value: proposal.status,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Approval",
                            key: "approvalStatus",
                            type: .singleSelect(options: [
                                "Not Submitted", "Submitted", "Approved", "Rejected", "Pending", "Under Review"
                            ]),
                            value: proposal.approvalStatus,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Version",
                            key: "version",
                            type: .text,
                            value: proposal.version,
                            onSave: saveField
                        )
                        EditableFieldRow(
                            label: "Template",
                            key: "templateUsed",
                            type: .singleSelect(options: [
                                "Basic", "Detailed", "Custom", "Standard Template", "Custom Template",
                                "Marketing Template", "IT Template", "Service Template", "Design Template",
                                "Security Template", "Strategy Template", "HR Template", "Event Template"
                            ]),
                            value: proposal.templateUsed,
                            onSave: saveField
                        )
                    }
                }
                .padding(.horizontal, 20)

                // ── Notes ─────────────────────────────────────────────
                DetailSection(title: "NOTES") {
                    VStack(spacing: 0) {
                        EditableFieldRow(label: "", key: "notes", type: .textarea, value: proposal.notes, onSave: saveField)
                    }
                }
                .padding(.horizontal, 20)

                // ── Scope Summary ─────────────────────────────────────
                DetailSection(title: "SCOPE SUMMARY") {
                    VStack(spacing: 0) {
                        EditableFieldRow(label: "", key: "scopeSummary", type: .textarea, value: proposal.scopeSummary, onSave: saveField)
                    }
                }
                .padding(.horizontal, 20)

                // ── Client Feedback ───────────────────────────────────
                DetailSection(title: "CLIENT FEEDBACK") {
                    VStack(spacing: 0) {
                        EditableFieldRow(label: "", key: "clientFeedback", type: .textarea, value: proposal.clientFeedback, onSave: saveField)
                    }
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
