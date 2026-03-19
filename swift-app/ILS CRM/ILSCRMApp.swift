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
            fatalError("Failed to initialize SwiftData container: \(error)")
        }

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
            ContentView()
                .environment(syncEngine)
        }
        .modelContainer(container)
        .defaultSize(width: 1200, height: 800)
        .windowResizability(.contentMinSize)
        #if os(macOS)
        .commands {
            CommandGroup(after: .appInfo) {
                CheckForUpdatesView(updater: updaterController.updater)
            }
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
