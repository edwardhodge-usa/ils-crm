# ILS CRM — Electron / Swift Parity Tracker

Last updated: 2026-03-12

## Scorecard

| Category | Total | Done in Swift | Percentage |
|----------|-------|---------------|------------|
| Navigation & Layout | 4 | 4 | 100% |
| Dashboard | 3 | 3 | 100% |
| Contacts | 5 | 5 | 100% |
| Companies | 5 | 5 | 100% |
| Pipeline | 4 | 3 | 75% |
| Tasks | 4 | 3 | 75% |
| Proposals | 4 | 3 | 75% |
| Projects | 4 | 1 | 25% |
| Interactions | 4 | 1 | 25% |
| Portal (Access + Logs) | 4 | 1 | 25% |
| Settings | 4 | 4 | 100% |
| Shared Components | 8 | 8 | 100% |
| Data Layer | 8 | 7 | 88% |
| Sync Engine | 5 | 2 | 40% |
| **TOTAL** | **66** | **50** | **76%** |

---

## Navigation & Layout

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Sidebar with 9 nav items | DONE | DONE | NavItem enum + NavigationSplitView |
| Selection binding | DONE | DONE | @State selection: NavItem? |
| Settings gear button | DONE | DONE | Toolbar button + .sheet |
| Detail view routing | DONE | DONE | @ViewBuilder switch on selection |

## Dashboard

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Greeting with time-of-day | DONE | DONE | Calendar.current hour check |
| 6 stat cards with live counts | DONE | DONE | @Query counts for all 6 entities |
| Tasks due today section | DONE | DONE | Filtered CRMTask list with priority badges |

## Contacts

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Searchable list (name, email, company) | DONE | DONE | .searchable + filter |
| Grouped by first letter | DONE | DONE | Dictionary grouping + sorted sections |
| Avatar + name + subtitle rows | DONE | DONE | AvatarView + contactSubtitle helper |
| Categorization badges | DONE | DONE | BadgeView with color mapping |
| Detail view (all key fields) | DONE | DONE | ContactDetailView — header, contact info, classification, business, notes, details sections. Tappable links (email, phone, LinkedIn, website). Tags flow layout. Address formatting. |

## Companies

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Searchable list (name, industry, website) | DONE | DONE | .searchable + filter |
| Grouped by first letter | DONE | DONE | Dictionary grouping + sorted sections |
| Avatar + name + subtitle rows | DONE | DONE | AvatarView + companySubtitle helper |
| Company type badges | DONE | DONE | BadgeView with color mapping |
| Detail view (all key fields) | DONE | DONE | CompanyDetailView — header, company info, address, description, notes, details sections. Tappable website link. |

## Pipeline

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Kanban board with stage columns | DONE | DONE | 7 stage columns with color-coded headers, badge counts |
| Opportunity detail view | DONE | DONE | OpportunityDetailView — header, deal info, stage, engagement, notes, milestones, linked records, details sections. FlowLayout for engagement badges. |
| Deal cards (name, value, close date) | DONE | DONE | KanbanCard with name, formatted currency, date |
| Drag-and-drop stage changes | DONE | TODO | SwiftUI .draggable/.dropDestination |

## Tasks

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Task list with filters | DONE | DONE | Segmented picker (All/Active/Completed/Overdue), search by name+notes, priority dots, type+status badges |
| Due date highlighting (overdue=red) | DONE | DONE | Overdue row background tint + red date text |
| Task detail view | DONE | DONE | TaskDetailView — overdue banner, priority colors, status/type badges, notes, linked records (opportunities/contacts/projects/proposals), details section |
| Create/edit form | DONE | TODO | Stub form view exists |

## Proposals

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Proposal list with search | DONE | DONE | Searchable list with name, status/approval badges, version, value, date sent metadata |
| Proposal detail view | DONE | DONE | ProposalDetailView — header with status+approval badges, proposal info, scope, client feedback, notes, performance metrics, linked records (clients/companies/opportunities/tasks), details section |
| Create/edit form | DONE | TODO | Stub form view exists |
| Linked entities (opportunity, tasks) | DONE | DONE | Linked record counts displayed in detail view |

## Projects

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Project list with name/status | DONE | PARTIAL | Basic list only |
| Detail view | DONE | TODO | |
| Create/edit form | DONE | TODO | Stub form view exists |
| Linked entities (contacts, tasks) | DONE | TODO | |

## Interactions

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Interaction list (subject, type, date) | DONE | PARTIAL | Basic list only |
| Detail view | DONE | TODO | |
| Log interaction sheet | DONE | TODO | |
| Linked contacts/opportunities | DONE | TODO | |

## Portal (Access + Logs)

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Portal access list | DONE | PARTIAL | Basic list with name/stage/company |
| Portal logs list | DONE | PARTIAL | Basic list with client/page/timestamp |
| Portal access detail view | DONE | TODO | |
| By Page / By Person views | DONE | TODO | v3.3.5 Electron feature |

## Settings

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| API key input (secure) | DONE | DONE | SecureField + Keychain storage |
| Base ID config | DONE | DONE | @AppStorage |
| Sync interval picker | DONE | DONE | Picker with 30/60/120/Off options |
| Sync status + force sync | DONE | DONE | SyncEngine integration |

## Shared Components

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| StatusBadge | DONE | DONE | Capsule + color opacity bg |
| EmptyStateView | DONE | DONE | ContentUnavailableView |
| LoadingOverlay | DONE | DONE | ProgressView + message |
| RatingDots | DONE | DONE | Filled/unfilled circles |
| ConfirmDeleteModifier | DONE | DONE | .confirmationDialog |
| AvatarView | DONE | DONE | Initials + deterministic color + async photo |
| StatCard | DONE | DONE | Icon + value + title + material bg |
| SectionHeader / FieldRow / BadgeView | DONE | DONE | Reusable layout components |

## Data Layer

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| 11 @Model classes | DONE | DONE | All tables modeled |
| SwiftData ModelContainer | DONE | DONE | ILSCRMApp init |
| AirtableConfig (table IDs, sync order) | DONE | DONE | |
| AirtableService (REST client) | DONE | DONE | Actor with pagination, batch CRUD |
| AirtableConvertible protocol | DONE | DONE | Protocol + AirtableRecord + AirtableFields + AirtableFieldsBuilder |
| 11 Converter extensions | DONE | DONE | All tables have +Airtable.swift |
| KeychainService | DONE | DONE | macOS Keychain for API key |
| SyncEngine (full sync logic) | DONE | PARTIAL | Shell exists, TODO: actual pull/push implementation |

## Sync Engine

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| isSyncing mutex | DONE | DONE | Guard in fullSync() |
| Polling timer | DONE | DONE | startPolling/stopPolling |
| Push pending records | DONE | TODO | |
| Pull all tables in order | DONE | TODO | |
| Cross-app sync lock (/tmp/) | DONE | TODO | |

---

## Priority Queue (next to implement)

1. **SyncEngine pull/push** — Without this, the app has no data. Highest priority.
2. **Pipeline drag-and-drop** — Kanban board is done but needs drag-to-reorder stage changes.
3. **Create/edit forms** — Tasks, Proposals, Contacts, Companies all need create/edit forms.
4. **Remaining detail views** — Projects, Interactions, Portal detail views.
5. **Projects/Interactions/Portal list upgrades** — Currently basic lists, need filters and richer metadata.
