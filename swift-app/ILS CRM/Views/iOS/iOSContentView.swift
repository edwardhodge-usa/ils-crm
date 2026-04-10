#if os(iOS)
import SwiftUI
import SwiftData

/// Root view for iPhone — TabView with Tasks and Settings.
/// Future phases add Contacts, Companies, Pipeline tabs.
struct iOSContentView: View {
    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        TabView {
            iOSTasksView()
                .tabItem {
                    Label("Tasks", systemImage: "checklist")
                }
            NavigationStack {
                iOSSettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
        .tint(.accentColor)
        .task {
            let interval = UserDefaults.standard.double(forKey: "syncIntervalSeconds")
            syncEngine.startPolling(intervalSeconds: interval > 0 ? interval : AirtableConfig.defaultSyncIntervalSeconds)
        }
    }
}
#endif
