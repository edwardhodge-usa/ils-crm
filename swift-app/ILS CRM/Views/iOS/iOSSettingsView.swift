#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone settings — dark neon bento design.
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
        ScrollView {
            VStack(spacing: 16) {
                // Airtable Connection
                NeonCard(header: "Airtable Connection") {
                    VStack(spacing: 12) {
                        HStack {
                            Group {
                                if showApiKey {
                                    TextField("API Key", text: $apiKey)
                                        .textContentType(.password)
                                        .autocorrectionDisabled()
                                } else {
                                    SecureField("API Key", text: $apiKey)
                                }
                            }
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(NeonTheme.background)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(NeonTheme.cardBorderGlow, lineWidth: 1)
                            )

                            Button {
                                showApiKey.toggle()
                            } label: {
                                Image(systemName: showApiKey ? "eye.slash" : "eye")
                                    .foregroundStyle(NeonTheme.cyan)
                                    .frame(minWidth: 44, minHeight: 44)
                            }
                            .accessibilityLabel(showApiKey ? "Hide API key" : "Show API key")
                        }

                        if !keychainSource.isEmpty {
                            Text(keychainSource)
                                .font(.system(size: 12))
                                .foregroundStyle(NeonTheme.textSecondary)
                        }

                        if !saveConfirmation.isEmpty {
                            HStack(spacing: 6) {
                                Image(systemName: saveIsError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                                Text(saveConfirmation)
                            }
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(saveIsError ? NeonTheme.neonRed : NeonTheme.neonGreen)
                        }

                        Button {
                            guard !apiKey.isEmpty else { return }
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                            do {
                                try KeychainService.save(value: apiKey)
                                // Persist Base ID and configure sync engine
                                UserDefaults.standard.set(baseId, forKey: "airtable_base_id")
                                syncEngine.configure(apiKey: apiKey, baseId: baseId)
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
                        } label: {
                            Text("Save Connection")
                                .font(.system(size: 14, weight: .bold))
                                .frame(maxWidth: .infinity)
                                .frame(minHeight: 44)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(apiKey.isEmpty ? NeonTheme.cardSurfaceElevated : NeonTheme.cyan.opacity(0.15))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                                .stroke(apiKey.isEmpty ? NeonTheme.cardBorder : NeonTheme.cyan.opacity(0.3), lineWidth: 1)
                                        )
                                )
                                .foregroundStyle(apiKey.isEmpty ? NeonTheme.textTertiary : NeonTheme.cyan)
                        }
                        .disabled(apiKey.isEmpty)

                        TextField("Base ID", text: $baseId)
                            .autocorrectionDisabled()
                            .foregroundStyle(NeonTheme.textPrimary)
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(NeonTheme.background)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(NeonTheme.cardBorderGlow, lineWidth: 1)
                            )
                    }
                }

                // Sync
                NeonCard(header: "Sync") {
                    VStack(spacing: 10) {
                        HStack {
                            Text("Interval")
                                .foregroundStyle(NeonTheme.textSecondary)
                            Spacer()
                            Picker("", selection: $syncInterval) {
                                ForEach(intervalOptions, id: \.1) { option in
                                    Text(option.0).tag(option.1)
                                }
                            }
                            .tint(NeonTheme.cyan)
                        }
                        .frame(minHeight: 32)

                        NeonDivider()

                        HStack {
                            Text("Status")
                                .foregroundStyle(NeonTheme.textSecondary)
                            Spacer()
                            if syncEngine.isSyncing {
                                HStack(spacing: 6) {
                                    ProgressView()
                                        .tint(NeonTheme.cyan)
                                        .controlSize(.small)
                                    Text("Syncing...")
                                        .foregroundStyle(NeonTheme.cyan)
                                }
                            } else if let lastSync = syncEngine.lastSyncDate {
                                Text(lastSync, style: .relative)
                                    .foregroundStyle(NeonTheme.neonGreen)
                            } else {
                                Text("Never synced")
                                    .foregroundStyle(NeonTheme.textTertiary)
                            }
                        }
                        .frame(minHeight: 32)

                        NeonDivider()

                        Button {
                            Task { await syncEngine.forceSync() }
                        } label: {
                            HStack {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                Text("Force Sync")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 44)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(NeonTheme.electricBlue.opacity(0.12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .stroke(NeonTheme.electricBlue.opacity(0.25), lineWidth: 1)
                                    )
                            )
                            .foregroundStyle(NeonTheme.electricBlue)
                        }
                        .disabled(syncEngine.isSyncing)

                        if let error = syncEngine.syncError {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                Text(error)
                            }
                            .font(.system(size: 12))
                            .foregroundStyle(NeonTheme.neonRed)
                        }
                    }
                }

                // License
                NeonCard(header: "License") {
                    HStack {
                        Text("Status")
                            .foregroundStyle(NeonTheme.textSecondary)
                        Spacer()
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundStyle(NeonTheme.neonGreen)
                                .shadow(color: NeonTheme.neonGreen.opacity(0.5), radius: 4)
                            Text("Active")
                                .foregroundStyle(NeonTheme.neonGreen)
                        }
                    }
                    .frame(minHeight: 32)
                }

                // About
                NeonCard(header: "About") {
                    VStack(spacing: 8) {
                        HStack {
                            Text("Version")
                                .foregroundStyle(NeonTheme.textSecondary)
                            Spacer()
                            Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "--")
                                .foregroundStyle(NeonTheme.textPrimary)
                        }
                        .frame(minHeight: 28)
                        NeonDivider()
                        HStack {
                            Text("Build")
                                .foregroundStyle(NeonTheme.textSecondary)
                            Spacer()
                            Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "--")
                                .foregroundStyle(NeonTheme.textPrimary)
                        }
                        .frame(minHeight: 28)
                    }
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .sensoryFeedback(.success, trigger: hapticTrigger)
        .navigationTitle("Settings")
        .onAppear {
            if let stored = KeychainService.read() {
                apiKey = stored
                keychainSource = "Saved to Keychain"
                // Auto-configure sync engine if key exists
                let savedBaseId = UserDefaults.standard.string(forKey: "airtable_base_id") ?? AirtableConfig.baseId
                baseId = savedBaseId
                syncEngine.configure(apiKey: stored, baseId: savedBaseId)
            }
        }
    }
}
#endif
