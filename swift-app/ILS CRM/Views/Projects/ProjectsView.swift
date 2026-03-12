import SwiftUI
import SwiftData

/// Projects list — mirrors src/components/projects/ProjectListPage.tsx
///
/// Features:
/// - Searchable list with project name, notes filtering
/// - Status badge per row, date subtitle
/// - Navigation to ProjectDetailView via sheet
/// - Empty state when no projects exist
///
/// Electron hooks: useEntityList('projects')
struct ProjectsView: View {
    @Query(sort: \Project.projectName) private var projects: [Project]
    @State private var searchText = ""
    @State private var selectedProject: Project?
    @State private var showNewProject = false

    // MARK: - Filtered Data

    private var filteredProjects: [Project] {
        if searchText.isEmpty { return projects }
        let query = searchText
        return projects.filter { project in
            (project.projectName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (project.projectDescription?.localizedCaseInsensitiveContains(query) ?? false) ||
            (project.keyMilestones?.localizedCaseInsensitiveContains(query) ?? false) ||
            (project.lessonsLearned?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
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
        .searchable(text: $searchText, prompt: "Search projects...")
        .navigationTitle("Projects")
        .toolbar {
            Button { showNewProject = true } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showNewProject) {
            NavigationStack {
                ProjectFormView(project: nil)
            }
            .frame(minWidth: 480, minHeight: 560)
        }
        .sheet(item: $selectedProject) { project in
            NavigationStack {
                ProjectDetailView(project: project)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") { selectedProject = nil }
                        }
                    }
            }
            .frame(minWidth: 500, minHeight: 600)
        }
    }

    // MARK: - Project List

    private var projectList: some View {
        List(filteredProjects, id: \.id) { project in
            projectRow(project)
                .contentShape(Rectangle())
                .onTapGesture {
                    selectedProject = project
                }
        }
        .listStyle(.sidebar)
    }

    // MARK: - Project Row

    private func projectRow(_ project: Project) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: project.projectName ?? "?", size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(project.projectName ?? "Unknown")
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if let subtitle = projectSubtitle(for: project) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let status = project.status, !status.isEmpty {
                BadgeView(
                    text: status,
                    color: statusColor(status)
                )
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    /// Returns the best subtitle: location, then start date, then nil.
    private func projectSubtitle(for project: Project) -> String? {
        if let location = project.location, !location.isEmpty {
            return location
        }
        if let startDate = project.startDate {
            return "Started \(Self.dateFormatter.string(from: startDate))"
        }
        return nil
    }

    /// Deterministic color for project status badges.
    private func statusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("active") || lower.contains("in progress") { return .blue }
        if lower.contains("complete") || lower.contains("done") { return .green }
        if lower.contains("on hold") || lower.contains("paused") { return .orange }
        if lower.contains("cancel") { return .red }
        if lower.contains("planning") || lower.contains("planned") { return .purple }
        if lower.contains("proposal") { return .teal }
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
