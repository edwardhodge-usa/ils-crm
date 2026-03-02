import SwiftUI

/// Root content view — NavigationSplitView with sidebar + detail.
/// Mirrors: src/components/layout/Layout.tsx (sidebar + topbar + outlet)
struct ContentView: View {
    @State private var selectedSection: NavigationSection? = .dashboard

    enum NavigationSection: String, CaseIterable, Identifiable {
        case dashboard = "Dashboard"
        case contacts = "Contacts"
        case companies = "Companies"
        case pipeline = "Pipeline"
        case tasks = "Tasks"
        case proposals = "Proposals"
        case projects = "Projects"
        case interactions = "Interactions"
        case importedContacts = "Imported Contacts"
        case portalAccess = "Portal Access"
        case portalLogs = "Portal Logs"
        case settings = "Settings"

        var id: String { rawValue }

        var systemImage: String {
            switch self {
            case .dashboard: return "square.grid.2x2"
            case .contacts: return "person.2"
            case .companies: return "building.2"
            case .pipeline: return "chart.bar"
            case .tasks: return "checklist"
            case .proposals: return "doc.text"
            case .projects: return "folder"
            case .interactions: return "bubble.left.and.bubble.right"
            case .importedContacts: return "person.badge.plus"
            case .portalAccess: return "globe"
            case .portalLogs: return "list.bullet.rectangle"
            case .settings: return "gear"
            }
        }
    }

    var body: some View {
        NavigationSplitView {
            List(NavigationSection.allCases, selection: $selectedSection) { section in
                Label(section.rawValue, systemImage: section.systemImage)
            }
            .navigationTitle("ILS CRM")
        } detail: {
            switch selectedSection {
            case .dashboard:
                DashboardView()
            case .contacts:
                ContactsView()
            case .companies:
                CompaniesView()
            case .pipeline:
                PipelineView()
            case .tasks:
                TasksView()
            case .proposals:
                ProposalsView()
            case .projects:
                ProjectsView()
            case .interactions:
                InteractionsView()
            case .importedContacts:
                ImportedContactsView()
            case .portalAccess:
                PortalAccessView()
            case .portalLogs:
                PortalLogsView()
            case .settings:
                SettingsView()
            case nil:
                DashboardView()
            }
        }
    }
}
