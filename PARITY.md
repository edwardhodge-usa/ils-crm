# ILS CRM — Feature Parity Tracker

> Electron (primary) vs Swift (shadow build)
> Updated: 2026-04-04 (Audit rewrite — Command Palette, collapsible sections, editable task fields, full entity views)

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
| App entry point | Done | Done | `main.ts` → `ILSCRMApp.swift` — @main, ModelContainer, Sparkle, AppStateManager |
| SwiftData / sql.js container | Done | Done | Schema with 15 models, persistent ModelConfiguration, full data flow |
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
| Window configuration | Done | Done | `.defaultSize(width: 1200, height: 800)` + `.windowResizability(.contentMinSize)` |

## Dashboard

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Dashboard page | Done | Done | `DashboardPage.tsx` → `DashboardView.swift` (560 lines) |
| Stat cards (contacts, companies, deals, tasks) | Done | Done | 4 DashStatCards: Tasks Due, Follow-ups, Active Contracts, Open Proposals |
| Pipeline summary widget | Done | Done | Bar chart with stage colors + deal value totals |
| Follow-up alerts | Done | Done | Panel with contact list, days-since badge, company name |
| Tasks due today | Done | Done | Panel with priority dots, type badges, due dates |
| Colored stat cards | Done | Done | Red, orange, blue, yellow themed with SF Symbols |
| Dashboard aggregation queries | Done | Done | SwiftData FetchDescriptor + in-memory `.filter{}` (11 query patterns) |

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
| Company list | Done | Done | `CompaniesView.swift` — 479 lines, search, sort, filters, inline create |
| Company 360 detail view | Done | Done | `CompanyDetailView.swift` — 519 lines, bento layout, linked records, inline editing |
| Company create/edit form | Done | Done | Inline form within CompaniesView — modelContext.insert + push |
| Company row component | Done | Done | Row component integrated in CompaniesView list |

## Pipeline (Opportunities)

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Pipeline page (Kanban + list toggle) | Done | Done | `PipelineView.swift` — 563 lines, Kanban + list toggle |
| Kanban board | Done | Done | `.draggable()` / `.dropDestination()` with stage-based columns |
| Kanban columns by salesStage | Done | Done | Columns grouped by sales stage with color coding |
| Deal cards | Done | Done | Card view with deal value, company, stage badge |
| Opportunity detail view | Done | Done | `OpportunityDetailView.swift` — 495 lines, inline editing via @Bindable + EditableFieldRow |
| Opportunity create/edit form | Done | Done | Inline form within PipelineView — modelContext.insert + push |
| Stage progress bar | Done | Done | Stage color badges in detail view |
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
| Collapsible sections | Done | Done | DisclosureGroup with expand/collapse state per section |
| Section grouping (overdue/today/etc.) | Done | Done | Overdue / Today / Waiting / No Date / Scheduled / Completed |
| Task row (priority dot, type badge, due) | Done | Done | Both have circular checkbox, priority dots, type color badges |
| Task create form | Done (inline) | Done (sheet) | Swift has dedicated `TaskFormView` with all fields |
| Due date overdue highlighting | Done | Done | Red text + overdue banner (Swift has banner, Electron doesn't) |
| Overdue banner + days counter | TODO | Done | Swift: BentoHeroStat with overdue day count |
| Bento hero card + pills | TODO | Done | Swift: priority/status/type pills + assigned initials stat |
| Editable title inline | Done | Done | EditableFieldRow for title in TaskDetailView |
| Priority editable in detail | Done | Done | EditableFieldRow dropdown for priority |
| Type editable in detail | Done | Done | EditableFieldRow dropdown for type |
| Assigned To editable in detail | Done | Done | EditableFieldRow dropdown for assignedTo |
| Status editable in detail | Done | Done | Both have singleSelect dropdown |
| Due Date editable in detail | Done | Done | Electron: DateSuggestionPicker. Swift: EditableFieldRow.date |
| Notes editable in detail | Done | Done | Both have textarea editing |
| Linked record pickers (4 entities) | Done | Done | Opportunities, Contacts, Projects, Proposals |
| Complete/uncomplete toggle | Done | Done | Both toggle status + set completed_date |
| Delete with confirm | Done | Done | Electron: ConfirmDialog. Swift: confirmationDialog |

## Proposals

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Proposal list | Done | Done | `ProposalsView.swift` — 459 lines, search, sort, filters, inline create |
| Proposal detail view | Done | Done | `ProposalDetailView.swift` — 372 lines, inline editing, delete with trackDeletion |
| Proposal create/edit form | Done | Done | Inline form within ProposalsView — modelContext.insert + push |
| Proposal row component | Done | Done | Row component integrated in ProposalsView list |

## Projects

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Project list | Done | Done | `ProjectsView.swift` — 456 lines, search, sort, filters, inline create |
| Project detail view | Done | Done | `ProjectDetailView.swift` — 238 lines, inline editing via @Bindable |
| Project create/edit form | Done | Done | Inline form within ProjectsView — modelContext.insert + push |
| Project row component | Done | Done | Row component integrated in ProjectsView list |
| Engagement column JSON display | Bug | TODO | Electron bug #12: shows raw JSON |

## Interactions

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Interaction list | Done | Done | `InteractionsView.swift` — 324 lines, search, sort, filters, inline create |
| Interaction table view | Done | Done | List view serves as table view (same InteractionsView) |
| Interaction detail view | Done | Done | `InteractionDetailView.swift` — 197 lines, @Bindable inline editing |
| Interaction create/edit form | Done | Done | Inline form within InteractionsView — modelContext.insert + push |
| Log interaction quick sheet | Done | Done | Create form acts as quick-entry sheet |

## Imported Contacts

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Imported contacts staging list | Done | Done | `ImportedContactsPage.tsx` → `ImportedContactsView.swift` |
| Approve action | Done | Done | IPC: `importedContacts:approve` |
| Reject action (with reason) | Done | Done | IPC: `importedContacts:reject` |
| Name display | Done | Done | Fixed: `getContactName()` reads `imported_contact_name`, falls back to `first_name`/`last_name`, then `email` |

## Email Intelligence (Phase 1)

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Gmail OAuth flow | Done | Done | Per-user, gmail.readonly scope, safeStorage/Keychain |
| Gmail API client | Done | Done | messages.list, history.list, full MIME parsing |
| Email scanner orchestrator | Done | Done | Full/incremental/on-demand scan modes |
| Rules engine (8 default rules) | Done | Done | Configurable via Airtable table |
| Heuristic classifier (0-60) | Done | Done | Thread frequency, From/CC ratio, time span |
| Signature extraction (regex) | Done | Done | Phone, title, company from email body |
| Email normalization | Done | Done | Plus-alias stripping, Gmail dot handling |
| Name parsing from headers | Done | Done | Display name → first/last splitting |
| Source filter tabs | Done | Done | All / Email / Contacts |
| Confidence badges | Done | Done | Green ≥80, yellow ≥50, gray <50 |
| Relationship type badges | Done | Done | Client/Vendor/Employee/Contractor/Unknown |
| AI Reasoning card | Done | Done | Shows ai_reasoning or fallback metadata |
| Company pairing card | Done | Done | Yellow for new, blue for existing company |
| Email Activity stats | Done | Done | Threads, time span, first/last seen via |
| Scan Now button | Done | Done | Triggers on-demand scan |
| Background polling | Done | Done | Configurable interval (1m/5m/15m/Off) |
| Settings: Gmail connection | Done | Done | Connect/disconnect, email display |
| Settings: Scan interval | Done | Done | Picker with configurable intervals |
| Approve flow (Add to CRM) | Done | Done | Pre-filled form, creates Contact + Company |
| Dismiss/Reject flow | Done | Done | State machine transitions |
| Enrichment queue | Done | Done | Existing contact update suggestions |
| Airtable schema (3 tables) | Done | Done | Email Scan Rules, State, Enrichment Queue |
| 11 new Imported Contact fields | Done | Done | Source through Suggested Company |

## Portal

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Portal Access list | Done | Done | `PortalAccessView.swift` — 1034 lines, 3 view modes, full CRUD |
| Portal Logs list | Done | Done | `PortalLogsView.swift` — 277 lines, search, filters |
| Portal Access detail view | Done | Done | `PortalAccessDetailView.swift` — 286 lines, inline editing, URL open |
| Grant Access sheet | Done | Done | `GrantAccessSheet.swift` — 202 lines, new portal access creation |
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
| AvatarView | Done | Done | `AvatarView` in SharedComponents.swift (105 lines) |
| StatusBadge | Done | Done | `StatusBadge` in SharedComponents.swift — color-coded status pills |
| StageBadge | Done | Done | Covered by `StatusBadge` with stage-specific colors |
| ConfirmDeleteModifier | Done | Done | `ConfirmDeleteModifier` in SharedComponents.swift — `.confirmationDialog` |
| EmptyStateView | Done | Done | `EmptyStateView` in SharedComponents.swift — SF Symbol + message |
| LoadingOverlay | Done | Done | `LoadingOverlay` in SharedComponents.swift — ProgressView spinner |
| RatingDots | Done | Done | `RatingDots` in SharedComponents.swift — filled/empty circles |
| StatCard | Done | Done | `StatCard` in SharedComponents.swift — icon + value + label |
| SectionHeader | Done | Done | `SectionHeader` in SharedComponents.swift |
| FieldRow | Done | Done | `FieldRow` in SharedComponents.swift — label + value display |
| BadgeView | Done | Done | `BadgeView` in SharedComponents.swift — colored pill |
| EditableFieldRow | Done | Done | `EditableFieldRow` in DetailComponents.swift (384 lines) — text, date, dropdown, textarea |
| DetailHeader | Done | Done | `DetailHeader` in DetailComponents.swift — avatar + title + subtitle |
| StatsRow | Done | Done | `StatsRow` in DetailComponents.swift — horizontal stat cards |
| DetailSection | Done | Done | `DetailSection` in DetailComponents.swift — collapsible content section |
| SortDropdown | Done | Done | `SortDropdown` in DetailComponents.swift — generic sort picker |
| ListHeader | Done | Done | `ListHeader` in DetailComponents.swift — title + count + sort + create |
| LinkedRecordPicker | Done | Done | `LinkedRecordPicker.swift` — 398 lines, all 5 entity types |
| BentoComponents | Done | Done | `BentoComponents.swift` — hero cards, stat pills, layout helpers |
| EditableAvatarView | Done | Done | `EditableAvatarView.swift` — avatar with edit overlay |
| DataTable | Done | N/A | `DataTable.tsx` — SwiftUI uses native List, no separate component needed |
| EntityForm (generic wrapper) | Done | N/A | `EntityForm.tsx` — SwiftUI uses inline forms per view, no wrapper needed |
| FilterTabs | Done | Done | Implemented inline as Picker with `.segmented` style in each list view |
| KanbanBoard (shared) | Done | Done | Kanban implemented directly in PipelineView with `.draggable`/`.dropDestination` |
| LinkedList | Done | Done | Linked records displayed via LinkedRecordPicker + inline sections |
| PrimaryButton | Done | Done | `.buttonStyle(.borderedProminent)` used throughout |
| Sheet (slide-in panel) | Done | Done | `.sheet()` used throughout for forms and detail views |

## Search & Commands

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| Command Palette (Cmd+K) | Done | Done | `CommandPaletteView.swift` — 276 lines, `.keyboardShortcut("k", modifiers: .command)` |
| Full-text search (Fuse.js) | Done | TODO | Swift: entity-level search exists but no Fuse.js-style fuzzy matching |
| Global search across tables | Done | Done | Command Palette searches all entity types via SwiftData FetchDescriptor |

## Data Operations

| Operation | Electron Status | Swift Status | Notes |
|-----------|----------------|--------------|-------|
| Full CRUD (8 entities) | Done | Done | modelContext.insert + @Bindable mutation + trackDeletion + modelContext.delete |
| Read-only sync (Specialties) | Done | Done | Pull only, skipped by pushPendingChanges via readOnlyTables |
| Read-only sync (Portal Logs) | Done | Done | Pull only, skipped by pushPendingChanges via readOnlyTables |
| Imported Contacts approve/reject | Done | Done | onboardingStatus set + push in ImportedContactsView |
| Dashboard aggregation queries | Done | Done | FetchDescriptor + in-memory `.filter{}` — 11 query patterns in DashboardView |
| Airtable metadata fetch (select options) | Done | Done | `fetchFieldMetadata()` in AirtableService actor |
| Batch create (10/req) | Done | Done | `batchCreate()` — used by pushTable with chunked batches |
| Batch update (10/req) | Done | Done | `batchUpdate()` — used by pushTable with chunked batches |
| Batch delete (10/req) | Done | Done | `batchDelete()` in AirtableService actor |
| URL open (shell:openExternal) | Done | Done | `NSWorkspace.shared.open()` — 13 call sites across views |

## Platform Features

| Feature | Electron Status | Swift Status | Notes |
|---------|----------------|--------------|-------|
| macOS native look & feel | Partial (HIG toolkit) | N/A (native) | Swift is native by default |
| App packaging (.app bundle) | Done (electron-builder) | TODO | Xcode archive needed for distribution |
| Auto-update | TODO | TODO | Sparkle configured but not distributing yet |
| Notifications | TODO | TODO | |
| Keyboard shortcuts | Partial | Done | Cmd+K (Command Palette), Cmd+N (create), Cmd+1-0 (Go menu) |
| Touch Bar support | N/A | N/A | Discontinued by Apple — removed from tracker |

---

## Summary

| Category | Electron Done | Swift Done | Swift N/A | Swift TODO |
|----------|--------------|------------|-----------|------------|
| Architecture | 12 | 13 | 2 | 0 |
| Data Models | 11 | 11 | 0 | 0 |
| Navigation | 6 | 6 | 0 | 0 |
| Dashboard | 7 | 7 | 0 | 0 |
| Contacts | 8 | 8 | 0 | 0 |
| Companies | 4 | 4 | 0 | 0 |
| Pipeline | 9 | 7 | 0 | 2 |
| Tasks | 22 | 24 | 0 | 0 |
| Proposals | 4 | 4 | 0 | 0 |
| Projects | 5 | 4 | 0 | 1 |
| Interactions | 5 | 5 | 0 | 0 |
| Imported Contacts | 4 | 4 | 0 | 0 |
| Email Intelligence | 23 | 23 | 0 | 0 |
| Portal | 6 | 4 | 0 | 2 |
| Settings | 7 | 7 | 0 | 0 |
| Shared Components | 27 | 25 | 2 | 0 |
| Search & Commands | 3 | 2 | 0 | 1 |
| Data Operations | 10 | 10 | 0 | 0 |
| Platform | 3 | 1 | 2 | 3 |
| **TOTAL** | **176** | **169** | **6** | **9** |

Swift now has **169 features done** out of 178 applicable (95%) — up from 101/160 (63%) after full audit rewrite.
Key corrections: Companies (0→4), Pipeline (0→7), Proposals (0→4), Projects (0→4), Interactions (0→5), Portal (0→4), Shared Components (0→25), Data Operations (6→10), Search (0→2), Tasks (+4 editable fields + collapsible sections), Navigation (+window config), Architecture (+app entry + SwiftData container).
New rows added: CommandPaletteView (Cmd+K), GrantAccessSheet, PortalAccessDetailView, BentoComponents, EditableAvatarView, Dashboard aggregation queries, 6 DetailComponents structs.
**9 features remain TODO** — mostly Electron-side bugs (click/drag #5, JSON display #12, portal linked fields #14/#15) plus app packaging, auto-update, notifications, and Fuse.js-style fuzzy search.
