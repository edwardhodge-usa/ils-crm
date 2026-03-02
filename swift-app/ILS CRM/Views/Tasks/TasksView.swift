import SwiftUI
import SwiftData

/// Tasks view — mirrors src/components/tasks/TasksPage.tsx + TaskListPage.tsx
///
/// Features to implement:
/// - Task list with status/priority filters
/// - Due date highlighting (overdue = red)
/// - Grouping and sorting (feature request #6)
/// - Task detail with contact/company/assignee fields (feature request #8)
///
/// Electron hooks: useEntityList('tasks')
struct TasksView: View {
    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @State private var searchText = ""

    var body: some View {
        List(tasks, id: \.id) { task in
            VStack(alignment: .leading) {
                Text(task.task ?? "—")
                    .fontWeight(.medium)
                HStack {
                    if let priority = task.priority {
                        Text(priority)
                            .font(.caption)
                    }
                    if let due = task.dueDate {
                        Text(due, style: .date)
                            .font(.caption)
                            .foregroundStyle(due < Date() ? .red : .secondary)
                    }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search tasks...")
        .navigationTitle("Tasks")
        .toolbar {
            Button { /* TODO: new task */ } label: {
                Image(systemName: "plus")
            }
        }
    }
}

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
