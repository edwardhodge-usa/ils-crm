import SwiftUI

/// Navigation items for the main sidebar.
enum NavItem: String, CaseIterable, Hashable {
    case dashboard
    case contacts
    case companies
    case pipeline
    case tasks
    case proposals
    case projects
    case interactions
    case clientPortal

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .contacts: return "Contacts"
        case .companies: return "Companies"
        case .pipeline: return "Pipeline"
        case .tasks: return "Tasks"
        case .proposals: return "Proposals"
        case .projects: return "Projects"
        case .interactions: return "Interactions"
        case .clientPortal: return "Client Portal"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "house"
        case .contacts: return "person.2"
        case .companies: return "building.2"
        case .pipeline: return "chart.bar"
        case .tasks: return "checklist"
        case .proposals: return "doc.text"
        case .projects: return "folder"
        case .interactions: return "bubble.left.and.bubble.right"
        case .clientPortal: return "globe"
        }
    }
}

/// Root content view — NavigationSplitView with sidebar + detail.
/// Mirrors: src/components/layout/Layout.tsx (sidebar + topbar + outlet)
struct ContentView: View {
    @State private var selection: NavItem? = .dashboard
    @State private var showSettings = false

    var body: some View {
        NavigationSplitView {
            List(NavItem.allCases, id: \.self, selection: $selection) { item in
                Label(item.title, systemImage: item.icon)
                    .tag(item)
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 260)
            .navigationTitle("ILS CRM")
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gear")
                    }
                    .help("Settings")
                }
            }
        } detail: {
            detailView
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .frame(minWidth: 480, minHeight: 400)
        }
    }

    @ViewBuilder
    private var detailView: some View {
        switch selection {
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
        case .clientPortal:
            PortalAccessView()
        case nil:
            DashboardView()
        }
    }
}
