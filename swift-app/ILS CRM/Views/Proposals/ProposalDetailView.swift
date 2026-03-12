import SwiftUI
import SwiftData

struct ProposalDetailView: View {
    let proposal: Proposal

    // MARK: - Formatters

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    private func formatted(_ date: Date?) -> String? {
        guard let date else { return nil }
        return Self.dateFormatter.string(from: date)
    }

    private func formattedCurrency(_ value: Double?) -> String? {
        guard let value, value > 0 else { return nil }
        return Self.currencyFormatter.string(from: NSNumber(value: value))
    }

    // MARK: - Color Helpers

    private func statusColor(_ status: String?) -> Color {
        switch status?.lowercased() {
        case "draft": return .gray
        case "sent": return .blue
        case "accepted": return .green
        case "rejected": return .red
        case "revised": return .orange
        default: return .secondary
        }
    }

    private func approvalColor(_ approval: String?) -> Color {
        switch approval?.lowercased() {
        case "approved": return .green
        case "pending": return .orange
        case "rejected": return .red
        default: return .secondary
        }
    }

    // MARK: - Linked Record Counts

    private var linkedClients: Int { proposal.clientIds.count }
    private var linkedCompanies: Int { proposal.companyIds.count }
    private var linkedOpportunities: Int { proposal.relatedOpportunityIds.count }
    private var linkedTasks: Int { proposal.tasksIds.count }
    private var hasLinkedRecords: Bool {
        linkedClients > 0 || linkedCompanies > 0 || linkedOpportunities > 0 || linkedTasks > 0
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                    .padding(.horizontal)
                    .padding(.top)

                Form {
                    proposalInfoSection

                    if let scope = proposal.scopeSummary, !scope.isEmpty {
                        scopeSection(scope)
                    }

                    if let feedback = proposal.clientFeedback, !feedback.isEmpty {
                        clientFeedbackSection(feedback)
                    }

                    if let notes = proposal.notes, !notes.isEmpty {
                        notesSection(notes)
                    }

                    if let metrics = proposal.performanceMetrics, !metrics.isEmpty {
                        performanceSection(metrics)
                    }

                    if hasLinkedRecords {
                        linkedRecordsSection
                    }

                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(proposal.proposalName ?? "Untitled")
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 8) {
                if let status = proposal.status, !status.isEmpty {
                    BadgeView(text: status, color: statusColor(status))
                }
                if let approval = proposal.approvalStatus, !approval.isEmpty {
                    BadgeView(text: approval, color: approvalColor(approval))
                }
            }

            if let formatted = formattedCurrency(proposal.proposedValue) {
                Text(formatted)
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Proposal Info Section

    private var proposalInfoSection: some View {
        Section("Proposal Info") {
            if let status = proposal.status, !status.isEmpty {
                HStack {
                    Text("Status")
                        .foregroundStyle(.secondary)
                    Spacer()
                    BadgeView(text: status, color: statusColor(status))
                }
                .frame(minHeight: 28)
            }

            if let approval = proposal.approvalStatus, !approval.isEmpty {
                HStack {
                    Text("Approval Status")
                        .foregroundStyle(.secondary)
                    Spacer()
                    BadgeView(text: approval, color: approvalColor(approval))
                }
                .frame(minHeight: 28)
            }

            if let version = proposal.version, !version.isEmpty {
                FieldRow(label: "Version", value: version)
            }

            if let template = proposal.templateUsed, !template.isEmpty {
                FieldRow(label: "Template Used", value: template)
            }

            if let currency = formattedCurrency(proposal.proposedValue) {
                FieldRow(label: "Proposed Value", value: currency)
            }

            if let dateSent = formatted(proposal.dateSent) {
                FieldRow(label: "Date Sent", value: dateSent)
            }

            if let validUntil = formatted(proposal.validUntil) {
                FieldRow(label: "Valid Until", value: validUntil)
            }
        }
    }

    // MARK: - Scope Section

    private func scopeSection(_ scope: String) -> some View {
        Section("Scope") {
            Text(scope)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Client Feedback Section

    private func clientFeedbackSection(_ feedback: String) -> some View {
        Section("Client Feedback") {
            Text(feedback)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Notes Section

    private func notesSection(_ notes: String) -> some View {
        Section("Notes") {
            Text(notes)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Performance Section

    private func performanceSection(_ metrics: String) -> some View {
        Section("Performance") {
            Text(metrics)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Linked Records Section

    private var linkedRecordsSection: some View {
        Section("Linked Records") {
            if linkedClients > 0 {
                FieldRow(label: "Clients", value: "\(linkedClients)")
            }
            if linkedCompanies > 0 {
                FieldRow(label: "Companies", value: "\(linkedCompanies)")
            }
            if linkedOpportunities > 0 {
                FieldRow(label: "Opportunities", value: "\(linkedOpportunities)")
            }
            if linkedTasks > 0 {
                FieldRow(label: "Tasks", value: "\(linkedTasks)")
            }
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        Section("Details") {
            if let created = formatted(proposal.airtableModifiedAt) {
                FieldRow(label: "Created", value: created)
            }

            if let modified = formatted(proposal.localModifiedAt) {
                FieldRow(label: "Last Modified", value: modified)
            }

            Text(proposal.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
        }
    }
}
