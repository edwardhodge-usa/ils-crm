import SwiftUI
import SwiftData

/// Gmail settings section — extracted for use in SettingsView.
///
/// Provides:
/// - Connect/Disconnect Gmail button bound to GmailOAuthService
/// - Connected email display
/// - Scan interval picker
/// - Last scan timestamp + status from EmailScanEngine
/// - Manage dismissed suggestions (restore action)
struct GmailSettingsSection: View {
    @Environment(\.modelContext) private var modelContext

    @State private var oAuthService = GmailOAuthService()
    @State private var scanEngine: EmailScanEngine?
    @State private var clientId: String = ""
    @State private var clientSecret: String = ""
    @State private var showCredentialsSaved = false
    @State private var showDismissedSheet = false
    @AppStorage("gmail_scan_interval") private var scanInterval: String = "off"

    @Query(sort: \ImportedContact.importedContactName) private var allImported: [ImportedContact]
    @Query(sort: \EmailScanState.lastScanDate) private var scanStates: [EmailScanState]

    private var dismissedContacts: [ImportedContact] {
        allImported.filter { ($0.onboardingStatus ?? "").lowercased().contains("dismissed") }
    }

    private var lastScanState: EmailScanState? {
        scanStates.first
    }

    private static let intervalOptions: [(label: String, value: String)] = [
        ("1 min", "60"),
        ("5 min", "300"),
        ("15 min", "900"),
        ("Off", "off"),
    ]

    var body: some View {
        Section("Gmail / Email Intelligence") {
            // OAuth credentials
            SecureField("Google Client ID", text: $clientId)
                .textFieldStyle(.roundedBorder)
            SecureField("Google Client Secret", text: $clientSecret)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button("Save Credentials") {
                    saveCredentials()
                }
                .disabled(clientId.isEmpty || clientSecret.isEmpty)

                if showCredentialsSaved {
                    Text("Saved")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
            }

            Divider()

            // Connection status
            if oAuthService.isConnected {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Connected")
                            .font(.system(size: 13, weight: .medium))
                        if let email = oAuthService.connectedEmail {
                            Text(email)
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Button("Disconnect") {
                        oAuthService.disconnect()
                        scanEngine?.stopPolling()
                    }
                    .foregroundStyle(.red)
                }
            } else {
                HStack {
                    Image(systemName: "xmark.circle")
                        .foregroundStyle(.secondary)
                    Text("Gmail not connected")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Connect Gmail") {
                        Task {
                            do {
                                try await oAuthService.connect()
                            } catch {
                                print("[GmailSettings] Connect failed: \(error.localizedDescription)")
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(oAuthService.isAuthenticating)
                }
            }

            if let error = oAuthService.lastError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Divider()

            // Scan interval
            Picker("Scan Interval", selection: $scanInterval) {
                ForEach(Self.intervalOptions, id: \.value) { option in
                    Text(option.label).tag(option.value)
                }
            }
            .onChange(of: scanInterval) { _, newValue in
                updatePolling(newValue)
            }

            // Last scan info
            if let state = lastScanState {
                HStack {
                    Text("Last Scan")
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let date = state.lastScanDate {
                        Text(date, format: .dateTime)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }

                if let status = state.scanStatus {
                    HStack {
                        Text("Status")
                            .foregroundStyle(.secondary)
                        Spacer()
                        StatusBadge(
                            text: status,
                            color: status.lowercased() == "complete" ? .green : .orange
                        )
                    }
                }

                if let total = state.totalProcessed, total > 0 {
                    HStack {
                        Text("Messages Processed")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(total)")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Scan progress (if actively scanning)
            if let engine = scanEngine, engine.isScanning {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Scanning... \(engine.progress.processed)/\(engine.progress.total)")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            // Dismissed suggestions
            Button("Manage Dismissed Suggestions (\(dismissedContacts.count))") {
                showDismissedSheet = true
            }
            .disabled(dismissedContacts.isEmpty)
        }
        .onAppear {
            loadCredentials()
            initScanEngine()
        }
        .sheet(isPresented: $showDismissedSheet) {
            DismissedSuggestionsSheet(dismissed: dismissedContacts)
                .frame(minWidth: 450, minHeight: 400)
        }
    }

    // MARK: - Helpers

    private func loadCredentials() {
        clientId = oAuthService.getClientId() ?? ""
        clientSecret = oAuthService.getClientSecret() ?? ""
    }

    private func saveCredentials() {
        do {
            try oAuthService.saveClientCredentials(clientId: clientId, clientSecret: clientSecret)
            showCredentialsSaved = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                showCredentialsSaved = false
            }
        } catch {
            print("[GmailSettings] Failed to save credentials: \(error.localizedDescription)")
        }
    }

    private func initScanEngine() {
        if scanEngine == nil {
            let container = modelContext.container
            let gmailClient = GmailAPIClient(oAuthService: oAuthService)
            scanEngine = EmailScanEngine(
                modelContainer: container,
                gmailClient: gmailClient,
                oAuthService: oAuthService
            )
        }

        if oAuthService.isConnected && scanInterval != "off" {
            updatePolling(scanInterval)
        }
    }

    private func updatePolling(_ intervalString: String) {
        guard let engine = scanEngine else { return }
        if let seconds = Double(intervalString), seconds > 0 {
            engine.startPolling(interval: seconds)
        } else {
            engine.stopPolling()
        }
    }
}

// MARK: - Dismissed Suggestions Sheet

private struct DismissedSuggestionsSheet: View {
    let dismissed: [ImportedContact]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(dismissed, id: \.id) { contact in
                    HStack(spacing: 10) {
                        AvatarView(
                            name: contact.importedContactName ?? contact.email ?? "Unknown",
                            avatarSize: .small
                        )

                        VStack(alignment: .leading, spacing: 2) {
                            Text(contact.importedContactName ?? contact.email ?? "Unknown")
                                .font(.system(size: 13, weight: .medium))
                            if let email = contact.email {
                                Text(email)
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Button("Restore") {
                            restoreContact(contact)
                        }
                        .font(.system(size: 12, weight: .medium))
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .padding(.vertical, 2)
                }
            }
            .navigationTitle("Dismissed Suggestions")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func restoreContact(_ contact: ImportedContact) {
        contact.onboardingStatus = "Ready"
        contact.localModifiedAt = Date()
        contact.isPendingPush = true
    }
}
