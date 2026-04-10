#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task creation form — presented as a sheet from the "+" button.
/// Mirrors the macOS TaskFormView but uses iOS-native Form styling.
struct iOSTaskFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query private var allTasks: [CRMTask]

    @State private var taskName = ""
    @State private var status = "To Do"
    @State private var priority = ""
    @State private var type = ""
    @State private var assignedTo = ""
    @State private var dueDate = Date()
    @State private var hasDueDate = false
    @State private var notes = ""
    @State private var saveHaptic = false

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed"]
    private let priorityOptions = ["🔴 High", "🟡 Medium", "🟢 Low"]
    private let typeOptions = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    private var assigneeOptions: [String] {
        Array(Set(allTasks.compactMap { $0.assignedTo }.filter { !$0.isEmpty })).sorted()
    }

    private var collaboratorMap: [String: String] {
        Dictionary(
            allTasks
                .filter { $0.assignedTo != nil && $0.assignedToData != nil }
                .map { ($0.assignedTo!, $0.assignedToData!) },
            uniquingKeysWith: { _, last in last }
        )
    }

    var body: some View {
        Form {
            Section("Task") {
                TextField("Task name", text: $taskName)
            }

            Section("Details") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("Priority", selection: $priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { option in
                        priorityLabel(option).tag(option)
                    }
                }
                Picker("Type", selection: $type) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("Assigned To", selection: $assignedTo) {
                    Text("Unassigned").tag("")
                    ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                }
            }

            Section("Schedule") {
                Toggle("Due Date", isOn: $hasDueDate)
                if hasDueDate {
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextEditor(text: $notes)
                    .frame(minHeight: 80)
            }
        }
        .sensoryFeedback(.success, trigger: saveHaptic)
        .navigationTitle("New Task")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save(); saveHaptic.toggle() }
                    .disabled(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    @ViewBuilder
    private func priorityLabel(_ raw: String) -> some View {
        if raw.contains("High") {
            Label("High", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
        } else if raw.contains("Medium") {
            Label("Medium", systemImage: "minus.circle.fill").foregroundStyle(.orange)
        } else if raw.contains("Low") {
            Label("Low", systemImage: "arrow.down.circle.fill").foregroundStyle(.green)
        } else {
            Text(raw)
        }
    }

    private func save() {
        let name = taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        let resolvedAssignedTo = assignedTo.isEmpty ? nil : assignedTo
        let resolvedAssignedToData = resolvedAssignedTo.flatMap { collaboratorMap[$0] }

        let newTask = CRMTask(
            id: "local_\(UUID().uuidString)",
            task: name,
            isPendingPush: true
        )
        newTask.status = status
        newTask.priority = priority.isEmpty ? nil : priority
        newTask.type = type.isEmpty ? nil : type
        newTask.assignedTo = resolvedAssignedTo
        newTask.assignedToData = resolvedAssignedToData
        newTask.dueDate = hasDueDate ? dueDate : nil
        newTask.notes = notes.isEmpty ? nil : notes
        newTask.localModifiedAt = Date()
        modelContext.insert(newTask)

        dismiss()
    }
}
#endif
