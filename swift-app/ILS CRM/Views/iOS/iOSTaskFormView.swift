#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task creation form — dark neon bento design.
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
    private let priorityOptions = ["High", "Medium", "Low"]
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
        ScrollView {
            VStack(spacing: 16) {
                NeonCard(header: "Task") {
                    TextField("Task name", text: $taskName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(NeonTheme.textPrimary)
                }

                NeonCard(header: "Details") {
                    VStack(spacing: 0) {
                        neonPicker("Status", selection: $status) {
                            ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Priority", selection: $priority) {
                            Text("None").tag("")
                            ForEach(priorityOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Type", selection: $type) {
                            Text("None").tag("")
                            ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Assigned To", selection: $assignedTo) {
                            Text("Unassigned").tag("")
                            ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                        }
                    }
                }

                NeonCard(header: "Schedule") {
                    VStack(spacing: 8) {
                        Toggle("Due Date", isOn: $hasDueDate)
                            .tint(NeonTheme.cyan)
                            .foregroundStyle(NeonTheme.textPrimary)
                        if hasDueDate {
                            DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                                .foregroundStyle(NeonTheme.textPrimary)
                        }
                    }
                }

                NeonCard(header: "Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(NeonTheme.textPrimary)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .sensoryFeedback(.success, trigger: saveHaptic)
        .navigationTitle("New Task")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
                    .foregroundStyle(NeonTheme.textSecondary)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save(); saveHaptic.toggle() }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? NeonTheme.textTertiary : NeonTheme.cyan)
                    .disabled(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    // MARK: - Picker Helper

    private func neonPicker<SelectionValue: Hashable, Content: View>(
        _ label: String,
        selection: Binding<SelectionValue>,
        @ViewBuilder content: () -> Content
    ) -> some View {
        Picker(label, selection: selection) {
            content()
        }
        .foregroundStyle(NeonTheme.textPrimary)
        .frame(minHeight: 32)
    }

    // MARK: - Save

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
