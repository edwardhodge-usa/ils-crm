# macOS Polish — ILS CRM Swift App

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Full polish (4 waves, ~14 tasks)

## Context

The Swift app has 100% feature parity with the Electron build (72/72 items). It needs macOS platform integration to feel like a native Mac app rather than a web app in SwiftUI clothing.

## Design Decisions

- **Window style:** Split toolbar (Apple Contacts/Calendar pattern) — sidebar has its own toolbar zone, content area has its own
- **Window size:** Default 1200x800, minimum 900x600
- **Sidebar toolbar:** Search field to filter nav items
- **Content toolbar:** Sync status indicator (left), Search field (center-right), Create button (right)
- **Settings:** Native macOS Settings scene (Cmd+, auto-wired), replacing current `.sheet()` presentation

## Wave 1 — Window Chrome (Session 7)

### Task 1: Window Sizing
**Files:** `ILSCRMApp.swift`
- Add `.defaultSize(width: 1200, height: 800)` to WindowGroup
- Set minimum window size (900x600) via NSWindow delegate or `.windowResizability`
- Verify NavigationSplitView column widths still work within min bounds

### Task 2: Split Toolbar
**Files:** `ContentView.swift`, `ILSCRMApp.swift`
- Add `.toolbarStyle(.unified)` to the window
- Sidebar toolbar zone: search field using `.searchable()` scoped to sidebar navigation
- Content toolbar zone:
  - Leading: (empty or page context)
  - Trailing: Sync status (green dot + "Synced Xm ago" / spinner + "Syncing..."), Create button ("+ New" context-aware per entity), Search field
- Sync status reads from existing `SyncEngine` observable
- Create button triggers the same form sheets already wired in each entity view

### Task 3: Settings Scene
**Files:** `ILSCRMApp.swift`, `SettingsView.swift`
- Replace `.sheet(isPresented: $showSettings)` with native `Settings { SettingsView() }` scene
- Remove the Settings button from the sidebar footer (Cmd+, is the standard access)
- Keep version number in Settings view itself
- SettingsView may need minor layout adjustments for standalone window vs sheet

### Task 4: Window Restoration
**Files:** `ILSCRMApp.swift`
- Add `.windowRestorationBehavior(.enabled)` (macOS 14+) or `NSWindow.restorationClass`
- Window remembers position, size, and sidebar state across app launches
- Sidebar selection state persisted via `@SceneStorage` or `@AppStorage`

## Wave 2 — Keyboard & Menus (Future Session)

### Task 5: Navigation Shortcuts
- Cmd+1 through Cmd+9 mapped to sidebar nav items (Dashboard, Contacts, Companies, Pipeline, Tasks, Projects, Proposals, Portal, Interactions)
- Implemented via `.commands { CommandMenu }` on the WindowGroup

### Task 6: Action Shortcuts
- Cmd+N: New record (context-aware per current entity)
- Cmd+K: Global search / command palette
- Cmd+F: Filter current list
- Cmd+R: Force sync
- Delete: Delete selected record (with confirmation)

### Task 7: Menu Bar
- **File:** New Record (Cmd+N), Close Window (Cmd+W)
- **Edit:** Standard (Cut/Copy/Paste — provided by system)
- **View:** Toggle Sidebar (Cmd+Opt+S), Refresh/Sync (Cmd+R)
- **Window:** Standard (Minimize, Zoom — provided by system)
- **Help:** (standard)

## Wave 3 — Toolbar & Search (Future Session)

### Task 8: Native .searchable()
- Replace manual `@State searchText` + filter logic with `.searchable(text:placement:)` on all list views
- Placement: `.sidebar` for sidebar filter, `.toolbar` for entity lists

### Task 9: Global Search (Cmd+K)
- Search across all entities (contacts, companies, opportunities, tasks, projects, proposals)
- Quick-jump overlay — type to filter, Enter to navigate
- Uses SwiftData `#Predicate` with `.localizedStandardContains()`

### Task 10: Sync Toolbar Indicator
- Live sync status in content toolbar
- Green dot + relative time ("Synced 2m ago")
- Spinning indicator during active sync
- Click to force sync
- Error state: red dot + "Sync failed" with retry

## Wave 4 — Interaction Polish (Future Session)

### Task 11: Context Menus
- Right-click on list items: Edit, Delete, Copy Email/Phone, Open in Airtable
- Implemented via `.contextMenu { }` modifier on list rows
- Actions match existing toolbar buttons + add Copy and Open in Airtable

### Task 12: Inline Click-to-Edit
- Detail panes: field values become editable on click (Apple Contacts pattern)
- Hover shows subtle highlight, click converts to text field / picker / date picker
- Auto-save on blur (focus loss)
- Cancel with Escape

### Task 13: Drag-and-Drop
- Pipeline Kanban: drag cards between stages (already implemented)
- Contacts list: drag to reorder or assign to company
- Sidebar: drag to reorder favorites (stretch goal)

### Task 14: Keyboard Navigation
- Tab / Shift+Tab through form fields
- Enter to confirm edits
- Escape to cancel / dismiss sheets
- Arrow keys to navigate lists
- Space to toggle checkboxes

## Verification Goals (Wave 1)

- [ ] Window opens at 1200x800 on first launch
- [ ] Window cannot be resized below 900x600
- [ ] Sidebar has search field in toolbar zone
- [ ] Content toolbar shows sync status, create button, search
- [ ] Settings opens via Cmd+, (native Settings scene)
- [ ] No Settings button in sidebar footer
- [ ] Window position/size persists across app relaunch
- [ ] Sidebar selection persists across app relaunch
- [ ] xcodebuild BUILD SUCCEEDED
