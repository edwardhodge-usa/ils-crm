import SwiftUI

/// Settings view — mirrors src/components/settings/SettingsPage.tsx
///
/// SECURITY: API key stored in macOS Keychain via KeychainService (not UserDefaults).
/// This is a security improvement over the Electron build which uses SQLite.
struct SettingsView: View {
    @AppStorage("airtable_base_id") private var baseId = AirtableConfig.baseId
    @AppStorage("sync_interval_seconds") private var syncInterval: Double = AirtableConfig.defaultSyncIntervalSeconds
    @State private var apiKey = ""
    @State private var showSaveConfirmation = false

    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        Form {
            Section("Airtable Connection") {
                SecureField("API Key (Personal Access Token)", text: $apiKey)
                    .textFieldStyle(.roundedBorder)

                TextField("Base ID", text: $baseId)
                    .textFieldStyle(.roundedBorder)

                Button("Save Connection") {
                    saveApiKey()
                }
                .disabled(apiKey.isEmpty)
            }

            Section("Sync") {
                Picker("Sync Interval", selection: $syncInterval) {
                    Text("30 seconds").tag(30.0)
                    Text("60 seconds").tag(60.0)
                    Text("120 seconds").tag(120.0)
                    Text("Off").tag(0.0)
                }
                .onChange(of: syncInterval) { _, newValue in
                    if newValue > 0 {
                        syncEngine.startPolling(intervalSeconds: newValue)
                    } else {
                        syncEngine.stopPolling()
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
                        Text(lastSync, format: .dateTime)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("Never synced")
                            .foregroundStyle(.secondary)
                    }
                }

                Button("Force Sync") {
                    Task { await syncEngine.forceSync() }
                }
                .disabled(syncEngine.isSyncing || apiKey.isEmpty)
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
        .onAppear {
            loadApiKey()
        }
        .overlay {
            if showSaveConfirmation {
                Text("Saved ✓")
                    .font(.caption)
                    .foregroundStyle(.green)
                    .transition(.opacity)
            }
        }
    }

    // MARK: - Keychain Integration

    private func loadApiKey() {
        if let stored = KeychainService.read() {
            apiKey = stored
            // Auto-configure sync engine if key exists
            syncEngine.configure(apiKey: stored, baseId: baseId)
        }
    }

    private func saveApiKey() {
        do {
            try KeychainService.save(key: KeychainService.apiKeyAccount, value: apiKey)
            syncEngine.configure(apiKey: apiKey, baseId: baseId)

            // Show brief confirmation
            withAnimation { showSaveConfirmation = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation { showSaveConfirmation = false }
            }

            // Start polling if interval is set
            if syncInterval > 0 {
                syncEngine.startPolling(intervalSeconds: syncInterval)
            }
        } catch {
            print("[SettingsView] Failed to save API key: \(error.localizedDescription)")
        }
    }
}
