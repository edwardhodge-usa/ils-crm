# macOS Polish Wave 1 — Window Chrome Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ILS CRM Swift app look and behave like a native macOS app — proper window sizing, split toolbar with sync status, native Settings scene, and window restoration.

**Architecture:** Modify the app entry point (`ILSCRMApp.swift`) and root view (`ContentView.swift`) to add macOS window configuration, toolbar items, and scene storage. Convert Settings from a sheet to a native macOS Settings scene. All changes are in the Swift app at `swift-app/ILS CRM/`.

**Tech Stack:** SwiftUI, SwiftData, macOS 14+ APIs (`defaultSize`, `Settings` scene, `@SceneStorage`, `.toolbar`)

**Spec:** `docs/superpowers/specs/2026-03-12-macos-polish-design.md`

---

## Chunk 1: Window Sizing + Settings Scene

### Task 1: Window Default Size and Minimum Size

**Files:**
- Modify: `swift-app/ILS CRM/ILSCRMApp.swift`

- [ ] **Step 1: Add default window size**

In `ILSCRMApp.swift`, add `.defaultSize` to the WindowGroup:

```swift
WindowGroup {
    ContentView()
        .environment(SyncEngine(modelContainer: container))
}
.modelContainer(container)
.defaultSize(width: 1200, height: 800)
```

- [ ] **Step 2: Add minimum window size**

Add `.windowResizability` below `.defaultSize`:

```swift
.defaultSize(width: 1200, height: 800)
.windowResizability(.contentMinSize)
```

Then in `ContentView.swift`, add `.frame(minWidth:minHeight:)` to the root NavigationSplitView:

```swift
NavigationSplitView {
    sidebarContent
        .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
        .navigationTitle("ILS CRM")
} detail: {
    detailView
}
.frame(minWidth: 900, minHeight: 600)
```

- [ ] **Step 3: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/ILSCRMApp.swift" "swift-app/ILS CRM/Views/ContentView.swift"
git commit -m "feat(swift): add window default size (1200x800) and minimum (900x600)"
```

---

### Task 2: Convert Settings to Native macOS Settings Scene

**Files:**
- Modify: `swift-app/ILS CRM/ILSCRMApp.swift`
- Modify: `swift-app/ILS CRM/Views/ContentView.swift`
- Modify: `swift-app/ILS CRM/Views/Settings/SettingsView.swift`

- [ ] **Step 1: Verify Settings scene already exists in ILSCRMApp.swift**

The app already has a `Settings` scene (lines 50-55). Confirm it passes the SyncEngine environment. Currently it does NOT — it only has `.modelContainer(container)` but not `.environment(SyncEngine(...))`. This needs fixing.

Update `ILSCRMApp.swift` to share a single SyncEngine instance across both scenes. Extract it to a stored property:

```swift
@main
struct ILSCRMApp: App {
    let container: ModelContainer
    @State private var syncEngine: SyncEngine

    init() {
        let schema = Schema([
            Contact.self,
            Company.self,
            Opportunity.self,
            Project.self,
            Proposal.self,
            CRMTask.self,
            Interaction.self,
            ImportedContact.self,
            Specialty.self,
            PortalAccessRecord.self,
            PortalLog.self,
        ])

        let config = ModelConfiguration(
            "ILS_CRM",
            schema: schema,
            isStoredInMemoryOnly: false
        )

        do {
            let c = try ModelContainer(for: schema, configurations: [config])
            container = c
            _syncEngine = State(initialValue: SyncEngine(modelContainer: c))
        } catch {
            fatalError("Failed to initialize SwiftData container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(syncEngine)
        }
        .modelContainer(container)
        .defaultSize(width: 1200, height: 800)
        .windowResizability(.contentMinSize)

        #if os(macOS)
        Settings {
            SettingsView()
                .environment(syncEngine)
        }
        .modelContainer(container)
        #endif
    }
}
```

- [ ] **Step 2: Remove Settings sheet and footer from ContentView**

In `ContentView.swift`:

1. Remove `@State private var showSettings = false`
2. Remove the `.sheet(isPresented: $showSettings)` modifier
3. Replace the `settingsFooter` with just a version number:

```swift
private var settingsFooter: some View {
    VStack(spacing: 0) {
        Divider()
        Text("v3.4.3")
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 14)
            .padding(.vertical, 8)
    }
    .background(.bar)
}
```

- [ ] **Step 3: Update SettingsView for standalone window**

In `SettingsView.swift`:

1. Remove `@Environment(\.dismiss) private var dismiss`
2. Remove the `.toolbar` modifier with the "Done" button (Settings scene has its own close button)
3. Add `.frame(minWidth: 450, idealWidth: 500, minHeight: 350)` to the Form

```swift
var body: some View {
    Form {
        // ... existing sections unchanged ...
    }
    .formStyle(.grouped)
    .navigationTitle("Settings")
    .frame(minWidth: 450, idealWidth: 500, minHeight: 350)
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
```

- [ ] **Step 4: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/ILSCRMApp.swift" "swift-app/ILS CRM/Views/ContentView.swift" "swift-app/ILS CRM/Views/Settings/SettingsView.swift"
git commit -m "feat(swift): native Settings scene (Cmd+,), shared SyncEngine instance"
```

---

## Chunk 2: Toolbar + Sync Status + Window Restoration

### Task 3: Content Toolbar — Sync Status + Create + Search

**Files:**
- Modify: `swift-app/ILS CRM/Views/ContentView.swift`

- [ ] **Step 1: Add sync status toolbar item**

Add `@Environment(SyncEngine.self) private var syncEngine` to ContentView, then add a toolbar to the NavigationSplitView:

```swift
NavigationSplitView {
    sidebarContent
        .navigationSplitViewColumnWidth(min: 180, ideal: 200, max: 240)
        .navigationTitle("ILS CRM")
} detail: {
    detailView
}
.frame(minWidth: 900, minHeight: 600)
.toolbar {
    ToolbarItemGroup(placement: .automatic) {
        syncStatusView
        Spacer()
        createButton
    }
}
```

- [ ] **Step 2: Implement sync status view**

Add a computed property to ContentView:

```swift
@ViewBuilder
private var syncStatusView: some View {
    HStack(spacing: 6) {
        if syncEngine.isSyncing {
            ProgressView()
                .controlSize(.small)
            Text("Syncing...")
                .font(.caption)
                .foregroundStyle(.secondary)
        } else if let lastSync = syncEngine.lastSyncDate {
            Circle()
                .fill(syncEngine.syncError == nil ? Color.green : Color.red)
                .frame(width: 7, height: 7)
            Text(lastSync, style: .relative)
                .font(.caption)
                .foregroundStyle(.secondary)
        } else {
            Circle()
                .fill(Color.secondary)
                .frame(width: 7, height: 7)
            Text("Not synced")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
```

- [ ] **Step 3: Implement context-aware create button**

Add a computed property and action:

```swift
@State private var showCreateSheet = false

private var createEntityLabel: String {
    switch selection {
    case .contacts: return "Contact"
    case .companies: return "Company"
    case .pipeline: return "Opportunity"
    case .tasks: return "Task"
    case .projects: return "Project"
    case .proposals: return "Proposal"
    case .interactions: return "Interaction"
    case .importedContacts: return "Imported Contact"
    default: return "Record"
    }
}

@ViewBuilder
private var createButton: some View {
    let canCreate = [NavItem.contacts, .companies, .pipeline, .tasks, .projects, .proposals, .interactions, .importedContacts].contains(selection)
    if canCreate {
        Button {
            showCreateSheet = true
        } label: {
            Label("New \(createEntityLabel)", systemImage: "plus")
        }
    }
}
```

Note: The `showCreateSheet` state connects to each entity view's existing form sheet. Since each entity view manages its own create sheet internally, the toolbar button should instead notify the active entity view. A simpler approach: pass a binding or use `NotificationCenter` to trigger the create action in the active view.

**Simpler alternative:** Each entity view already has a "+ New" button in its `ListHeader`. The toolbar create button can post a notification that each view listens for:

```swift
// In ContentView:
@ViewBuilder
private var createButton: some View {
    let canCreate = [NavItem.contacts, .companies, .pipeline, .tasks, .projects, .proposals, .interactions, .importedContacts].contains(selection)
    if canCreate {
        Button {
            NotificationCenter.default.post(name: .createNewRecord, object: nil)
        } label: {
            Label("New \(createEntityLabel)", systemImage: "plus")
        }
    }
}

// Add extension at file level:
extension Notification.Name {
    static let createNewRecord = Notification.Name("createNewRecord")
}
```

Each entity view adds `.onReceive(NotificationCenter.default.publisher(for: .createNewRecord))` to trigger its `showCreateForm = true`.

- [ ] **Step 4: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/ContentView.swift"
git commit -m "feat(swift): content toolbar with sync status and context-aware create button"
```

---

### Task 4: Wire Create Notification to Entity Views

**Files:**
- Modify: `swift-app/ILS CRM/Views/Contacts/ContactsView.swift`
- Modify: `swift-app/ILS CRM/Views/Companies/CompaniesView.swift`
- Modify: `swift-app/ILS CRM/Views/Pipeline/PipelineView.swift`
- Modify: `swift-app/ILS CRM/Views/Tasks/TasksView.swift`
- Modify: `swift-app/ILS CRM/Views/Projects/ProjectsView.swift`
- Modify: `swift-app/ILS CRM/Views/Proposals/ProposalsView.swift`
- Modify: `swift-app/ILS CRM/Views/Interactions/InteractionsView.swift`
- Modify: `swift-app/ILS CRM/Views/ImportedContacts/ImportedContactsView.swift`

- [ ] **Step 1: Add .onReceive to each entity view**

In each view that has a `@State private var showCreateForm` (or equivalent), add:

```swift
.onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
    showCreateForm = true
}
```

This goes on the outermost view in each entity's body. The exact state variable name may vary per view (`showForm`, `showCreateSheet`, `showingForm`, etc.) — check each file.

- [ ] **Step 2: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 3: Commit**

```bash
git add swift-app/ILS\ CRM/Views/
git commit -m "feat(swift): wire toolbar create button to all entity views via notification"
```

---

### Task 5: Sidebar Navigation Search

**Files:**
- Modify: `swift-app/ILS CRM/Views/ContentView.swift`

- [ ] **Step 1: Add sidebar search state and filtering**

Add search state and filter the sidebar items:

```swift
@State private var sidebarSearchText = ""

private var filteredCrmItems: [NavItem] {
    filterItems(crmItems)
}
private var filteredWorkItems: [NavItem] {
    filterItems(workItems)
}
private var filteredActivityItems: [NavItem] {
    filterItems(activityItems)
}

private func filterItems(_ items: [NavItem]) -> [NavItem] {
    guard !sidebarSearchText.isEmpty else { return items }
    return items.filter { $0.title.localizedCaseInsensitiveContains(sidebarSearchText) }
}
```

- [ ] **Step 2: Add .searchable to sidebar and use filtered items**

Update `sidebarContent`:

```swift
private var sidebarContent: some View {
    List(selection: $selection) {
        if !filteredCrmItems.isEmpty {
            sidebarSection(title: "CRM", items: filteredCrmItems)
        }
        if !filteredWorkItems.isEmpty {
            sidebarSection(title: "WORK", items: filteredWorkItems)
        }
        if !filteredActivityItems.isEmpty {
            sidebarSection(title: "ACTIVITY", items: filteredActivityItems)
        }
    }
    .listStyle(.sidebar)
    .searchable(text: $sidebarSearchText, placement: .sidebar, prompt: "Filter")
    .safeAreaInset(edge: .bottom, spacing: 0) {
        settingsFooter
    }
}
```

- [ ] **Step 3: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Views/ContentView.swift"
git commit -m "feat(swift): sidebar search filter with .searchable()"
```

---

### Task 6: Window State Restoration

**Files:**
- Modify: `swift-app/ILS CRM/Views/ContentView.swift`

- [ ] **Step 1: Persist sidebar selection across launches**

Replace `@State` with `@SceneStorage` for the selection:

```swift
@SceneStorage("selectedNavItem") private var selection: NavItem? = .dashboard
```

This requires `NavItem` to conform to `RawRepresentable` where `RawValue == String` — it already does via `String` raw type on the enum.

Note: `@SceneStorage` works with `RawRepresentable` types. Since `NavItem` is `RawRepresentable` with `String`, this should work directly. If it doesn't compile (some SwiftUI versions need explicit conformance), fall back to:

```swift
@SceneStorage("selectedNavItem") private var selectedRawValue: String = "dashboard"

private var selection: Binding<NavItem?> {
    Binding(
        get: { NavItem(rawValue: selectedRawValue) },
        set: { selectedRawValue = $0?.rawValue ?? "dashboard" }
    )
}
```

- [ ] **Step 2: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Views/ContentView.swift"
git commit -m "feat(swift): persist sidebar selection across app launches via @SceneStorage"
```

---

## Verification Goals

- [ ] Window opens at 1200x800 on first launch
- [ ] Window cannot be resized below 900x600
- [ ] Sidebar has search field for filtering nav items
- [ ] Content toolbar shows sync status (green dot + relative time)
- [ ] Content toolbar shows context-aware create button (+ New Contact, etc.)
- [ ] Settings opens via Cmd+, (native Settings scene)
- [ ] No Settings button in sidebar footer (just version number)
- [ ] Sidebar selection persists across app relaunch
- [ ] SyncEngine is shared between main window and Settings scene
- [ ] xcodebuild BUILD SUCCEEDED
