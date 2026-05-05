import SwiftUI
import SwiftData

// MARK: - TaskFormView

/// Create / Edit sheet for CRMTask — mirrors src/components/tasks/TaskForm.tsx
///
/// - `crmTask: nil`      → create mode (new CRMTask with local_ prefix ID)
/// - `crmTask: existing` → edit mode (updates in place)
struct TaskFormView: View {
    @Environment(\.dismiss) private var dismiss

    let modelContext: ModelContext

    let crmTask: CRMTask?  // nil = create, non-nil = edit
    let initialAssignee: String?

    // MARK: - Form State

    /// Bundled state. SwiftUI re-evaluates ancestors on @Query change; bundling
    /// prevents per-field @State resets when the parent (TasksView) refreshes
    /// during a sync. Same pattern as iOS TaskFormView (see project memory:
    /// "Form sheets: bundle all @State fields in a single struct").
    private struct FormState {
        var taskName: String = ""
        var status: String = "To Do"
        var priority: String = ""
        var type: String = ""
        var assignedTo: String = ""
        var dueDate: Date = Date()
        var hasDueDate: Bool = false
        var completedDate: Date = Date()
        var hasCompletedDate: Bool = false
        var notes: String = ""
    }
    @State private var form = FormState()

    /// Unique assignee names extracted from all existing tasks
    private var assigneeOptions: [String] {
        let descriptor = FetchDescriptor<CRMTask>()
        let allTasks = (try? modelContext.fetch(descriptor)) ?? []
        return Array(Set(allTasks.compactMap { $0.assignedTo }.filter { !$0.isEmpty })).sorted()
    }

    /// Maps display name → full collaborator JSON string from existing tasks.
    /// Same approach as Electron's `buildCollaboratorMap(records, fieldName)`.
    private var collaboratorMap: [String: String] {
        let descriptor = FetchDescriptor<CRMTask>()
        let allTasks = (try? modelContext.fetch(descriptor)) ?? []
        return Dictionary(
            allTasks
                .filter { $0.assignedTo != nil && $0.assignedToData != nil }
                .map { ($0.assignedTo!, $0.assignedToData!) },
            uniquingKeysWith: { _, last in last }
        )
    }

    init(modelContext: ModelContext, crmTask: CRMTask? = nil, initialAssignee: String? = nil) {
        self.modelContext = modelContext
        self.crmTask = crmTask
        self.initialAssignee = initialAssignee
    }

    // MARK: - Options (matching Airtable select values)

    private let statusOptions   = ["To Do", "In Progress", "Waiting", "Completed"]
    private let priorityOptions = ["🔴 High", "🟡 Medium", "🟢 Low"]
    private let typeOptions     = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    private var isCreate: Bool { crmTask == nil }

    // MARK: - Body

    var body: some View {
        Form {
            Section("Task") {
                TextField("Task name", text: $form.taskName)
            }

            Section("Details") {
                Picker("Status", selection: $form.status) {
                    ForEach(statusOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Priority", selection: $form.priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Type", selection: $form.type) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Assigned To", selection: $form.assignedTo) {
                    Text("Unassigned").tag("")
                    ForEach(assigneeOptions, id: \.self) { name in
                        Text(name).tag(name)
                    }
                }
            }

            Section("Schedule") {
                Toggle("Due Date", isOn: $form.hasDueDate)
                if form.hasDueDate {
                    DatePicker("Due", selection: $form.dueDate, displayedComponents: .date)
                }

                if form.status == "Completed" {
                    Toggle("Completed Date", isOn: $form.hasCompletedDate)
                    if form.hasCompletedDate {
                        DatePicker("Completed", selection: $form.completedDate, displayedComponents: .date)
                    }
                }
            }

            Section("Notes") {
                TextEditor(text: $form.notes)
                    .frame(minHeight: 100)
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isCreate ? "New Task" : "Edit Task")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(form.taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear { loadExistingTask() }
    }

    // MARK: - Load Existing Task (edit mode)

    private func loadExistingTask() {
        if let task = crmTask {
            form.taskName   = task.task ?? ""
            form.status     = task.status   ?? "To Do"
            form.priority   = task.priority ?? ""
            form.type       = task.type     ?? ""
            form.assignedTo = task.assignedTo ?? ""
            form.notes      = task.notes    ?? ""

            if let due = task.dueDate {
                form.dueDate    = due
                form.hasDueDate = true
            }
            if let completed = task.completedDate {
                form.completedDate    = completed
                form.hasCompletedDate = true
            }
        } else if let initial = initialAssignee, !initial.isEmpty {
            form.assignedTo = initial
        }
    }

    // MARK: - Save

    private func save() {
        let name = form.taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        // Resolve collaborator data from picker selection
        let resolvedAssignedTo = form.assignedTo.isEmpty ? nil : form.assignedTo
        let resolvedAssignedToData = resolvedAssignedTo.flatMap { collaboratorMap[$0] }

        if let task = crmTask {
            task.task          = name
            task.status        = form.status
            task.priority      = form.priority.isEmpty  ? nil : form.priority
            task.type          = form.type.isEmpty      ? nil : form.type
            task.assignedTo    = resolvedAssignedTo
            task.assignedToData = resolvedAssignedToData
            task.dueDate       = form.hasDueDate        ? form.dueDate : nil
            task.completedDate = (form.status == "Completed" && form.hasCompletedDate) ? form.completedDate : nil
            task.notes         = form.notes.isEmpty     ? nil : form.notes
            task.localModifiedAt = Date()
            task.isPendingPush = true
        } else {
            let newTask = CRMTask(
                id: "local_\(UUID().uuidString)",
                task: name,
                isPendingPush: true
            )
            newTask.status        = form.status
            newTask.priority      = form.priority.isEmpty  ? nil : form.priority
            newTask.type          = form.type.isEmpty      ? nil : form.type
            newTask.assignedTo    = resolvedAssignedTo
            newTask.assignedToData = resolvedAssignedToData
            newTask.dueDate       = form.hasDueDate        ? form.dueDate : nil
            newTask.completedDate = (form.status == "Completed" && form.hasCompletedDate) ? form.completedDate : nil
            newTask.notes         = form.notes.isEmpty     ? nil : form.notes
            newTask.localModifiedAt = Date()
            modelContext.insert(newTask)
        }

        dismiss()
    }
}
