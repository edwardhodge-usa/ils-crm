import SwiftUI

// MARK: - Focused Value Key for Navigation

extension FocusedValues {
    var selectedNavItem: Binding<NavItem?>? {
        get { self[SelectedNavItemKey.self] }
        set { self[SelectedNavItemKey.self] = newValue }
    }
}

private struct SelectedNavItemKey: FocusedValueKey {
    typealias Value = Binding<NavItem?>
}

extension FocusedValues {
    var currentEntityLabel: String? {
        get { self[CurrentEntityLabelKey.self] }
        set { self[CurrentEntityLabelKey.self] = newValue }
    }
}

private struct CurrentEntityLabelKey: FocusedValueKey {
    typealias Value = String
}

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
    @SceneStorage("selectedNavItem") private var selectedRawValue: String = "dashboard"
    @State private var sidebarSearchText = ""
    @Environment(SyncEngine.self) private var syncEngine

    /// Computed selection derived from persisted raw value.
    private var selection: NavItem? {
        NavItem(rawValue: selectedRawValue)
    }

    /// Entity label for the current selection (used by Cmd+N menu command).
    /// Empty string means no entity can be created (dashboard, clientPortal, importedContacts).
    private var entityLabelForSelection: String {
        switch selection {
        case .contacts: return "Contact"
        case .companies: return "Company"
        case .pipeline: return "Opportunity"
        case .tasks: return "Task"
        case .projects: return "Project"
        case .proposals: return "Proposal"
        case .interactions: return "Interaction"
        case .dashboard, .clientPortal, .importedContacts, nil: return ""
        }
    }

    /// Two-way binding for List/NavigationSplitView selection.
    private var selectionBinding: Binding<NavItem?> {
        Binding(
            get: { NavItem(rawValue: selectedRawValue) },
            set: { selectedRawValue = $0?.rawValue ?? "dashboard" }
        )
    }

    var body: some View {
        NavigationSplitView {
            sidebarContent
                .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
                .navigationTitle("ILS CRM")
        } detail: {
            detailView
        }
        .focusedSceneValue(\.selectedNavItem, selectionBinding)
        .focusedSceneValue(\.currentEntityLabel, entityLabelForSelection)
        .frame(minWidth: 900, minHeight: 600)
        .onAppear {
            // Auto-configure sync from Keychain on launch (matches Electron behavior)
            if let storedKey = KeychainService.read() {
                let baseId = UserDefaults.standard.string(forKey: "airtable_base_id") ?? AirtableConfig.baseId
                syncEngine.configure(apiKey: storedKey, baseId: baseId)
                let interval = UserDefaults.standard.double(forKey: "sync_interval_seconds")
                syncEngine.startPolling(intervalSeconds: interval > 0 ? interval : AirtableConfig.defaultSyncIntervalSeconds)
            }
        }
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
        Button {
            Task { await syncEngine.forceSync() }
        } label: {
            if syncEngine.isSyncing {
                ProgressView()
                    .controlSize(.small)
            } else {
                Image(systemName: syncEngine.syncError != nil
                      ? "exclamationmark.arrow.triangle.2.circlepath"
                      : "arrow.triangle.2.circlepath")
            }
        }
        .disabled(syncEngine.isSyncing)
        .help(syncHelpText)
    }

    private var syncHelpText: String {
        if syncEngine.isSyncing { return "Syncing…" }
        if let error = syncEngine.syncError { return "Sync error: \(error)" }
        if let lastSync = syncEngine.lastSyncDate {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .abbreviated
            return "Last synced \(formatter.localizedString(for: lastSync, relativeTo: Date())) — click to sync"
        }
        return "Not synced — click to sync"
    }

    // MARK: - Sidebar

    private func filterItems(_ items: [NavItem]) -> [NavItem] {
        guard !sidebarSearchText.isEmpty else { return items }
        return items.filter { $0.title.localizedCaseInsensitiveContains(sidebarSearchText) }
    }

    private var sidebarContent: some View {
        List(selection: selectionBinding) {
            let filteredCrm = filterItems(crmItems)
            let filteredWork = filterItems(workItems)
            let filteredActivity = filterItems(activityItems)

            if !filteredCrm.isEmpty {
                sidebarSection(title: "CRM", items: filteredCrm)
            }
            if !filteredWork.isEmpty {
                sidebarSection(title: "WORK", items: filteredWork)
            }
            if !filteredActivity.isEmpty {
                sidebarSection(title: "ACTIVITY", items: filteredActivity)
            }
        }
        .listStyle(.sidebar)
        .accessibilityIdentifier("sidebar")
        .searchable(text: $sidebarSearchText, placement: .sidebar, prompt: "Filter")
        .safeAreaInset(edge: .bottom, spacing: 0) {
            settingsFooter
        }
    }

    private func sidebarSection(title: String, items: [NavItem]) -> some View {
        Section {
            ForEach(items, id: \.self) { item in
                Label(item.title, systemImage: item.icon)
                    .tag(item)
                    .accessibilityIdentifier("nav_\(item.rawValue)")
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
            Text("v\(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.3")")
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
