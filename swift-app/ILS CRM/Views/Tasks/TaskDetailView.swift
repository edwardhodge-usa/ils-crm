import SwiftUI
import SwiftData

// MARK: - TaskDetailView

/// Inline detail pane for a selected task — Column 4 of TasksView.
///
/// Uses @Bindable for direct two-way editing. SwiftData auto-saves mutations;
/// we set isPendingPush = true so the sync engine knows to push changes.
///
/// Redesigned with BentoHeroCard + BentoGrid layout.
struct TaskDetailView: View {
    @Bindable var task: CRMTask
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var showDeleteConfirm = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingContactsPicker = false
    @State private var showingProjectsPicker = false
    @State private var showingProposalsPicker = false

    /// Unique assignees for the dropdown, queried from all tasks.
    private var assigneeOptions: [String] {
        let descriptor = FetchDescriptor<CRMTask>()
        let allTasks = (try? modelContext.fetch(descriptor)) ?? []
        return Array(Set(allTasks.compactMap(\.assignedTo))).sorted()
    }

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    private static let displayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    // MARK: - Init

    init(task: CRMTask) {
        self.task = task
    }

    // MARK: - Helpers

    private var isOverdue: Bool {
        guard let due = task.dueDate else { return false }
        let isComplete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        return Calendar.current.startOfDay(for: due) < Calendar.current.startOfDay(for: Date()) && !isComplete
    }

    private var overdueDays: Int {
        guard let due = task.dueDate else { return 0 }
        let start = Calendar.current.startOfDay(for: due)
        let end = Calendar.current.startOfDay(for: Date())
        return Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0
    }

    private var priorityColor: Color {
        guard let p = task.priority else { return .gray }
        if p.localizedCaseInsensitiveContains("high")   { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        if p.localizedCaseInsensitiveContains("low")    { return .green }
        return .gray
    }

    private var assigneeInitials: String {
        guard let name = task.assignedTo, !name.isEmpty else { return "?" }
        let parts = name.split(separator: " ")
        let first = parts.first?.prefix(1) ?? ""
        let last = parts.count > 1 ? parts.last!.prefix(1) : ""
        return String(first + last).uppercased()
    }

    private var isComplete: Bool {
        task.status?.localizedCaseInsensitiveContains("complet") ?? false
    }

    private var completedDateDisplay: String {
        guard let d = task.completedDate else { return "—" }
        return Self.displayDateFormatter.string(from: d)
    }

    private func markModified() {
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    // MARK: - Linked Record Labels

    private var salesOpportunityLabels: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveOpportunities(ids: task.salesOpportunitiesIds)
    }
    private var contactLabels: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveContacts(ids: task.contactsIds)
    }
    private var projectLabels: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProjects(ids: task.projectsIds)
    }
    private var proposalLabels: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProposals(ids: task.proposalIds)
    }

    // MARK: - Save Field

    private func saveField(_ key: String, _ value: Any?) {
        let stringVal = value as? String
        switch key {
        case "task": task.task = stringVal
        case "priority": task.priority = stringVal
        case "status": task.status = stringVal
        case "type": task.type = stringVal
        case "assignedTo": task.assignedTo = stringVal
        case "notes": task.notes = stringVal
        case "dueDate":
            if let dateStr = stringVal {
                task.dueDate = Self.isoFormatter.date(from: dateStr)
            } else {
                task.dueDate = nil
            }
        default: break
        }
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {

                // Overdue banner
                if isOverdue {
                    overdueBanner
                        .padding(.horizontal, 16)
                        .padding(.top, 14)
                }

                // Hero card: checkbox icon + task name + pills + stats
                heroSection
                    .padding(.top, isOverdue ? 10 : 14)
                    .padding(.bottom, 8)

                // Row 1: Schedule + Notes
                BentoGrid(columns: 2) {
                    scheduleCell
                    notesCell
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 10)

                // Row 2: Linked Records + Actions
                BentoGrid(columns: 2) {
                    linkedRecordsCell
                    actionsCell
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .confirmationDialog(
            "Delete this task?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
                modelContext.delete(task)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingOpportunitiesPicker) {
            LinkedRecordPicker(
                title: "Link Opportunities",
                entityType: .opportunities,
                currentIds: Set(task.salesOpportunitiesIds),
                onSave: { ids in
                    task.salesOpportunitiesIds = Array(ids)
                    markModified()
                }
            )
        }
        .sheet(isPresented: $showingContactsPicker) {
            LinkedRecordPicker(
                title: "Link Contacts",
                entityType: .contacts,
                currentIds: Set(task.contactsIds),
                onSave: { ids in
                    task.contactsIds = Array(ids)
                    markModified()
                }
            )
        }
        .sheet(isPresented: $showingProjectsPicker) {
            LinkedRecordPicker(
                title: "Link Projects",
                entityType: .projects,
                currentIds: Set(task.projectsIds),
                onSave: { ids in
                    task.projectsIds = Array(ids)
                    markModified()
                }
            )
        }
        .sheet(isPresented: $showingProposalsPicker) {
            LinkedRecordPicker(
                title: "Link Proposals",
                entityType: .proposals,
                currentIds: Set(task.proposalIds),
                onSave: { ids in
                    task.proposalIds = Array(ids)
                    markModified()
                }
            )
        }
    }

    // MARK: - Overdue Banner

    private var overdueBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            Text("This task is overdue")
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        HStack(spacing: 12) {
            // Checkbox circle icon
            Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 28))
                .foregroundStyle(isComplete ? .green : .secondary)
                .padding(.leading, 16)

            BentoHeroCard(
                name: task.task ?? "Untitled Task",
                avatarSize: 0,
                avatarShape: .circle
            ) {
                // Pills: priority, status, type
                if let priority = task.priority, !priority.isEmpty {
                    BentoPill(text: priority, color: priorityColor)
                }
                if let status = task.status, !status.isEmpty {
                    BentoPill(text: status, color: .blue)
                }
                if let type = task.type, !type.isEmpty {
                    BentoPill(text: type, color: .purple)
                }
            } stats: {
                // Overdue days stat
                if isOverdue {
                    VStack(spacing: 2) {
                        Text("\(overdueDays)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.red)
                        Text("OVERDUE")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                } else {
                    BentoHeroStat(value: "—", label: "OVERDUE")
                }
                // Assigned initials stat
                BentoHeroStat(value: assigneeInitials, label: "ASSIGNED")
            }
        }
    }

    // MARK: - Schedule Cell

    private var scheduleCell: some View {
        BentoCell(title: "Schedule") {
            VStack(spacing: 0) {
                EditableFieldRow(
                    label: "Due Date",
                    key: "dueDate",
                    type: .date,
                    value: task.dueDate.map { Self.isoFormatter.string(from: $0) },
                    onSave: { key, val in saveField(key, val) }
                )
                EditableFieldRow(
                    label: "Status",
                    key: "status",
                    type: .singleSelect(options: ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"]),
                    value: task.status,
                    onSave: { key, val in saveField(key, val) }
                )
                BentoFieldRow(
                    label: "Completed",
                    value: completedDateDisplay
                )
            }
        }
    }

    // MARK: - Notes Cell

    private var notesCell: some View {
        BentoCell(title: "Notes") {
            EditableFieldRow(
                label: "",
                key: "notes",
                type: .textarea,
                value: task.notes,
                onSave: { key, val in saveField(key, val) }
            )
        }
    }

    // MARK: - Linked Records Cell

    private var linkedRecordsCell: some View {
        BentoCell(title: "Linked Records") {
            VStack(alignment: .leading, spacing: 8) {
                linkedRecordGroup(
                    label: "Opportunities",
                    items: salesOpportunityLabels,
                    onAdd: { showingOpportunitiesPicker = true }
                )
                linkedRecordGroup(
                    label: "Contacts",
                    items: contactLabels,
                    onAdd: { showingContactsPicker = true }
                )
                linkedRecordGroup(
                    label: "Projects",
                    items: projectLabels,
                    onAdd: { showingProjectsPicker = true }
                )
                linkedRecordGroup(
                    label: "Proposals",
                    items: proposalLabels,
                    onAdd: { showingProposalsPicker = true }
                )
            }
        }
    }

    @ViewBuilder
    private func linkedRecordGroup(label: String, items: [String], onAdd: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    onAdd()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.accentColor)
                }
                .buttonStyle(.plain)
            }

            if items.isEmpty {
                Text("None")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(items, id: \.self) { item in
                        BentoChip(text: item)
                    }
                }
            }
        }
        .padding(.bottom, 4)
    }

    // MARK: - Actions Cell

    private var actionsCell: some View {
        BentoCell(title: "Actions") {
            VStack(spacing: 10) {
                // Complete button
                Button {
                    let wasCompleted = task.status?.localizedCaseInsensitiveContains("complet") ?? false
                    task.status = wasCompleted ? "To Do" : "Completed"
                    if !wasCompleted {
                        task.completedDate = Date()
                    } else {
                        task.completedDate = nil
                    }
                    markModified()
                } label: {
                    Label(isComplete ? "Completed" : "Complete",
                          systemImage: isComplete ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 13, weight: .medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)

                // Delete button
                Button {
                    showDeleteConfirm = true
                } label: {
                    Text("Delete")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .frame(maxWidth: .infinity)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.red.opacity(0.4), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)

                // Metadata
                if let modified = task.localModifiedAt {
                    VStack(spacing: 0) {
                        BentoFieldRow(
                            label: "Modified",
                            value: Self.displayDateFormatter.string(from: modified)
                        )
                    }
                }
            }
        }
    }
}
