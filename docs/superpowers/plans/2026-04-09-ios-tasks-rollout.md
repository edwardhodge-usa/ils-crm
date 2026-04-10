# iOS Tasks Rollout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ILS CRM compile and run on iPhone with full CRUD Tasks as the first feature.

**Architecture:** Single universal target (already configured in project.yml). Wave 1 fixes ~20 files that use macOS-only APIs so the entire codebase compiles for iOS. Wave 2 adds 5 new iOS-specific view files. Wave 3 updates the app entry point and project config.

**Tech Stack:** SwiftUI, SwiftData, XcodeGen, Keychain Services, Airtable REST API

**Spec:** `docs/superpowers/specs/2026-04-09-ios-tasks-rollout-design.md`

---

## File Structure

### New Files
- `swift-app/ILS CRM/Utils/PlatformHelpers.swift` — cross-platform `openURL()` + `Color.platformControlBackground`
- `swift-app/ILS CRM/Views/iOS/iOSContentView.swift` — TabView root (Tasks + Settings)
- `swift-app/ILS CRM/Views/iOS/iOSTasksView.swift` — task list with sections
- `swift-app/ILS CRM/Views/iOS/iOSTaskDetailView.swift` — task detail with inline editing
- `swift-app/ILS CRM/Views/iOS/iOSTaskFormView.swift` — task creation sheet
- `swift-app/ILS CRM/Views/iOS/iOSSettingsView.swift` — API key, sync, theme, license

### Modified Files
- `swift-app/ILS CRM/Views/Shared/DetailComponents.swift` — replace NSWorkspace + controlBackgroundColor
- `swift-app/ILS CRM/Views/Shared/EditableAvatarView.swift` — wrap in `#if os(macOS)`
- `swift-app/ILS CRM/Views/Tasks/TasksView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Dashboard/DashboardView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Contacts/ContactsView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift` — replace NSWorkspace
- `swift-app/ILS CRM/Views/Companies/CompaniesView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift` — replace NSWorkspace
- `swift-app/ILS CRM/Views/Pipeline/PipelineView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Pipeline/OpportunityDetailView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Proposals/ProposalsView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Projects/ProjectsView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/Portal/PortalAccessView.swift` — replace NSWorkspace + controlBackgroundColor
- `swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift` — replace NSWorkspace
- `swift-app/ILS CRM/Views/Portal/GrantAccessSheet.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/ImportedContacts/ImportedContactsView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/ImportedContacts/ImportedContactDetailView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Views/ImportedContacts/EnrichmentDetailView.swift` — replace controlBackgroundColor
- `swift-app/ILS CRM/Services/KeychainService.swift` — shared access group + iCloud sync + migration
- `swift-app/ILS CRM/ILSCRMApp.swift` — route to iOSContentView on iOS
- `swift-app/ILS CRM/ILS CRM.entitlements` — add keychain-access-groups
- `swift-app/project.yml` — add iOS entitlements path

---

## Wave 1: Platform Compatibility (sequential)

### Task 1: Create PlatformHelpers.swift

Cross-platform helpers that replace macOS-only APIs. Every file that currently uses `NSWorkspace.shared.open()` or `Color(.controlBackgroundColor)` will switch to these helpers.

**Files:**
- Create: `swift-app/ILS CRM/Utils/PlatformHelpers.swift`

- [ ] **Step 1: Create the platform helpers file**

```swift
import SwiftUI

// MARK: - Cross-Platform URL Opening

/// Opens a URL using the platform-appropriate API.
/// Replaces direct NSWorkspace.shared.open() / UIApplication.shared.open() calls.
func openURL(_ url: URL) {
    #if os(macOS)
    NSWorkspace.shared.open(url)
    #else
    UIApplication.shared.open(url)
    #endif
}

// MARK: - Cross-Platform Colors

extension Color {
    /// Background color for control surfaces (search bars, sort controls, cards).
    /// macOS: NSColor.controlBackgroundColor
    /// iOS: UIColor.secondarySystemGroupedBackground
    static var platformControlBackground: Color {
        #if os(macOS)
        Color(nsColor: .controlBackgroundColor)
        #else
        Color(uiColor: .secondarySystemGroupedBackground)
        #endif
    }
}
```

Write this to `swift-app/ILS CRM/Utils/PlatformHelpers.swift`.

- [ ] **Step 2: Verify it compiles**

Run: `cd swift-app && xcodegen generate 2>&1 | tail -5`

Then build for macOS to confirm no regressions:
```bash
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "platform=macOS" -quiet 2>&1 | tail -10
```

Expected: BUILD SUCCEEDED

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Utils/PlatformHelpers.swift"
git commit -m "feat(swift): add cross-platform helpers for URL opening and control background color"
```

---

### Task 2: Replace NSWorkspace.shared.open() across all files

Replace every `NSWorkspace.shared.open(url)` call with `openURL(url)` from PlatformHelpers. Skip files that already have `#if os(macOS)` guards (RevokedView, OfflineLockView, GmailOAuthService).

**Files to modify (7 files, ~15 call sites):**
- `swift-app/ILS CRM/Views/Shared/DetailComponents.swift` — lines 60, 166, 483
- `swift-app/ILS CRM/Views/Shared/EditableAvatarView.swift` — line 214 (but Task 3 wraps this whole file)
- `swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift` — lines 798, 804, 810
- `swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift` — lines 122, 136
- `swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift` — lines 99, 229
- `swift-app/ILS CRM/Views/Portal/PortalAccessView.swift` — line 694

- [ ] **Step 1: Replace in DetailComponents.swift**

Find and replace all 3 occurrences of `NSWorkspace.shared.open(url)` with `openURL(url)` in `swift-app/ILS CRM/Views/Shared/DetailComponents.swift`.

Specifically:
- Line 60: `NSWorkspace.shared.open(url)` → `openURL(url)`
- Line 166: `NSWorkspace.shared.open(url)` → `openURL(url)`
- Line 483: `if let url { NSWorkspace.shared.open(url) }` → `if let url { openURL(url) }`

- [ ] **Step 2: Replace in ContactDetailView.swift**

Find and replace all 3 occurrences of `NSWorkspace.shared.open(url)` or similar in `swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift` with `openURL(url)`.

Read the file around lines 795-815 to find exact patterns. Replace each `NSWorkspace.shared.open(...)` with `openURL(...)`.

- [ ] **Step 3: Replace in CompanyDetailView.swift**

Find and replace 2 occurrences in `swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift`:
- Line 122: `NSWorkspace.shared.open(u)` → `openURL(u)`
- Line 136: `NSWorkspace.shared.open(telURL)` → `openURL(telURL)`

- [ ] **Step 4: Replace in Portal views**

`swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift`:
- Line 99: `NSWorkspace.shared.open(url)` → `openURL(url)`
- Line 229: `NSWorkspace.shared.open(url)` → `openURL(url)`

`swift-app/ILS CRM/Views/Portal/PortalAccessView.swift`:
- Line 694: `NSWorkspace.shared.open(url)` → `openURL(url)`

- [ ] **Step 5: Verify no remaining unguarded NSWorkspace calls**

Search for unguarded `NSWorkspace` usage:
```bash
cd "swift-app/ILS CRM" && grep -rn "NSWorkspace" --include="*.swift" | grep -v "#if os"
```

Expected: Only `EditableAvatarView.swift` (handled in Task 3) should remain. All others replaced with `openURL()`.

- [ ] **Step 6: Commit**

```bash
git add -A swift-app/ILS\ CRM/Views/
git commit -m "refactor(swift): replace NSWorkspace.shared.open() with cross-platform openURL()"
```

---

### Task 3: Wrap EditableAvatarView in #if os(macOS)

EditableAvatarView heavily uses NSImage, NSColor, and .popover — all macOS-only. Tasks don't use this component. Wrap the entire file content in `#if os(macOS)` so it compiles away on iOS. Future iOS phases will create an iOS-native avatar editor.

**Files:**
- Modify: `swift-app/ILS CRM/Views/Shared/EditableAvatarView.swift`

- [ ] **Step 1: Wrap the entire file in platform guard**

Read `swift-app/ILS CRM/Views/Shared/EditableAvatarView.swift` fully. Add `#if os(macOS)` after the imports and `#endif` at the very end of the file.

The file starts with `import SwiftUI` (and possibly other imports). After all import statements, add:

```swift
#if os(macOS)
import AppKit
```

And at the very end of the file, add:

```swift
#endif
```

Remove any existing standalone `import AppKit` or `import Cocoa` if present. The NSImage/NSColor usage is fine inside the `#if os(macOS)` block.

- [ ] **Step 2: Check for references from shared code**

```bash
cd "swift-app/ILS CRM" && grep -rn "EditableAvatarView" --include="*.swift" | grep -v "EditableAvatarView.swift"
```

If any iOS-compiled view references `EditableAvatarView`, those references need `#if os(macOS)` guards too. Expected: only used by ContactDetailView and CompanyDetailView (macOS-only views in future phases — but they compile for both platforms now).

If referenced: wrap each reference in `#if os(macOS)` / `#endif`.

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Views/Shared/EditableAvatarView.swift"
git commit -m "refactor(swift): guard EditableAvatarView behind #if os(macOS)"
```

---

### Task 4: Replace controlBackgroundColor across all files

Replace `Color(.controlBackgroundColor)` and `Color(nsColor: .controlBackgroundColor)` with `Color.platformControlBackground` from PlatformHelpers across 14 files.

**Files (14):**
- `Views/Shared/DetailComponents.swift`
- `Views/Tasks/TasksView.swift`
- `Views/Dashboard/DashboardView.swift`
- `Views/Contacts/ContactsView.swift`
- `Views/Companies/CompaniesView.swift`
- `Views/Pipeline/PipelineView.swift`
- `Views/Pipeline/OpportunityDetailView.swift`
- `Views/Proposals/ProposalsView.swift`
- `Views/Projects/ProjectsView.swift`
- `Views/Portal/PortalAccessView.swift`
- `Views/Portal/GrantAccessSheet.swift`
- `Views/ImportedContacts/ImportedContactsView.swift`
- `Views/ImportedContacts/ImportedContactDetailView.swift`
- `Views/ImportedContacts/EnrichmentDetailView.swift`

- [ ] **Step 1: Replace in all 14 files**

For each file, find and replace:
- `Color(.controlBackgroundColor)` → `Color.platformControlBackground`
- `Color(nsColor: .controlBackgroundColor)` → `Color.platformControlBackground`

Use the Edit tool's `replace_all` parameter for each file. Process all 14 files.

- [ ] **Step 2: Verify no remaining controlBackgroundColor references**

```bash
cd "swift-app/ILS CRM" && grep -rn "controlBackgroundColor" --include="*.swift"
```

Expected: zero results (EditableAvatarView is already wrapped in `#if os(macOS)` from Task 3).

- [ ] **Step 3: Build for macOS to confirm no regressions**

```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "platform=macOS" -quiet 2>&1 | tail -10
```

Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add -A swift-app/ILS\ CRM/Views/
git commit -m "refactor(swift): replace controlBackgroundColor with cross-platform Color.platformControlBackground"
```

---

### Task 5: Fix remaining macOS-only APIs

Handle `NSApplication.shared.terminate()` in OfflineLockView/RevokedView (already partially guarded) and any other macOS-only API that slipped through.

**Files:**
- `Views/Auth/OfflineLockView.swift`
- `Views/Auth/RevokedView.swift`
- Any file flagged by iOS build attempt

- [ ] **Step 1: Attempt iOS build to find remaining issues**

```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "generic/platform=iOS" -quiet 2>&1 | grep "error:" | head -30
```

- [ ] **Step 2: Fix each error**

For each build error:
- If it's an `NSWorkspace`/`NSApplication`/`NSImage`/`NSColor` reference: add `#if os(macOS)` guard or use the platform helper
- If it's `Color(nsColor:)`: replace with `Color.platformControlBackground` or platform-conditional
- If it's an API availability issue: add `#if os(macOS)` or `#available` guard

Common fixes:
- `NSApplication.shared.terminate(nil)` → wrap in `#if os(macOS)` with `exit(0)` on iOS as fallback
- `ASPresentationAnchor()` differences between macOS/iOS — check GmailOAuthService (already guarded)

- [ ] **Step 3: Iterate until iOS build succeeds**

Re-run the iOS build command after each fix until BUILD SUCCEEDED:
```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "generic/platform=iOS" -quiet 2>&1 | grep "error:" | head -20
```

- [ ] **Step 4: Verify macOS still builds**

```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "platform=macOS" -quiet 2>&1 | tail -5
```

Expected: BUILD SUCCEEDED for both platforms.

- [ ] **Step 5: Commit**

```bash
git add -A swift-app/
git commit -m "fix(swift): resolve remaining macOS-only API usage for iOS compilation"
```

---

## Wave 2: Infrastructure (sequential)

### Task 6: Update KeychainService for shared access group

Add iCloud Keychain shared access group so the API key entered on macOS is available on iPhone automatically. Include migration from old (unshared) keychain location.

**Files:**
- Modify: `swift-app/ILS CRM/Services/KeychainService.swift`

- [ ] **Step 1: Update KeychainService with shared access group**

Replace the entire content of `swift-app/ILS CRM/Services/KeychainService.swift` with:

```swift
import Foundation
import Security

/// Keychain wrapper for storing the Airtable API key securely.
///
/// Uses a shared Keychain access group + iCloud Keychain sync so the API key
/// entered on macOS is automatically available on iPhone (same Team ID).
enum KeychainService {
    static let service = "ils-crm-airtable"
    static let apiKeyAccount = "airtable-pat"
    static let accessGroup = "8RHA62T6FQ.com.imaginelabstudios.shared"

    // MARK: - Save

    /// Saves a value to the shared Keychain. Overwrites if it already exists.
    static func save(key: String = apiKeyAccount, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }

        // Delete existing item first (update pattern)
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrSynchronizable as String: kSecAttrSynchronizableAny,
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // Add new item with iCloud sync
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrSynchronizable as String: true,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked,
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status: status)
        }
    }

    // MARK: - Read

    /// Reads a value from the shared Keychain. Returns nil if not found.
    static func read(key: String = apiKeyAccount) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrSynchronizable as String: kSecAttrSynchronizableAny,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    // MARK: - Delete

    /// Deletes a value from the shared Keychain.
    static func delete(key: String = apiKeyAccount) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrSynchronizable as String: kSecAttrSynchronizableAny,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Migration

    /// Migrates API key from the old (non-shared) Keychain location to the shared group.
    /// Call once on app launch. Safe to call multiple times — no-ops if already migrated.
    static func migrateToSharedGroupIfNeeded() {
        // Check if key already exists in shared group
        if read() != nil { return }

        // Try to read from old (non-shared) location
        let oldQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: apiKeyAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(oldQuery as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return  // No old key found, nothing to migrate
        }

        // Save to new shared location
        do {
            try save(value: value)
            // Delete old entry
            let deleteOld: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: apiKeyAccount,
            ]
            SecItemDelete(deleteOld as CFDictionary)
            print("[Keychain] Migrated API key to shared access group")
        } catch {
            print("[Keychain] Migration failed: \(error)")
        }
    }
}

// MARK: - Errors

enum KeychainError: LocalizedError {
    case encodingFailed
    case saveFailed(status: OSStatus)

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode value for Keychain storage"
        case .saveFailed(let status):
            return "Keychain save failed with status \(status)"
        }
    }
}
```

- [ ] **Step 2: Call migration from ILSCRMApp.init()**

In `swift-app/ILS CRM/ILSCRMApp.swift`, add at the end of `init()` (after the container setup, before the `#if os(macOS)` updaterController block):

```swift
KeychainService.migrateToSharedGroupIfNeeded()
```

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Services/KeychainService.swift" "swift-app/ILS CRM/ILSCRMApp.swift"
git commit -m "feat(swift): shared Keychain access group for cross-device API key sync"
```

---

### Task 7: Update entitlements and project.yml

Add Keychain access group entitlement and ensure iOS build settings are correct.

**Files:**
- Modify: `swift-app/ILS CRM/ILS CRM.entitlements`
- Modify: `swift-app/project.yml`

- [ ] **Step 1: Update entitlements**

Replace the content of `swift-app/ILS CRM/ILS CRM.entitlements` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.imaginelabstudios.shared</string>
    </array>
</dict>
</plist>
```

- [ ] **Step 2: Update project.yml for iOS entitlements**

In `swift-app/project.yml`, under the `ILS CRM` target's `settings.configs.Debug` section, add:

```yaml
CODE_SIGN_ENTITLEMENTS: "ILS CRM/ILS CRM.entitlements"
```

This ensures both Debug and Release builds use the entitlements file (Release already has it).

- [ ] **Step 3: Regenerate Xcode project**

```bash
cd swift-app && xcodegen generate 2>&1 | tail -5
```

Expected: `Generated project ILS CRM.xcodeproj` with no errors.

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/ILS CRM.entitlements" "swift-app/project.yml"
git commit -m "feat(swift): add shared Keychain entitlement for cross-device API key"
```

---

## Wave 3: iOS Views (parallel-safe — all create new files)

### Task 8: Create iOSContentView

The root view for iPhone — a TabView with Tasks and Settings tabs.

**Files:**
- Create: `swift-app/ILS CRM/Views/iOS/iOSContentView.swift`

- [ ] **Step 1: Create the iOS directory**

```bash
mkdir -p "swift-app/ILS CRM/Views/iOS"
```

- [ ] **Step 2: Create iOSContentView.swift**

```swift
import SwiftUI
import SwiftData

/// Root view for iPhone — TabView with Tasks and Settings.
/// Future phases add Contacts, Companies, Pipeline tabs.
struct iOSContentView: View {
    @Environment(SyncEngine.self) private var syncEngine

    var body: some View {
        TabView {
            Tab("Tasks", systemImage: "checklist") {
                iOSTasksView()
            }
            Tab("Settings", systemImage: "gear") {
                NavigationStack {
                    iOSSettingsView()
                }
            }
        }
        .task {
            syncEngine.startPolling()
        }
    }
}
```

Write this to `swift-app/ILS CRM/Views/iOS/iOSContentView.swift`.

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Views/iOS/iOSContentView.swift"
git commit -m "feat(ios): add iOSContentView with TabView root"
```

---

### Task 9: Create iOSTasksView

The main task list for iPhone with grouped sections, search, sort, swipe actions, and pull-to-refresh.

**Files:**
- Create: `swift-app/ILS CRM/Views/iOS/iOSTasksView.swift`

- [ ] **Step 1: Create iOSTasksView.swift**

```swift
import SwiftUI
import SwiftData

/// iPhone task list — NavigationStack with grouped sections.
/// Reuses the same grouping logic as macOS TasksView but with iPhone-native patterns:
/// NavigationStack, .searchable, swipe actions, pull-to-refresh.
struct iOSTasksView: View {
    @Query(sort: \CRMTask.dueDate) private var tasks: [CRMTask]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var sortOrder: TaskSortOrder = .dueDate
    @State private var showNewTask = false
    @State private var filterMode: TaskFilterMode = .allTasks

    // MARK: - Filter Mode

    enum TaskFilterMode: String, CaseIterable {
        case allTasks = "All"
        case overdue = "Overdue"
        case today = "Today"
        case scheduled = "Scheduled"
        case completed = "Completed"
    }

    // MARK: - Date Helpers

    private var today: Date { Calendar.current.startOfDay(for: Date()) }

    private func isOverdue(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        let isComplete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        return Calendar.current.startOfDay(for: due) < today && !isComplete
    }

    private func isToday(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) == today
    }

    private func isScheduled(_ task: CRMTask) -> Bool {
        guard let due = task.dueDate else { return false }
        return Calendar.current.startOfDay(for: due) > today
    }

    private func isCompleted(_ task: CRMTask) -> Bool {
        task.status?.localizedCaseInsensitiveContains("complet") ?? false
    }

    private func isWaiting(_ task: CRMTask) -> Bool {
        task.status?.localizedCaseInsensitiveContains("waiting") ?? false
    }

    // MARK: - Filtered + Sorted Tasks

    private var filteredTasks: [CRMTask] {
        var result = Array(tasks)

        // Filter mode
        switch filterMode {
        case .allTasks:  result = result.filter { !isCompleted($0) }
        case .overdue:   result = result.filter { isOverdue($0) }
        case .today:     result = result.filter { isToday($0) && !isOverdue($0) }
        case .scheduled: result = result.filter { isScheduled($0) && !isWaiting($0) }
        case .completed: result = result.filter { isCompleted($0) }
        }

        // Search
        if !searchText.isEmpty {
            result = result.filter { task in
                (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return sortTasks(result)
    }

    // MARK: - Grouped Sections (for All Tasks mode)

    private var overdueTasks: [CRMTask] {
        sortTasks(tasks.filter { isOverdue($0) && matchesSearch($0) })
    }
    private var todayTasks: [CRMTask] {
        sortTasks(tasks.filter { isToday($0) && !isOverdue($0) && !isCompleted($0) && matchesSearch($0) })
    }
    private var waitingTasks: [CRMTask] {
        sortTasks(tasks.filter { isWaiting($0) && !isOverdue($0) && !isToday($0) && matchesSearch($0) })
    }
    private var noDateTasks: [CRMTask] {
        sortTasks(tasks.filter { $0.dueDate == nil && !isCompleted($0) && !isWaiting($0) && matchesSearch($0) })
    }
    private var scheduledTasks: [CRMTask] {
        sortTasks(tasks.filter { isScheduled($0) && !isWaiting($0) && matchesSearch($0) })
    }

    private func matchesSearch(_ task: CRMTask) -> Bool {
        if searchText.isEmpty { return true }
        return (task.task?.localizedCaseInsensitiveContains(searchText) ?? false) ||
               (task.notes?.localizedCaseInsensitiveContains(searchText) ?? false)
    }

    // MARK: - Sort

    private func sortTasks(_ tasks: [CRMTask]) -> [CRMTask] {
        switch sortOrder {
        case .dueDate:
            return tasks.sorted { a, b in
                switch (a.dueDate, b.dueDate) {
                case (nil, nil): return false
                case (nil, _):   return false
                case (_, nil):   return true
                case let (ad?, bd?): return ad < bd
                }
            }
        case .nameAZ:
            return tasks.sorted {
                ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedAscending
            }
        case .nameZA:
            return tasks.sorted {
                ($0.task ?? "").localizedCaseInsensitiveCompare($1.task ?? "") == .orderedDescending
            }
        case .priorityHighLow:
            return tasks.sorted { priorityRank($0.priority) < priorityRank($1.priority) }
        case .dateCreated:
            return tasks.sorted { a, b in
                switch (a.airtableModifiedAt, b.airtableModifiedAt) {
                case (nil, nil): return false
                case (nil, _):   return false
                case (_, nil):   return true
                case let (ad?, bd?): return ad > bd
                }
            }
        }
    }

    private func priorityRank(_ priority: String?) -> Int {
        guard let p = priority else { return 3 }
        if p.localizedCaseInsensitiveContains("high")   { return 0 }
        if p.localizedCaseInsensitiveContains("medium") { return 1 }
        if p.localizedCaseInsensitiveContains("low")    { return 2 }
        return 3
    }

    private func priorityColor(_ priority: String?) -> Color {
        guard let p = priority else { return .gray }
        if p.localizedCaseInsensitiveContains("high")   { return .red }
        if p.localizedCaseInsensitiveContains("medium") { return .orange }
        if p.localizedCaseInsensitiveContains("low")    { return .green }
        return .gray
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Group {
                if filterMode == .allTasks && searchText.isEmpty {
                    groupedListView
                } else {
                    flatListView
                }
            }
            .navigationTitle("Tasks")
            .searchable(text: $searchText, prompt: "Search tasks")
            .refreshable {
                await syncEngine.forceSync()
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Picker("Filter", selection: $filterMode) {
                            ForEach(TaskFilterMode.allCases, id: \.self) { mode in
                                Text(mode.rawValue).tag(mode)
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("Sort", selection: $sortOrder) {
                            ForEach(TaskSortOrder.allCases, id: \.self) { order in
                                Text(order.rawValue).tag(order)
                            }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewTask = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showNewTask) {
                NavigationStack {
                    iOSTaskFormView()
                }
            }
        }
    }

    // MARK: - Grouped List (default All Tasks view)

    private var groupedListView: some View {
        List {
            taskSection("Overdue", tasks: overdueTasks, color: .red, icon: "exclamationmark.triangle.fill")
            taskSection("Today", tasks: todayTasks, color: .orange, icon: "sun.max.fill")
            taskSection("Waiting", tasks: waitingTasks, color: .yellow, icon: "hourglass")
            taskSection("No Date", tasks: noDateTasks, color: .secondary, icon: "calendar.badge.minus")
            taskSection("Scheduled", tasks: scheduledTasks, color: .blue, icon: "calendar")
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: String.self) { taskId in
            if let task = tasks.first(where: { $0.id == taskId }) {
                iOSTaskDetailView(task: task)
            }
        }
        .overlay {
            if overdueTasks.isEmpty && todayTasks.isEmpty && waitingTasks.isEmpty &&
               noDateTasks.isEmpty && scheduledTasks.isEmpty {
                ContentUnavailableView("No Tasks", systemImage: "checklist",
                    description: Text("All caught up!"))
            }
        }
    }

    // MARK: - Flat List (filtered/searched view)

    private var flatListView: some View {
        List {
            ForEach(filteredTasks) { task in
                taskRow(task)
            }
        }
        .listStyle(.insetGrouped)
        .navigationDestination(for: String.self) { taskId in
            if let task = tasks.first(where: { $0.id == taskId }) {
                iOSTaskDetailView(task: task)
            }
        }
        .overlay {
            if filteredTasks.isEmpty {
                ContentUnavailableView.search(text: searchText)
            }
        }
    }

    // MARK: - Section

    @ViewBuilder
    private func taskSection(_ title: String, tasks: [CRMTask], color: Color, icon: String) -> some View {
        if !tasks.isEmpty {
            Section {
                ForEach(tasks) { task in
                    taskRow(task)
                }
            } header: {
                Label(title, systemImage: icon)
                    .foregroundStyle(color)
                    .font(.subheadline.weight(.semibold))
            }
        }
    }

    // MARK: - Task Row

    @ViewBuilder
    private func taskRow(_ task: CRMTask) -> some View {
        NavigationLink(value: task.id) {
            HStack(spacing: 12) {
                // Priority dot
                Circle()
                    .fill(priorityColor(task.priority))
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 3) {
                    Text(task.task ?? "Untitled")
                        .font(.body)
                        .strikethrough(isCompleted(task))
                        .foregroundStyle(isCompleted(task) ? .secondary : .primary)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        if let due = task.dueDate {
                            Text(due, style: .date)
                                .font(.caption)
                                .foregroundStyle(isOverdue(task) ? .red : .secondary)
                        }
                        if let type = task.type, !type.isEmpty {
                            Text(type)
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.secondary.opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
        }
        .swipeActions(edge: .leading) {
            Button {
                toggleComplete(task)
            } label: {
                Label(
                    isCompleted(task) ? "Undo" : "Done",
                    systemImage: isCompleted(task) ? "arrow.uturn.backward" : "checkmark"
                )
            }
            .tint(isCompleted(task) ? .orange : .green)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                deleteTask(task)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Actions

    private func toggleComplete(_ task: CRMTask) {
        let wasCompleted = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        task.status = wasCompleted ? "To Do" : "Completed"
        task.completedDate = wasCompleted ? nil : Date()
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    private func deleteTask(_ task: CRMTask) {
        syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
        modelContext.delete(task)
    }
}
```

Write this to `swift-app/ILS CRM/Views/iOS/iOSTasksView.swift`.

- [ ] **Step 2: Commit**

```bash
git add "swift-app/ILS CRM/Views/iOS/iOSTasksView.swift"
git commit -m "feat(ios): add iOSTasksView with grouped sections, search, swipe actions"
```

---

### Task 10: Create iOSTaskDetailView

Full detail view for a task with inline editing, linked records, and complete/delete actions.

**Files:**
- Create: `swift-app/ILS CRM/Views/iOS/iOSTaskDetailView.swift`

- [ ] **Step 1: Create iOSTaskDetailView.swift**

```swift
import SwiftUI
import SwiftData

/// iPhone task detail — Form-based layout with inline editing.
/// Uses the same @Bindable + saveField pattern as macOS TaskDetailView.
struct iOSTaskDetailView: View {
    @Bindable var task: CRMTask
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var showDeleteConfirm = false
    @State private var showingContactsPicker = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingProjectsPicker = false
    @State private var showingProposalsPicker = false

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    // MARK: - Options

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed", "Cancelled"]
    private let priorityOptions = ["🟢 Low", "🟡 Medium", "🔴 High"]
    private let typeOptions = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    private var assigneeOptions: [String] {
        let descriptor = FetchDescriptor<CRMTask>()
        let allTasks = (try? modelContext.fetch(descriptor)) ?? []
        return Array(Set(allTasks.compactMap(\.assignedTo))).sorted()
    }

    // MARK: - Helpers

    private var isComplete: Bool {
        task.status?.localizedCaseInsensitiveContains("complet") ?? false
    }

    private var isOverdue: Bool {
        guard let due = task.dueDate else { return false }
        let complete = task.status?.localizedCaseInsensitiveContains("complet") ?? false
        return Calendar.current.startOfDay(for: due) < Calendar.current.startOfDay(for: Date()) && !complete
    }

    private func markModified() {
        task.localModifiedAt = Date()
        task.isPendingPush = true
    }

    // MARK: - Linked Record Labels

    private var contactLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveContacts(ids: task.contactsIds)
    }
    private var opportunityLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveOpportunities(ids: task.salesOpportunitiesIds)
    }
    private var projectLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveProjects(ids: task.projectsIds)
    }
    private var proposalLabels: [String] {
        LinkedRecordResolver(context: modelContext).resolveProposals(ids: task.proposalIds)
    }

    // MARK: - Body

    var body: some View {
        Form {
            // Overdue banner
            if isOverdue {
                Section {
                    Label("This task is overdue", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            // Task name
            Section("Task") {
                TextField("Task name", text: Binding(
                    get: { task.task ?? "" },
                    set: { task.task = $0; markModified() }
                ))
            }

            // Details
            Section("Details") {
                Picker("Priority", selection: Binding(
                    get: { task.priority ?? "" },
                    set: { task.priority = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { Text($0).tag($0) }
                }

                Picker("Type", selection: Binding(
                    get: { task.type ?? "" },
                    set: { task.type = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                }

                Picker("Status", selection: Binding(
                    get: { task.status ?? "To Do" },
                    set: { task.status = $0; markModified() }
                )) {
                    ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                }

                Picker("Assigned To", selection: Binding(
                    get: { task.assignedTo ?? "" },
                    set: { task.assignedTo = $0.isEmpty ? nil : $0; markModified() }
                )) {
                    Text("Unassigned").tag("")
                    ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                }
            }

            // Schedule
            Section("Schedule") {
                DatePicker(
                    "Due Date",
                    selection: Binding(
                        get: { task.dueDate ?? Date() },
                        set: { task.dueDate = $0; markModified() }
                    ),
                    displayedComponents: .date
                )

                if isComplete, let completed = task.completedDate {
                    LabeledContent("Completed") {
                        Text(completed, style: .date)
                    }
                }
            }

            // Linked Records
            Section("Linked Records") {
                linkedRecordRow("Contacts", items: contactLabels) {
                    showingContactsPicker = true
                }
                linkedRecordRow("Opportunities", items: opportunityLabels) {
                    showingOpportunitiesPicker = true
                }
                linkedRecordRow("Projects", items: projectLabels) {
                    showingProjectsPicker = true
                }
                linkedRecordRow("Proposals", items: proposalLabels) {
                    showingProposalsPicker = true
                }
            }

            // Notes
            Section("Notes") {
                TextEditor(text: Binding(
                    get: { task.notes ?? "" },
                    set: { task.notes = $0.isEmpty ? nil : $0; markModified() }
                ))
                .frame(minHeight: 100)
            }

            // Actions
            Section {
                Button {
                    let wasCompleted = isComplete
                    task.status = wasCompleted ? "To Do" : "Completed"
                    task.completedDate = wasCompleted ? nil : Date()
                    markModified()
                } label: {
                    Label(
                        isComplete ? "Mark Incomplete" : "Mark Complete",
                        systemImage: isComplete ? "arrow.uturn.backward.circle" : "checkmark.circle"
                    )
                }

                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    Label("Delete Task", systemImage: "trash")
                }
            }
        }
        .navigationTitle(task.task ?? "Task")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this task?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: CRMTask.airtableTableId, recordId: task.id)
                modelContext.delete(task)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingContactsPicker) {
            LinkedRecordPicker(title: "Link Contacts", entityType: .contacts,
                currentIds: Set(task.contactsIds)) { ids in
                task.contactsIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingOpportunitiesPicker) {
            LinkedRecordPicker(title: "Link Opportunities", entityType: .opportunities,
                currentIds: Set(task.salesOpportunitiesIds)) { ids in
                task.salesOpportunitiesIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingProjectsPicker) {
            LinkedRecordPicker(title: "Link Projects", entityType: .projects,
                currentIds: Set(task.projectsIds)) { ids in
                task.projectsIds = Array(ids); markModified()
            }
        }
        .sheet(isPresented: $showingProposalsPicker) {
            LinkedRecordPicker(title: "Link Proposals", entityType: .proposals,
                currentIds: Set(task.proposalIds)) { ids in
                task.proposalIds = Array(ids); markModified()
            }
        }
    }

    // MARK: - Linked Record Row

    @ViewBuilder
    private func linkedRecordRow(_ label: String, items: [String], onAdd: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .foregroundStyle(.secondary)
                Spacer()
                Button { onAdd() } label: {
                    Image(systemName: "plus.circle")
                }
            }
            if !items.isEmpty {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .font(.subheadline)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
        }
    }
}
```

Write this to `swift-app/ILS CRM/Views/iOS/iOSTaskDetailView.swift`.

- [ ] **Step 2: Commit**

```bash
git add "swift-app/ILS CRM/Views/iOS/iOSTaskDetailView.swift"
git commit -m "feat(ios): add iOSTaskDetailView with inline editing and linked records"
```

---

### Task 11: Create iOSTaskFormView

Task creation sheet for iPhone.

**Files:**
- Create: `swift-app/ILS CRM/Views/iOS/iOSTaskFormView.swift`

- [ ] **Step 1: Create iOSTaskFormView.swift**

```swift
import SwiftUI
import SwiftData

/// iPhone task creation form — presented as a sheet from the "+" button.
/// Mirrors the macOS TaskFormView but uses iOS-native Form styling.
struct iOSTaskFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query private var allTasks: [CRMTask]

    @State private var taskName = ""
    @State private var status = "To Do"
    @State private var priority = ""
    @State private var type = ""
    @State private var assignedTo = ""
    @State private var dueDate = Date()
    @State private var hasDueDate = false
    @State private var notes = ""

    private let statusOptions = ["To Do", "In Progress", "Waiting", "Completed"]
    private let priorityOptions = ["🔴 High", "🟡 Medium", "🟢 Low"]
    private let typeOptions = [
        "Schedule Meeting", "Send Qualifications", "Follow-up Email",
        "Follow-up Call", "Other", "Presentation Deck", "Research",
        "Administrative", "Send Proposal", "Internal Review", "Project", "Travel"
    ]

    private var assigneeOptions: [String] {
        Array(Set(allTasks.compactMap { $0.assignedTo }.filter { !$0.isEmpty })).sorted()
    }

    private var collaboratorMap: [String: String] {
        Dictionary(
            allTasks
                .filter { $0.assignedTo != nil && $0.assignedToData != nil }
                .map { ($0.assignedTo!, $0.assignedToData!) },
            uniquingKeysWith: { _, last in last }
        )
    }

    var body: some View {
        Form {
            Section("Task") {
                TextField("Task name", text: $taskName)
            }

            Section("Details") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("Priority", selection: $priority) {
                    Text("None").tag("")
                    ForEach(priorityOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("Type", selection: $type) {
                    Text("None").tag("")
                    ForEach(typeOptions, id: \.self) { Text($0).tag($0) }
                }
                Picker("Assigned To", selection: $assignedTo) {
                    Text("Unassigned").tag("")
                    ForEach(assigneeOptions, id: \.self) { Text($0).tag($0) }
                }
            }

            Section("Schedule") {
                Toggle("Due Date", isOn: $hasDueDate)
                if hasDueDate {
                    DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextEditor(text: $notes)
                    .frame(minHeight: 80)
            }
        }
        .navigationTitle("New Task")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    private func save() {
        let name = taskName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        let resolvedAssignedTo = assignedTo.isEmpty ? nil : assignedTo
        let resolvedAssignedToData = resolvedAssignedTo.flatMap { collaboratorMap[$0] }

        let newTask = CRMTask(
            id: "local_\(UUID().uuidString)",
            task: name,
            isPendingPush: true
        )
        newTask.status = status
        newTask.priority = priority.isEmpty ? nil : priority
        newTask.type = type.isEmpty ? nil : type
        newTask.assignedTo = resolvedAssignedTo
        newTask.assignedToData = resolvedAssignedToData
        newTask.dueDate = hasDueDate ? dueDate : nil
        newTask.notes = notes.isEmpty ? nil : notes
        newTask.localModifiedAt = Date()
        modelContext.insert(newTask)

        dismiss()
    }
}
```

Write this to `swift-app/ILS CRM/Views/iOS/iOSTaskFormView.swift`.

- [ ] **Step 2: Commit**

```bash
git add "swift-app/ILS CRM/Views/iOS/iOSTaskFormView.swift"
git commit -m "feat(ios): add iOSTaskFormView for task creation"
```

---

### Task 12: Create iOSSettingsView

Settings screen for iPhone — API key, sync, theme, license, Gmail.

**Files:**
- Create: `swift-app/ILS CRM/Views/iOS/iOSSettingsView.swift`

- [ ] **Step 1: Create iOSSettingsView.swift**

```swift
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
```

Write this to `swift-app/ILS CRM/Views/iOS/iOSSettingsView.swift`.

- [ ] **Step 2: Commit**

```bash
git add "swift-app/ILS CRM/Views/iOS/iOSSettingsView.swift"
git commit -m "feat(ios): add iOSSettingsView with API key, sync, theme settings"
```

---

## Wave 4: App Entry Point + Build Verification (sequential)

### Task 13: Update ILSCRMApp.swift for iOS routing

Route to iOSContentView on iOS. Guard macOS-only scene modifiers.

**Files:**
- Modify: `swift-app/ILS CRM/ILSCRMApp.swift`

- [ ] **Step 1: Add iOS content view routing**

In `swift-app/ILS CRM/ILSCRMApp.swift`, find the `.onboarding, .ready:` case (around line 93-94). Replace:

```swift
case .onboarding, .ready:
    ContentView()
        .environment(syncEngine)
```

With:

```swift
case .onboarding, .ready:
    #if os(macOS)
    ContentView()
        .environment(syncEngine)
    #else
    iOSContentView()
        .environment(syncEngine)
    #endif
```

- [ ] **Step 2: Guard the .frame(minWidth:minHeight:) modifier**

Find `.frame(minWidth: 900, minHeight: 600)` (line 99). Wrap it:

```swift
#if os(macOS)
.frame(minWidth: 900, minHeight: 600)
#endif
```

- [ ] **Step 3: Verify KeychainService.migrateToSharedGroupIfNeeded() is called**

Confirm the migration call from Task 6 Step 2 is present in `init()`. If not, add it after the container setup block (before `#if os(macOS)` updaterController).

- [ ] **Step 4: Regenerate Xcode project and build for iOS**

```bash
cd swift-app && xcodegen generate 2>&1 | tail -5
```

Then build for iOS simulator:
```bash
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "platform=iOS Simulator,name=iPhone 16" -quiet 2>&1 | tail -20
```

Expected: BUILD SUCCEEDED

- [ ] **Step 5: Build for macOS to confirm no regressions**

```bash
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination "platform=macOS" -quiet 2>&1 | tail -10
```

Expected: BUILD SUCCEEDED

- [ ] **Step 6: Commit**

```bash
git add "swift-app/ILS CRM/ILSCRMApp.swift"
git commit -m "feat(ios): route to iOSContentView on iPhone, guard macOS-only modifiers"
```

---

### Task 14: iOS Simulator Verification

Run the app on iPhone simulator, verify tasks sync and UI works.

**Files:** None (verification only)

- [ ] **Step 1: Boot iPhone simulator**

```bash
xcrun simctl boot "iPhone 16" 2>/dev/null; open -a Simulator
```

- [ ] **Step 2: Build and run on simulator**

Use XcodeBuildMCP or:
```bash
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" \
  -destination "platform=iOS Simulator,name=iPhone 16" 2>&1 | tail -20
```

Then install and launch:
```bash
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "ILS CRM.app" -path "*/Debug-iphonesimulator/*" 2>/dev/null | head -1)
xcrun simctl install booted "$APP_PATH"
xcrun simctl launch booted com.imaginelabstudios.ils-crm
```

- [ ] **Step 3: Screenshot key screens**

```bash
xcrun simctl io booted screenshot /tmp/ios-crm-tasks.png
```

Take screenshots of: tasks list, task detail, task form, settings.

- [ ] **Step 4: Verify checklist**

Confirm each item:
- [ ] App launches without crash
- [ ] License check passes (or shows appropriate state)
- [ ] Tasks tab shows task list with sections
- [ ] Pull-to-refresh triggers sync
- [ ] Tapping a task pushes to detail view
- [ ] Editing a field marks task as pending push
- [ ] "+" button opens task creation form
- [ ] Creating a task adds it to the list
- [ ] Swipe-to-complete works
- [ ] Swipe-to-delete works
- [ ] Settings tab shows API key status
- [ ] Settings tab shows sync controls

---

## Final Verification

After all tasks complete, run these checks:

```bash
# iOS build
cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" \
  -destination "platform=iOS Simulator,name=iPhone 16" -quiet 2>&1 | tail -5

# macOS build (no regressions)
xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" \
  -destination "platform=macOS" -quiet 2>&1 | tail -5

# No unguarded macOS APIs
grep -rn "NSWorkspace\|NSApplication\|NSImage\|NSColor\|controlBackgroundColor" \
  "ILS CRM/" --include="*.swift" | grep -v "#if os" | grep -v "PlatformHelpers"
```

All three must pass before marking complete.

## Execution Route

**Recommended: Subagent-driven** — 14 tasks across 4 waves. Wave 1 (Tasks 1-5) is sequential (each builds on the last). Wave 2 (Tasks 6-7) is sequential. Wave 3 (Tasks 8-12) is parallel-safe (all create new files). Wave 4 (Tasks 13-14) is sequential.
