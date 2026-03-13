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

    @State private var showDeleteConfirm = false
    @State private var hasDueDate: Bool

    // MARK: - Options

    private let priorityOptions = ["", "🔴 High", "🟡 Medium", "🟢 Low"]
    private let statusOptions   = ["To Do", "In Progress", "Waiting", "Completed"]
    private let typeOptions     = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    // MARK: - Init

    init(task: CRMTask) {
        self.task = task
        _hasDueDate = State(initialValue: task.dueDate != nil)
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

                // NOTES section
                DetailSection(title: "Notes") {
                    notesEditor
                }
                .padding(.horizontal, 16)

                // DETAILS section
                DetailSection(title: "Details") {
                    detailsSection
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
                modelContext.delete(task)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
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
            set: { newVal in
                task.task = newVal.isEmpty ? nil : newVal
                markModified()
            }
        ))
        .font(.title3)
        .fontWeight(.semibold)
        .textFieldStyle(.plain)
        .padding(.bottom, 4)
    }

    // MARK: - Notes Editor

    private var notesEditor: some View {
        VStack(alignment: .leading, spacing: 0) {
            Divider()
            TextEditor(text: Binding(
                get: { task.notes ?? "" },
                set: { newVal in
                    task.notes = newVal.isEmpty ? nil : newVal
                    markModified()
                }
            ))
            .font(.body)
            .frame(minHeight: 80)
            .scrollContentBackground(.hidden)
            .padding(.horizontal, 4)
            .padding(.vertical, 4)
            Divider()
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(spacing: 0) {
            // Due Date row
            VStack(spacing: 0) {
                HStack {
                    Text("Due Date")
                        .foregroundStyle(.primary)
                    Spacer()
                    if hasDueDate {
                        DatePicker(
                            "",
                            selection: Binding(
                                get: { task.dueDate ?? Date() },
                                set: { newVal in
                                    task.dueDate = newVal
                                    markModified()
                                }
                            ),
                            displayedComponents: .date
                        )
                        .labelsHidden()
                        .font(.subheadline)

                        Button {
                            task.dueDate = nil
                            hasDueDate = false
                            markModified()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                                .font(.system(size: 14))
                        }
                        .buttonStyle(.plain)
                    } else {
                        Button("Add Date") {
                            task.dueDate = Date()
                            hasDueDate = true
                            markModified()
                        }
                        .font(.subheadline)
                        .foregroundStyle(Color.accentColor)
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 36)
                Divider()
            }

            // Priority row
            pickerRow(
                label: "Priority",
                value: task.priority ?? "None",
                options: priorityOptions,
                selection: Binding(
                    get: { task.priority ?? "" },
                    set: { newVal in
                        task.priority = newVal.isEmpty ? nil : newVal
                        markModified()
                    }
                ),
                noneTag: ""
            )

            // Status row
            pickerRow(
                label: "Status",
                value: task.status ?? "—",
                options: statusOptions,
                selection: Binding(
                    get: { task.status ?? "To Do" },
                    set: { newVal in
                        task.status = newVal
                        markModified()
                    }
                ),
                noneTag: nil
            )

            // Type row
            pickerRow(
                label: "Type",
                value: task.type ?? "—",
                options: typeOptions,
                selection: Binding(
                    get: { task.type ?? "" },
                    set: { newVal in
                        task.type = newVal.isEmpty ? nil : newVal
                        markModified()
                    }
                ),
                noneTag: ""
            )

            // Assigned To row (read-only — collaborator field)
            VStack(spacing: 0) {
                HStack {
                    Text("Assigned To")
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(task.assignedTo ?? "—")
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 36)
                Divider()
            }
        }
    }

    @ViewBuilder
    private func pickerRow(
        label: String,
        value: String,
        options: [String],
        selection: Binding<String>,
        noneTag: String?
    ) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                Spacer()
                Menu {
                    if let noneTag {
                        Button("None") { selection.wrappedValue = noneTag }
                        Divider()
                    }
                    ForEach(options.filter { $0 != (noneTag ?? "__sentinel__") }, id: \.self) { option in
                        Button(option) { selection.wrappedValue = option }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(value.isEmpty ? "None" : value)
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                        Text("⌃")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                }
                .menuStyle(.borderlessButton)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
            Divider()
        }
    }

    // MARK: - Related Section

    private var relatedSection: some View {
        VStack(spacing: 0) {
            RelatedRecordRow(
                label: "Opportunities",
                items: salesOpportunityLabels,
                onAdd: { /* future: link picker */ }
            )
            RelatedRecordRow(
                label: "Contacts",
                items: contactLabels,
                onAdd: { /* future: link picker */ }
            )
            RelatedRecordRow(
                label: "Projects",
                items: projectLabels,
                onAdd: { /* future: link picker */ }
            )
            RelatedRecordRow(
                label: "Proposals",
                items: proposalLabels,
                onAdd: { /* future: link picker */ }
            )
        }
    }

    // Linked record ID arrays converted to display labels.
    // Until names are resolved via join queries, show abbreviated IDs as placeholders.
    private var salesOpportunityLabels: [String] {
        task.salesOpportunitiesIds.map { abbreviate($0) }
    }
    private var contactLabels: [String] {
        task.contactsIds.map { abbreviate($0) }
    }
    private var projectLabels: [String] {
        task.projectsIds.map { abbreviate($0) }
    }
    private var proposalLabels: [String] {
        task.proposalIds.map { abbreviate($0) }
    }

    private func abbreviate(_ id: String) -> String {
        id.count > 10 ? "rec" + id.suffix(6) : id
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
