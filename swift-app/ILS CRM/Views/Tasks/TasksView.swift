import SwiftUI
import SwiftData

// MARK: - Status Filter

enum StatusFilter: String, CaseIterable {
    case all = "All"
    case active = "Active"
    case completed = "Completed"
    case overdue = "Overdue"
}

// MARK: - TasksView

/// Tasks list view — mirrors src/components/tasks/TasksPage.tsx + TaskListPage.tsx
///
/// Features:
/// - Segmented filter (All / Active / Completed / Overdue)
/// - Search by task name and notes
/// - Priority color dots, due date, type badges, status badges
/// - Overdue row highlighting
struct TasksView: View {
    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @State private var searchText = ""
    @State private var statusFilter: StatusFilter = .all
    @State private var selectedTask: CRMTask?
    @State private var showingCreateForm = false

    // MARK: - Filtered Tasks

    private var filteredTasks: [CRMTask] {
        var result: [CRMTask]

        switch statusFilter {
        case .all:
            result = tasks
        case .active:
            result = tasks.filter { task in
                !(task.status?.localizedCaseInsensitiveContains("complete") ?? false)
            }
        case .completed:
            result = tasks.filter { task in
                task.status?.localizedCaseInsensitiveContains("complete") ?? false
            }
        case .overdue:
            result = tasks.filter { isOverdue($0) }
        }

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter { task in
                let matchesName = task.task?.localizedCaseInsensitiveContains(searchText) ?? false
                let matchesNotes = task.notes?.localizedCaseInsensitiveContains(searchText) ?? false
                return matchesName || matchesNotes
            }
        }

        return result
    }

    // MARK: - Body

    var body: some View {
        Group {
            if filteredTasks.isEmpty {
                emptyState
            } else {
                taskList
            }
        }
        .searchable(text: $searchText, prompt: "Search tasks...")
        .navigationTitle("Tasks")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Picker("Filter", selection: $statusFilter) {
                    ForEach(StatusFilter.allCases, id: \.self) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
            }
            ToolbarItem(placement: .automatic) {
                Button {
                    showingCreateForm = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(item: $selectedTask) { task in
            NavigationStack {
                TaskDetailView(crmTask: task)
                    .navigationTitle("Task")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedTask = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 450, minHeight: 500)
        }
        .sheet(isPresented: $showingCreateForm) {
            NavigationStack {
                TaskFormView(crmTask: nil)
            }
            .frame(minWidth: 450, minHeight: 500)
        }
    }

    // MARK: - Task List

    private var taskList: some View {
        List(filteredTasks, id: \.id, selection: $selectedTask) { task in
            TaskRowView(task: task, isOverdue: isOverdue(task))
                .contentShape(Rectangle())
                .onTapGesture {
                    selectedTask = task
                }
                .listRowBackground(
                    isOverdue(task)
                        ? Color.red.opacity(0.06)
                        : nil
                )
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyState: some View {
        switch statusFilter {
        case .all:
            if searchText.isEmpty {
                EmptyStateView(
                    title: "No Tasks",
                    description: "Tasks will appear here once synced from Airtable.",
                    systemImage: "checklist"
                )
            } else {
                EmptyStateView(
                    title: "No Results",
                    description: "No tasks match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            }
        case .active:
            EmptyStateView(
                title: "No Active Tasks",
                description: searchText.isEmpty
                    ? "All tasks are completed."
                    : "No active tasks match \"\(searchText)\".",
                systemImage: "checkmark.circle"
            )
        case .completed:
            EmptyStateView(
                title: "No Completed Tasks",
                description: searchText.isEmpty
                    ? "No tasks have been completed yet."
                    : "No completed tasks match \"\(searchText)\".",
                systemImage: "circle"
            )
        case .overdue:
            EmptyStateView(
                title: "No Overdue Tasks",
                description: searchText.isEmpty
                    ? "All tasks are on schedule."
                    : "No overdue tasks match \"\(searchText)\".",
                systemImage: "clock.badge.checkmark"
            )
        }
    }

    // MARK: - Helpers

    private func isOverdue(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        let isComplete = task.status?.localizedCaseInsensitiveContains("complete") ?? false
        return due < Date.now && !isComplete
    }
}

// MARK: - Task Row

private struct TaskRowView: View {
    let task: CRMTask
    let isOverdue: Bool

    private var priorityColor: Color {
        guard let priority = task.priority else { return .gray }
        if priority.localizedCaseInsensitiveContains("high") { return .red }
        if priority.localizedCaseInsensitiveContains("medium") { return .yellow }
        if priority.localizedCaseInsensitiveContains("low") { return .green }
        return .gray
    }

    private static let dueDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    var body: some View {
        HStack(spacing: 12) {
            // Priority dot
            Circle()
                .fill(priorityColor)
                .frame(width: 10, height: 10)

            // Task info
            VStack(alignment: .leading, spacing: 3) {
                Text(task.task ?? "Untitled")
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let due = task.dueDate {
                        Text(Self.dueDateFormatter.string(from: due))
                            .font(.caption)
                            .foregroundStyle(isOverdue ? .red : .secondary)
                    }
                    if let type = task.type, !type.isEmpty {
                        BadgeView(text: type, color: .secondary)
                    }
                }
            }

            Spacer()

            // Status badge
            if let status = task.status, !status.isEmpty {
                BadgeView(text: status, color: statusColor(for: status))
            }
        }
        .padding(.vertical, 2)
    }

    private func statusColor(for status: String) -> Color {
        if status.localizedCaseInsensitiveContains("complete") { return .green }
        if status.localizedCaseInsensitiveContains("progress") { return .blue }
        if status.localizedCaseInsensitiveContains("blocked") { return .red }
        if status.localizedCaseInsensitiveContains("review") { return .orange }
        return .secondary
    }
}

// MARK: - Task Form

/// Full create/edit form — mirrors src/components/tasks/TaskForm.tsx
///
/// - `crmTask: nil` → create mode (inserts new CRMTask with local_ prefix ID)
/// - `crmTask: existing` → edit mode (updates in place)
struct TaskFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let crmTask: CRMTask?  // nil = create, non-nil = edit

    // MARK: - Form State

    @State private var taskName: String = ""
    @State private var status: String = "Not Started"
    @State private var priority: String = ""
    @State private var type: String = ""
    @State private var dueDate: Date = Date()
    @State private var hasDueDate: Bool = false
    @State private var completedDate: Date = Date()
    @State private var hasCompletedDate: Bool = false
    @State private var notes: String = ""

    // MARK: - Options (matching Airtable select values)

    private let statusOptions = ["Not Started", "In Progress", "Complete", "Blocked"]
    private let priorityOptions = ["", "\u{1F534} High", "\u{1F7E1} Medium", "\u{1F7E2} Low"]
    private let typeOptions = [
        "", "Follow-up", "Meeting", "Call", "Email", "Research",
        "Admin", "Review", "Outreach", "Proposal", "Contract", "Onboarding", "Other"
    ]

    private var isCreate: Bool { crmTask == nil }

    // MARK: - Body

    var body: some View {
        Form {
            // Task Name
            Section("Task") {
                TextField("Task name", text: $taskName)
            }

            // Details
            Section("Details") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Priority", selection: $priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions.filter { !$0.isEmpty }, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                Picker("Type", selection: $type) {
                    Text("None").tag("")
                    ForEach(typeOptions.filter { !$0.isEmpty }, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
            }

            // Schedule
            Section("Schedule") {
                Toggle("Due Date", isOn: $hasDueDate)
                if hasDueDate {
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                }

                if status == "Complete" {
                    Toggle("Completed Date", isOn: $hasCompletedDate)
                    if hasCompletedDate {
                        DatePicker("Completed", selection: $completedDate, displayedComponents: .date)
                    }
                }
            }

            // Notes
            Section("Notes") {
                TextEditor(text: $notes)
                    .frame(minHeight: 100)
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isCreate ? "New Task" : "Edit Task")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    save()
                }
                .disabled(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear {
            loadExistingTask()
        }
    }

    // MARK: - Load Existing Task (edit mode)

    private func loadExistingTask() {
        guard let task = crmTask else { return }
        taskName = task.task ?? ""
        status = task.status ?? "Not Started"
        priority = task.priority ?? ""
        type = task.type ?? ""
        notes = task.notes ?? ""

        if let due = task.dueDate {
            dueDate = due
            hasDueDate = true
        }

        if let completed = task.completedDate {
            completedDate = completed
            hasCompletedDate = true
        }
    }

    // MARK: - Save

    private func save() {
        let trimmedName = taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let task = crmTask {
            // Edit mode — update existing
            task.task = trimmedName
            task.status = status
            task.priority = priority.isEmpty ? nil : priority
            task.type = type.isEmpty ? nil : type
            task.dueDate = hasDueDate ? dueDate : nil
            task.completedDate = (status == "Complete" && hasCompletedDate) ? completedDate : nil
            task.notes = notes.isEmpty ? nil : notes
            task.localModifiedAt = Date()
            task.isPendingPush = true
        } else {
            // Create mode — insert new
            let newTask = CRMTask(
                id: "local_\(UUID().uuidString)",
                task: trimmedName,
                isPendingPush: true
            )
            newTask.status = status
            newTask.priority = priority.isEmpty ? nil : priority
            newTask.type = type.isEmpty ? nil : type
            newTask.dueDate = hasDueDate ? dueDate : nil
            newTask.completedDate = (status == "Complete" && hasCompletedDate) ? completedDate : nil
            newTask.notes = notes.isEmpty ? nil : notes
            newTask.localModifiedAt = Date()
            modelContext.insert(newTask)
        }

        dismiss()
    }
}
