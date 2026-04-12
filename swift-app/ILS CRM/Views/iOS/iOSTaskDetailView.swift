#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task detail — dark neon bento design.
struct iOSTaskDetailView: View {
    @Bindable var task: CRMTask
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var showDeleteConfirm = false
    @State private var completionHaptic = false
    @State private var showingContactsPicker = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingProjectsPicker = false
    @State private var showingProposalsPicker = false

    // MARK: - Options

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"]
    private let priorityOptions = ["High", "Medium", "Low"]
    private let typeOptions = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    private var assigneeOptions: [String] {
        let descriptor = FetchDescriptor<CRMTask>()
        let allTasks = (try? modelContext.fetch(descriptor)) ?? []
        return Array(Set(allTasks.compactMap(\.assignedTo))).sorted()
    }

    // MARK: - Helpers

    private var isComplete: Bool {
        task.status?.localizedCaseInsensitiveContains("complet") ?? false
    }

    private var isOverdue: Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) < Calendar.current.startOfDay(for: Date()) && !isComplete
    }

    private func markModified() {
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    // MARK: - Linked Record Labels

    private var contactLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveContacts(ids: task.contactsIds)
    }
    private var opportunityLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveOpportunities(ids: task.salesOpportunitiesIds)
    }
    private var projectLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveProjects(ids: task.projectsIds)
    }
    private var proposalLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveProposals(ids: task.proposalIds)
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Overdue banner
                if isOverdue {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(NeonTheme.neonRed)
                            .shadow(color: NeonTheme.neonRed.opacity(0.5), radius: 4)
                        Text("This task is overdue")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(NeonTheme.neonRed)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(NeonTheme.neonRed.opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(NeonTheme.neonRed.opacity(0.25), lineWidth: 1)
                            )
                    )
                    .padding(.horizontal, 16)
                }

                // Task name
                NeonCard(header: "Task") {
                    TextField("Task name", text: Binding(
                        get: { task.task ?? "" },
                        set: { task.task = $0; markModified() }
                    ))
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(NeonTheme.textPrimary)
                }

                // Details
                NeonCard(header: "Details") {
                    VStack(spacing: 0) {
                        neonPicker("Priority", selection: Binding(
                            get: { task.priority ?? "" },
                            set: { task.priority = $0.isEmpty ? nil : $0; markModified() }
                        )) {
                            Text("None").tag("")
                            ForEach(priorityOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Type", selection: Binding(
                            get: { task.type ?? "" },
                            set: { task.type = $0.isEmpty ? nil : $0; markModified() }
                        )) {
                            Text("None").tag("")
                            ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Status", selection: Binding(
                            get: { task.status ?? "To Do" },
                            set: { task.status = $0; markModified() }
                        )) {
                            ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                        }
                        NeonDivider()

                        neonPicker("Assigned To", selection: Binding(
                            get: { task.assignedTo ?? "" },
                            set: { task.assignedTo = $0.isEmpty ? nil : $0; markModified() }
                        )) {
                            Text("Unassigned").tag("")
                            ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                        }
                    }
                }

                // Schedule
                NeonCard(header: "Schedule") {
                    VStack(spacing: 0) {
                        DatePicker(
                            "Due Date",
                            selection: Binding(
                                get: { task.dueDate ?? Date() },
                                set: { task.dueDate = $0; markModified() }
                            ),
                            displayedComponents: .date
                        )
                        .foregroundStyle(NeonTheme.textPrimary)

                        if isComplete, let completed = task.completedDate {
                            NeonDivider()
                            HStack {
                                Text("Completed")
                                    .foregroundStyle(NeonTheme.textSecondary)
                                Spacer()
                                Text(completed, style: .date)
                                    .foregroundStyle(NeonTheme.neonGreen)
                            }
                            .frame(minHeight: 32)
                        }
                    }
                }

                // Linked Records
                NeonCard(header: "Linked Records") {
                    VStack(spacing: 8) {
                        neonLinkedRow("Contacts", items: contactLabels) {
                            showingContactsPicker = true
                        }
                        neonLinkedRow("Opportunities", items: opportunityLabels) {
                            showingOpportunitiesPicker = true
                        }
                        neonLinkedRow("Projects", items: projectLabels) {
                            showingProjectsPicker = true
                        }
                        neonLinkedRow("Proposals", items: proposalLabels) {
                            showingProposalsPicker = true
                        }
                    }
                }

                // Notes
                NeonCard(header: "Notes") {
                    TextEditor(text: Binding(
                        get: { task.notes ?? "" },
                        set: { task.notes = $0.isEmpty ? nil : $0; markModified() }
                    ))
                    .frame(minHeight: 100)
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(NeonTheme.textPrimary)
                }

                // Actions
                VStack(spacing: 10) {
                    NeonActionButton(
                        title: isComplete ? "Mark Incomplete" : "Mark Complete",
                        icon: isComplete ? "arrow.uturn.backward.circle" : "checkmark.circle.fill",
                        color: NeonTheme.neonGreen
                    ) {
                        let wasCompleted = isComplete
                        task.status = wasCompleted ? "To Do" : "Completed"
                        task.completedDate = wasCompleted ? nil : Date()
                        markModified()
                        completionHaptic.toggle()
                    }

                    NeonDestructiveButton(title: "Delete Task", icon: "trash") {
                        showDeleteConfirm = true
                    }
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .sensoryFeedback(.success, trigger: completionHaptic)
        .sensoryFeedback(.warning, trigger: showDeleteConfirm)
        .navigationTitle(task.task ?? "Task")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this task?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
                modelContext.delete(task)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingContactsPicker) {
            LinkedRecordPicker(title: "Link Contacts", entityType: .contacts,
                currentIds: Set(task.contactsIds)) { ids in
                task.contactsIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingOpportunitiesPicker) {
            LinkedRecordPicker(title: "Link Opportunities", entityType: .opportunities,
                currentIds: Set(task.salesOpportunitiesIds)) { ids in
                task.salesOpportunitiesIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingProjectsPicker) {
            LinkedRecordPicker(title: "Link Projects", entityType: .projects,
                currentIds: Set(task.projectsIds)) { ids in
                task.projectsIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingProposalsPicker) {
            LinkedRecordPicker(title: "Link Proposals", entityType: .proposals,
                currentIds: Set(task.proposalIds)) { ids in
                task.proposalIds = Array(ids); markModified()
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

    // MARK: - Linked Record Row

    @ViewBuilder
    private func neonLinkedRow(_ label: String, items: [String], onAdd: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(NeonTheme.textPrimary)
                if !items.isEmpty {
                    Text("\(items.count)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(NeonTheme.cyan)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(NeonTheme.cyan.opacity(0.12))
                        .clipShape(Capsule())
                }
                Spacer()
                Button { onAdd() } label: {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(NeonTheme.cyan)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Add \(label)")
            }
            if !items.isEmpty {
                ForEach(items, id: \.self) { item in
                    HStack(spacing: 8) {
                        AvatarView(name: item, avatarSize: .small)
                        Text(item)
                            .font(.system(size: 14))
                            .foregroundStyle(NeonTheme.textPrimary)
                    }
                    .frame(minHeight: 32)
                }
            }
        }
    }
}
#endif
