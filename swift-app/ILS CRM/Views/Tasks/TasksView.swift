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
                    // TODO: new task
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

// MARK: - Task Form (placeholder)

/// Mirrors src/components/tasks/TaskForm.tsx
struct TaskFormView: View {
    let taskId: String?

    var body: some View {
        Form {
            Text("Task form — coming soon")
        }
        .navigationTitle(taskId == nil ? "New Task" : "Edit Task")
    }
}
