import SwiftUI
import SwiftData
import Combine

/// Projects list — mirrors src/components/projects/ProjectListPage.tsx
///
/// Features:
/// - List + detail split (HStack with ~380pt left pane)
/// - Searchable list with project name and notes filtering
/// - Sort dropdown: Name A–Z, Status, Company, Newest First (persisted via AppStorage)
/// - Status badge per row
/// - Inline detail pane (ProjectDetailView) or EmptyStateView when none selected
///
/// Electron hooks: useEntityList('projects')

// MARK: - ProjectsView

struct ProjectsView: View {
    @Query private var projects: [Project]
    @Query private var companies: [Company]
    @State private var searchText = ""
    @AppStorage("sort-projects") private var sortBy: String = "name"
    @State private var selectedProject: Project?
    @State private var showNewProject = false
    @State private var showEditProject = false
    @State private var showDeleteConfirm = false

    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    // MARK: - Sort Label

    private var sortLabel: String {
        switch sortBy {
        case "status": return "Status"
        case "company": return "Company"
        case "newest": return "Newest First"
        default: return "Name A–Z"
        }
    }

    // MARK: - Company Lookup

    /// Build a map of company ID → company name for sorting by company.
    private var companyNameMap: [String: String] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { co in
            guard let name = co.companyName else { return nil }
            return (co.id, name)
        })
    }

    /// Returns the first linked company name for a project (used for sort grouping).
    private func companyName(for project: Project) -> String {
        for cid in project.clientIds {
            if let name = companyNameMap[cid] { return name }
        }
        return ""
    }

    // MARK: - Filtered & Sorted Data

    private var filteredProjects: [Project] {
        let filtered: [Project]
        if searchText.isEmpty {
            filtered = projects
        } else {
            let query = searchText
            filtered = projects.filter { project in
                (project.projectName?.localizedCaseInsensitiveContains(query) ?? false) ||
                (project.projectDescription?.localizedCaseInsensitiveContains(query) ?? false) ||
                (project.keyMilestones?.localizedCaseInsensitiveContains(query) ?? false) ||
                (project.lessonsLearned?.localizedCaseInsensitiveContains(query) ?? false)
            }
        }

        switch sortBy {
        case "status":
            return filtered.sorted {
                ($0.status ?? "").localizedCaseInsensitiveCompare($1.status ?? "") == .orderedAscending
            }
        case "company":
            return filtered.sorted {
                companyName(for: $0).localizedCaseInsensitiveCompare(companyName(for: $1)) == .orderedAscending
            }
        case "newest":
            return filtered.sorted {
                ($0.airtableModifiedAt ?? .distantPast) > ($1.airtableModifiedAt ?? .distantPast)
            }
        default: // "name"
            return filtered.sorted {
                ($0.projectName ?? "").localizedCaseInsensitiveCompare($1.projectName ?? "") == .orderedAscending
            }
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // Left list pane — ~380pt
            leftPane
                .frame(width: 380)

            Divider()

            // Right detail pane
            rightPane
        }
        .sheet(isPresented: $showNewProject) {
            NavigationStack {
                ProjectFormView(project: nil)
            }
            .frame(minWidth: 480, minHeight: 560)
        }
        .sheet(isPresented: $showEditProject) {
            if let project = selectedProject {
                NavigationStack {
                    ProjectFormView(project: project)
                }
                .frame(minWidth: 480, minHeight: 560)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewProject = true
        }
    }

    // MARK: - Left Pane

    private var leftPane: some View {
        VStack(spacing: 0) {
            ListHeader(
                title: "Projects",
                count: projects.count,
                buttonLabel: "+ New Project",
                onButton: { showNewProject = true }
            )

            Divider()

            // Search bar
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                TextField("Search projects...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color.platformControlBackground)

            Divider()

            // Sort bar
            HStack(spacing: 6) {
                Text("\(filteredProjects.count) projects")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                HStack(spacing: 3) {
                    sortOptionButton("Name", value: "name")
                    sortOptionButton("Status", value: "status")
                    sortOptionButton("Company", value: "company")
                    sortOptionButton("Newest", value: "newest")
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)

            Divider()

            // Project list
            if projects.isEmpty {
                EmptyStateView(
                    title: "No projects yet",
                    description: "Projects will appear here once synced from Airtable.",
                    systemImage: "folder"
                )
            } else if filteredProjects.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No projects match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                projectList
            }
        }
    }

    private func sortOptionButton(_ title: String, value: String) -> some View {
        let isSelected = sortBy == value

        return Button(title) {
            sortBy = value
        }
        .font(.caption)
        .foregroundStyle(isSelected ? Color.white : Color.primary)
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .background(
            Capsule(style: .continuous)
                .fill(isSelected ? Color.accentColor : Color.platformControlBackground)
        )
        .overlay {
            if !isSelected {
                Capsule(style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Project List

    private var projectList: some View {
        List(filteredProjects, id: \.id, selection: Binding(
            get: { selectedProject?.id },
            set: { id in selectedProject = filteredProjects.first { $0.id == id } }
        )) { project in
            projectRow(project)
                .tag(project.id)
        }
        .listStyle(.sidebar)
    }

    // MARK: - Project Row

    private func projectRow(_ project: Project) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(project.projectName ?? "Unknown")
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)
            }

            Spacer()

            if let status = project.status, !status.isEmpty {
                StatusBadge(text: status, color: projectStatusColor(status))
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Right Pane

    @ViewBuilder
    private var rightPane: some View {
        if let project = selectedProject {
            ProjectDetailView(
                project: project,
                onEdit: { showEditProject = true },
                onDelete: {
                    syncEngine.trackDeletion(tableId: Project.airtableTableId, recordId: project.id)
                    modelContext.delete(project)
                    selectedProject = nil
                }
            )
        } else {
            EmptyStateView(
                title: "No project selected",
                description: "Select a project from the list to view details.",
                systemImage: "folder"
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    // MARK: - Helpers

    private func projectStatusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("active") || lower.contains("in progress") { return .blue }
        if lower.contains("complete") || lower.contains("done") { return .green }
        if lower.contains("on hold") || lower.contains("paused") { return .orange }
        if lower.contains("cancel") { return .red }
        if lower.contains("planning") || lower.contains("planned") { return .purple }
        if lower.contains("discovery") { return .cyan }
        return .secondary
    }
}

// MARK: - Project Form

/// Full create/edit form — mirrors src/components/projects/ProjectForm.tsx
///
/// - `project: nil` → create mode (inserts new Project with local_ prefix ID)
/// - `project: existing` → edit mode (updates in place)
struct ProjectFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let project: Project?  // nil = create, non-nil = edit

    // MARK: - Form State

    @State private var projectName: String = ""
    @State private var status: String = "Not Started"
    @State private var location: String = ""
    @State private var contractValueText: String = ""
    @State private var startDate: Date = Date()
    @State private var hasStartDate: Bool = false
    @State private var endDate: Date = Date()
    @State private var hasEndDate: Bool = false
    @State private var projectDescription: String = ""
    @State private var keyMilestones: String = ""
    @State private var lessonsLearned: String = ""

    // MARK: - Options

    private let statusOptions = ["Not Started", "In Progress", "On Hold", "Complete"]

    private var isCreate: Bool { project == nil }

    // MARK: - Body

    var body: some View {
        Form {
            Section("Project") {
                TextField("Project Name", text: $projectName)
            }

            Section("Details") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
                TextField("Location", text: $location)
                TextField("Contract Value", text: $contractValueText)
                #if os(iOS)
                    .keyboardType(.decimalPad)
                #endif
            }

            Section("Schedule") {
                Toggle("Start Date", isOn: $hasStartDate)
                if hasStartDate {
                    DatePicker("Start", selection: $startDate, displayedComponents: .date)
                }

                Toggle("End Date", isOn: $hasEndDate)
                if hasEndDate {
                    DatePicker("End", selection: $endDate, displayedComponents: .date)
                }
            }

            Section("Description") {
                TextEditor(text: $projectDescription)
                    .frame(minHeight: 80)
            }

            Section("Key Milestones") {
                TextEditor(text: $keyMilestones)
                    .frame(minHeight: 80)
            }

            Section("Lessons Learned") {
                TextEditor(text: $lessonsLearned)
                    .frame(minHeight: 80)
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isCreate ? "New Project" : "Edit Project")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear { loadExisting() }
    }

    // MARK: - Load Existing (edit mode)

    private func loadExisting() {
        guard let project else { return }
        projectName = project.projectName ?? ""
        status = project.status ?? "Not Started"
        location = project.location ?? ""
        if let value = project.contractValue {
            contractValueText = String(value)
        }
        projectDescription = project.projectDescription ?? ""
        keyMilestones = project.keyMilestones ?? ""
        lessonsLearned = project.lessonsLearned ?? ""

        if let start = project.startDate {
            startDate = start
            hasStartDate = true
        }
        if let end = project.targetCompletion {
            endDate = end
            hasEndDate = true
        }
    }

    // MARK: - Save

    private func save() {
        let trimmedName = projectName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let contractValue = Double(contractValueText)

        if let project {
            // Edit mode — update existing
            project.projectName = trimmedName
            project.status = status.nilIfEmpty
            project.location = location.nilIfEmpty
            project.contractValue = contractValue
            project.startDate = hasStartDate ? startDate : nil
            project.targetCompletion = hasEndDate ? endDate : nil
            project.projectDescription = projectDescription.nilIfEmpty
            project.keyMilestones = keyMilestones.nilIfEmpty
            project.lessonsLearned = lessonsLearned.nilIfEmpty
            project.localModifiedAt = Date()
            project.isPendingPush = true
        } else {
            // Create mode — insert new
            let newProject = Project(
                id: "local_\(UUID().uuidString)",
                projectName: trimmedName,
                isPendingPush: true
            )
            newProject.status = status.nilIfEmpty
            newProject.location = location.nilIfEmpty
            newProject.contractValue = contractValue
            newProject.startDate = hasStartDate ? startDate : nil
            newProject.targetCompletion = hasEndDate ? endDate : nil
            newProject.projectDescription = projectDescription.nilIfEmpty
            newProject.keyMilestones = keyMilestones.nilIfEmpty
            newProject.lessonsLearned = lessonsLearned.nilIfEmpty
            newProject.localModifiedAt = Date()
            modelContext.insert(newProject)
        }

        dismiss()
    }
}

// MARK: - String Extension

private extension String {
    /// Returns nil if the string is empty, otherwise returns self.
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
