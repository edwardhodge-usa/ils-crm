import SwiftUI
import SwiftData
import Combine

// MARK: - TasksView

/// Tasks — 3-column layout mirroring the Electron TasksPage.tsx + TaskListPage.tsx.
///
/// Column 1 (210pt) — Categories: Assigned + Smart Lists + By Type in one scrollable column
/// Column 2 (380pt) — Task list: grouped into Overdue / Today / Waiting On / No Date sections
/// Column 3 (flex)  — Inline TaskDetailView or empty state
struct TasksView: View {

    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @Environment(\.modelContext) private var modelContext
    @Environment(\.colorScheme) private var colorScheme

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

    /// Per-type Electron-matched swatch colors
    private static let typeSwatchColors: [String: Color] = [
        "Schedule Meeting":     Color(red: 0.188, green: 0.690, blue: 0.780),  // #30B0C7
        "Send Qualifications":  Color(red: 0.0,   green: 0.478, blue: 1.0),    // #007AFF
        "Follow-up Email":      Color(red: 0.686, green: 0.322, blue: 0.871),  // #AF52DE
        "Follow-up Call":       Color(red: 0.204, green: 0.780, blue: 0.349),  // #34C759
        "Other":                Color(red: 0.557, green: 0.557, blue: 0.576),  // #8E8E93
        "Presentation Deck":    Color(red: 1.0,   green: 0.584, blue: 0.0),    // #FF9500
        "Research":             Color(red: 1.0,   green: 0.176, blue: 0.333),  // #FF2D55
        "Administrative":       Color(red: 0.345, green: 0.337, blue: 0.839),  // #5856D6
        "Send Proposal":        Color(red: 0.196, green: 0.678, blue: 0.902),  // #32ADE6
        "Internal Review":      Color(red: 0.635, green: 0.518, blue: 0.369),  // #A2845E
        "Project":              Color(red: 0.0,   green: 0.780, blue: 0.745),  // #00C7BE
        "Travel":               Color(red: 1.0,   green: 0.231, blue: 0.188),  // #FF3B30
    ]

    /// Per-type badge colors for task rows (bg, fg for light mode, fgDark for dark mode)
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

    // MARK: - Smart list counts (scoped by assignee filter, matching Electron's scopedTasks)

    private func smartListCount(_ name: String) -> Int {
        let scoped = assigneeFilteredTasks
        switch name {
        case "All Tasks":   return scoped.filter { !isCompleted($0) }.count
        case "Overdue":     return scoped.filter { isOverdue($0) }.count
        case "Today":       return scoped.filter { isToday($0) && !isOverdue($0) }.count
        case "Scheduled":   return scoped.filter { isScheduled($0) && !isWaiting($0) }.count
        case "No Date":     return scoped.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) }.count
        case "Waiting":     return scoped.filter { isWaiting($0) }.count
        case "Completed":   return scoped.filter { isCompleted($0) }.count
        default:            return 0
        }
    }

    private func typeCount(_ type: String) -> Int {
        assigneeFilteredTasks.filter { task in
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
            case "Today":       result = result.filter { isToday($0) && !isOverdue($0) }
            case "Scheduled":   result = result.filter { isScheduled($0) && !isWaiting($0) }
            case "No Date":     result = result.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) }
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
        let category = selectedType ?? selectedSmartList
        if let assignee = selectedAssignee {
            return "\(category) — \(assignee)"
        }
        return category
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // Column 1 — Categories (Assigned + Smart Lists + By Type)
            categoriesColumn
                .frame(width: 210)

            Divider()

            // Column 2 — Task List
            taskListColumn
                .frame(width: 380)

            Divider()

            // Column 3 — Detail
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

    // MARK: - Column 1: Categories (Assigned + Smart Lists + By Type)

    private var categoriesColumn: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // ASSIGNED section
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

                // SMART LISTS section
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

                // BY TYPE section
                Text("BY TYPE")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.top, 14)
                    .padding(.bottom, 6)

                ForEach(Self.taskTypes, id: \.self) { type in
                    typeRow(name: type, color: Self.typeSwatchColors[type] ?? .gray, count: typeCount(type))
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
        .accessibilityIdentifier("categories_column")
    }

    @ViewBuilder
    private func assigneeRow(name: String?, count: Int) -> some View {
        let isSelected = (name == selectedAssignee)
        Button {
            selectedAssignee = name
            selectedTask = nil
        } label: {
            HStack(spacing: 8) {
                if let name {
                    AvatarView(name: name, avatarSize: .small)
                    Text(name)
                        .font(.system(size: 12))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .lineLimit(1)
                } else {
                    Text("All")
                        .font(.system(size: 12))
                        .foregroundStyle(isSelected ? .white : .primary)
                }
                Spacer()
                Text("\(count)")
                    .font(.system(size: 11, weight: .medium))
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
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(name == nil ? "assignee_all" : "assignee_\(name!)")
    }

    // MARK: - Smart Lists & Type Row Helpers

    private static let smartLists: [(name: String, dotColor: Color)] = [
        ("All Tasks",  Color(.systemBlue)),
        ("Overdue",    Color(.systemRed)),
        ("Today",      Color(.systemOrange)),
        ("Scheduled",  Color(.systemTeal)),
        ("No Date",    Color(white: 0.556)),      // #8E8E93
        ("Waiting",    Color(.systemYellow)),
        ("Completed",  Color(.systemGreen)),
    ]

    @ViewBuilder
    private func smartListRow(name: String, dotColor: Color, count: Int) -> some View {
        let isSelected = (selectedType == nil && selectedSmartList == name)
        Button {
            selectedSmartList = name
            selectedType = nil
            selectedTask = nil
        } label: {
            HStack(spacing: 8) {
                Circle()
                    .fill(dotColor)
                    .frame(width: 10, height: 10)
                Text(name)
                    .font(.system(size: 12))
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(1)
                Spacer()
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .medium))
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
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("smartlist_\(name.lowercased().replacingOccurrences(of: " ", with: "_"))")
    }

    @ViewBuilder
    private func typeRow(name: String, color: Color, count: Int) -> some View {
        let isSelected = (selectedType == name)
        Button {
            selectedType = name
            selectedTask = nil
        } label: {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 12, height: 8)
                Text(name)
                    .font(.system(size: 12))
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(1)
                Spacer()
                Text("\(count)")
                    .font(.system(size: 11, weight: .medium))
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
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("type_\(name.lowercased().replacingOccurrences(of: " ", with: "_"))")
    }

    // MARK: - Column 2: Task List

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
                    .font(.system(size: 13))
                    .textFieldStyle(.plain)
                    .accessibilityIdentifier("task_search")
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
        .accessibilityIdentifier("task_list")
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
        let completed = isCompleted(task)

        HStack(spacing: 10) {
            // Circular checkbox (17px, priority-colored border)
            ZStack {
                Circle()
                    .stroke(checkboxBorderColor(task), lineWidth: 1.5)
                    .frame(width: 17, height: 17)
                if completed {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 17, height: 17)
                    Image(systemName: "checkmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                }
            }

            // Name + meta
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(task.task ?? "Untitled")
                        .font(.system(size: 14, weight: .medium))
                        .strikethrough(completed)
                        .foregroundStyle(completed ? .tertiary : .primary)
                        .lineLimit(1)
                    // Priority dot after name
                    if let p = task.priority, !completed {
                        Circle()
                            .fill(priorityColor(for: p))
                            .frame(width: 6, height: 6)
                    }
                }

                HStack(spacing: 5) {
                    if let due = task.dueDate {
                        Text(Self.dueDateFormatter.string(from: due))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(overdue ? .red : .secondary)
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

            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        // Selection: translucent accent background + left border (NOT full solid accent)
        .background(isSelected ? Color.accentColor.opacity(0.15) : Color.clear)
        .overlay(alignment: .leading) {
            if isSelected {
                Rectangle()
                    .fill(Color.accentColor)
                    .frame(width: 2.5)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            selectedTask = task
        }
    }

    // MARK: - Column 3: Detail

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

    private func checkboxBorderColor(_ task: CRMTask) -> Color {
        if isCompleted(task) { return .green }
        let p = task.priority ?? ""
        if p.localizedCaseInsensitiveContains("high") { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        return Color(white: 0.5)
    }
}
