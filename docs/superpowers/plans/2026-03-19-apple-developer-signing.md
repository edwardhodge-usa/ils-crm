# Apple Developer Signing, Notarization & Distribution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Developer ID signing, notarization, Sparkle auto-update, and Airtable license checking for the ILS CRM Swift app.

**Architecture:** Three layers built incrementally: (1) signing & notarization via project.yml + entitlements, (2) Sparkle auto-update via SPM, (3) license check service ported from Electron. Each layer is independently testable and committable.

**Tech Stack:** XcodeGen, Developer ID Application certificate, xcrun notarytool, Sparkle 2.6+ (SPM), Airtable REST API, macOS Keychain

**Spec:** `docs/superpowers/specs/2026-03-19-apple-developer-signing-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `ILS CRM/ILS CRM.entitlements` | Hardened Runtime entitlements (network.client) |
| `ILS CRM/Services/LicenseService.swift` | Airtable license check actor — check, grace period, revocation |
| `ILS CRM/Views/Auth/RevokedView.swift` | Lock screen for revoked/suspended licenses |
| `ILS CRM/Views/Auth/OfflineLockView.swift` | Lock screen for expired grace period |
| `appcast.xml` | Sparkle update feed (repo root) |

### Modified Files
| File | Changes |
|------|---------|
| `project.yml` | Signing config, Hardened Runtime, Sparkle SPM dependency, entitlements path |
| `ILS CRM/ILSCRMApp.swift` | App state machine, license check on launch, Sparkle updater init |

---

## Wave 1: Code Signing & Notarization

### Task 1: Create Entitlements File

**Files:**
- Create: `swift-app/ILS CRM/ILS CRM.entitlements`

- [ ] **Step 1: Create the entitlements plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

Write to `swift-app/ILS CRM/ILS CRM.entitlements`.

- [ ] **Step 2: Commit**

```bash
cd swift-app
git add "ILS CRM/ILS CRM.entitlements"
git commit -m "feat: add Hardened Runtime entitlements for notarization"
```

### Task 2: Update project.yml for Developer ID Signing

**Files:**
- Modify: `swift-app/project.yml`

- [ ] **Step 1: Add Sparkle package dependency at project root level**

Add this as a sibling to `targets:` in `project.yml`:

```yaml
packages:
  Sparkle:
    url: https://github.com/sparkle-project/Sparkle
    from: "2.6.0"
```

- [ ] **Step 2: Update ILS CRM target settings for signing**

Replace the existing `settings.base` block under `ILS CRM` target with per-config signing:

```yaml
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.imaginelabstudios.ils-crm
        MARKETING_VERSION: "1.0.6"
        CURRENT_PROJECT_VERSION: 7
        INFOPLIST_KEY_CFBundleDisplayName: "ILS CRM+"
        GENERATE_INFOPLIST_FILE: YES
        INFOPLIST_KEY_LSApplicationCategoryType: "public.app-category.business"
        DEVELOPMENT_TEAM: "3CHSW4M2B7"
      configs:
        Debug:
          CODE_SIGN_IDENTITY: "Apple Development"
          CODE_SIGN_STYLE: Automatic
          CODE_SIGNING_REQUIRED: YES
          CODE_SIGNING_ALLOWED: YES
        Release:
          CODE_SIGN_IDENTITY: "Developer ID Application"
          CODE_SIGN_STYLE: Automatic
          CODE_SIGNING_REQUIRED: YES
          CODE_SIGNING_ALLOWED: YES
          ENABLE_HARDENED_RUNTIME: YES
          CODE_SIGN_ENTITLEMENTS: "ILS CRM/ILS CRM.entitlements"
```

- [ ] **Step 3: Add Sparkle dependency to ILS CRM target**

Add under the ILS CRM target (after `sources:`):

```yaml
    dependencies:
      - package: Sparkle
```

- [ ] **Step 4: Regenerate Xcode project**

```bash
cd swift-app && xcodegen generate
```

Expected: `ILS CRM.xcodeproj` regenerated with signing settings and Sparkle dependency.

- [ ] **Step 5: Verify Debug build succeeds**

Use XcodeBuildMCP `build_sim` or:

```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -configuration Debug -destination "platform=macOS" 2>&1 | tail -5
```

Expected: `BUILD SUCCEEDED` with Apple Development signing.

- [ ] **Step 6: Commit**

```bash
cd swift-app
git add project.yml "ILS CRM.xcodeproj"
git commit -m "feat: configure Developer ID signing, Hardened Runtime, Sparkle SPM dep"
```

### Task 3: Verify Release Build & Notarization (Manual Steps Required)

**Prerequisite:** Edward must have created the Developer ID Application certificate in Xcode > Settings > Accounts > Manage Certificates. Check `security find-identity -v -p codesigning` — should show a "Developer ID Application: ImagineLab Studios" entry.

- [ ] **Step 1: Verify Developer ID Application certificate exists**

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

Expected: At least one valid identity. If missing, STOP — Edward needs to create it in Xcode.

- [ ] **Step 2: Archive Release build**

```bash
cd swift-app && xcodebuild archive \
  -project "ILS CRM.xcodeproj" \
  -scheme "ILS CRM" \
  -configuration Release \
  -archivePath /tmp/ils-crm-build/ILS-CRM.xcarchive \
  CODE_SIGN_IDENTITY="Developer ID Application" \
  DEVELOPMENT_TEAM="3CHSW4M2B7" \
  2>&1 | tail -10
```

Expected: `ARCHIVE SUCCEEDED`

- [ ] **Step 3: Export signed .app from archive**

```bash
xcodebuild -exportArchive \
  -archivePath /tmp/ils-crm-build/ILS-CRM.xcarchive \
  -exportPath /tmp/ils-crm-build/export \
  -exportOptionsPlist <(cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>developer-id</string>
    <key>teamID</key>
    <string>3CHSW4M2B7</string>
</dict>
</plist>
PLIST
) 2>&1 | tail -10
```

Expected: Signed `.app` bundle in `/tmp/ils-crm-build/export/`.

- [ ] **Step 4: Verify code signature**

```bash
codesign -vvv --deep --strict "/tmp/ils-crm-build/export/ILS CRM+.app"
```

Expected: `valid on disk`, `satisfies its Designated Requirement`

- [ ] **Step 5: Create DMG**

```bash
hdiutil create -volname "ILS CRM+" \
  -srcfolder "/tmp/ils-crm-build/export/ILS CRM+.app" \
  -ov -format UDZO \
  "/tmp/ils-crm-build/ILS-CRM-1.0.6.dmg"
```

- [ ] **Step 6: Store notarization credentials (one-time)**

Edward runs this interactively — it prompts for the app-specific password:

```bash
xcrun notarytool store-credentials "ILS-Notarize" \
  --apple-id "<edward-apple-id-email>" \
  --team-id "3CHSW4M2B7"
```

- [ ] **Step 7: Submit for notarization**

```bash
xcrun notarytool submit "/tmp/ils-crm-build/ILS-CRM-1.0.6.dmg" \
  --keychain-profile "ILS-Notarize" \
  --wait
```

Expected: `status: Accepted` (may take 1-5 minutes)

- [ ] **Step 8: Staple the notarization ticket**

```bash
xcrun stapler staple "/tmp/ils-crm-build/ILS-CRM-1.0.6.dmg"
```

Expected: `The staple and validate action worked!`

- [ ] **Step 9: Verify Gatekeeper approval**

```bash
spctl --assess --type open --context context:primary-signature -vvv "/tmp/ils-crm-build/export/ILS CRM+.app"
```

Expected: `accepted` (not `rejected`)

---

## Wave 2: Sparkle Auto-Update

### Task 4: Initialize Sparkle in the App

**Files:**
- Modify: `swift-app/ILS CRM/ILSCRMApp.swift`

- [ ] **Step 1: Add Sparkle import and updater controller**

At the top of `ILSCRMApp.swift`, add:

```swift
import Sparkle
```

Add a property to the struct:

```swift
private let updaterController: SPUStandardUpdaterController
```

- [ ] **Step 2: Initialize updater in init()**

At the end of the existing `init()`, before the closing brace, add:

```swift
updaterController = SPUStandardUpdaterController(
    startingUpdater: true,
    updaterDelegate: nil,
    userDriverDelegate: nil
)
```

- [ ] **Step 3: Add Check for Updates menu item**

In the `body`, inside the `#if os(macOS)` block, add a `.commands` modifier to `WindowGroup`:

```swift
WindowGroup {
    ContentView()
        .environment(syncEngine)
}
.modelContainer(container)
.defaultSize(width: 1200, height: 800)
.windowResizability(.contentMinSize)
.commands {
    CommandGroup(after: .appInfo) {
        CheckForUpdatesView(updater: updaterController.updater)
    }
}
```

- [ ] **Step 4: Create CheckForUpdatesView helper**

Add at the bottom of `ILSCRMApp.swift` (or as a separate file if preferred):

```swift
struct CheckForUpdatesView: View {
    @ObservedObject private var checkForUpdatesViewModel: CheckForUpdatesViewModel

    init(updater: SPUUpdater) {
        self.checkForUpdatesViewModel = CheckForUpdatesViewModel(updater: updater)
    }

    var body: some View {
        Button("Check for Updates…", action: checkForUpdatesViewModel.checkForUpdates)
            .disabled(!checkForUpdatesViewModel.canCheckForUpdates)
    }
}

final class CheckForUpdatesViewModel: ObservableObject {
    @Published var canCheckForUpdates = false
    private let updater: SPUUpdater

    init(updater: SPUUpdater) {
        self.updater = updater
        updater.publisher(for: \.canCheckForUpdates)
            .assign(to: &$canCheckForUpdates)
    }

    func checkForUpdates() {
        updater.checkForUpdates()
    }
}
```

- [ ] **Step 5: Add Info.plist keys via project.yml**

In `project.yml`, under the ILS CRM target `settings.base`, add:

```yaml
INFOPLIST_KEY_SUFeedURL: "https://raw.githubusercontent.com/edwardhodge-usa/ils-crm/main/appcast.xml"
INFOPLIST_KEY_SUPublicEDKey: "PLACEHOLDER_REPLACE_AFTER_KEY_GENERATION"
INFOPLIST_KEY_SUEnableAutomaticChecks: YES
```

Note: `SUPublicEDKey` will be replaced with the real key after running `generate_keys` in Task 5.

- [ ] **Step 6: Regenerate Xcode project and verify build**

```bash
cd swift-app && xcodegen generate
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -configuration Debug -destination "platform=macOS" 2>&1 | tail -5
```

Expected: `BUILD SUCCEEDED`

- [ ] **Step 7: Commit**

```bash
cd swift-app
git add ILSCRMApp.swift project.yml "ILS CRM.xcodeproj"
git commit -m "feat: integrate Sparkle auto-updater with Check for Updates menu"
```

### Task 5: Generate Sparkle Ed25519 Keypair & Create Appcast (Manual)

- [ ] **Step 1: Locate Sparkle CLI tools after SPM build**

```bash
find swift-app/.build -name "generate_keys" 2>/dev/null || \
find ~/Library/Developer/Xcode/DerivedData -name "generate_keys" -path "*/Sparkle*" 2>/dev/null | head -3
```

If not found, build the project once in Xcode to trigger SPM resolution, then re-search.

- [ ] **Step 2: Generate Ed25519 keypair**

Run the `generate_keys` tool. It stores the private key in the macOS Keychain (service: `https://sparkle-project.org`) and outputs the public key to stdout.

```bash
/path/to/generate_keys
```

Copy the public key output — it looks like a base64 string.

- [ ] **Step 3: Update SUPublicEDKey in project.yml**

Replace the placeholder:

```yaml
INFOPLIST_KEY_SUPublicEDKey: "<paste-public-key-here>"
```

- [ ] **Step 4: Create initial appcast.xml**

Write to `swift-app/../appcast.xml` (repo root):

```xml
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" xmlns:dc="http://purl.org/dc/elements/1.1/">
    <channel>
        <title>ILS CRM+</title>
        <description>ILS CRM+ macOS App Updates</description>
        <language>en</language>
    </channel>
</rss>
```

This is an empty feed. Entries are added during each `/release`.

- [ ] **Step 5: Regenerate project and commit**

```bash
cd swift-app && xcodegen generate
cd .. && git add appcast.xml swift-app/project.yml swift-app/"ILS CRM.xcodeproj"
git commit -m "feat: add Sparkle Ed25519 public key and empty appcast"
```

---

## Wave 3: License Check Service

### Task 6: Create LicenseService Actor

**Files:**
- Create: `swift-app/ILS CRM/Services/LicenseService.swift`

- [ ] **Step 1: Write LicenseService**

```swift
import Foundation
import os

/// License check service — validates app license against Airtable licensing base.
/// Port of electron/airtable/license-check.ts.
///
/// Uses a SEPARATE PAT + base from the main CRM sync. Same base as Electron:
/// Base: appMIBpSZpJ0vsiz1, Table: tblQhmjhL5WA8rP7S
actor LicenseService {
    static let shared = LicenseService()

    private let logger = Logger(subsystem: "com.ils-crm", category: "license")

    // Airtable licensing base config (same as Electron's license-config.ts)
    private let baseId = "appMIBpSZpJ0vsiz1"
    private let tableId = "tblQhmjhL5WA8rP7S"
    private let appName = "ILS CRM"

    // Field IDs from the licensing table
    private enum Fields {
        static let email = "fldUiOOTwFe9Y1IVa"
        static let name = "fldo5QoZgFoIDqPsH"
        static let status = "fld36VOJrlqKpeZpa"
        static let app = "fldOMjOAenJJ2Crls"
        static let airtableUserId = "fld6Gz62PhGy2hkpY"
        static let appVersion = "fldvS9VgXiyIHGcrU"
        static let lastCheckIn = "fldV7BeDhOwfme1eD"
        static let deviceInfo = "fldo0O2Je92GdVCzf"
    }

    // MARK: - Keychain Keys

    private let licensePATKey = "license-pat"

    // MARK: - License Status

    enum Status: Equatable {
        case active
        case revoked
        case suspended
        case notFound
        case error(String)

        var isValid: Bool { self == .active }
    }

    // MARK: - Check License

    func checkLicense(email: String) async -> Status {
        guard let pat = KeychainService.read(key: licensePATKey) else {
            logger.error("License PAT not found in Keychain")
            return .error("License PAT not configured")
        }

        // Validate email format before using in formula
        let emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
        guard email.wholeMatch(of: emailRegex) != nil else {
            return .error("Invalid email format")
        }

        let sanitizedEmail = email.replacingOccurrences(of: "'", with: "''")
        let formula = "AND({\(Fields.email)} = '\(sanitizedEmail)', {\(Fields.app)} = '\(appName)')"

        guard let encodedFormula = formula.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return .error("Failed to encode formula")
        }

        let urlString = "https://api.airtable.com/v0/\(baseId)/\(tableId)?filterByFormula=\(encodedFormula)&returnFieldsByFieldId=true"
        guard let url = URL(string: urlString) else {
            return .error("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                return .error("Not an HTTP response")
            }

            guard httpResponse.statusCode == 200 else {
                return .error("HTTP \(httpResponse.statusCode)")
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let records = json["records"] as? [[String: Any]],
                  let first = records.first,
                  let fields = first["fields"] as? [String: Any] else {
                return .notFound
            }

            let statusValue = fields[Fields.status] as? String ?? ""

            guard statusValue == "Active" else {
                let normalized = statusValue.lowercased()
                if normalized == "revoked" { return .revoked }
                if normalized == "suspended" { return .suspended }
                return .notFound
            }

            // Active — fire-and-forget check-in update
            if let recordId = first["id"] as? String {
                fireCheckIn(pat: pat, recordId: recordId)
            }

            return .active

        } catch {
            logger.error("License check failed: \(error.localizedDescription)")
            return .error(error.localizedDescription)
        }
    }

    // MARK: - Check-In (fire and forget)

    private nonisolated func fireCheckIn(pat: String, recordId: String) {
        Task.detached {
            let url = URL(string: "https://api.airtable.com/v0/\(self.baseId)/\(self.tableId)/\(recordId)")!
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
            let device = "\(ProcessInfo.processInfo.operatingSystemVersionString)"

            let body: [String: Any] = [
                "fields": [
                    "fldV7BeDhOwfme1eD": ISO8601DateFormatter().string(from: Date()),
                    "fldvS9VgXiyIHGcrU": version,
                    "fldo0O2Je92GdVCzf": "macOS \(device)",
                ]
            ]

            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            _ = try? await URLSession.shared.data(for: request)
        }
    }

    // MARK: - Grace Period

    private let gracePeriodKey = "license_last_verified"
    private let graceDuration: TimeInterval = 24 * 60 * 60 // 24 hours

    func saveLastVerified() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: gracePeriodKey)
    }

    func isWithinGracePeriod() -> Bool {
        let lastVerified = UserDefaults.standard.double(forKey: gracePeriodKey)
        guard lastVerified > 0 else { return false }
        return Date().timeIntervalSince1970 - lastVerified < graceDuration
    }

    // MARK: - Revocation

    /// Deletes all SwiftData store files. Call before showing RevokedView.
    nonisolated func deleteLocalStore() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let storeDir = appSupport

        let extensions = [".store", ".store-shm", ".store-wal"]
        let fm = FileManager.default

        do {
            let contents = try fm.contentsOfDirectory(at: storeDir, includingPropertiesForKeys: nil)
            for file in contents {
                let name = file.lastPathComponent
                if extensions.contains(where: { name.hasSuffix($0) }) && name.contains("ILS_CRM") {
                    try fm.removeItem(at: file)
                }
            }
        } catch {
            // Directory might not exist on first launch — that's fine
        }
    }

    // MARK: - PAT Management

    func savePAT(_ pat: String) throws {
        try KeychainService.save(key: licensePATKey, value: pat)
    }

    func hasPAT() -> Bool {
        KeychainService.read(key: licensePATKey) != nil
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd swift-app && xcodegen generate
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -configuration Debug -destination "platform=macOS" 2>&1 | tail -5
```

Expected: `BUILD SUCCEEDED`

- [ ] **Step 3: Commit**

```bash
cd swift-app
git add "ILS CRM/Services/LicenseService.swift" "ILS CRM.xcodeproj"
git commit -m "feat: add LicenseService actor — Airtable license check with grace period"
```

### Task 7: Create Auth Views (RevokedView & OfflineLockView)

**Files:**
- Create: `swift-app/ILS CRM/Views/Auth/RevokedView.swift`
- Create: `swift-app/ILS CRM/Views/Auth/OfflineLockView.swift`

- [ ] **Step 1: Create Auth directory**

```bash
mkdir -p "swift-app/ILS CRM/Views/Auth"
```

- [ ] **Step 2: Write RevokedView**

```swift
import SwiftUI

/// Lock screen shown when license is revoked or suspended.
/// Mirrors src/components/auth/RevokedPage.tsx
struct RevokedView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Lock icon
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.10))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.red)
                }
                .padding(.bottom, 20)

            Text("Access Revoked")
                .font(.system(size: 18, weight: .semibold))
                .padding(.bottom, 8)

            Text("Your access to ILS CRM has been revoked.")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)

            Text("If you believe this is an error, contact your administrator.")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
                .padding(.bottom, 24)

            // Admin email link
            Button("admin@imaginelabstudios.com") {
                if let url = URL(string: "mailto:admin@imaginelabstudios.com") {
                    NSWorkspace.shared.open(url)
                }
            }
            .buttonStyle(.plain)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(.accent)
            .padding(.bottom, 24)

            // Quit button
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.bordered)
            .controlSize(.regular)

            Spacer()

            // Version
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                Text("v\(version)")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .opacity(0.6)
                    .padding(.bottom, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.background)
    }
}
```

- [ ] **Step 3: Write OfflineLockView**

```swift
import SwiftUI

/// Lock screen shown when license cannot be verified and grace period has expired.
/// Mirrors src/components/auth/OfflineLockPage.tsx
struct OfflineLockView: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Warning icon
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.10))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(.orange)
                }
                .padding(.bottom, 20)

            Text("Unable to Verify License")
                .font(.system(size: 18, weight: .semibold))
                .padding(.bottom, 8)

            Text("Please connect to the internet and restart the app.")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.bottom, 6)

            Text("Your data is safe — the app will unlock once connectivity is restored.")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
                .padding(.bottom, 24)

            // Quit button
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.bordered)
            .controlSize(.regular)

            Spacer()

            // Version
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                Text("v\(version)")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
                    .opacity(0.6)
                    .padding(.bottom, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.background)
    }
}
```

- [ ] **Step 4: Verify build**

```bash
cd swift-app && xcodegen generate
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -configuration Debug -destination "platform=macOS" 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd swift-app
git add "ILS CRM/Views/Auth/" "ILS CRM.xcodeproj"
git commit -m "feat: add RevokedView and OfflineLockView — license lock screens"
```

### Task 8: Wire License Check into App Startup

**Files:**
- Modify: `swift-app/ILS CRM/ILSCRMApp.swift`

- [ ] **Step 1: Add app state enum and license integration**

Add the `AppState` enum above the `ILSCRMApp` struct:

```swift
/// App state machine — mirrors Electron's appState in App.tsx
enum AppState {
    case loading
    case revoked
    case offlineLocked
    case onboarding
    case ready
}
```

- [ ] **Step 2: Replace ContentView root with state-driven view**

Replace the `ILSCRMApp` struct's `body` property. The new version:

1. Uses `@State var appState: AppState = .loading`
2. Shows the appropriate view based on state
3. Runs license check in `.task` modifier
4. Starts a 2-hour periodic re-check timer

The `WindowGroup` content becomes:

```swift
@State private var appState: AppState = .loading
```

And the `WindowGroup` body switches on `appState`:

```swift
WindowGroup {
    Group {
        switch appState {
        case .loading:
            ProgressView("Verifying license…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .revoked:
            RevokedView()
        case .offlineLocked:
            OfflineLockView()
        case .onboarding:
            ContentView()
                .environment(syncEngine)
        case .ready:
            ContentView()
                .environment(syncEngine)
        }
    }
    .task { await performLicenseCheck() }
}
```

- [ ] **Step 3: Add license check methods**

Add these methods to `ILSCRMApp`:

```swift
private func performLicenseCheck() async {
    let email = UserDefaults.standard.string(forKey: "user_email") ?? ""

    // No email yet — skip license check (onboarding hasn't happened)
    guard !email.isEmpty else {
        appState = .onboarding
        return
    }

    // Check if license PAT is configured
    let licenseService = LicenseService.shared
    guard await licenseService.hasPAT() else {
        // No license PAT — proceed to app (license check not configured yet)
        appState = .ready
        return
    }

    let status = await licenseService.checkLicense(email: email)

    switch status {
    case .active:
        await licenseService.saveLastVerified()
        appState = .ready
        startPeriodicLicenseCheck(email: email)
    case .error:
        if await licenseService.isWithinGracePeriod() {
            appState = .ready
            startPeriodicLicenseCheck(email: email)
        } else {
            appState = .offlineLocked
        }
    case .revoked, .suspended, .notFound:
        licenseService.deleteLocalStore()
        appState = .revoked
    }
}

private func startPeriodicLicenseCheck(email: String) {
    // Re-check every 2 hours
    Task {
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(2 * 60 * 60))
            let status = await LicenseService.shared.checkLicense(email: email)
            switch status {
            case .active:
                await LicenseService.shared.saveLastVerified()
            case .error:
                if await !LicenseService.shared.isWithinGracePeriod() {
                    await MainActor.run { appState = .offlineLocked }
                }
            case .revoked, .suspended, .notFound:
                LicenseService.shared.deleteLocalStore()
                await MainActor.run { appState = .revoked }
            }
        }
    }
}
```

- [ ] **Step 4: Verify build**

```bash
cd swift-app && xcodegen generate
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -configuration Debug -destination "platform=macOS" 2>&1 | tail -5
```

Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
cd swift-app
git add "ILS CRM/ILSCRMApp.swift" "ILS CRM.xcodeproj"
git commit -m "feat: wire license check into app startup with state machine + periodic re-check"
```

---

## Wave 4: Bootstrap & Smoke Test

### Task 9: Store License PAT in Keychain

The license PAT needs to be stored in the Keychain before the license check will work. This is a one-time setup step.

- [ ] **Step 1: Add license PAT storage to SettingsView (or run via debug helper)**

The simplest approach: store the PAT on first launch. Add a call in `SettingsView.onAppear` or create a small bootstrap in `ILSCRMApp`:

```swift
// In performLicenseCheck(), before the guard for hasPAT():
// Bootstrap: store the license PAT if not already in Keychain
if await !licenseService.hasPAT() {
    // PAT from license-config.ts — same token used by Electron
    try? await licenseService.savePAT("REDACTED_AIRTABLE_PAT")
}
```

Note: This embeds the PAT in source. For a private employee app this is acceptable (same as Electron's gitignored `license-config.ts`). The file containing this is already in `.gitignore` territory — but since Swift source files are tracked, add a comment noting this is the license PAT and should not be committed to public repos.

Alternative: Add a "License" section to SettingsView with a SecureField for the PAT. This is cleaner but adds more UI work.

- [ ] **Step 2: Set user_email in UserDefaults**

The license check needs `user_email` in UserDefaults. This should already be set during onboarding. Verify:

```swift
UserDefaults.standard.string(forKey: "user_email")
```

If nil, the license check is skipped (goes to onboarding). Ensure the onboarding flow or SettingsView saves this value.

- [ ] **Step 3: Run the app and verify license check**

Launch the app in Xcode. Check console logs for:
- `[License] ` log messages showing the check result
- App should reach the main UI if the license is active

- [ ] **Step 4: Commit**

```bash
cd swift-app
git add -A
git commit -m "feat: bootstrap license PAT and smoke test license check flow"
```

---

## Execution Route

| Signal | Route |
|--------|-------|
| 9 tasks, multi-file, 3 waves | `/do` (subagents) |

Wave 1 (Tasks 1-3) has a manual gate: Edward must create the Developer ID Application certificate and store notarization credentials. Tasks 1-2 can be done by subagents. Task 3 requires interactive verification.

Waves 2-3 (Tasks 4-8) are fully automatable.

Wave 4 (Task 9) needs Edward to verify the running app.
