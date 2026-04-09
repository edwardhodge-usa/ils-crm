#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone settings — Form-based, covers API key, sync, theme, license.
struct iOSSettingsView: View {
    @Environment(SyncEngine.self) private var syncEngine
    @AppStorage("appearanceMode") private var appearanceMode = "System"
    @AppStorage("syncIntervalSeconds") private var syncInterval: Double = 60

    @State private var apiKey: String = ""
    @State private var baseId: String = AirtableConfig.baseId
    @State private var showApiKey = false
    @State private var keychainSource: String = ""

    private let intervalOptions: [(String, Double)] = [
        ("30 seconds", 30),
        ("1 minute", 60),
        ("2 minutes", 120),
        ("Off", 0),
    ]

    private let themeOptions = ["System", "Light", "Dark"]

    var body: some View {
        Form {
            // Airtable
            Section("Airtable") {
                HStack {
                    if showApiKey {
                        TextField("API Key", text: $apiKey)
                            .textContentType(.password)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("API Key", text: $apiKey)
                    }
                    Button {
                        showApiKey.toggle()
                    } label: {
                        Image(systemName: showApiKey ? "eye.slash" : "eye")
                    }
                }

                if !keychainSource.isEmpty {
                    Text(keychainSource)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button("Save API Key") {
                    guard !apiKey.isEmpty else { return }
                    try? KeychainService.save(value: apiKey)
                }
                .disabled(apiKey.isEmpty)

                TextField("Base ID", text: $baseId)
                    .autocorrectionDisabled()
            }

            // Sync
            Section("Sync") {
                Picker("Sync Interval", selection: $syncInterval) {
                    ForEach(intervalOptions, id: \.1) { option in
                        Text(option.0).tag(option.1)
                    }
                }

                Button {
                    Task { await syncEngine.forceSync() }
                } label: {
                    HStack {
                        Text("Sync Now")
                        Spacer()
                        if syncEngine.isSyncing {
                            ProgressView()
                        }
                    }
                }
                .disabled(syncEngine.isSyncing)

                if let lastSync = syncEngine.lastSyncDate {
                    LabeledContent("Last Sync") {
                        Text(lastSync, style: .relative)
                    }
                }

                if let error = syncEngine.syncError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // Appearance
            Section("Appearance") {
                Picker("Theme", selection: $appearanceMode) {
                    ForEach(themeOptions, id: \.self) { Text($0).tag($0) }
                }
                .pickerStyle(.segmented)
            }

            // License
            Section("License") {
                LabeledContent("Status") {
                    Text("Active")
                        .foregroundStyle(.green)
                }
            }

            // About
            Section("About") {
                LabeledContent("Version") {
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
                }
                LabeledContent("Build") {
                    Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—")
                }
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            if let stored = KeychainService.read() {
                apiKey = stored
                keychainSource = "Shared via iCloud Keychain"
            }
        }
    }
}
#endif
