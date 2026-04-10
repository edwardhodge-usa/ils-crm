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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var searchText = ""
    @State private var sortOrder: TaskSortOrder = .dueDate
    @State private var showNewTask = false
    @State private var filterMode: TaskFilterMode = .allTasks
    @State private var completionHaptic = false
    @State private var taskToDelete: CRMTask?

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

    private func checkboxBorderColor(_ task: CRMTask) -> Color {
        if isCompleted(task) { return .green }
        return priorityColor(task.priority) == .gray ? Color(white: 0.5) : priorityColor(task.priority)
    }

    /// Per-type badge colors matching the desktop app (bg at 22% opacity, distinct fg per light/dark)
    private static let typeBadgeColors: [String: (bg: Color, fg: Color, fgDark: Color)] = [
        "Schedule Meeting":     (Color(red: 0.188, green: 0.690, blue: 0.780).opacity(0.22), Color(red: 0.055, green: 0.478, blue: 0.553), Color(red: 0.251, green: 0.796, blue: 0.878)),
        "Send Qualifications":  (Color(red: 0.0, green: 0.478, blue: 1.0).opacity(0.22), Color(red: 0.0, green: 0.333, blue: 0.702), Color(red: 0.251, green: 0.612, blue: 1.0)),
        "Follow-up Email":      (Color(red: 0.686, green: 0.322, blue: 0.871).opacity(0.22), Color(red: 0.537, green: 0.267, blue: 0.671), Color(red: 0.749, green: 0.353, blue: 0.949)),
        "Follow-up Call":       (Color(red: 0.204, green: 0.780, blue: 0.349).opacity(0.22), Color(red: 0.141, green: 0.541, blue: 0.239), Color(red: 0.188, green: 0.820, blue: 0.345)),
        "Other":                (Color(red: 0.557, green: 0.557, blue: 0.576).opacity(0.22), Color(red: 0.388, green: 0.388, blue: 0.400), Color(red: 0.596, green: 0.596, blue: 0.616)),
        "Presentation Deck":    (Color(red: 1.0, green: 0.584, blue: 0.0).opacity(0.22), Color(red: 0.788, green: 0.204, blue: 0.0), Color(red: 1.0, green: 0.624, blue: 0.039)),
        "Research":             (Color(red: 1.0, green: 0.176, blue: 0.333).opacity(0.22), Color(red: 0.827, green: 0.0, blue: 0.278), Color(red: 1.0, green: 0.216, blue: 0.373)),
        "Administrative":       (Color(red: 0.345, green: 0.337, blue: 0.839).opacity(0.22), Color(red: 0.212, green: 0.204, blue: 0.639), Color(red: 0.369, green: 0.361, blue: 0.902)),
        "Send Proposal":        (Color(red: 0.196, green: 0.678, blue: 0.902).opacity(0.22), Color(red: 0.0, green: 0.443, blue: 0.643), Color(red: 0.392, green: 0.824, blue: 1.0)),
        "Internal Review":      (Color(red: 0.635, green: 0.518, blue: 0.369).opacity(0.22), Color(red: 0.486, green: 0.396, blue: 0.271), Color(red: 0.675, green: 0.557, blue: 0.408)),
        "Project":              (Color(red: 0.0, green: 0.780, blue: 0.745).opacity(0.22), Color(red: 0.047, green: 0.506, blue: 0.482), Color(red: 0.388, green: 0.902, blue: 0.886)),
        "Travel":               (Color(red: 1.0, green: 0.231, blue: 0.188).opacity(0.22), Color(red: 0.839, green: 0.0, blue: 0.082), Color(red: 1.0, green: 0.271, blue: 0.227)),
    ]

    private func priorityAccessibilityLabel(_ priority: String?) -> String {
        guard let p = priority else { return "No priority" }
        if p.localizedCaseInsensitiveContains("high")   { return "High priority" }
        if p.localizedCaseInsensitiveContains("medium") { return "Medium priority" }
        if p.localizedCaseInsensitiveContains("low")    { return "Low priority" }
        return "No priority"
    }

    private func taskAccessibilityLabel(_ task: CRMTask) -> String {
        var parts: [String] = []
        parts.append(task.task ?? "Untitled")
        parts.append(priorityAccessibilityLabel(task.priority))
        if isOverdue(task) { parts.append("Overdue") }
        if let due = task.dueDate {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            parts.append("Due \(formatter.string(from: due))")
        }
        if let type = task.type, !type.isEmpty { parts.append(type) }
        if isCompleted(task) { parts.append("Completed") }
        return parts.joined(separator: ", ")
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
                    .accessibilityLabel("Filter tasks")
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
                    .accessibilityLabel("Sort tasks")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewTask = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Add new task")
                }
            }
            .sheet(isPresented: $showNewTask) {
                NavigationStack {
                    iOSTaskFormView()
                }
            }
            .sensoryFeedback(.success, trigger: completionHaptic)
            .confirmationDialog("Delete this task?", isPresented: Binding(
                get: { taskToDelete != nil },
                set: { if !$0 { taskToDelete = nil } }
            ), titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    if let task = taskToDelete {
                        deleteTask(task)
                        taskToDelete = nil
                    }
                }
                Button("Cancel", role: .cancel) {
                    taskToDelete = nil
                }
            } message: {
                Text("This action cannot be undone.")
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
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(color)
                    Text(title.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(color)
                    Text("(\(tasks.count))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Task Row

    @Environment(\.colorScheme) private var colorScheme

    private static let dueDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    @ViewBuilder
    private func taskRow(_ task: CRMTask) -> some View {
        let completed = isCompleted(task)
        NavigationLink(value: task.id) {
            HStack(spacing: 10) {
                // Circular checkbox — priority-colored border, green fill when done
                ZStack {
                    Circle()
                        .stroke(checkboxBorderColor(task), lineWidth: 1.5)
                        .frame(width: 22, height: 22)
                    if completed {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 22, height: 22)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    // Name + priority dot
                    HStack(spacing: 4) {
                        Text(task.task ?? "Untitled")
                            .font(.system(size: 15, weight: .medium))
                            .strikethrough(completed)
                            .foregroundStyle(completed ? .tertiary : .primary)
                            .lineLimit(2)
                        if let p = task.priority, !completed {
                            Circle()
                                .fill(priorityColor(p))
                                .frame(width: 7, height: 7)
                                .accessibilityLabel(priorityAccessibilityLabel(p))
                        }
                    }

                    // Date + type badge
                    HStack(spacing: 5) {
                        if let due = task.dueDate {
                            Text(Self.dueDateFormatter.string(from: due))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(isOverdue(task) ? .red : .secondary)
                        }
                        if let type = task.type, !type.isEmpty {
                            let colors = Self.typeBadgeColors[type]
                            Text(type)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(colorScheme == .dark ? (colors?.fgDark ?? .secondary) : (colors?.fg ?? .secondary))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(colors?.bg ?? Color.secondary.opacity(0.22))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
        }
        .accessibilityLabel(taskAccessibilityLabel(task))
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
                taskToDelete = task
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
        completionHaptic.toggle()
    }

    private func deleteTask(_ task: CRMTask) {
        syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
        modelContext.delete(task)
    }
}
#endif
