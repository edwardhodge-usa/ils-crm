import SwiftUI
import SwiftData
import Combine

// MARK: - TasksView

/// Tasks — 4-column layout mirroring the Electron TasksPage.tsx + TaskListPage.tsx.
///
/// Column 1 (170pt) — Assigned sidebar: All + per-assignee rows with avatar + count badge
/// Column 2 (170pt) — Smart Lists + By Type filter panel
/// Column 3 (380pt) — Task list: grouped into Overdue / Today / Waiting On / No Date sections
/// Column 4 (flex)  — Inline TaskDetailView or empty state
struct TasksView: View {

    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @Environment(\.modelContext) private var modelContext

    // Column 1 — Assignee filter
    @State private var selectedAssignee: String? = nil   // nil = All

    // Column 2 — Smart list OR type filter (mutually exclusive)
    @State private var selectedSmartList: String = "All Tasks"
    @State private var selectedType: String? = nil

    // Column 3
    @State private var searchText: String = ""
    @State private var selectedTask: CRMTask?

    // Sheet
    @State private var showNewTask = false

    // MARK: - Constants

    private static let taskTypes: [String] = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    /// 12-color deterministic palette for type squares
    private static let typePalette: [Color] = [
        .blue, .purple, .orange, .green, .teal, .red,
        .indigo, .pink, .mint, .yellow, .cyan, .brown
    ]

    private static let dueDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    // MARK: - Date helpers

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

    // MARK: - Unique Assignees

    private var sortedAssignees: [String] {
        Array(Set(tasks.compactMap(\.assignedTo))).sorted()
    }

    // MARK: - Assignee-filtered tasks (Column 1 gate)

    private var assigneeFilteredTasks: [CRMTask] {
        guard let assignee = selectedAssignee else { return Array(tasks) }
        return tasks.filter { $0.assignedTo == assignee }
    }

    // MARK: - Smart list counts (computed on full tasks list, not filtered)

    private func smartListCount(_ name: String) -> Int {
        switch name {
        case "All Tasks":   return tasks.filter { !isCompleted($0) }.count
        case "Overdue":     return tasks.filter { isOverdue($0) }.count
        case "Today":       return tasks.filter { isToday($0) }.count
        case "Scheduled":   return tasks.filter { isScheduled($0) }.count
        case "No Date":     return tasks.filter { $0.dueDate == nil && !isCompleted($0) }.count
        case "Waiting":     return tasks.filter { isWaiting($0) }.count
        case "Completed":   return tasks.filter { isCompleted($0) }.count
        default:            return 0
        }
    }

    private func typeCount(_ type: String) -> Int {
        tasks.filter { task in
            guard let t = task.type else { return false }
            return t.localizedCaseInsensitiveContains(type)
        }.count
    }

    // MARK: - Fully filtered tasks for Column 3

    private var filteredTasks: [CRMTask] {
        var result = assigneeFilteredTasks

        // Smart list filter
        if let type = selectedType {
            result = result.filter { task in
                guard let t = task.type else { return false }
                return t.localizedCaseInsensitiveContains(type)
            }
        } else {
            switch selectedSmartList {
            case "All Tasks":   result = result.filter { !isCompleted($0) }
            case "Overdue":     result = result.filter { isOverdue($0) }
            case "Today":       result = result.filter { isToday($0) }
            case "Scheduled":   result = result.filter { isScheduled($0) }
            case "No Date":     result = result.filter { $0.dueDate == nil && !isCompleted($0) }
            case "Waiting":     result = result.filter { isWaiting($0) }
            case "Completed":   result = result.filter { isCompleted($0) }
            default:            break
            }
        }

        // Search filter
        if !searchText.isEmpty {
            result = result.filter { task in
                (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return result
    }

    // MARK: - Grouped sections

    private var overdueTasks:   [CRMTask] { filteredTasks.filter { isOverdue($0) } }
    private var todayTasks:     [CRMTask] { filteredTasks.filter { isToday($0) && !isOverdue($0) } }
    private var waitingTasks:   [CRMTask] { filteredTasks.filter { isWaiting($0) && !isOverdue($0) && !isToday($0) } }
    private var noDateTasks:    [CRMTask] { filteredTasks.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) } }
    private var scheduledTasks: [CRMTask] { filteredTasks.filter { isScheduled($0) && !isWaiting($0) } }
    private var completedTasks: [CRMTask] { filteredTasks.filter { isCompleted($0) } }

    private var filterName: String {
        if let type = selectedType { return type }
        return selectedSmartList
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // Column 1 — Assigned
            assignedColumn
                .frame(width: 170)

            Divider()

            // Column 2 — Smart Lists + By Type
            filterColumn
                .frame(width: 170)

            Divider()

            // Column 3 — Task List
            taskListColumn
                .frame(width: 380)

            Divider()

            // Column 4 — Detail
            detailColumn
        }
        .sheet(isPresented: $showNewTask) {
            NavigationStack {
                TaskFormView(crmTask: nil)
            }
            .frame(minWidth: 450, minHeight: 500)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewTask = true
        }
    }

    // MARK: - Column 1: Assigned

    private var assignedColumn: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                Text("ASSIGNED")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.top, 14)
                    .padding(.bottom, 6)

                // "All" row
                assigneeRow(name: nil, count: tasks.count)

                // Per-assignee rows
                ForEach(sortedAssignees, id: \.self) { assignee in
                    assigneeRow(name: assignee, count: tasks.filter { $0.assignedTo == assignee }.count)
                }
            }
        }
    }

    @ViewBuilder
    private func assigneeRow(name: String?, count: Int) -> some View {
        let isSelected = (name == selectedAssignee)
        HStack(spacing: 8) {
            if let name {
                AvatarView(name: name, avatarSize: .small)
                Text(name)
                    .font(.caption)
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(1)
            } else {
                Text("All")
                    .font(.caption)
                    .foregroundStyle(isSelected ? .white : .primary)
            }
            Spacer()
            // Count badge
            Text("\(count)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(isSelected ? Color.accentColor : .secondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(isSelected ? Color.white.opacity(0.2) : Color.secondary.opacity(0.12))
                .clipShape(Capsule())
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isSelected ? Color.accentColor : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            selectedAssignee = name
        }
    }

    // MARK: - Column 2: Filter Panel

    private static let smartLists: [(name: String, dotColor: Color)] = [
        ("All Tasks",  .blue),
        ("Overdue",    .red),
        ("Today",      .blue),
        ("Scheduled",  .blue),
        ("No Date",    .gray),
        ("Waiting",    .yellow),
        ("Completed",  .green),
    ]

    private var filterColumn: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {

                // SMART LISTS header
                Text("SMART LISTS")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.top, 14)
                    .padding(.bottom, 6)

                ForEach(Self.smartLists, id: \.name) { item in
                    smartListRow(name: item.name, dotColor: item.dotColor, count: smartListCount(item.name))
                }

                // BY TYPE header
                Text("BY TYPE")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.top, 14)
                    .padding(.bottom, 6)

                ForEach(Array(Self.taskTypes.enumerated()), id: \.offset) { index, type in
                    typeRow(name: type, color: Self.typePalette[index % Self.typePalette.count], count: typeCount(type))
                }

                // Footer
                Text("Auto-populated from Airtable")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
                    .padding(.bottom, 12)
            }
        }
    }

    @ViewBuilder
    private func smartListRow(name: String, dotColor: Color, count: Int) -> some View {
        let isSelected = (selectedType == nil && selectedSmartList == name)
        HStack(spacing: 8) {
            Circle()
                .fill(dotColor)
                .frame(width: 8, height: 8)
            Text(name)
                .font(.caption)
                .foregroundStyle(isSelected ? .white : .primary)
                .lineLimit(1)
            Spacer()
            if count > 0 {
                Text("\(count)")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(isSelected ? Color.accentColor : (name == "All Tasks" ? .red : .secondary))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(isSelected ? Color.white.opacity(0.2) : Color.secondary.opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isSelected ? Color.accentColor : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            selectedSmartList = name
            selectedType = nil
        }
    }

    @ViewBuilder
    private func typeRow(name: String, color: Color, count: Int) -> some View {
        let isSelected = (selectedType == name)
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 8, height: 8)
            Text(name)
                .font(.caption)
                .foregroundStyle(isSelected ? .white : .primary)
                .lineLimit(1)
            Spacer()
            Text("\(count)")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(isSelected ? Color.accentColor : .secondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(isSelected ? Color.white.opacity(0.2) : Color.secondary.opacity(0.12))
                .clipShape(Capsule())
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isSelected ? Color.accentColor : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            selectedType = name
        }
    }

    // MARK: - Column 3: Task List

    private var taskListColumn: some View {
        VStack(spacing: 0) {
            // Header
            ListHeader(
                title: filterName,
                count: filteredTasks.count,
                buttonLabel: "+ New Task",
                onButton: { showNewTask = true }
            )

            Divider()

            // Search bar
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                TextField("Search tasks...", text: $searchText)
                    .font(.subheadline)
                    .textFieldStyle(.plain)
                if !searchText.isEmpty {
                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color(.controlBackgroundColor))

            Divider()

            // Grouped list
            if filteredTasks.isEmpty {
                EmptyStateView(
                    title: "No Tasks",
                    description: searchText.isEmpty
                        ? "No tasks match the current filter."
                        : "No tasks match \"\(searchText)\".",
                    systemImage: "checklist"
                )
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0, pinnedViews: .sectionHeaders) {
                        taskSection(
                            tasks: overdueTasks,
                            icon: { AnyView(Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)) },
                            label: "OVERDUE",
                            labelColor: .red
                        )
                        taskSection(
                            tasks: todayTasks,
                            icon: { AnyView(Circle().fill(Color.orange).frame(width: 8, height: 8)) },
                            label: "TODAY",
                            labelColor: .orange
                        )
                        taskSection(
                            tasks: waitingTasks,
                            icon: { AnyView(Image(systemName: "diamond.fill").foregroundStyle(.yellow)) },
                            label: "WAITING ON",
                            labelColor: .yellow
                        )
                        taskSection(
                            tasks: noDateTasks,
                            icon: { AnyView(Circle().fill(Color.secondary).frame(width: 8, height: 8)) },
                            label: "NO DATE",
                            labelColor: .secondary
                        )
                        taskSection(
                            tasks: scheduledTasks,
                            icon: { AnyView(Image(systemName: "calendar").foregroundStyle(.blue)) },
                            label: "SCHEDULED",
                            labelColor: .blue
                        )
                        taskSection(
                            tasks: completedTasks,
                            icon: { AnyView(Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)) },
                            label: "COMPLETED",
                            labelColor: .green
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func taskSection<Icon: View>(
        tasks: [CRMTask],
        icon: () -> Icon,
        label: String,
        labelColor: Color
    ) -> some View {
        if !tasks.isEmpty {
            Section {
                ForEach(tasks) { task in
                    taskRow(task)
                    Divider().padding(.leading, 32)
                }
            } header: {
                HStack(spacing: 6) {
                    icon()
                        .font(.system(size: 10, weight: .semibold))
                    Text(label)
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(labelColor)
                    Text("(\(tasks.count))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(.windowBackgroundColor).opacity(0.95))
            }
        }
    }

    @ViewBuilder
    private func taskRow(_ task: CRMTask) -> some View {
        let isSelected = (selectedTask?.id == task.id)
        let overdue = isOverdue(task)
        let isHighPriority = task.priority?.localizedCaseInsensitiveContains("high") ?? false

        HStack(spacing: 10) {
            // Priority circle
            Circle()
                .fill(priorityColor(for: task.priority))
                .frame(width: 8, height: 8)

            // Name + meta
            VStack(alignment: .leading, spacing: 2) {
                Text(task.task ?? "Untitled")
                    .font(.subheadline)
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(1)

                HStack(spacing: 5) {
                    if let due = task.dueDate {
                        Text(Self.dueDateFormatter.string(from: due))
                            .font(.caption)
                            .foregroundStyle(overdue ? .red : (isSelected ? Color.white.opacity(0.8) : .secondary))
                    }
                    if let type = task.type, !type.isEmpty {
                        StatusBadge(text: type, color: isSelected ? .white : .blue)
                    }
                }
            }

            Spacer()

            // High priority indicator
            if isHighPriority {
                Circle()
                    .fill(Color.red)
                    .frame(width: 6, height: 6)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isSelected ? Color.accentColor : Color.clear)
        .contentShape(Rectangle())
        .onTapGesture {
            selectedTask = task
        }
    }

    // MARK: - Column 4: Detail

    private var detailColumn: some View {
        Group {
            if let task = selectedTask {
                TaskDetailView(task: task)
            } else {
                EmptyStateView(
                    title: "Select a task",
                    description: "Select a task to view details",
                    systemImage: "checklist"
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func priorityColor(for priority: String?) -> Color {
        guard let p = priority else { return .gray }
        if p.localizedCaseInsensitiveContains("high")   { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        if p.localizedCaseInsensitiveContains("low")    { return .green }
        return .gray
    }
}
