import SwiftUI
import SwiftData

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
        Settings {
            SettingsView()
                .environment(syncEngine)
        }
        .modelContainer(container)
        #endif
    }
}
