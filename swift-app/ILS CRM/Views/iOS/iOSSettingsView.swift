#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone settings — native Form layout matching desktop design language.
/// Section headers use uppercase tracked text consistent with macOS SettingsView.
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
            // Airtable Connection
            Section {
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

                Button("Save Connection") {
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
            } header: {
                sectionHeader("Airtable Connection")
            }

            // Sync
            Section {
                Picker("Sync Interval", selection: $syncInterval) {
                    ForEach(intervalOptions, id: \.1) { option in
                        Text(option.0).tag(option.1)
                    }
                }

                LabeledContent("Status") {
                    if syncEngine.isSyncing {
                        HStack(spacing: 6) {
                            ProgressView()
                                .controlSize(.small)
                            Text("Syncing…")
                                .foregroundStyle(.secondary)
                        }
                    } else if let lastSync = syncEngine.lastSyncDate {
                        Text(lastSync, style: .relative)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Never synced")
                            .foregroundStyle(.secondary)
                    }
                }

                Button {
                    Task { await syncEngine.forceSync() }
                } label: {
                    Text("Force Sync")
                }
                .disabled(syncEngine.isSyncing)
                .sensoryFeedback(.impact, trigger: syncEngine.isSyncing)

                if let error = syncEngine.syncError {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            } header: {
                sectionHeader("Sync")
            }

            // License
            Section {
                LabeledContent("Status") {
                    Label("Active", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                }
            } header: {
                sectionHeader("License")
            }

            // About
            Section {
                LabeledContent("Version") {
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
                }
                LabeledContent("Build") {
                    Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—")
                }
            } header: {
                sectionHeader("About")
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

    // MARK: - Design Language

    /// Uppercase tracked section header matching desktop DetailSection style
    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(.secondary)
    }
}
#endif
