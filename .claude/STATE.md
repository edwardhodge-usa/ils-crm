# Session State

**Last updated:** 2026-05-05 12:10
**Goal:** Migrate macOS distribution from Developer ID + Sparkle to Mac App Store TestFlight (private/internal)
**Plan:** `.claude/PLAN.md` — TestFlight macOS Migration (v1.5.1)

## Current Task
**What:** Wave 2-4 (code prep) complete. Awaiting Wave 1 (App Store Connect web UI) before Wave 5 (archive + upload).
**Status:** In progress

## Completed
- ✅ Diagnosed v1.5.0 launch failure: AMFI -413 — `keychain-access-groups` entitlement requires provisioning profile, Developer ID Manual config has none
- ✅ Confirmed ILS Expense Lab does NOT depend on shared keychain group (was dead architecture under Developer ID)
- ✅ Decided: Mac App Store TestFlight cutover (resolves AMFI cleanly via App Store distribution profile)
- ✅ Removed Sparkle SPM dep + Info.plist keys from `swift-app/project.yml`
- ✅ Bumped to v1.5.1, build 23
- ✅ Replaced Release config: Developer ID Manual → Apple Distribution Automatic (covers both iOS + macOS distribution; resolves prior iOS TestFlight `CODE_SIGN_IDENTITY=` empty-override hack)
- ✅ Wrapped Sparkle code with `#if os(macOS) && canImport(Sparkle)` in `ILSCRMApp.swift` (5 blocks)
- ✅ Added `com.apple.security.app-sandbox = true` to `ILS CRM.entitlements`
- ✅ Added runtime `APP_SANDBOX_CONTAINER_ID` check in `SyncEngine.swift` + `EmailScanEngine.swift` to bypass `/tmp/` lock when sandboxed
- ✅ `xcodegen generate` clean
- ✅ Debug compile clean — verified by apple-platform-build-tools subagent

## Open: Wave 1 — User-driven (App Store Connect web UI)
1. Add macOS platform to existing iOS app record in App Store Connect → My Apps → ILS CRM → "+" → macOS. Bundle ID: `com.imaginelabstudios.ils-crm`.
2. Configure internal TestFlight group with Ed + 2nd user.

## Open: Wave 5 — After Wave 1
- Open `swift-app/ILS CRM.xcodeproj` in Xcode → Signing & Capabilities tab → confirm "Apple Distribution" profile auto-downloads (needs Wave 1 done).
- Archive scheme "ILS CRM" with Release config → Window > Organizer → Distribute App → App Store Connect → Upload.
- Submit for TestFlight review (24-48h first time).

## Open: Wave 6-7
- Both users install via TestFlight on first approval; re-enter Airtable PAT, Anthropic key, Gmail OAuth, license email
- Verify Kevin McBee Person Rates render in Contact 360 (closes lingering S19)
- Update CLAUDE.md, PARITY.md, vault memory + Cortex
- `/close` to commit

## Key Files Modified
- `swift-app/project.yml` — Sparkle dep removed, Apple Distribution + Automatic, v1.5.1/23
- `swift-app/ILS CRM/ILS CRM.entitlements` — `app-sandbox = true` added
- `swift-app/ILS CRM/ILSCRMApp.swift` — Sparkle blocks now `#if canImport(Sparkle)`
- `swift-app/ILS CRM/Services/SyncEngine.swift` — sandbox-aware sync lock
- `swift-app/ILS CRM/Services/EmailScanEngine.swift` — sandbox-aware scan lock

## Lessons (capture at /close)
- **AMFI -413 root cause:** `keychain-access-groups` entitlement requires either App Store distribution profile OR Developer ID profile — NOT compatible with Developer ID + Manual signing without an embedded profile. macOS 26.x tightened enforcement; same entitlement worked on earlier OS versions.
- **`Apple Distribution` + Automatic is unified for iOS + macOS** distribution — replaces the `CODE_SIGN_IDENTITY=` empty override hack used in iOS TestFlight builds since v1.4.0.
- **Sandbox detection at runtime:** `ProcessInfo.processInfo.environment["APP_SANDBOX_CONTAINER_ID"]` — works in any signing context, no compile-time flag needed.
- **Sparkle preservation pattern:** `#if canImport(Sparkle)` lets Sparkle code stay in source. Re-enable for a Developer ID build by adding the SPM dep back to project.yml + restoring Info.plist `SU*` keys.
