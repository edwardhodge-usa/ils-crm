#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task creation form — dark neon bento design.
struct iOSTaskFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var formState = TaskFormState()

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed"]
    private let priorityOptions = ["High", "Medium", "Low"]
    private let typeOptions = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    @State private var cachedAssignees: [String] = []
    @State private var cachedCollaboratorMap: [String: String] = [:]

    var body: some View {
        Form {
            Section("Task") {
                TextField("Task name", text: $formState.taskName)
            }

            Section("Details") {
                Picker("Status", selection: $formState.status) {
                    ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.navigationLink)

                Picker("Priority", selection: $formState.priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.navigationLink)

                Picker("Type", selection: $formState.type) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.navigationLink)

                Picker("Assigned To", selection: $formState.assignedTo) {
                    Text("Unassigned").tag("")
                    ForEach(cachedAssignees, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.navigationLink)
            }

            Section("Schedule") {
                Toggle("Due Date", isOn: $formState.hasDueDate)
                if formState.hasDueDate {
                    DatePicker("Due", selection: $formState.dueDate, displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextEditor(text: $formState.notes)
                    .frame(minHeight: 80)
            }
        }
        .navigationTitle("New Task")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(formState.taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear {
            let descriptor = FetchDescriptor<CRMTask>()
            let allTasks = (try? modelContext.fetch(descriptor)) ?? []
            cachedAssignees = Array(Set(allTasks.compactMap(\.assignedTo).filter { !$0.isEmpty })).sorted()
            cachedCollaboratorMap = Dictionary(
                allTasks
                    .filter { $0.assignedTo != nil && $0.assignedToData != nil }
                    .map { ($0.assignedTo!, $0.assignedToData!) },
                uniquingKeysWith: { _, last in last }
            )
        }
    }

    private func save() {
        let name = formState.taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        let resolvedAssignedTo = formState.assignedTo.isEmpty ? nil : formState.assignedTo
        let resolvedAssignedToData = resolvedAssignedTo.flatMap { cachedCollaboratorMap[$0] }

        let newTask = CRMTask(
            id: "local_\(UUID().uuidString)",
            task: name,
            isPendingPush: true
        )
        newTask.status = formState.status
        newTask.priority = formState.priority.isEmpty ? nil : formState.priority
        newTask.type = formState.type.isEmpty ? nil : formState.type
        newTask.assignedTo = resolvedAssignedTo
        newTask.assignedToData = resolvedAssignedToData
        newTask.dueDate = formState.hasDueDate ? formState.dueDate : nil
        newTask.notes = formState.notes.isEmpty ? nil : formState.notes
        newTask.localModifiedAt = Date()
        modelContext.insert(newTask)

        dismiss()
    }
}

/// Holds all form fields in a single @State to prevent SwiftUI from resetting individual values.
private struct TaskFormState {
    var taskName = ""
    var status = "To Do"
    var priority = ""
    var type = ""
    var assignedTo = ""
    var dueDate = Date()
    var hasDueDate = false
    var notes = ""
}
#endif
