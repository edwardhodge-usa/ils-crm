#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task list — dark neon bento design.
struct iOSTasksView: View {
    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var sortOrder: TaskSortOrder = .dueDate
    @State private var selectedFilter: String = "All"
    @State private var showNewTask = false
    @State private var completionHaptic = false
    @State private var taskToDelete: CRMTask?

    private static let filterOptions: [(name: String, color: Color)] = [
        ("All", NeonTheme.cyan),
        ("Overdue", NeonTheme.neonRed),
        ("Today", NeonTheme.electricBlue),
        ("Scheduled", NeonTheme.neonPurple),
        ("Waiting", NeonTheme.neonYellow),
        ("No Date", NeonTheme.textSecondary),
        ("Completed", NeonTheme.neonGreen),
    ]

    // MARK: - Date Helpers

    private var today: Date { Calendar.current.startOfDay(for: Date()) }

    private func isOverdue(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) < today && !isCompleted(task)
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

    // MARK: - Grouped Sections

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
    private var completedTasks: [CRMTask] {
        sortTasks(tasks.filter { isCompleted($0) && matchesSearch($0) })
    }

    private func matchesSearch(_ task: CRMTask) -> Bool {
        if searchText.isEmpty { return true }
        return (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
               (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
    }

    private var isFilterActive: Bool { selectedFilter != "All" }

    // MARK: - Counts

    private var activeCount: Int { tasks.filter { !isCompleted($0) }.count }
    private var overdueCount: Int { tasks.filter { isOverdue($0) }.count }
    private var todayCount: Int { tasks.filter { isToday($0) && !isOverdue($0) && !isCompleted($0) }.count }
    private var scheduledCount: Int { tasks.filter { isScheduled($0) && !isWaiting($0) }.count }
    private var completedCount: Int { tasks.filter { isCompleted($0) }.count }
    private var waitingCount: Int { tasks.filter { isWaiting($0) && !isOverdue($0) && !isToday($0) }.count }
    private var noDateCount: Int { tasks.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) }.count }
    private var hasAnyTasks: Bool {
        !overdueTasks.isEmpty || !todayTasks.isEmpty || !waitingTasks.isEmpty ||
        !noDateTasks.isEmpty || !scheduledTasks.isEmpty
    }

    private func filterCount(_ name: String) -> Int {
        switch name {
        case "All": return activeCount
        case "Overdue": return overdueCount
        case "Today": return todayCount
        case "Scheduled": return scheduledCount
        case "Waiting": return waitingCount
        case "No Date": return noDateCount
        case "Completed": return completedCount
        default: return 0
        }
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
            return tasks.sorted { ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedAscending }
        case .nameZA:
            return tasks.sorted { ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedDescending }
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
        guard let p = priority else { return NeonTheme.textTertiary }
        if p.localizedCaseInsensitiveContains("high")   { return NeonTheme.neonRed }
        if p.localizedCaseInsensitiveContains("medium") { return NeonTheme.neonOrange }
        if p.localizedCaseInsensitiveContains("low")    { return NeonTheme.neonGreen }
        return NeonTheme.textTertiary
    }

    private func checkboxBorderColor(_ task: CRMTask) -> Color {
        if isCompleted(task) { return NeonTheme.neonGreen }
        return priorityColor(task.priority) == NeonTheme.textTertiary ? Color.white.opacity(0.3) : priorityColor(task.priority)
    }

    private static let typeBadgeColors: [String: (bg: Color, glow: Color)] = [
        "Schedule Meeting":     (NeonTheme.cyan.opacity(0.15),           NeonTheme.cyan),
        "Send Qualifications":  (NeonTheme.electricBlue.opacity(0.15),   NeonTheme.electricBlue),
        "Follow-up Email":      (NeonTheme.neonPurple.opacity(0.15),     NeonTheme.neonPurple),
        "Follow-up Call":       (NeonTheme.neonGreen.opacity(0.15),      NeonTheme.neonGreen),
        "Other":                (Color.white.opacity(0.08),              Color.white.opacity(0.5)),
        "Presentation Deck":    (NeonTheme.neonOrange.opacity(0.15),     NeonTheme.neonOrange),
        "Research":             (NeonTheme.neonRed.opacity(0.15),        NeonTheme.neonRed),
        "Administrative":       (NeonTheme.electricBlue.opacity(0.12),   NeonTheme.electricBlue),
        "Send Proposal":        (NeonTheme.cyan.opacity(0.12),           NeonTheme.cyan),
        "Internal Review":      (NeonTheme.neonYellow.opacity(0.12),     NeonTheme.neonYellow),
        "Project":              (NeonTheme.neonGreen.opacity(0.12),      NeonTheme.neonGreen),
        "Travel":               (NeonTheme.magenta.opacity(0.15),        NeonTheme.magenta),
    ]

    private static let dueDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    // MARK: - Body

    var body: some View {
        NavigationStack {
            listContent
                .background(NeonTheme.background)
                .scrollContentBackground(.hidden)
                .navigationTitle("Tasks")
                .navigationBarTitleDisplayMode(.inline)
                .toolbarBackground(.hidden, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        HStack(spacing: 4) {
                            Menu {
                                Picker("Sort", selection: $sortOrder) {
                                    ForEach(TaskSortOrder.allCases, id: \.self) { order in
                                        Text(order.rawValue).tag(order)
                                    }
                                }
                            } label: {
                                Image(systemName: "arrow.up.arrow.down")
                                    .font(.system(size: 16))
                                    .foregroundStyle(NeonTheme.cyan)
                            }
                            .accessibilityLabel("Sort tasks")
                            Button { showNewTask = true } label: {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 22))
                                    .foregroundStyle(NeonTheme.cyan)
                            }
                            .accessibilityLabel("Add new task")
                        }
                    }
                }
                .refreshable {
                    await syncEngine.forceSync()
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
                    Button("Cancel", role: .cancel) { taskToDelete = nil }
                } message: {
                    Text("This action cannot be undone.")
                }
                .navigationDestination(for: String.self) { taskId in
                    if let task = tasks.first(where: { $0.id == taskId }) {
                        iOSTaskDetailView(task: task)
                    }
                }
        }
    }

    // MARK: - List Content (supports swipe actions)

    private var listContent: some View {
        List {
            // Search + summary + filter chips
            Section {
                // Search
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(NeonTheme.textTertiary)
                    TextField("Search tasks", text: $searchText)
                        .font(.system(size: 15))
                        .foregroundStyle(NeonTheme.textPrimary)
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(NeonTheme.cardSurface)
                )
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                if !tasks.isEmpty {
                    summaryStrip
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    filterChips
                        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 4, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            }

            // Task sections
            if !isFilterActive || selectedFilter == "Overdue" {
                taskSection("Overdue", tasks: overdueTasks, color: NeonTheme.neonRed, icon: "exclamationmark.triangle.fill")
            }
            if !isFilterActive || selectedFilter == "Today" {
                taskSection("Today", tasks: todayTasks, color: NeonTheme.neonOrange, icon: "sun.max.fill")
            }
            if !isFilterActive || selectedFilter == "Waiting" {
                taskSection("Waiting", tasks: waitingTasks, color: NeonTheme.neonYellow, icon: "hourglass")
            }
            if !isFilterActive || selectedFilter == "No Date" {
                taskSection("No Date", tasks: noDateTasks, color: NeonTheme.textSecondary, icon: "calendar.badge.minus")
            }
            if !isFilterActive || selectedFilter == "Scheduled" {
                taskSection("Scheduled", tasks: scheduledTasks, color: NeonTheme.electricBlue, icon: "calendar")
            }
            if selectedFilter == "All" || selectedFilter == "Completed" {
                taskSection("Completed", tasks: completedTasks, color: NeonTheme.neonGreen, icon: "checkmark.circle.fill")
            }

            // Empty state
            if !hasAnyTasks && selectedFilter == "All" {
                emptyState
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .listSectionSpacing(4)
    }

    // MARK: - Summary Strip (horizontal scroll)

    private var summaryStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                neonSummaryChip(count: activeCount, label: "All", color: NeonTheme.cyan, icon: "tray.fill")
                neonSummaryChip(count: overdueCount, label: "Overdue", color: NeonTheme.neonRed, icon: "exclamationmark.circle.fill")
                neonSummaryChip(count: todayCount, label: "Today", color: NeonTheme.electricBlue, icon: "calendar.circle.fill")
                neonSummaryChip(count: scheduledCount, label: "Scheduled", color: NeonTheme.neonPurple, icon: "calendar.badge.clock")
                neonSummaryChip(count: waitingCount, label: "Waiting", color: NeonTheme.neonYellow, icon: "hourglass")
            }
            .padding(.horizontal, 16)
        }
    }

    private func neonSummaryChip(count: Int, label: String, color: Color, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.5), radius: 4)
            Text("\(count)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(NeonTheme.textSecondary)
                .textCase(.uppercase)
                .tracking(0.3)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(NeonTheme.cardSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Filter Chips

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Self.filterOptions, id: \.name) { option in
                    let isSelected = selectedFilter == option.name
                    let count = filterCount(option.name)
                    Button {
                        selectedFilter = isSelected ? "All" : option.name
                    } label: {
                        HStack(spacing: 4) {
                            Text(option.name)
                                .font(.system(size: 13, weight: .semibold))
                            if count > 0 {
                                Text("\(count)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(isSelected ? .black.opacity(0.6) : option.color)
                            }
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 36)
                        .background(
                            Capsule(style: .continuous)
                                .fill(isSelected ? option.color : NeonTheme.cardSurface)
                        )
                        .foregroundStyle(isSelected ? .black : NeonTheme.textPrimary)
                        .overlay {
                            if !isSelected {
                                Capsule(style: .continuous)
                                    .stroke(option.color.opacity(0.25), lineWidth: 1)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Task Section (List-based for swipe actions)

    @ViewBuilder
    private func taskSection(_ title: String, tasks: [CRMTask], color: Color, icon: String) -> some View {
        if !tasks.isEmpty {
            Section {
                ForEach(tasks) { task in
                    taskRow(task)
                        .swipeActions(edge: .leading) {
                            Button { toggleComplete(task) } label: {
                                Label(isCompleted(task) ? "Undo" : "Done",
                                      systemImage: isCompleted(task) ? "arrow.uturn.backward" : "checkmark")
                            }
                            .tint(isCompleted(task) ? .orange : .green)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) { taskToDelete = task } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                        .listRowBackground(NeonTheme.cardSurface)
                        .listRowSeparator(.hidden)
                }
            } header: {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(color)
                        .shadow(color: color.opacity(0.5), radius: 4)
                    Text(title.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.8)
                        .foregroundStyle(color)
                    Text("\(tasks.count)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(NeonTheme.textTertiary)
                    Spacer()
                }
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 4, trailing: 16))
            }
        }
    }

    // MARK: - Task Row

    private func taskRow(_ task: CRMTask) -> some View {
        let completed = isCompleted(task)
        return NavigationLink(value: task.id) {
            HStack(spacing: 12) {
                // Checkbox
                ZStack {
                    Circle()
                        .stroke(checkboxBorderColor(task).opacity(completed ? 1 : 0.6), lineWidth: 1.5)
                        .frame(width: 22, height: 22)
                    if completed {
                        Circle()
                            .fill(NeonTheme.neonGreen)
                            .frame(width: 22, height: 22)
                            .shadow(color: NeonTheme.neonGreen.opacity(0.5), radius: 4)
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.black)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 5) {
                        Text(task.task ?? "Untitled")
                            .font(.system(size: 15, weight: .medium))
                            .strikethrough(completed)
                            .foregroundStyle(completed ? NeonTheme.textTertiary : NeonTheme.textPrimary)
                            .lineLimit(2)
                        if let p = task.priority, !completed {
                            Circle()
                                .fill(priorityColor(p))
                                .frame(width: 6, height: 6)
                                .shadow(color: priorityColor(p).opacity(0.6), radius: 3)
                        }
                    }

                    HStack(spacing: 6) {
                        if let due = task.dueDate {
                            Text(Self.dueDateFormatter.string(from: due))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(isOverdue(task) ? NeonTheme.neonRed : NeonTheme.textSecondary)
                        }
                        if let type = task.type, !type.isEmpty {
                            let colors = Self.typeBadgeColors[type]
                            Text(type)
                                .font(.system(size: 10, weight: .bold))
                                .tracking(0.3)
                                .foregroundStyle(colors?.glow ?? NeonTheme.textSecondary)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(
                                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                                        .fill(colors?.bg ?? Color.white.opacity(0.06))
                                )
                        }
                    }
                }

                Spacer()
            }
            .frame(minHeight: 44)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "checklist")
                .font(.system(size: 36, weight: .thin))
                .foregroundStyle(NeonTheme.cyan.opacity(0.4))
                .shadow(color: NeonTheme.cyan.opacity(0.2), radius: 12)
            Text("No Tasks")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(NeonTheme.textPrimary)
            Text("Tap + to create a task")
                .font(.system(size: 13))
                .foregroundStyle(NeonTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
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
