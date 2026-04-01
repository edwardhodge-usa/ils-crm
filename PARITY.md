# ILS CRM — Feature Parity Tracker

> Electron (primary) vs Swift (shadow build)
> Updated: 2026-03-31 (Full audit — Dashboard, Contacts, Navigation were done but not tracked)

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
| Airtable REST client | Done | Done | `client.ts` → `AirtableService.swift` (actor) — full CRUD + batch + metadata |
| Sync engine (push-first, pull) | Done | Done | `sync-engine.ts` → `SyncEngine.swift` — pullTable + pushPendingChanges + fullSync |
| Airtable field maps | Done | Done | `field-maps.ts` → `AirtableConfig.swift` (table IDs, sync order, read-only set) |
| Bidirectional converters | Done | Done | `converters.ts` → `AirtableConvertible` protocol + 11 converter extensions |
| AirtableSyncable protocol | N/A | Done | Generic sync via `pullTable<T>` / `pushTable<T>` with type-safe model access |
| Model sync properties | Done | Done | All 11 models have `isPendingPush: Bool` + `airtableModifiedAt: Date?` |
| Polling (60s interval) | Done | Done | `startPolling()` / `stopPolling()` — configurable interval |
| isSyncing mutex | Done | Done | `syncLock` flag + cross-app lock guard |
| Cross-app sync lock (/tmp) | Done | Done | Both apps check `/tmp/ils-crm-sync.lock` before syncing |
| Keychain API key storage | N/A | Done | Electron uses SQLite; Swift uses macOS Keychain (security improvement) |
| Xcode project (xcodegen) | N/A | Done | `project.yml` → `ILS CRM.xcodeproj` via xcodegen |
| IPC bridge (contextBridge) | Done | N/A | No process boundary in native app |
| Preload security (contextIsolation) | Done | N/A | |

## Data Models (11 tables)

| Table | Electron Status | Swift Status | Notes |
|-------|----------------|--------------|-------|
| Contacts (57 fields) | Done | Done | `@Model` + converter + sync properties + AirtableSyncable |
| Companies (24 fields) | Done | Done | `@Model` + converter + sync properties + AirtableSyncable |
| Opportunities (23 fields) | Done | Done | engagementType correctly typed as [String] |
| Projects (18 fields) | Done | Done | `@Model` + converter + sync properties + AirtableSyncable |
| Proposals (13+4 fields) | Done | Done | 4 migrated fields included |
| Tasks (12 fields) | Done | Done | Named `CRMTask` to avoid Swift.Task conflict |
| Interactions (9 fields) | Done | Done | Correctly marked as CRUD (not read-only) |
| Imported Contacts (48 fields) | Done | Done | `@Model` + converter + sync properties + AirtableSyncable |
| Specialties (3 fields) | Done | Done | Read-only (never pushes), has isPendingPush for protocol |
| Portal Access (37 fields) | Done | Done | 12 lookup + 1 formula marked read-only |
| Portal Logs (12 fields) | Done | Done | Read-only (never pushes), has isPendingPush for protocol |

## Navigation & Layout

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Sidebar navigation | Done | Done | `Sidebar.tsx` → `ContentView.swift` NavigationSplitView with 3 groups |
| Top bar (title + sync status) | Done | Done | Toolbar with sync status indicator + Cmd+N create button |
| Route config (`routes.ts`) | Done | Done | `NavItem` enum with all 10 sections |
| Dark mode toggle | Done | Done | `@AppStorage("appearanceMode")` + `.preferredColorScheme()` in ContentView |
| macOS menu bar | Done | Done | Go menu (Cmd+1-0), Cmd+N, SidebarCommands in ILSCRMApp.swift |
| Window configuration | Done | TODO | Electron: `BrowserWindow`. Swift: basic `WindowGroup` — needs min size tuning |

## Dashboard

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Dashboard page | Done | Done | `DashboardPage.tsx` → `DashboardView.swift` (560 lines) |
| Stat cards (contacts, companies, deals, tasks) | Done | Done | 4 DashStatCards: Tasks Due, Follow-ups, Active Contracts, Open Proposals |
| Pipeline summary widget | Done | Done | Bar chart with stage colors + deal value totals |
| Follow-up alerts | Done | Done | Panel with contact list, days-since badge, company name |
| Tasks due today | Done | Done | Panel with priority dots, type badges, due dates |
| Colored stat cards | Done | Done | Red, orange, blue, yellow themed with SF Symbols |

## Contacts

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Contact list with filters | Done | Done | Search + 3 sort modes (Name A-Z, Company, Newest) + categorization filter tabs |
| Contact 360 detail view | Done | Done | Bento layout (906 lines): hero, overview, timeline, linked records, opportunities, notes, partner |
| Contact create/edit form | Done | Done | Multi-select categorization, company picker, all fields |
| Contact row component | Done | Done | Avatar, name, subtitle (title+company), categorization badge |
| Contact stats | Done | Done | Hero stats: Companies, Open Opps, Lead Score, Days Since |
| Filter tabs (All/Leads/Clients/etc.) | Done | Done | Horizontal capsule pills with counts for all 13 Airtable categories |
| Specialty color badges | Done | Done | Deterministic hash-based colors matching Electron palette |
| Linked record display | Done | Done | Companies + Opportunities pickers with sheet-based detail views |

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
| Tasks 3-column layout | Done | Done | `TasksPage.tsx` → `TasksView.swift` — categories / list / detail |
| Assignee filter + avatars | Done | Done | Named assignees, unassigned, "All" row with counts |
| Smart Lists (All/Overdue/Today/etc.) | Done | Done | 7 smart lists with counts |
| By Type filter with swatches | Done | Done | All 12 task types with color swatches |
| Project sub-grouping in type filter | Done | Done | Tasks grouped by linked Projects when viewing By Type |
| Search bar | Done | Done | Full-text search across task name + notes |
| Sort options | Done (3) | Done (5) | Electron: date/priority/alpha. Swift adds name Z-A + created |
| Collapsible sections | Done | TODO | Electron toggles; Swift uses SwiftUI Section (no collapse) |
| Section grouping (overdue/today/etc.) | Done | Done | Overdue / Today / Waiting / No Date / Scheduled / Completed |
| Task row (priority dot, type badge, due) | Done | Done | Both have circular checkbox, priority dots, type color badges |
| Task create form | Done (inline) | Done (sheet) | Swift has dedicated `TaskFormView` with all fields |
| Due date overdue highlighting | Done | Done | Red text + overdue banner (Swift has banner, Electron doesn't) |
| Overdue banner + days counter | TODO | Done | Swift: BentoHeroStat with overdue day count |
| Bento hero card + pills | TODO | Done | Swift: priority/status/type pills + assigned initials stat |
| Editable title inline | Done | TODO | Electron: input field in detail. Swift: display only in hero |
| Priority editable in detail | Done | TODO | Electron: dropdown. Swift: read-only pill |
| Type editable in detail | Done | TODO | Electron: dropdown. Swift: read-only pill |
| Assigned To editable in detail | Done | TODO | Electron: dropdown. Swift: read-only stat |
| Status editable in detail | Done | Done | Both have singleSelect dropdown |
| Due Date editable in detail | Done | Done | Electron: DateSuggestionPicker. Swift: EditableFieldRow.date |
| Notes editable in detail | Done | Done | Both have textarea editing |
| Linked record pickers (4 entities) | Done | Done | Opportunities, Contacts, Projects, Proposals |
| Complete/uncomplete toggle | Done | Done | Both toggle status + set completed_date |
| Delete with confirm | Done | Done | Electron: ConfirmDialog. Swift: confirmationDialog |

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
| Name display | Done | TODO | Fixed: `getContactName()` reads `imported_contact_name`, falls back to `first_name`/`last_name`, then `email` |

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
| API key input | Done | Done | SecureField + Keychain save/load via KeychainService |
| Base ID configuration | Done | Done | @AppStorage with default from AirtableConfig.baseId |
| Sync interval control | Done | Done | Picker: 30s / 60s / 120s / Off — auto-starts/stops polling |
| Theme toggle | Done | Done | `@AppStorage("appearanceMode")` — System/Light/Dark segmented picker |
| Force Sync button | Done | Done | Calls syncEngine.forceSync(), disabled while syncing |
| Last sync display | Done | Done | Shows timestamp or "Never synced" + syncing spinner |
| Sync error display | Done | Done | Red error text section when syncError is set |

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
| Read-only sync (Specialties) | Done | Done | Pull only, skipped by pushPendingChanges via readOnlyTables |
| Read-only sync (Portal Logs) | Done | Done | Pull only, skipped by pushPendingChanges via readOnlyTables |
| Imported Contacts approve/reject | Done | TODO | Set onboardingStatus + push |
| Dashboard aggregation queries | Done | TODO | `dashboard.ts` → SwiftData `#Predicate` + `FetchDescriptor` |
| Airtable metadata fetch (select options) | Done | Done | `fetchFieldMetadata()` in AirtableService actor |
| Batch create (10/req) | Done | Done | `batchCreate()` — used by pushTable with chunked batches |
| Batch update (10/req) | Done | Done | `batchUpdate()` — used by pushTable with chunked batches |
| Batch delete (10/req) | Done | Done | `batchDelete()` in AirtableService actor |
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
| Architecture | 10 | 12 | 1 | 0 |
| Data Models | 11 | 11 | 0 | 0 |
| Navigation | 6 | 5 | 0 | 1 |
| Dashboard | 6 | 6 | 0 | 0 |
| Contacts | 8 | 8 | 0 | 0 |
| Companies | 4 | 0 | 3 | 1 |
| Pipeline | 9 | 0 | 3 | 6 |
| Tasks | 22 | 19 | 0 | 5 |
| Proposals | 4 | 0 | 2 | 2 |
| Projects | 5 | 0 | 2 | 3 |
| Interactions | 5 | 0 | 2 | 3 |
| Imported Contacts | 4 | 0 | 1 | 3 |
| Portal | 4 | 0 | 2 | 2 |
| Settings | 6 | 7 | 0 | 0 |
| Shared Components | 14 | 0 | 5 | 9 |
| Search & Commands | 3 | 0 | 0 | 3 |
| Data Operations | 10 | 6 | 0 | 4 |
| Platform | 3 | 0 | 0 | 3 |
| **TOTAL** | **137** | **74** | **21** | **45** |

Swift now has **74 features done** (54%) — up from 55 after 2026-03-31 audit.
Key gains: Dashboard fully implemented (stat cards, tasks due today, follow-up alerts, pipeline bar chart). Contacts fully implemented (list with search + 3 sort modes + categorization filter tabs, 360 bento detail with hero/overview/timeline/linked records/opportunities/notes/partner data, specialty color badges). Navigation complete (sidebar, Go menu Cmd+1-0, Cmd+N, SidebarCommands, sync toolbar). Settings now includes Appearance (System/Light/Dark) toggle.
**21 stubs** remain with placeholder UI, **45 features** need implementation from scratch.
