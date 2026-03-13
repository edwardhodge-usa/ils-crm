import SwiftUI
import SwiftData

// MARK: - TaskFormView

/// Create / Edit sheet for CRMTask — mirrors src/components/tasks/TaskForm.tsx
///
/// - `crmTask: nil`      → create mode (new CRMTask with local_ prefix ID)
/// - `crmTask: existing` → edit mode (updates in place)
struct TaskFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let crmTask: CRMTask?  // nil = create, non-nil = edit

    // MARK: - Form State

    @State private var taskName: String = ""
    @State private var status: String = "To Do"
    @State private var priority: String = ""
    @State private var type: String = ""
    @State private var dueDate: Date = Date()
    @State private var hasDueDate: Bool = false
    @State private var completedDate: Date = Date()
    @State private var hasCompletedDate: Bool = false
    @State private var notes: String = ""

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
                TextField("Task name", text: $taskName)
            }

            Section("Details") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Priority", selection: $priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Type", selection: $type) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
            }

            Section("Schedule") {
                Toggle("Due Date", isOn: $hasDueDate)
                if hasDueDate {
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                }

                if status == "Completed" {
                    Toggle("Completed Date", isOn: $hasCompletedDate)
                    if hasCompletedDate {
                        DatePicker("Completed", selection: $completedDate, displayedComponents: .date)
                    }
                }
            }

            Section("Notes") {
                TextEditor(text: $notes)
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
                    .disabled(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear { loadExistingTask() }
    }

    // MARK: - Load Existing Task (edit mode)

    private func loadExistingTask() {
        guard let task = crmTask else { return }
        taskName = task.task ?? ""
        status   = task.status   ?? "To Do"
        priority = task.priority ?? ""
        type     = task.type     ?? ""
        notes    = task.notes    ?? ""

        if let due = task.dueDate {
            dueDate    = due
            hasDueDate = true
        }
        if let completed = task.completedDate {
            completedDate    = completed
            hasCompletedDate = true
        }
    }

    // MARK: - Save

    private func save() {
        let name = taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        if let task = crmTask {
            task.task          = name
            task.status        = status
            task.priority      = priority.isEmpty  ? nil : priority
            task.type          = type.isEmpty      ? nil : type
            task.dueDate       = hasDueDate        ? dueDate : nil
            task.completedDate = (status == "Completed" && hasCompletedDate) ? completedDate : nil
            task.notes         = notes.isEmpty     ? nil : notes
            task.localModifiedAt = Date()
            task.isPendingPush = true
        } else {
            let newTask = CRMTask(
                id: "local_\(UUID().uuidString)",
                task: name,
                isPendingPush: true
            )
            newTask.status        = status
            newTask.priority      = priority.isEmpty  ? nil : priority
            newTask.type          = type.isEmpty      ? nil : type
            newTask.dueDate       = hasDueDate        ? dueDate : nil
            newTask.completedDate = (status == "Completed" && hasCompletedDate) ? completedDate : nil
            newTask.notes         = notes.isEmpty     ? nil : notes
            newTask.localModifiedAt = Date()
            modelContext.insert(newTask)
        }

        dismiss()
    }
}
