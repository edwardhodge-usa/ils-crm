import SwiftUI
import SwiftData
#if os(macOS)
import Sparkle
#endif

/// ILS CRM — Native macOS/iOS app
/// Parallel build alongside Electron version, sharing the same Airtable base (appYXbUdcmSwBoPFU).
///
/// Target: Swift 5.9 / iOS 17 / macOS 14
/// Local cache: SwiftData (replaces sql.js from Electron build)
/// Remote: Airtable REST API (same base, same field IDs)

@main
struct ILSCRMApp: App {
    let container: ModelContainer
    @State private var syncEngine: SyncEngine
    @State private var appStateManager = AppStateManager()

    #if os(macOS)
    private let updaterController: SPUStandardUpdaterController
    #endif

    init() {
        let schema = Schema([
            Contact.self,
            Company.self,
            Opportunity.self,
            Project.self,
            Proposal.self,
            CRMTask.self,
            Interaction.self,
            ImportedContact.self,
            Specialty.self,
            PortalAccessRecord.self,
            PortalLog.self,
            ClientPage.self,
            EmailScanRule.self,
            EmailScanState.self,
            EnrichmentQueueItem.self,
            RateCard.self,
            PersonRate.self,
        ])

        let config = ModelConfiguration(
            "ILS_CRM",
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            let c = try ModelContainer(for: schema, configurations: [config])
            container = c
            _syncEngine = State(initialValue: SyncEngine(modelContainer: c))
        } catch {
            // Schema changed between versions — delete stale store and retry.
            // All data re-syncs from Airtable, so no data loss.
            print("[App] SwiftData schema mismatch, deleting store and retrying: \(error)")
            let fileManager = FileManager.default
            if let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
                let storeFiles = ["ILS_CRM.store", "ILS_CRM.store-shm", "ILS_CRM.store-wal"]
                for file in storeFiles {
                    try? fileManager.removeItem(at: appSupport.appendingPathComponent(file))
                }
            }
            do {
                let c = try ModelContainer(for: schema, configurations: [config])
                container = c
                _syncEngine = State(initialValue: SyncEngine(modelContainer: c))
            } catch {
                fatalError("Failed to initialize SwiftData container after store reset: \(error)")
            }
        }

        KeychainService.migrateToSharedGroupIfNeeded()

        #if os(macOS)
        updaterController = SPUStandardUpdaterController(
            startingUpdater: true,
            updaterDelegate: nil,
            userDriverDelegate: nil
        )
        #endif
    }

    var body: some Scene {
        WindowGroup {
            Group {
                switch appStateManager.appState {
                case .loading:
                    ProgressView("Verifying license…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .revoked:
                    RevokedView()
                case .offlineLocked:
                    OfflineLockView()
                case .onboarding, .ready:
                    #if os(macOS)
                    ContentView()
                        .environment(syncEngine)
                    #else
                    iOSContentView()
                        .environment(syncEngine)
                    #endif
                }
            }
            .task { await appStateManager.performLicenseCheck() }
            #if os(macOS)
            .frame(minWidth: 900, minHeight: 600)
            #endif
        }
        .modelContainer(container)
        #if os(macOS)
        .defaultSize(width: 1200, height: 800)
        .windowResizability(.contentMinSize)
        .windowToolbarStyle(.unified)
        #endif
        #if os(macOS)
        .commands {
            CommandGroup(after: .appInfo) {
                CheckForUpdatesView(updater: updaterController.updater)
            }
            NavigationCommands()
            NewRecordCommand()
            SidebarCommands()
        }
        #endif

        #if os(macOS)
        Settings {
            SettingsView()
                .environment(syncEngine)
        }
        .modelContainer(container)
        #endif
    }
}

// MARK: - Navigation Commands (Go Menu)

struct NavigationCommands: Commands {
    @FocusedBinding(\.selectedNavItem) private var selectedNavItem

    var body: some Commands {
        CommandMenu("Go") {
            Button("Dashboard") { selectedNavItem = .dashboard }
                .keyboardShortcut("1", modifiers: .command)
            Button("Contacts") { selectedNavItem = .contacts }
                .keyboardShortcut("2", modifiers: .command)
            Button("Companies") { selectedNavItem = .companies }
                .keyboardShortcut("3", modifiers: .command)
            Button("Pipeline") { selectedNavItem = .pipeline }
                .keyboardShortcut("4", modifiers: .command)
            Button("Tasks") { selectedNavItem = .tasks }
                .keyboardShortcut("5", modifiers: .command)
            Button("Projects") { selectedNavItem = .projects }
                .keyboardShortcut("6", modifiers: .command)
            Button("Proposals") { selectedNavItem = .proposals }
                .keyboardShortcut("7", modifiers: .command)
            Button("Client Portal") { selectedNavItem = .clientPortal }
                .keyboardShortcut("8", modifiers: .command)
            Button("Interactions") { selectedNavItem = .interactions }
                .keyboardShortcut("9", modifiers: .command)
            Button("Imported Contacts") { selectedNavItem = .importedContacts }
                .keyboardShortcut("0", modifiers: .command)
        }
    }
}

// MARK: - New Record Command (Cmd+N)

struct NewRecordCommand: Commands {
    @FocusedValue(\.currentEntityLabel) private var entityLabel

    /// Non-empty label means an entity can be created; empty/nil means disabled.
    private var canCreate: Bool {
        guard let label = entityLabel else { return false }
        return !label.isEmpty
    }

    private var menuTitle: String {
        if let label = entityLabel, !label.isEmpty {
            return "New \(label)"
        }
        return "New Record"
    }

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button(menuTitle) {
                NotificationCenter.default.post(name: .createNewRecord, object: nil)
            }
            .keyboardShortcut("n", modifiers: .command)
            .disabled(!canCreate)
        }
    }
}

#if os(macOS)
struct CheckForUpdatesView: View {
    @ObservedObject private var checkForUpdatesViewModel: CheckForUpdatesViewModel

    init(updater: SPUUpdater) {
        self.checkForUpdatesViewModel = CheckForUpdatesViewModel(updater: updater)
    }

    var body: some View {
        Button("Check for Updates…", action: checkForUpdatesViewModel.checkForUpdates)
            .disabled(!checkForUpdatesViewModel.canCheckForUpdates)
    }
}

final class CheckForUpdatesViewModel: ObservableObject {
    @Published var canCheckForUpdates = false
    private let updater: SPUUpdater

    init(updater: SPUUpdater) {
        self.updater = updater
        updater.publisher(for: \.canCheckForUpdates)
            .assign(to: &$canCheckForUpdates)
    }

    func checkForUpdates() {
        updater.checkForUpdates()
    }
}
#endif
