import SwiftUI
import SwiftData

struct TaskDetailView: View {
    let crmTask: CRMTask

    // MARK: - Computed Helpers

    private var isOverdue: Bool {
        guard let due = crmTask.dueDate else { return false }
        let isComplete = crmTask.status?.localizedCaseInsensitiveContains("complete") ?? false
        return due < Date.now && !isComplete
    }

    private var priorityColor: Color {
        let p = crmTask.priority ?? ""
        if p.localizedCaseInsensitiveContains("high") { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .yellow }
        if p.localizedCaseInsensitiveContains("low") { return .green }
        return .gray
    }

    private var statusColor: Color {
        let s = (crmTask.status ?? "").lowercased()
        if s.contains("complete") { return .green }
        if s.contains("in progress") || s.contains("in-progress") { return .blue }
        if s.contains("blocked") { return .red }
        if s.contains("review") { return .orange }
        return .secondary
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    private func formatted(_ date: Date?) -> String? {
        guard let date else { return nil }
        return Self.dateFormatter.string(from: date)
    }

    // MARK: - Linked Record Counts

    private var linkedOpportunities: Int { crmTask.salesOpportunitiesIds.count }
    private var linkedContacts: Int { crmTask.contactsIds.count }
    private var linkedProjects: Int { crmTask.projectsIds.count }
    private var linkedProposals: Int { crmTask.proposalIds.count }
    private var hasLinkedRecords: Bool {
        linkedOpportunities > 0 || linkedContacts > 0 || linkedProjects > 0 || linkedProposals > 0
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Overdue Banner
                if isOverdue {
                    overdueBanner
                        .padding(.horizontal)
                        .padding(.top)
                }

                // Header
                header
                    .padding(.horizontal)
                    .padding(.top)

                // Form Content
                Form {
                    taskInfoSection

                    if let notes = crmTask.notes, !notes.isEmpty {
                        notesSection(notes)
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

    // MARK: - Overdue Banner

    private var overdueBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            Text("This task is overdue")
                .fontWeight(.medium)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(crmTask.task ?? "Untitled")
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 8) {
                Circle()
                    .fill(priorityColor)
                    .frame(width: 10, height: 10)

                if let status = crmTask.status, !status.isEmpty {
                    BadgeView(text: status, color: statusColor)
                }
            }
        }
    }

    // MARK: - Task Info Section

    private var taskInfoSection: some View {
        Section("Task Info") {
            if let status = crmTask.status, !status.isEmpty {
                HStack {
                    Text("Status")
                        .foregroundStyle(.secondary)
                    Spacer()
                    BadgeView(text: status, color: statusColor)
                }
                .frame(minHeight: 28)
            }

            if let priority = crmTask.priority, !priority.isEmpty {
                HStack {
                    Text("Priority")
                        .foregroundStyle(.secondary)
                    Spacer()
                    BadgeView(text: priority, color: priorityColor)
                }
                .frame(minHeight: 28)
            }

            if let type = crmTask.type, !type.isEmpty {
                FieldRow(label: "Type", value: type)
            }

            if let due = crmTask.dueDate, let formatted = formatted(due) {
                HStack {
                    Text("Due Date")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(formatted)
                        .foregroundStyle(isOverdue ? .red : .primary)
                }
                .frame(minHeight: 28)
            }

            if let completed = crmTask.completedDate, let formatted = formatted(completed) {
                FieldRow(label: "Completed", value: formatted)
            }
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

    // MARK: - Linked Records Section

    private var linkedRecordsSection: some View {
        Section("Linked Records") {
            if linkedOpportunities > 0 {
                FieldRow(label: "Opportunities", value: "\(linkedOpportunities)")
            }
            if linkedContacts > 0 {
                FieldRow(label: "Contacts", value: "\(linkedContacts)")
            }
            if linkedProjects > 0 {
                FieldRow(label: "Projects", value: "\(linkedProjects)")
            }
            if linkedProposals > 0 {
                FieldRow(label: "Proposals", value: "\(linkedProposals)")
            }
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        Section("Details") {
            if let created = formatted(crmTask.airtableModifiedAt) {
                FieldRow(label: "Created", value: created)
            }

            if let modified = formatted(crmTask.localModifiedAt) {
                FieldRow(label: "Last Modified", value: modified)
            }

            Text(crmTask.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
        }
    }
}
