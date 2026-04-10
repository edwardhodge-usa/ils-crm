#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone task detail — Form layout matching desktop design language.
/// Uses uppercase tracked section headers, priority labels with SF Symbols,
/// and linked record rows with avatars (mirroring macOS RelatedRecordRow).
struct iOSTaskDetailView: View {
    @Bindable var task: CRMTask
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var showDeleteConfirm = false
    @State private var completionHaptic = false
    @State private var showingContactsPicker = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingProjectsPicker = false
    @State private var showingProposalsPicker = false

    // MARK: - Options

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"]
    private let priorityOptions = ["🔴 High", "🟡 Medium", "🟢 Low"]
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
        let complete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        return Calendar.current.startOfDay(for: due) < Calendar.current.startOfDay(for: Date()) && !complete
    }

    private func markModified() {
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    @ViewBuilder
    private func priorityLabel(_ raw: String) -> some View {
        if raw.contains("High") {
            Label("High", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
        } else if raw.contains("Medium") {
            Label("Medium", systemImage: "minus.circle.fill").foregroundStyle(.orange)
        } else if raw.contains("Low") {
            Label("Low", systemImage: "arrow.down.circle.fill").foregroundStyle(.green)
        } else {
            Text(raw)
        }
    }

    /// Uppercase tracked section header matching desktop DetailSection style
    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(.secondary)
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
        Form {
            // Overdue banner
            if isOverdue {
                Section {
                    Label("This task is overdue", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            // Task name
            Section {
                TextField("Task name", text: Binding(
                    get: { task.task ?? "" },
                    set: { task.task = $0; markModified() }
                ))
                .font(.system(size: 15, weight: .medium))
            } header: {
                sectionHeader("Task")
            }

            // Details
            Section {
                Picker("Priority", selection: Binding(
                    get: { task.priority ?? "" },
                    set: { task.priority = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { option in
                        priorityLabel(option).tag(option)
                    }
                }

                Picker("Type", selection: Binding(
                    get: { task.type ?? "" },
                    set: { task.type = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                }

                Picker("Status", selection: Binding(
                    get: { task.status ?? "To Do" },
                    set: { task.status = $0; markModified() }
                )) {
                    ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                }

                Picker("Assigned To", selection: Binding(
                    get: { task.assignedTo ?? "" },
                    set: { task.assignedTo = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("Unassigned").tag("")
                    ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                }
            } header: {
                sectionHeader("Details")
            }

            // Schedule
            Section {
                DatePicker(
                    "Due Date",
                    selection: Binding(
                        get: { task.dueDate ?? Date() },
                        set: { task.dueDate = $0; markModified() }
                    ),
                    displayedComponents: .date
                )

                if isComplete, let completed = task.completedDate {
                    LabeledContent("Completed") {
                        Text(completed, style: .date)
                    }
                }
            } header: {
                sectionHeader("Schedule")
            }

            // Linked Records
            Section {
                linkedRecordRow("Contacts", items: contactLabels) {
                    showingContactsPicker = true
                }
                linkedRecordRow("Opportunities", items: opportunityLabels) {
                    showingOpportunitiesPicker = true
                }
                linkedRecordRow("Projects", items: projectLabels) {
                    showingProjectsPicker = true
                }
                linkedRecordRow("Proposals", items: proposalLabels) {
                    showingProposalsPicker = true
                }
            } header: {
                sectionHeader("Linked Records")
            }

            // Notes
            Section {
                TextEditor(text: Binding(
                    get: { task.notes ?? "" },
                    set: { task.notes = $0.isEmpty ? nil : $0; markModified() }
                ))
                .frame(minHeight: 100)
            } header: {
                sectionHeader("Notes")
            }

            // Actions
            Section {
                Button {
                    let wasCompleted = isComplete
                    task.status = wasCompleted ? "To Do" : "Completed"
                    task.completedDate = wasCompleted ? nil : Date()
                    markModified()
                    completionHaptic.toggle()
                } label: {
                    Label(
                        isComplete ? "Mark Incomplete" : "Mark Complete",
                        systemImage: isComplete ? "arrow.uturn.backward.circle" : "checkmark.circle"
                    )
                }

                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    Label("Delete Task", systemImage: "trash")
                }
            }
        }
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

    // MARK: - Linked Record Row (matches desktop RelatedRecordRow pattern)

    @ViewBuilder
    private func linkedRecordRow(_ label: String, items: [String], onAdd: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                if !items.isEmpty {
                    Text("\(items.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Capsule())
                }
                Spacer()
                Button { onAdd() } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.accentColor)
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
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }
}
#endif
