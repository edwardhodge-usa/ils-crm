# ILS CRM — Electron / Swift Parity Tracker

Last updated: 2026-03-12 (Session 4 — CRUD forms + sync push/pull)

## Scorecard

| Category | Total | Done in Swift | Percentage |
|----------|-------|---------------|------------|
| Navigation & Layout | 4 | 4 | 100% |
| Dashboard | 3 | 3 | 100% |
| Contacts | 5 | 5 | 100% |
| Companies | 5 | 5 | 100% |
| Pipeline | 4 | 3 | 75% |
| Tasks | 4 | 4 | 100% |
| Proposals | 4 | 4 | 100% |
| Projects | 4 | 4 | 100% |
| Interactions | 4 | 4 | 100% |
| Imported Contacts | 4 | 3 | 75% |
| Portal (Access + Logs) | 5 | 4 | 80% |
| Settings | 4 | 4 | 100% |
| Shared Components | 8 | 8 | 100% |
| Data Layer | 8 | 8 | 100% |
| Sync Engine | 5 | 4 | 80% |
| **TOTAL** | **71** | **67** | **94%** |

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
| Create/edit form | DONE | DONE | TaskFormView — name, status/priority/type pickers, due date, completed date, notes |

## Proposals

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Proposal list with search | DONE | DONE | Searchable list with name, status/approval badges, version, value, date sent metadata |
| Proposal detail view | DONE | DONE | ProposalDetailView — header with status+approval badges, proposal info, scope, client feedback, notes, performance metrics, linked records (clients/companies/opportunities/tasks), details section |
| Create/edit form | DONE | DONE | ProposalFormView — name, status/approval pickers, value, date sent, valid until, notes |
| Linked entities (opportunity, tasks) | DONE | DONE | Linked record counts displayed in detail view |

## Projects

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Project list with search/status | DONE | DONE | Searchable list with status badges, date subtitle, sheet detail navigation |
| Detail view | DONE | DONE | ProjectDetailView — header with avatar + status, project info (location, contract value, engagement type, dates), description, key milestones, lessons learned, linked records (opportunities, clients, contacts, tasks), details section |
| Create/edit form | DONE | DONE | ProjectFormView — name, status picker, location, contract value, dates, description, milestones, lessons |
| Linked entities (contacts, tasks) | DONE | DONE | Linked record counts displayed in detail view |

## Interactions

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Interaction list with search/type icons | DONE | DONE | Searchable list with type-specific SF Symbol icons (phone, email, meeting, video), direction badges, formatted dates, sheet detail navigation |
| Detail view | DONE | DONE | InteractionDetailView — header with type icon + subject + badges, interaction info (type, date, direction), summary, next steps, linked records (contacts, opportunities), details section |
| Log interaction sheet | DONE | DONE | InteractionFormView — subject, type/direction pickers, date, summary, next steps |
| Linked contacts/opportunities | DONE | DONE | Linked record counts displayed in detail view |

## Imported Contacts

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Imported contacts list with search | DONE | DONE | Searchable list with name/email/company filtering, status badges (Approved/Rejected/Pending), sheet detail navigation |
| Detail view | DONE | DONE | ImportedContactDetailView — header with avatar + job title + onboarding status, contact info (email, phone, mobile, LinkedIn, website with tappable links), import info (source, date, categorization, tags with FlowLayout, event tags, sync flag), business (company, industry, type, size, address), company details (revenue, founded, NAICS, address, description), notes (general, review, rejection reason), details section |
| Create/edit form | DONE | TODO | |
| Linked entities | DONE | TODO | |

## Portal (Access + Logs)

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Portal access list with search | DONE | DONE | Searchable list with name/email/page/company filtering, status badges, stage/company metadata, sheet detail navigation |
| Portal logs list with search | DONE | DONE | Searchable list with client/email/company/page filtering, sorted newest-first, formatted timestamps |
| Portal access detail view | DONE | DONE | PortalAccessDetailView — header with avatar + position + status badge, access info (page address, status, stage, email, position, company, decision maker, primary contact, lead source), portal & business (portal URL, website, phone, address, industry, budget), linked contact lookups (name, email, phone, job title, company, industry, website, tags, address), services interested in (FlowLayout badges), notes, key dates (added, expected start, follow-up), details section |
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
| SyncEngine (full sync logic) | DONE | DONE | Push-then-pull architecture, 200ms table stagger, read-only guards |

## Sync Engine

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| isSyncing mutex | DONE | DONE | Guard in fullSync() |
| Polling timer | DONE | DONE | startPolling/stopPolling |
| Push pending records | DONE | DONE | pushRecords<T> — creates (local_ prefix → batchCreate) + updates (batchUpdate), ID replacement |
| Pull all tables in order | DONE | DONE | pullRecords<T> — fetchAll → AirtableRecord → upsert, delete stale (unless pending push) |
| Cross-app sync lock (/tmp/) | DONE | TODO | |

---

## Priority Queue (next to implement)

1. **Pipeline drag-and-drop** — Kanban board is done but needs drag-to-reorder stage changes.
2. **Portal By Page / By Person views** — Electron v3.3.5 feature, currently flat list only.
3. **Imported Contacts create/edit form** — Last remaining entity without a form.
4. **Cross-app sync lock** — `/tmp/ils-crm-sync.lock` to prevent simultaneous Electron + Swift sync.
5. **macOS polish** — Menu bar, keyboard shortcuts, window config.
