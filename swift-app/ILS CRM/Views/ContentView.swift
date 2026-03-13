import SwiftUI

/// Navigation items for the main sidebar.
enum NavItem: String, CaseIterable, Hashable {
    // CRM group
    case dashboard
    case contacts
    case companies
    case pipeline
    // WORK group
    case tasks
    case projects
    case proposals
    // ACTIVITY group
    case clientPortal
    case interactions
    case importedContacts

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .contacts: return "Contacts"
        case .companies: return "Companies"
        case .pipeline: return "Pipeline"
        case .tasks: return "Tasks"
        case .projects: return "Projects"
        case .proposals: return "Proposals"
        case .clientPortal: return "Client Portal"
        case .interactions: return "Interactions"
        case .importedContacts: return "Imported Contacts"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .contacts: return "person.2"
        case .companies: return "building.2"
        case .pipeline: return "chart.bar.horizontal.page"
        case .tasks: return "checklist"
        case .projects: return "folder"
        case .proposals: return "doc.text"
        case .clientPortal: return "globe"
        case .interactions: return "bubble.left.and.bubble.right"
        case .importedContacts: return "person.crop.rectangle.stack"
        }
    }
}

/// Sidebar section groups — mirrors Electron sidebar layout.
private let crmItems: [NavItem]      = [.dashboard, .contacts, .companies, .pipeline]
private let workItems: [NavItem]     = [.tasks, .projects, .proposals]
private let activityItems: [NavItem] = [.clientPortal, .interactions, .importedContacts]

/// Root content view — NavigationSplitView with sidebar + detail.
/// Mirrors: src/components/layout/Layout.tsx (sidebar + topbar + outlet)
struct ContentView: View {
    @State private var selection: NavItem? = .dashboard
    @State private var showSettings = false

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
                .navigationTitle("ILS CRM")
        } detail: {
            detailView
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .frame(minWidth: 480, minHeight: 400)
        }
    }

    // MARK: - Sidebar

    private var sidebarContent: some View {
        List(selection: $selection) {
            sidebarSection(title: "CRM", items: crmItems)
            sidebarSection(title: "WORK", items: workItems)
            sidebarSection(title: "ACTIVITY", items: activityItems)
        }
        .listStyle(.sidebar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            settingsFooter
        }
    }

    private func sidebarSection(title: String, items: [NavItem]) -> some View {
        Section {
            ForEach(items, id: \.self) { item in
                Label(item.title, systemImage: item.icon)
                    .tag(item)
            }
        } header: {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(nil)
        }
    }

    // MARK: - Settings Footer

    private var settingsFooter: some View {
        VStack(spacing: 0) {
            Divider()
            Button {
                showSettings = true
            } label: {
                Label("Settings", systemImage: "gear")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
            }
            .buttonStyle(.plain)

            Text("v3.4.1")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
                .padding(.bottom, 10)
        }
        .background(.bar)
    }

    // MARK: - Detail Routing

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
        case .importedContacts:
            ImportedContactsView()
        case nil:
            DashboardView()
        }
    }
}
