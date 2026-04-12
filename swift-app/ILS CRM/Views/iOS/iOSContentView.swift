#if os(iOS)
import SwiftUI
import SwiftData

/// Root view for iPhone — dark neon bento theme.
struct iOSContentView: View {
    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        TabView {
            iOSTasksView()
                .tabItem {
                    Label("Tasks", systemImage: "checklist")
                }
            iOSCompaniesView()
                .tabItem {
                    Label("Companies", systemImage: "building.2")
                }
            iOSContactsView()
                .tabItem {
                    Label("Contacts", systemImage: "person.2")
                }
            NavigationStack {
                iOSSettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
        .onAppear {
            UITabBar.appearance().tintColor = UIColor(NeonTheme.cyan)
        }
        .preferredColorScheme(.dark)
        .background(NeonTheme.background.ignoresSafeArea())
        .task {
            // Auto-configure sync from Keychain on launch (matches macOS ContentView behavior)
            if let storedKey = KeychainService.read() {
                let baseId = UserDefaults.standard.string(forKey: "airtable_base_id") ?? AirtableConfig.baseId
                syncEngine.configure(apiKey: storedKey, baseId: baseId)
            }
            let interval = UserDefaults.standard.double(forKey: "syncIntervalSeconds")
            syncEngine.startPolling(intervalSeconds: interval > 0 ? interval : AirtableConfig.defaultSyncIntervalSeconds)
        }
    }
}
#endif
