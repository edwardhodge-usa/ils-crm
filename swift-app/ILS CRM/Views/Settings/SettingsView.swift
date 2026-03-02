import SwiftUI

/// Settings view — mirrors src/components/settings/SettingsPage.tsx
///
/// Features to implement:
/// - Airtable API key input (store in Keychain, NOT UserDefaults)
/// - Airtable Base ID (default: appYXbUdcmSwBoPFU)
/// - Sync interval control (default: 60 seconds)
/// - Theme toggle (light/dark/system)
/// - Force Sync button
/// - Last sync timestamp display
///
/// SECURITY: API key must go in Keychain. Electron stores in settings table
/// (SQLite) which is less secure. Swift build should improve on this.
struct SettingsView: View {
    @AppStorage("airtable_base_id") private var baseId = AirtableConfig.baseId
    @AppStorage("sync_interval_seconds") private var syncInterval: Double = 60
    @State private var apiKey = ""

    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        Form {
            Section("Airtable Connection") {
                SecureField("API Key", text: $apiKey)
                TextField("Base ID", text: $baseId)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Sync") {
                HStack {
                    Text("Interval")
                    Slider(value: $syncInterval, in: 15...300, step: 15)
                    Text("\(Int(syncInterval))s")
                        .monospacedDigit()
                }

                if let lastSync = syncEngine.lastSyncDate {
                    LabeledContent("Last Sync", value: lastSync, format: .dateTime)
                }

                Button("Force Sync") {
                    Task { await syncEngine.forceSync() }
                }
                .disabled(syncEngine.isSyncing)
            }

            if let error = syncEngine.syncError {
                Section("Errors") {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle("Settings")
    }
}
