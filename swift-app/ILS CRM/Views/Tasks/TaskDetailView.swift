import SwiftUI
import SwiftData

// MARK: - TaskDetailView

/// Inline detail pane for a selected task — Column 4 of TasksView.
///
/// Uses @Bindable for direct two-way editing. SwiftData auto-saves mutations;
/// we set isPendingPush = true so the sync engine knows to push changes.
///
/// Mirrors the Electron task detail pane: large editable title, Notes section,
/// Details section with inline pickers, Related section with linked-record rows,
/// and Complete + Delete action buttons at the bottom.
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

    private var priorityColor: Color {
        guard let p = task.priority else { return .gray }
        if p.localizedCaseInsensitiveContains("high")   { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        if p.localizedCaseInsensitiveContains("low")    { return .green }
        return .gray
    }

    private func markModified() {
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

                // Editable task name
                titleField
                    .padding(.horizontal, 16)
                    .padding(.top, isOverdue ? 10 : 18)

                // DETAILS section
                DetailSection(title: "Details") {
                    detailsSection
                }
                .padding(.horizontal, 16)

                // NOTES section
                DetailSection(title: "Notes") {
                    VStack(spacing: 0) {
                        EditableFieldRow(
                            label: "Notes",
                            key: "notes",
                            type: .textarea,
                            value: task.notes,
                            onSave: { key, val in saveField(key, val) }
                        )
                    }
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.horizontal, 16)

                // RELATED section
                DetailSection(title: "Related") {
                    relatedSection
                }
                .padding(.horizontal, 16)

                // Action buttons
                actionButtons
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
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

    // MARK: - Editable Title

    private var titleField: some View {
        TextField("Task name", text: Binding(
            get: { task.task ?? "" },
            set: { task.task = $0.isEmpty ? nil : $0 }
        ), onCommit: {
            markModified()
        })
        .font(.title3)
        .fontWeight(.semibold)
        .textFieldStyle(.plain)
        .padding(.bottom, 4)
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(spacing: 0) {
            EditableFieldRow(
                label: "Task",
                key: "task",
                type: .text,
                value: task.task,
                onSave: { key, val in saveField(key, val) }
            )

            EditableFieldRow(
                label: "Due Date",
                key: "dueDate",
                type: .date,
                value: task.dueDate.map { Self.isoFormatter.string(from: $0) },
                onSave: { key, val in saveField(key, val) }
            )

            EditableFieldRow(
                label: "Priority",
                key: "priority",
                type: .singleSelect(options: ["🔴 High", "🟡 Medium", "🟢 Low"]),
                value: task.priority,
                onSave: { key, val in saveField(key, val) }
            )

            EditableFieldRow(
                label: "Status",
                key: "status",
                type: .singleSelect(options: ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"]),
                value: task.status,
                onSave: { key, val in saveField(key, val) }
            )

            EditableFieldRow(
                label: "Type",
                key: "type",
                type: .singleSelect(options: [
                    "Schedule Meeting", "Send Qualifications", "Follow-up Email",
                    "Follow-up Call", "Other", "Presentation Deck", "Research",
                    "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
                ]),
                value: task.type,
                onSave: { key, val in saveField(key, val) }
            )

            EditableFieldRow(
                label: "Assigned To",
                key: "assignedTo",
                type: .singleSelect(options: assigneeOptions),
                value: task.assignedTo,
                onSave: { key, val in saveField(key, val) }
            )
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
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

    // MARK: - Related Section

    private var relatedSection: some View {
        VStack(spacing: 0) {
            RelatedRecordRow(
                label: "Opportunities",
                items: salesOpportunityLabels,
                onAdd: { showingOpportunitiesPicker = true }
            )
            RelatedRecordRow(
                label: "Contacts",
                items: contactLabels,
                onAdd: { showingContactsPicker = true }
            )
            RelatedRecordRow(
                label: "Projects",
                items: projectLabels,
                onAdd: { showingProjectsPicker = true }
            )
            RelatedRecordRow(
                label: "Proposals",
                items: proposalLabels,
                onAdd: { showingProposalsPicker = true }
            )
        }
    }

    // Linked record ID arrays resolved to display names via SwiftData lookups.
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

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
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
                let isComplete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
                Label(isComplete ? "Completed" : "Complete", systemImage: isComplete ? "checkmark.circle.fill" : "circle")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 16)
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
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 7)
                    .frame(maxWidth: .infinity)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.red.opacity(0.4), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
    }
}
