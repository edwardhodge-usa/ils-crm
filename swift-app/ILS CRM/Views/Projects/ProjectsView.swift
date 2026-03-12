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
            Button { /* TODO: new project */ } label: {
                Image(systemName: "plus")
            }
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

/// Mirrors src/components/projects/ProjectForm.tsx
struct ProjectFormView: View {
    let projectId: String?

    var body: some View {
        Form {
            Text("Project form — coming soon")
        }
        .navigationTitle(projectId == nil ? "New Project" : "Edit Project")
    }
}
