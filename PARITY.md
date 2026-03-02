# ILS CRM — Feature Parity Tracker

> Electron (primary) vs Swift (shadow build)
> Updated: 2026-03-02

## Status Key
- **Done** — Fully implemented and working
- **Stub** — File exists with placeholder UI, no logic
- **TODO** — Not started
- **Bug** — Has known issues (see Notes)
- **N/A** — Not applicable to this platform

---

## Core Architecture

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| App entry point | Done | Stub | `main.ts` → `ILSCRMApp.swift` |
| SwiftData / sql.js container | Done | Stub | Schema defined, no data flow yet |
| Airtable REST client | Done | Stub | `client.ts` → `AirtableService.swift` (actor) |
| Sync engine (push-first, pull) | Done | Stub | `sync-engine.ts` → `SyncEngine.swift` |
| Airtable field maps | Done | Stub | `field-maps.ts` → `AirtableConfig.swift` (table IDs only, no per-field maps yet) |
| Bidirectional converters | Done | Done | `converters.ts` → `AirtableConvertible` protocol + 11 converter extensions |
| Polling (60s interval) | Done | Stub | Method exists, no actual sync logic |
| isSyncing mutex | Done | Stub | Actor + syncLock flag in place |
| Cross-app sync lock (/tmp) | Done | Done | Both apps check `/tmp/ils-crm-sync.lock` before syncing |
| Keychain API key storage | N/A | Done | Electron uses SQLite; Swift uses macOS Keychain (security improvement) |
| Xcode project (xcodegen) | N/A | Done | `project.yml` → `ILS CRM.xcodeproj` via xcodegen |
| IPC bridge (contextBridge) | Done | N/A | No process boundary in native app |
| Preload security (contextIsolation) | Done | N/A | |

## Data Models (11 tables)

| Table | Electron Status | Swift Status | Notes |
|-------|----------------|--------------|-------|
| Contacts (57 fields) | Done | Stub | `@Model` with all fields, no Codable/converter |
| Companies (24 fields) | Done | Stub | |
| Opportunities (23 fields) | Done | Stub | engagementType correctly typed as [String] |
| Projects (18 fields) | Done | Stub | |
| Proposals (13+4 fields) | Done | Stub | 4 migrated fields included |
| Tasks (12 fields) | Done | Stub | Named `CRMTask` to avoid Swift.Task conflict |
| Interactions (9 fields) | Done | Stub | Correctly marked as CRUD (not read-only) |
| Imported Contacts (48 fields) | Done | Stub | |
| Specialties (3 fields) | Done | Stub | Read-only, no isPendingPush |
| Portal Access (37 fields) | Done | Stub | 12 lookup + 1 formula marked read-only |
| Portal Logs (12 fields) | Done | Stub | Read-only, no isPendingPush |

## Navigation & Layout

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Sidebar navigation | Done | Stub | `Sidebar.tsx` → `ContentView.swift` NavigationSplitView |
| Top bar (title + sync status) | Done | TODO | `TopBar.tsx` — needs toolbar items in Swift |
| Route config (`routes.ts`) | Done | Stub | Enum-based in `ContentView.NavigationSection` |
| Dark mode toggle | Done | TODO | Electron: localStorage. Swift: `@AppStorage` + `.preferredColorScheme()` |
| macOS menu bar | Done | TODO | `menu.ts` — needs SwiftUI `.commands {}` |
| Window configuration | Done | TODO | Electron: `BrowserWindow`. Swift: `WindowGroup` modifiers |

## Dashboard

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Dashboard page | Done | Stub | `DashboardPage.tsx` → `DashboardView.swift` |
| Stat cards (contacts, companies, deals, tasks) | Done | TODO | `StatCard.tsx` — needs SwiftUI grid |
| Pipeline summary widget | Done | TODO | `PipelineWidget.tsx` — bar chart by stage |
| Follow-up alerts | Done | TODO | `dashboard:getFollowUpAlerts` query |
| Tasks due today | Done | TODO | `dashboard:getTasksDueToday` query |
| Colored stat cards | Done | TODO | Post-rebuild: indigo, green, orange, red |

## Contacts

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Contact list with filters | Done | Stub | `ContactListPage.tsx` → `ContactsView.swift` |
| Contact 360 detail view | Done | Stub | `Contact360Page.tsx` → `Contact360View` |
| Contact create/edit form | Done | Stub | `ContactForm.tsx` → `ContactFormView` |
| Contact row component | Done | TODO | `ContactRow.tsx` — inline in list for now |
| Contact stats | Done | TODO | `ContactStats.tsx` |
| Filter tabs (All/Leads/Clients/etc.) | Done | TODO | `FilterTabs.tsx` — needs SwiftUI picker |
| Specialty color badges | Done | TODO | Deterministic hash → palette color |
| Linked record display | Done | TODO | Show companies, opportunities, tasks inline |

## Companies

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Company list | Done | Stub | `CompanyListPage.tsx` → `CompaniesView.swift` |
| Company 360 detail view | Done | Stub | `Company360Page.tsx` → `Company360View` |
| Company create/edit form | Done | Stub | `CompanyForm.tsx` → `CompanyFormView` |
| Company row component | Done | TODO | `CompanyRow.tsx` |

## Pipeline (Opportunities)

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Pipeline page (Kanban + list toggle) | Done | Stub | `PipelinePage.tsx` → `PipelineView.swift` |
| Kanban board (@dnd-kit) | Done | TODO | Swift: `.draggable()` / `.dropDestination()` |
| Kanban columns by salesStage | Done | TODO | `KanbanColumn.tsx` |
| Deal cards | Done | TODO | `DealCard.tsx` |
| Deal detail view | Done | Stub | `DealDetail.tsx` → `DealDetailView` |
| Opportunity create/edit form | Done | Stub | `OpportunityForm.tsx` → `OpportunityFormView` |
| Stage progress bar | Done | TODO | `StageProgress.tsx` |
| Click vs drag differentiation | Bug | TODO | Electron bug #5: clicks only drag, can't navigate |
| Kanban small-window layout | Bug | TODO | Electron UX #4: 7 columns overflow |

## Tasks

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Tasks overview page | Done | Stub | `TasksPage.tsx` → `TasksView.swift` |
| Task list with filters | Done | Stub | `TaskListPage.tsx` |
| Task create/edit form | Done | Stub | `TaskForm.tsx` → `TaskFormView` |
| Due date overdue highlighting | Done | Stub | Red text for overdue in Swift stub |
| Task grouping and sorting | TODO | TODO | Feature request #6 |
| Task detail with contact/company | TODO | TODO | Feature request #8 |

## Proposals

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Proposal list | Done | Stub | `ProposalListPage.tsx` → `ProposalsView.swift` |
| Proposal detail view | Done | TODO | `ProposalDetail.tsx` |
| Proposal create/edit form | Done | Stub | `ProposalForm.tsx` → `ProposalFormView` |
| Proposal row component | Done | TODO | `ProposalRow.tsx` |

## Projects

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Project list | Done | Stub | `ProjectListPage.tsx` → `ProjectsView.swift` |
| Project detail view | Done | TODO | `ProjectDetail.tsx` |
| Project create/edit form | Done | Stub | `ProjectForm.tsx` → `ProjectFormView` |
| Project row component | Done | TODO | `ProjectRow.tsx` |
| Engagement column JSON display | Bug | TODO | Electron bug #12: shows raw JSON |

## Interactions

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Interaction list | Done | Stub | `InteractionListPage.tsx` → `InteractionsView.swift` |
| Interaction table view | Done | TODO | `InteractionsPage.tsx` (alternate view) |
| Interaction detail view | Done | TODO | `InteractionDetail.tsx` |
| Interaction create/edit form | Done | Stub | `InteractionForm.tsx` → `InteractionFormView` |
| Log interaction quick sheet | Done | TODO | `LogInteractionSheet.tsx` — `.sheet()` in Swift |

## Imported Contacts

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Imported contacts staging list | Done | Stub | `ImportedContactsPage.tsx` → `ImportedContactsView.swift` |
| Approve action | Done | TODO | IPC: `importedContacts:approve` |
| Reject action (with reason) | Done | TODO | IPC: `importedContacts:reject` |
| Name display | Bug | TODO | Electron bug #13: all names show "—" |

## Portal

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Portal Access list | Done | Stub | `PortalAccessPage.tsx` → `PortalAccessView.swift` |
| Portal Logs list | Done | Stub | `PortalLogsPage.tsx` → `PortalLogsView.swift` |
| Linked field resolution | Bug | TODO | Electron bug #14: Name/Email/Company empty |
| Portal Logs blank records | Bug | TODO | Electron UX #15 |

## Settings

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| API key input | Done | Stub | Electron: SQLite. Swift: Keychain (improvement) |
| Base ID configuration | Done | Stub | |
| Sync interval control | Done | Stub | Slider in Swift stub |
| Theme toggle | Done | TODO | |
| Force Sync button | Done | Stub | Button exists, wired to SyncEngine |
| Last sync display | Done | Stub | |

## Shared Components

| Component | Electron Status | Swift Status | Notes |
|-----------|----------------|--------------|-------|
| Avatar | Done | TODO | `Avatar.tsx` |
| Badge / StatusBadge | Done | Stub | `Badge.tsx` → `StatusBadge` in SharedComponents |
| StageBadge | Done | Stub | Covered by `StatusBadge` |
| ConfirmDialog | Done | Stub | `ConfirmDialog.tsx` → `ConfirmDeleteModifier` |
| DataTable | Done | TODO | `DataTable.tsx` — SwiftUI `Table` on macOS |
| EmptyState | Done | Stub | `EmptyState.tsx` → `EmptyStateView` |
| EntityForm (generic wrapper) | Done | TODO | `EntityForm.tsx` — may not need wrapper in SwiftUI |
| FilterTabs | Done | TODO | `FilterTabs.tsx` — `Picker` with `.segmented` style |
| KanbanBoard (shared) | Done | TODO | `shared/KanbanBoard.tsx` |
| LinkedList | Done | TODO | `LinkedList.tsx` — display linked records |
| LoadingSpinner | Done | Stub | `LoadingSpinner.tsx` → `LoadingOverlay` |
| PrimaryButton | Done | TODO | `PrimaryButton.tsx` — `.buttonStyle(.borderedProminent)` |
| RatingDots | Done | Stub | `RatingDots.tsx` → `RatingDots` view |
| Sheet (slide-in panel) | Done | TODO | `Sheet.tsx` → `.sheet()` or `.inspector()` |

## Search & Commands

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Command Palette (Cmd+K) | Done | TODO | `CommandPalette.tsx` — `.searchable()` + keyboard shortcut |
| Full-text search (Fuse.js) | Done | TODO | Swift: `#Predicate` or Spotlight integration |
| Global search across tables | Done | TODO | `search:query` IPC → SwiftData FetchDescriptor |

## Data Operations

| Operation | Electron Status | Swift Status | Notes |
|-----------|----------------|--------------|-------|
| Full CRUD (8 entities) | Done | TODO | Context.insert/delete + model mutation |
| Read-only sync (Specialties) | Done | TODO | Pull only, no push |
| Read-only sync (Portal Logs) | Done | TODO | Pull only, no push |
| Imported Contacts approve/reject | Done | TODO | Set onboardingStatus + push |
| Dashboard aggregation queries | Done | TODO | `dashboard.ts` → SwiftData `#Predicate` + `FetchDescriptor` |
| Airtable metadata fetch (select options) | Done | Stub | `fetchFieldMetadata()` exists in AirtableService |
| Batch create (10/req) | Done | Stub | `batchCreate()` exists |
| Batch update (10/req) | Done | Stub | `batchUpdate()` exists |
| Batch delete (10/req) | Done | Stub | `batchDelete()` exists |
| shell:openExternal (URL validation) | Done | TODO | Swift: `NSWorkspace.shared.open()` with scheme check |

## Platform Features

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| macOS native look & feel | Partial (HIG toolkit) | N/A (native) | Swift is native by default |
| App packaging (.app bundle) | Done (electron-builder) | TODO | Xcode project needed |
| Auto-update | TODO | TODO | |
| Notifications | TODO | TODO | |
| Keyboard shortcuts | Partial | TODO | |
| Touch Bar support | N/A | TODO | Low priority |

---

## Summary

| Category | Electron Done | Swift Done | Swift Stub | Swift TODO |
|----------|--------------|------------|------------|------------|
| Architecture | 10 | 4 | 7 | 2 |
| Data Models | 11 | 0 | 11 | 0 |
| Navigation | 6 | 0 | 2 | 4 |
| Dashboard | 6 | 0 | 1 | 5 |
| Contacts | 8 | 0 | 3 | 5 |
| Companies | 4 | 0 | 3 | 1 |
| Pipeline | 9 | 0 | 3 | 6 |
| Tasks | 6 | 0 | 3 | 3 |
| Proposals | 4 | 0 | 2 | 2 |
| Projects | 5 | 0 | 2 | 3 |
| Interactions | 5 | 0 | 2 | 3 |
| Imported Contacts | 4 | 0 | 1 | 3 |
| Portal | 4 | 0 | 2 | 2 |
| Settings | 6 | 0 | 4 | 2 |
| Shared Components | 14 | 0 | 5 | 9 |
| Search & Commands | 3 | 0 | 0 | 3 |
| Data Operations | 10 | 0 | 4 | 6 |
| Platform | 3 | 0 | 0 | 3 |
| **TOTAL** | **121** | **4** | **56** | **61** |

Swift scaffold provides **56 stubs** (46%) with files and placeholder UI.
**61 features** (50%) need implementation from scratch.
**4 features** are fully done in Swift: converters, sync lock, Keychain storage, xcodegen project.
