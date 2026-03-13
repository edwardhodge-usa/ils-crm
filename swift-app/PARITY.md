# ILS CRM — Electron / Swift Parity Tracker

Last updated: 2026-03-12 (Session 6 — visual parity with Electron)

## Scorecard

| Category | Total | Done in Swift | Percentage |
|----------|-------|---------------|------------|
| Navigation & Layout | 4 | 4 | 100% |
| Dashboard | 3 | 3 | 100% |
| Contacts | 5 | 5 | 100% |
| Companies | 5 | 5 | 100% |
| Pipeline | 4 | 4 | 100% |
| Tasks | 4 | 4 | 100% |
| Proposals | 4 | 4 | 100% |
| Projects | 4 | 4 | 100% |
| Interactions | 4 | 4 | 100% |
| Imported Contacts | 4 | 4 | 100% |
| Portal (Access + Logs) | 5 | 5 | 100% |
| Settings | 4 | 4 | 100% |
| Shared Components | 9 | 9 | 100% |
| Data Layer | 8 | 8 | 100% |
| Sync Engine | 5 | 5 | 100% |
| **TOTAL** | **72** | **72** | **100%** |

---

## Navigation & Layout

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Sidebar with grouped sections (CRM/WORK/ACTIVITY) | DONE | DONE | **Session 6:** 3 Section groups, Settings footer, version number |
| Selection binding | DONE | DONE | @State selection: NavItem? |
| Settings pinned at bottom + version | DONE | DONE | **Session 6:** .safeAreaInset(edge: .bottom) + "v3.4.1" |
| Detail view routing | DONE | DONE | @ViewBuilder switch on selection |
| Imported Contacts nav item | DONE | DONE | **Session 6:** Added to ACTIVITY group |

## Dashboard

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Greeting with time-of-day + date | DONE | DONE | **Session 6:** Full greeting + formatted date |
| 4 stat cards (Tasks/Follow-ups/Contracts/Proposals) | DONE | DONE | **Session 6:** Matched Electron layout — colored icons, live counts |
| Tasks due today section + Follow-up Alerts | DONE | DONE | **Session 6:** Two-column layout with avatar rows, days badges |
| Pipeline summary bar chart | DONE | DONE | **Session 6:** GeometryReader proportional bars, stage colors, dollar values |

## Contacts

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| List+detail split layout | DONE | DONE | **Session 6:** HStack split — 380pt list + flex detail pane |
| Company grouping + sort dropdown | DONE | DONE | **Session 6:** Group by Company (default), Name A-Z, Name Z-A |
| Avatar + name + subtitle + badges | DONE | DONE | AvatarView + categorization StatusBadge |
| Inline detail with sections | DONE | DONE | **Session 6:** DetailHeader, StatsRow, DetailSection, DetailFieldRow for all fields |
| Stats row (Opps/Meetings/Days Since) | DONE | DONE | **Session 6:** Live counts from @Query |

## Companies

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| List+detail split layout | DONE | DONE | **Session 6:** HStack split — 380pt list + flex detail pane |
| Alpha grouping + sort dropdown | DONE | DONE | **Session 6:** Group by letter, SortDropdown |
| Avatar + industry badge + contact count | DONE | DONE | **Session 6:** StatusBadge + resolved contact count |
| Inline detail with stats + linked records | DONE | DONE | **Session 6:** StatsRow (Contacts/Opps/Value), CONTACTS section, OPPORTUNITIES section |
| Detail with breadcrumb + action button | DONE | DONE | **Session 6:** DetailHeader + Website action |

## Pipeline

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Summary header (Active$/Won$/Deals) | DONE | DONE | **Session 6:** Pipeline totals + New Deal button |
| Kanban with enriched cards | DONE | DONE | **Session 6:** Company name, deal name, value, stage badge, probability on each card |
| Column headers with dollar totals | DONE | DONE | **Session 6:** Colored dot + stage + count + $ total |
| Drag-and-drop stage changes | DONE | DONE | .draggable/.dropDestination preserved |

## Tasks

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| 4-column layout (Assigned/Filters/List/Detail) | DONE | DONE | **Session 6:** Complete rewrite — 170+170+380+flex columns |
| Assigned sidebar with avatars + counts | DONE | DONE | **Session 6:** All + per-assignee filtering |
| Smart Lists + By Type filters | DONE | DONE | **Session 6:** 7 smart lists (Overdue/Today/etc) + 12 task types |
| Grouped task list (Overdue/Today/Waiting/No Date) | DONE | DONE | **Session 6:** Section headers with colored icons |
| Inline detail pane with editing | DONE | DONE | **Session 6:** Bindable task, pickers, related records |
| Create/edit form | DONE | DONE | TaskFormView extracted to separate file |

## Proposals

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Proposal list with search | DONE | DONE | **Session 6:** List+detail split with 380pt list + flex detail pane, status/approval badges, sort dropdown |
| Proposal detail view | DONE | DONE | **Session 6:** Inline detail — DetailHeader with badges, PROPOSAL INFO/RELATED/NOTES sections |
| Create/edit form | DONE | DONE | ProposalFormView — name, status/approval pickers, value, date sent, valid until, notes |
| Linked entities (opportunity, tasks) | DONE | DONE | **Session 6:** RelatedRecordRow with count badges in detail pane |

## Projects

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Project list with search/status | DONE | DONE | **Session 6:** List+detail split with 380pt list + flex detail pane, status badges, sort dropdown |
| Detail view | DONE | DONE | **Session 6:** Inline detail — DetailHeader, StatsRow (Value), PROJECT INFO/RELATED/NOTES sections |
| Create/edit form | DONE | DONE | ProjectFormView — name, status picker, location, contract value, dates, description, milestones, lessons |
| Linked entities (contacts, tasks) | DONE | DONE | **Session 6:** RelatedRecordRow with count badges in detail pane |

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
| Create/edit form | DONE | DONE | ImportedContactFormView — name, email, phone, company, status picker, source, notes |
| Linked entities | DONE | DONE | **Session 7:** @Query resolves specialtiesIds → Specialty names, relatedCrmContactIds → Contact names via RelatedRecordRow |

## Portal (Access + Logs)

| Feature | Electron | Swift | Notes |
|---------|----------|-------|-------|
| Portal access list with search | DONE | DONE | Searchable list with name/email/page/company filtering, status badges, stage/company metadata, sheet detail navigation |
| Portal logs list with search | DONE | DONE | Searchable list with client/email/company/page filtering, sorted newest-first, formatted timestamps |
| Portal access detail view | DONE | DONE | PortalAccessDetailView — header with avatar + position + status badge, access info (page address, status, stage, email, position, company, decision maker, primary contact, lead source), portal & business (portal URL, website, phone, address, industry, budget), linked contact lookups (name, email, phone, job title, company, industry, website, tags, address), services interested in (FlowLayout badges), notes, key dates (added, expected start, follow-up), details section |
| By Page / By Person views | DONE | DONE | Segmented picker: All / By Page / By Person with grouped sections |

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
| DetailComponents (DetailHeader, StatsRow, DetailSection, DetailFieldRow, RelatedRecordRow, SortDropdown, ListHeader) | DONE | DONE | **Session 6:** 7 shared components in DetailComponents.swift — used across all list+detail views |

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
| Cross-app sync lock (/tmp/) | DONE | DONE | /tmp/ils-crm-sync.lock with 120s staleness check |

---

## Status: 100% Parity Achieved (Session 7)

Session 7 completed the final parity item: Imported Contacts linked entity resolution. All 72 of 72 items now match between Electron and Swift.

**Session 7:**
- Imported Contacts linked entities — `@Query` fetches all Specialties and Contacts, filters by `specialtiesIds`/`relatedCrmContactIds`, renders via `RelatedRecordRow` in a "Related" section

**Session 6 highlights:**
- Sidebar redesigned with 3 grouped sections (CRM/WORK/ACTIVITY) + Settings footer + version
- 7 shared detail components extracted (DetailHeader, StatsRow, DetailSection, DetailFieldRow, RelatedRecordRow, SortDropdown, ListHeader)
- Contacts, Companies, Projects, Proposals all converted to HStack split (380pt list + flex detail)
- Dashboard completely rebuilt: greeting, 4 stat cards, tasks/follow-ups two-column, pipeline bar chart
- Pipeline enriched: summary header, company names on cards, column dollar totals
- Tasks rewritten as 4-column layout (Assigned/Filters/List/Detail) matching Electron exactly
- AvatarSize enum added (.small=28, .medium=36, .large=48, .xlarge=64)
- `assignedTo` property added to CRMTask model + Airtable converter

**Future sessions:**
1. **macOS polish** — Menu bar, keyboard shortcuts, window configuration
2. **End-to-end testing** — Full sync testing with Electron app, data integrity verification
3. **Release prep** — Code signing, notarization, DMG packaging, deployment
