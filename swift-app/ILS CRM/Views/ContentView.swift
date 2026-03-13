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

// MARK: - Notifications

extension Notification.Name {
    static let createNewRecord = Notification.Name("createNewRecord")
}

/// Root content view — NavigationSplitView with sidebar + detail.
/// Mirrors: src/components/layout/Layout.tsx (sidebar + topbar + outlet)
struct ContentView: View {
    @State private var selection: NavItem? = .dashboard
    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
                .navigationTitle("ILS CRM")
        } detail: {
            detailView
        }
        .frame(minWidth: 900, minHeight: 600)
        .toolbar {
            ToolbarItem(placement: .automatic) {
                syncStatusView
            }
            ToolbarItem(placement: .primaryAction) {
                if creatableEntities.contains(selection ?? .dashboard) {
                    Button {
                        NotificationCenter.default.post(name: .createNewRecord, object: selection)
                    } label: {
                        Label("New \(createEntityLabel)", systemImage: "plus")
                    }
                }
            }
        }
    }

    // MARK: - Toolbar Helpers

    /// Entities that support creation via the toolbar button.
    private var creatableEntities: Set<NavItem> {
        [.contacts, .companies, .pipeline, .tasks, .projects, .proposals, .interactions, .importedContacts]
    }

    private var createEntityLabel: String {
        switch selection {
        case .contacts: return "Contact"
        case .companies: return "Company"
        case .pipeline: return "Opportunity"
        case .tasks: return "Task"
        case .projects: return "Project"
        case .proposals: return "Proposal"
        case .interactions: return "Interaction"
        case .importedContacts: return "Imported Contact"
        default: return "Record"
        }
    }

    @ViewBuilder
    private var syncStatusView: some View {
        if syncEngine.isSyncing {
            HStack(spacing: 6) {
                ProgressView()
                    .controlSize(.small)
                Text("Syncing…")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } else if let lastSync = syncEngine.lastSyncDate {
            HStack(spacing: 6) {
                Circle()
                    .fill(syncEngine.syncError != nil ? Color.red : Color.green)
                    .frame(width: 7, height: 7)
                Text(lastSync, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } else {
            HStack(spacing: 6) {
                Circle()
                    .fill(Color.gray)
                    .frame(width: 7, height: 7)
                Text("Not synced")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
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
            Text("v3.4.3")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 14)
                .padding(.vertical, 8)
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
