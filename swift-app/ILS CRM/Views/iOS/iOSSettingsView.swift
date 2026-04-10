#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone settings — native Form layout with API key, sync, license, about.
struct iOSSettingsView: View {
    @Environment(SyncEngine.self) private var syncEngine
    @AppStorage("syncIntervalSeconds") private var syncInterval: Double = 60

    @State private var apiKey: String = ""
    @State private var baseId: String = AirtableConfig.baseId
    @State private var showApiKey = false
    @State private var keychainSource: String = ""
    @State private var saveConfirmation: String = ""
    @State private var saveIsError = false
    @State private var hapticTrigger = false

    private let intervalOptions: [(String, Double)] = [
        ("30 seconds", 30),
        ("1 minute", 60),
        ("2 minutes", 120),
        ("Off", 0),
    ]

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
                    .accessibilityLabel(showApiKey ? "Hide API key" : "Show API key")
                }

                if !keychainSource.isEmpty {
                    Text(keychainSource)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if !saveConfirmation.isEmpty {
                    Label(saveConfirmation, systemImage: saveIsError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundStyle(saveIsError ? .red : .green)
                }

                Button("Save API Key") {
                    guard !apiKey.isEmpty else { return }
                    do {
                        try KeychainService.save(value: apiKey)
                        saveConfirmation = "API Key saved to Keychain"
                        saveIsError = false
                        keychainSource = "Saved to Keychain"
                        hapticTrigger.toggle()
                        Task {
                            try? await Task.sleep(for: .seconds(3))
                            saveConfirmation = ""
                        }
                    } catch {
                        saveConfirmation = "Save failed: \(error.localizedDescription)"
                        saveIsError = true
                    }
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
                .sensoryFeedback(.impact, trigger: syncEngine.isSyncing)

                if let lastSync = syncEngine.lastSyncDate {
                    LabeledContent("Last Sync") {
                        Text(lastSync, style: .relative)
                    }
                }

                if let error = syncEngine.syncError {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            // License
            Section("License") {
                LabeledContent("Status") {
                    Label("Active", systemImage: "checkmark.seal.fill")
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
        .sensoryFeedback(.success, trigger: hapticTrigger)
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
