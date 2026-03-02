import SwiftUI
import SwiftData

/// Projects list — mirrors src/components/projects/ProjectListPage.tsx
///
/// Features to implement:
/// - List with project name, status, contract value
/// - Detail view with linked opportunities, contacts, tasks
/// - Known Electron bug: engagement column shows raw JSON arrays
struct ProjectsView: View {
    @Query(sort: \Project.projectName) private var projects: [Project]

    var body: some View {
        List(projects, id: \.id) { project in
            VStack(alignment: .leading) {
                Text(project.projectName ?? "—")
                    .fontWeight(.medium)
                if let status = project.status {
                    Text(status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Projects")
        .toolbar {
            Button { /* TODO: new project */ } label: {
                Image(systemName: "plus")
            }
        }
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
