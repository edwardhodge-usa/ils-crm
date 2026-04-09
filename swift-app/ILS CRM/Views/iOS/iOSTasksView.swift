#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task list — NavigationStack with grouped sections.
/// Reuses the same grouping logic as macOS TasksView but with iPhone-native patterns:
/// NavigationStack, .searchable, swipe actions, pull-to-refresh.
struct iOSTasksView: View {
    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var sortOrder: TaskSortOrder = .dueDate
    @State private var showNewTask = false
    @State private var filterMode: TaskFilterMode = .allTasks

    // MARK: - Filter Mode

    enum TaskFilterMode: String, CaseIterable {
        case allTasks = "All"
        case overdue = "Overdue"
        case today = "Today"
        case scheduled = "Scheduled"
        case completed = "Completed"
    }

    // MARK: - Date Helpers

    private var today: Date { Calendar.current.startOfDay(for: Date()) }

    private func isOverdue(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        let isComplete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        return Calendar.current.startOfDay(for: due) < today && !isComplete
    }

    private func isToday(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) == today
    }

    private func isScheduled(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) > today
    }

    private func isCompleted(_ task: CRMTask) -> Bool {
        task.status?.localizedCaseInsensitiveContains("complet") ?? false
    }

    private func isWaiting(_ task: CRMTask) -> Bool {
        task.status?.localizedCaseInsensitiveContains("waiting") ?? false
    }

    // MARK: - Filtered + Sorted Tasks

    private var filteredTasks: [CRMTask] {
        var result = Array(tasks)

        // Filter mode
        switch filterMode {
        case .allTasks:  result = result.filter { !isCompleted($0) }
        case .overdue:   result = result.filter { isOverdue($0) }
        case .today:     result = result.filter { isToday($0) && !isOverdue($0) }
        case .scheduled: result = result.filter { isScheduled($0) && !isWaiting($0) }
        case .completed: result = result.filter { isCompleted($0) }
        }

        // Search
        if !searchText.isEmpty {
            result = result.filter { task in
                (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return sortTasks(result)
    }

    // MARK: - Grouped Sections (for All Tasks mode)

    private var overdueTasks: [CRMTask] {
        sortTasks(tasks.filter { isOverdue($0) && matchesSearch($0) })
    }
    private var todayTasks: [CRMTask] {
        sortTasks(tasks.filter { isToday($0) && !isOverdue($0) && !isCompleted($0) && matchesSearch($0) })
    }
    private var waitingTasks: [CRMTask] {
        sortTasks(tasks.filter { isWaiting($0) && !isOverdue($0) && !isToday($0) && matchesSearch($0) })
    }
    private var noDateTasks: [CRMTask] {
        sortTasks(tasks.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) && matchesSearch($0) })
    }
    private var scheduledTasks: [CRMTask] {
        sortTasks(tasks.filter { isScheduled($0) && !isWaiting($0) && matchesSearch($0) })
    }

    private func matchesSearch(_ task: CRMTask) -> Bool {
        if searchText.isEmpty { return true }
        return (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
               (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
    }

    // MARK: - Sort

    private func sortTasks(_ tasks: [CRMTask]) -> [CRMTask] {
        switch sortOrder {
        case .dueDate:
            return tasks.sorted { a, b in
                switch (a.dueDate, b.dueDate) {
                case (nil, nil): return false
                case (nil, _):   return false
                case (_, nil):   return true
                case let (ad?, bd?): return ad < bd
                }
            }
        case .nameAZ:
            return tasks.sorted {
                ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedAscending
            }
        case .nameZA:
            return tasks.sorted {
                ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedDescending
            }
        case .priorityHighLow:
            return tasks.sorted { priorityRank($0.priority) < priorityRank($1.priority) }
        case .dateCreated:
            return tasks.sorted { a, b in
                switch (a.airtableModifiedAt, b.airtableModifiedAt) {
                case (nil, nil): return false
                case (nil, _):   return false
                case (_, nil):   return true
                case let (ad?, bd?): return ad > bd
                }
            }
        }
    }

    private func priorityRank(_ priority: String?) -> Int {
        guard let p = priority else { return 3 }
        if p.localizedCaseInsensitiveContains("high")   { return 0 }
        if p.localizedCaseInsensitiveContains("medium") { return 1 }
        if p.localizedCaseInsensitiveContains("low")    { return 2 }
        return 3
    }

    private func priorityColor(_ priority: String?) -> Color {
        guard let p = priority else { return .gray }
        if p.localizedCaseInsensitiveContains("high")   { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        if p.localizedCaseInsensitiveContains("low")    { return .green }
        return .gray
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Group {
                if filterMode == .allTasks && searchText.isEmpty {
                    groupedListView
                } else {
                    flatListView
                }
            }
            .navigationTitle("Tasks")
            .searchable(text: $searchText, prompt: "Search tasks")
            .refreshable {
                await syncEngine.forceSync()
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Picker("Filter", selection: $filterMode) {
                            ForEach(TaskFilterMode.allCases, id: \.self) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("Sort", selection: $sortOrder) {
                            ForEach(TaskSortOrder.allCases, id: \.self) { order in
                                Text(order.rawValue).tag(order)
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewTask = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showNewTask) {
                NavigationStack {
                    iOSTaskFormView()
                }
            }
        }
    }

    // MARK: - Grouped List (default All Tasks view)

    private var groupedListView: some View {
        List {
            taskSection("Overdue", tasks: overdueTasks, color: .red, icon: "exclamationmark.triangle.fill")
            taskSection("Today", tasks: todayTasks, color: .orange, icon: "sun.max.fill")
            taskSection("Waiting", tasks: waitingTasks, color: .yellow, icon: "hourglass")
            taskSection("No Date", tasks: noDateTasks, color: .secondary, icon: "calendar.badge.minus")
            taskSection("Scheduled", tasks: scheduledTasks, color: .blue, icon: "calendar")
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: String.self) { taskId in
            if let task = tasks.first(where: { $0.id == taskId }) {
                iOSTaskDetailView(task: task)
            }
        }
        .overlay {
            if overdueTasks.isEmpty && todayTasks.isEmpty && waitingTasks.isEmpty &&
               noDateTasks.isEmpty && scheduledTasks.isEmpty {
                ContentUnavailableView("No Tasks", systemImage: "checklist",
                    description: Text("All caught up!"))
            }
        }
    }

    // MARK: - Flat List (filtered/searched view)

    private var flatListView: some View {
        List {
            ForEach(filteredTasks) { task in
                taskRow(task)
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: String.self) { taskId in
            if let task = tasks.first(where: { $0.id == taskId }) {
                iOSTaskDetailView(task: task)
            }
        }
        .overlay {
            if filteredTasks.isEmpty {
                ContentUnavailableView.search(text: searchText)
            }
        }
    }

    // MARK: - Section

    @ViewBuilder
    private func taskSection(_ title: String, tasks: [CRMTask], color: Color, icon: String) -> some View {
        if !tasks.isEmpty {
            Section {
                ForEach(tasks) { task in
                    taskRow(task)
                }
            } header: {
                Label(title, systemImage: icon)
                    .foregroundStyle(color)
                    .font(.subheadline.weight(.semibold))
            }
        }
    }

    // MARK: - Task Row

    @ViewBuilder
    private func taskRow(_ task: CRMTask) -> some View {
        NavigationLink(value: task.id) {
            HStack(spacing: 12) {
                // Priority dot
                Circle()
                    .fill(priorityColor(task.priority))
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 3) {
                    Text(task.task ?? "Untitled")
                        .font(.body)
                        .strikethrough(isCompleted(task))
                        .foregroundStyle(isCompleted(task) ? .secondary : .primary)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        if let due = task.dueDate {
                            Text(due, style: .date)
                                .font(.caption)
                                .foregroundStyle(isOverdue(task) ? .red : .secondary)
                        }
                        if let type = task.type, !type.isEmpty {
                            Text(type)
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
        }
        .swipeActions(edge: .leading) {
            Button {
                toggleComplete(task)
            } label: {
                Label(
                    isCompleted(task) ? "Undo" : "Done",
                    systemImage: isCompleted(task) ? "arrow.uturn.backward" : "checkmark"
                )
            }
            .tint(isCompleted(task) ? .orange : .green)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                deleteTask(task)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Actions

    private func toggleComplete(_ task: CRMTask) {
        let wasCompleted = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        task.status = wasCompleted ? "To Do" : "Completed"
        task.completedDate = wasCompleted ? nil : Date()
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    private func deleteTask(_ task: CRMTask) {
        syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
        modelContext.delete(task)
    }
}
#endif
