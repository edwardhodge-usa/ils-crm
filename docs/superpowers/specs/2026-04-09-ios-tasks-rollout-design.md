# iOS Tasks Rollout — Design Spec

**Date:** 2026-04-09
**Status:** Draft
**Goal:** Add iPhone support to ILS CRM, starting with full CRUD Tasks as the first feature. Lay the foundation for incremental iOS feature rollout.

## Overview

The ILS CRM Swift app (v1.3.4, macOS) already has `supportedDestinations: [macOS, iOS]` in its XcodeGen config and `#if os()` conditionals in 7 files. No AppKit imports exist anywhere in the codebase. This spec covers adding an iPhone-optimized Tasks experience as the first iOS feature, with all 15 SwiftData models syncing via the existing Airtable sync engine.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Device target | iPhone only | Focused first step; iPad layouts deferred |
| Feature scope | Full CRUD for Tasks | View, create, edit, delete, mark complete |
| Data sync | Same Airtable sync engine, all 15 models | Engine is platform-agnostic; subsetting adds complexity for no gain |
| Auth & licensing | Same LicenseService | Reuse existing Airtable licensing check with 24h grace period |
| API key sharing | iCloud Keychain shared access group | Enter once on macOS, available on iPhone automatically |
| Navigation | TabView (Tasks + Settings) | Scales as features are added; standard iOS pattern |
| iOS views | Separate files in Views/iOS/ | Keeps macOS views untouched; avoids unreadable conditional sprawl |

## Architecture

### What's Shared (unchanged)

All of these are pure SwiftUI/Swift with no macOS-specific APIs:

- **Models** — all 15 SwiftData `@Model` classes (Contact, Company, CRMTask, etc.)
- **Services** — SyncEngine, AirtableService, KeychainService, LicenseService, AppStateManager, GmailOAuthService, ClaudeClient, EmailScanEngine
- **Config** — AirtableConfig (table IDs, field maps, sync order)
- **Utils** — EmailUtils, converters, AirtableSyncable protocol
- **Shared Components** — EditableFieldRow, LinkedRecordPicker, StatusBadge, AvatarView, BentoComponents, LinkedRecordResolver, SharedComponents, DetailComponents

### What's New (iOS-only)

```
ILS CRM/
├── Views/
│   ├── iOS/                          (NEW)
│   │   ├── iOSContentView.swift      — TabView root (Tasks + Settings)
│   │   ├── iOSTasksView.swift        — Task list with sections
│   │   ├── iOSTaskDetailView.swift   — Task detail with inline editing
│   │   ├── iOSTaskFormView.swift     — Task creation sheet
│   │   └── iOSSettingsView.swift     — API key, sync, theme, license
```

### What's Modified

| File | Change |
|------|--------|
| `ILSCRMApp.swift` | Route to `iOSContentView` on iOS; remove `.frame(minWidth:minHeight:)` on iOS |
| `KeychainService.swift` | Add shared access group + `kSecAttrSynchronizable` + migration from old keychain location |
| `ILS CRM.entitlements` | Add `keychain-access-groups` entitlement |
| `project.yml` | Add iOS Keychain entitlement; verify iOS build settings |

## Detailed Design

### 1. Project Structure & Build

The existing XcodeGen `project.yml` already declares:

```yaml
supportedDestinations: [macOS, iOS]
deploymentTarget:
  macOS: "14.0"
  iOS: "17.0"
```

Sparkle is already conditionally excluded via `platformFilter: macos`. No new targets needed — the universal target builds for both platforms.

**Build settings adjustments for iOS:**
- `LD_RUNPATH_SEARCH_PATHS` — XcodeGen sets this automatically for multi-destination targets
- Code signing for iOS uses Automatic signing in Debug (same team ID: 8RHA62T6FQ)
- Release signing deferred (App Store distribution is a future phase)

### 2. Shared Keychain Access Group

**Goal:** Enter API key once on macOS, iPhone picks it up via iCloud Keychain.

**Entitlement:** Add `keychain-access-groups` with value `$(TeamIdentifierPrefix)com.imaginelabstudios.shared` to the app entitlements.

**KeychainService changes:**
- Add `kSecAttrAccessGroup: "8RHA62T6FQ.com.imaginelabstudios.shared"` to all Keychain queries (save, load, delete)
- Add `kSecAttrSynchronizable: true` to enable cross-device sync via iCloud Keychain
- **Migration:** On first launch after update, check for existing key in old (non-grouped) location, copy to shared group, delete old entry
- **Fallback:** If shared Keychain read fails on iOS, show manual entry SecureField in Settings

### 3. App Entry Point (ILSCRMApp.swift)

The app entry point already has `#if os(macOS)` guards. Changes:

```swift
var body: some Scene {
    WindowGroup {
        Group {
            switch appStateManager.appState {
            case .loading:
                ProgressView("Verifying license...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .revoked:
                RevokedView()       // Already has #if os(macOS) guards
            case .offlineLocked:
                OfflineLockView()   // Already has #if os(macOS) guards
            case .onboarding, .ready:
                #if os(macOS)
                ContentView()
                    .environment(syncEngine)
                #else
                iOSContentView()
                    .environment(syncEngine)
                #endif
            }
        }
        .task { await appStateManager.performLicenseCheck() }
        #if os(macOS)
        .frame(minWidth: 900, minHeight: 600)
        #endif
    }
    .modelContainer(container)
    #if os(macOS)
    .defaultSize(width: 1200, height: 800)
    .windowResizability(.contentMinSize)
    .windowToolbarStyle(.unified)
    .commands {
        CommandGroup(after: .appInfo) {
            CheckForUpdatesView(updater: updaterController.updater)
        }
        NavigationCommands()
        NewRecordCommand()
        SidebarCommands()
    }
    #endif

    #if os(macOS)
    Settings {
        SettingsView()
            .environment(syncEngine)
    }
    .modelContainer(container)
    #endif
}
```

### 4. iOS Navigation (iOSContentView.swift)

```swift
struct iOSContentView: View {
    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        TabView {
            Tab("Tasks", systemImage: "checklist") {
                iOSTasksView()
            }
            Tab("Settings", systemImage: "gear") {
                iOSSettingsView()
            }
        }
        .task { syncEngine.startPolling() }
    }
}
```

Two tabs for Phase 1. Future releases add tabs: Contacts, Companies, Pipeline, etc.

### 5. Tasks List (iOSTasksView.swift)

**Layout:** `NavigationStack` with a `List` grouped into sections.

**Sections** (same grouping logic as macOS `TasksView`):
- Overdue (red header)
- Today
- Upcoming (next 7 days)
- No Date
- Completed (collapsed by default)

**Task row:** Priority dot (color-coded), task name, due date (red if overdue), type badge.

**Toolbar:**
- Leading: filter menu (by assignee, by type, by status)
- Trailing: sort menu (due date, priority, name, created), "+" button (presents `iOSTaskFormView` as sheet)

**Interactions:**
- Tap row → push `iOSTaskDetailView`
- Swipe leading → toggle complete/incomplete
- Swipe trailing → delete with confirmation
- Pull-to-refresh → triggers `syncEngine.forceSync()`
- Search bar (`.searchable` modifier) → filters by task name and notes

### 6. Task Detail (iOSTaskDetailView.swift)

**Presentation:** Pushed via `NavigationStack` (not sheet — standard iOS drill-down).

**Layout:** Scrollable `Form`-style sections:

1. **Header** — task name (editable), priority pill, status badge
2. **Schedule** — due date (EditableFieldRow.date), status (singleSelect dropdown)
3. **Info** — type (singleSelect), assigned to (singleSelect from assignee names), priority (singleSelect)
4. **Linked Records** — contacts, companies, projects, proposals (LinkedRecordPicker for each)
5. **Notes** — multiline text editor (EditableFieldRow.textarea)

**Toolbar:**
- Complete/uncomplete toggle button
- Menu (...) with delete option

**Save behavior:** Same as macOS — inline edits mutate the SwiftData model directly, set `isPendingPush = true`, sync engine pushes on next cycle.

### 7. Task Form (iOSTaskFormView.swift)

**Presentation:** `.sheet` from "+" button in tasks list.

**Layout:** `Form` with sections:
- Name (TextField, required)
- Priority (Picker: Low, Medium, High, Urgent)
- Type (Picker: 12 task types)
- Assigned To (Picker from assignee names)
- Due Date (DatePicker, optional)
- Status (Picker: Not Started, In Progress, Waiting, Completed)
- Linked Records (optional — contacts, projects, proposals, opportunities)
- Notes (TextEditor, optional)

**Save:** Creates `CRMTask` via `modelContext.insert()`, sets `isPendingPush = true`. Dismisses sheet.

**Cancel:** Dismisses without saving. No confirmation needed if no fields were filled.

### 8. iOS Settings (iOSSettingsView.swift)

Standard `Form`-based settings:

- **Airtable** — API key (SecureField, shows status: "Shared via iCloud Keychain" or manual entry), Base ID, sync interval picker (30s/60s/120s/Off), force sync button, last sync timestamp
- **Appearance** — theme toggle (System/Light/Dark)
- **Gmail** — connect/disconnect (ASWebAuthenticationSession works on iOS), scan interval
- **License** — status, email, last verified date (read-only)
- **About** — version, build number

### 9. Shared Component Adaptation

Most shared components are pure SwiftUI and work on both platforms. Known adaptations:

| Component | Issue | Fix |
|-----------|-------|-----|
| `LinkedRecordPicker` | May use `.popover` (macOS-style) | `#if os(iOS)` to use `.sheet` presentation |
| `EditableFieldRow` | `.popover` for dropdowns | `#if os(iOS)` to use inline `Picker` or `.sheet` |
| `NSWorkspace.shared.open()` | macOS-only for URL opening | Use `UIApplication.shared.open()` on iOS via `#if os()` |

These are small, surgical `#if os()` additions — not rewrites.

### 10. Things Not Included (iPhone)

- Sparkle auto-update (App Store handles updates)
- Menu bar commands (Go menu, Cmd+N, Cmd+K)
- Command Palette (search bar in list view covers this)
- Window size configuration
- NavigationSplitView / sidebar
- iPad adaptive layouts
- XCUITests for iOS (manual verification in Phase 1)
- App Store submission (build and test locally first)

## Testing Strategy

- **Unit tests:** Existing test target covers models and services — already platform-agnostic
- **Build verification:** Build for iPhone simulator via XcodeBuildMCP after each implementation task
- **UI verification:** Screenshot key screens on simulator (tasks list, detail, form, settings)
- **Keychain verification:** Confirm API key written on macOS simulator is readable on iOS simulator (same iCloud account required — may need device testing)
- **Sync verification:** Confirm tasks sync from Airtable, edits push back, pull-to-refresh works

## Future Phases

| Phase | Feature | Effort |
|-------|---------|--------|
| 2 | Contacts list + detail | Medium — reuse models, new iOS views |
| 3 | Companies list + detail | Medium — same pattern |
| 4 | Dashboard | Medium — adapt stat cards and charts for iPhone |
| 5 | Pipeline | High — Kanban on iPhone needs rethinking |
| 6 | iPad support | High — adaptive layouts, split view |
| 7 | App Store submission | Medium — screenshots, metadata, review |
