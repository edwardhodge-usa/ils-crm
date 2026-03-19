# Apple Developer Signing, Notarization & Distribution — ILS CRM Swift

**Date:** 2026-03-19
**Scope:** ILS CRM Swift app (pathfinder) — incremental rollout to AI Tracker and ILS Expense Lab after validation
**Status:** Approved

## Context

ImagineLab Studios has received Apple Developer Program approval. Team ID: `3CHSW4M2B7`. Xcode is logged into the developer account. All three Swift apps currently use ad-hoc signing (`CODE_SIGN_IDENTITY: "-"`).

The Electron app already has:
- Auto-update via `electron-updater` pulling from GitHub Releases
- License check against a dedicated Airtable licensing base (`appMIBpSZpJ0vsiz1`)
- Revocation: deletes local DB, shows lock screen
- 24-hour grace period for network failures

The Swift apps need equivalent capabilities with proper Apple code signing.

## Distribution Model

- **Private employee distribution only** — never publicly available
- **Developer ID signed + notarized DMG** for initial install
- **Sparkle framework** for auto-updates via GitHub Releases
- **Same Airtable license check** as Electron (same base, same `appName: "ILS CRM"`)

## Layer 1: Code Signing & Notarization

### Certificate

- Developer ID Application certificate (created manually in Xcode > Settings > Accounts > Manage Certificates)
- Apple Development certificate already exists for debug builds

### project.yml Changes

```yaml
settings:
  base:
    DEVELOPMENT_TEAM: "3CHSW4M2B7"
  configs:
    Debug:
      CODE_SIGN_IDENTITY: "Apple Development"
      CODE_SIGN_STYLE: Automatic
    Release:
      CODE_SIGN_IDENTITY: "Developer ID Application"
      CODE_SIGN_STYLE: Manual
      CODE_SIGNING_REQUIRED: YES
```

UITests target retains ad-hoc signing (no distribution needed).

### Notarization Workflow

1. `xcodebuild archive` produces signed `.app` bundle
2. Package into DMG (using `create-dmg` or `hdiutil`)
3. `xcrun notarytool submit <dmg> --keychain-profile "ILS-Notarize" --wait`
4. `xcrun stapler staple <dmg>`
5. Result: DMG installs without Gatekeeper warnings

### Credential Storage

```bash
xcrun notarytool store-credentials "ILS-Notarize" \
  --apple-id "<developer-email>" \
  --team-id "3CHSW4M2B7" \
  --password "<app-specific-password>"
```

Stored in macOS Keychain. Not in code or config files.

### What Doesn't Change

- Debug builds use Apple Development certificate (no Keychain prompts during dev)
- XcodeGen workflow unchanged
- No entitlements or sandbox required (Developer ID outside App Store)

## Layer 2: Sparkle Auto-Update

### Integration

- Add Sparkle as SPM dependency (https://github.com/sparkle-project/Sparkle)
- Initialize `SPUStandardUpdaterController` in `ILSCRMApp.swift`
- Check interval: every 4 hours (matching Electron)

### Info.plist Keys

- `SUFeedURL`: URL to appcast.xml (GitHub Pages, raw GitHub URL, or gist)
- `SUPublicEDKey`: Ed25519 public key for update verification

### Ed25519 Signing

- Generate keypair once: `generate_keys` (Sparkle CLI tool bundled with the framework)
- Private key stored on Edward's machine only
- Public key embedded in `Info.plist`
- Each DMG signed before upload: `sign_update <dmg>`

### Appcast

- `appcast.xml` hosted in the GitHub repo or as a GitHub Pages file
- Each release entry contains: version, download URL (GitHub Release asset URL), release notes, Ed25519 signature, minimum system version
- Updated as part of the `/release` workflow

### Updated Release Workflow

1. Bump version in `project.yml`
2. `xcodebuild archive` (signed with Developer ID Application)
3. Package DMG
4. Notarize + staple
5. Sign DMG with Sparkle Ed25519 key
6. Generate appcast entry with `generate_appcast` or manually
7. `gh release create` with DMG attached
8. Update `appcast.xml`

### User Experience

- App checks for updates on launch and every 4 hours
- Native macOS update prompt (Sparkle's built-in UI)
- User clicks "Install Update" — app downloads, replaces itself, relaunches
- No manual DMG download needed after initial install

## Layer 3: License Check

### LicenseService.swift (Actor)

Calls the same Airtable licensing base as Electron:

- **Base:** `appMIBpSZpJ0vsiz1`
- **Table:** `tblQhmjhL5WA8rP7S`
- **App name:** `"ILS CRM"` (same record covers Electron and Swift — they never run simultaneously in production)
- **PAT:** Stored in Keychain via `KeychainService` (improvement over Electron's gitignored `.ts` file)

### Field IDs

| Field | ID | Purpose |
|-------|----|---------|
| email | `fldUiOOTwFe9Y1IVa` | User's email (filter key) |
| name | `fldo5QoZgFoIDqPsH` | Display name |
| status | `fld36VOJrlqKpeZpa` | Active / Revoked / Suspended |
| app | `fldOMjOAenJJ2Crls` | App name filter |
| airtableUserId | `fld6Gz62PhGy2hkpY` | Check-in: user's Airtable ID |
| appVersion | `fldvS9VgXiyIHGcrU` | Check-in: current app version |
| lastCheckIn | `fldV7BeDhOwfme1eD` | Check-in: timestamp |
| deviceInfo | `fldo0O2Je92GdVCzf` | Check-in: OS + version |

### Startup Flow

1. App launches
2. Read user email from `@AppStorage` (set during onboarding)
3. Call `LicenseService.checkLicense(email:)`
4. **Active** — save `lastVerified` to `@AppStorage`, start sync, show main UI
5. **Network error** — check 24-hour grace period:
   - Within grace: proceed normally
   - Expired: show `OfflineLockView`
6. **Revoked / suspended / not-found** — delete SwiftData store, show `RevokedView`

### Periodic Re-check

- Every 2 hours (matching Electron)
- On success: fire-and-forget PATCH with check-in data (app version, device info, timestamp)
- On network error: grace period logic
- On revocation: same flow as startup (delete store, lock screen)

### Security

- License PAT in Keychain (not in source)
- `lastVerified` in `@AppStorage` — only `LicenseService` actor writes it (no view-level tampering)
- SwiftData store deletion on revocation: `FileManager.default.removeItem(at:)` on the `.store` file
- Email validation before Airtable formula injection (same regex as Electron)

### UI

**RevokedView:**
- Red lock icon
- "Access Revoked" heading
- "Contact your administrator" message
- `admin@imaginelabstudios.com` link (opens Mail via `NSWorkspace`)
- Quit button (`NSApplication.shared.terminate`)
- Version number footer

**OfflineLockView:**
- Orange warning icon
- "Unable to Verify License" heading
- "Connect to the internet and restart" message
- "Your data is safe" reassurance
- Quit button
- Version number footer

### App State Machine

```swift
enum AppState {
    case loading
    case revoked
    case offlineLocked
    case onboarding
    case ready
}
```

`ILSCRMApp` uses `@State var appState: AppState = .loading` and switches the root view accordingly (same pattern as Electron's `App.tsx`).

## Phase 2: Rollout to Other Apps (Post-Validation)

After ILS CRM Swift is validated:

1. **AI Tracker** — already has `DEVELOPMENT_TEAM: 3CHSW4M2B7` in `project.yml`. Add signing config, Sparkle, and `LicenseService` with `appName: "AI Tracker"`.
2. **ILS Expense Lab** — already has release target scaffolded with Developer ID signing (Team ID commented out). Uncomment, add Sparkle, add `LicenseService` with `appName: "ILS Expense Lab"`.

Each app gets its own appcast.xml and license records in the Airtable licensing table.

This phase is NOT part of the initial implementation.

## Manual Steps (Edward)

1. Create Developer ID Application certificate in Xcode > Settings > Accounts > Manage Certificates
2. Generate app-specific password at appleid.apple.com for notarization
3. Run `xcrun notarytool store-credentials` to save notarization creds to Keychain
4. Create license records in the Airtable licensing table for Swift app users (if not already covered by existing "ILS CRM" records)

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `swift-app/project.yml` | Modified | Signing config (team, identity, style) |
| `ILS CRM/Services/LicenseService.swift` | Created | Airtable license check actor |
| `ILS CRM/Views/Auth/RevokedView.swift` | Created | Lock screen for revoked licenses |
| `ILS CRM/Views/Auth/OfflineLockView.swift` | Created | Lock screen for expired grace period |
| `ILS CRM/ILSCRMApp.swift` | Modified | App state machine, Sparkle init |
| `appcast.xml` | Created | Sparkle update feed (repo root or separate hosting) |
