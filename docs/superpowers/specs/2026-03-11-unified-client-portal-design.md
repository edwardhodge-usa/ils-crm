# Unified Client Portal — Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Mockups:** `.superpowers/brainstorm/39470-1773270472/` (unified-layout.html, by-person-view.html)

## Problem

Managing client portal access requires navigating three separate tabs (Portal CMS, Portal Access, Portal Logs) and manually typing the same `page_address` slug in two places. The workflow is fragmented, error-prone, and doesn't reflect how Edward thinks about the task: "set up a client with a page."

## Solution

Replace three tabs with one unified **Client Portal** page that provides two views on the same data:

- **By Page** (default) — page-centric: select a page, see its settings, who has access, and recent activity
- **By Person** — person-centric: select a person, see all their pages, details, and activity

Portal Logs is absorbed as inline "Recent Activity" in both views. The sidebar goes from 3 nav items to 1.

## Architecture

### Data Model (unchanged)

No Airtable schema changes. No new tables. No new fields. The three existing tables remain:

| Table | Role | Writable |
|-------|------|----------|
| Client Pages (`tblo5TQos1VUGfuaQ`) | Page content (title, slug, deck, sections) | Yes |
| Portal Access (`tblN1jruT8VeucPKa`) | Who can view which page + CRM fields | Yes |
| Portal Logs (`tblj70XPHI7wnUmxO`) | Login audit trail | No (read-only) |

**Join key:** `page_address` field exists on both Client Pages and Portal Access. This is a string match, not a linked record.

**Many-to-many:** One page can have N access records (people from different companies). One person can have access to M pages (multiple Portal Access records with different `page_address` values).

### Component Architecture

```
src/components/client-portal/
├── ClientPortalPage.tsx        # Root: view toggle state, data loading, layout
├── ByPageView.tsx              # Three-panel layout for page-centric view
├── ByPersonView.tsx            # Two-panel layout for person-centric view
├── PageList.tsx                # Left panel: searchable page list with access counts
├── PersonList.tsx              # Left panel: searchable person list, grouped
├── PageDetail.tsx              # Middle panel: page settings + access list + logs
├── PersonDetail.tsx            # Middle panel: person header + page cards + details + logs
├── AccessRow.tsx               # Single person row in the access list (Tier 1 fields)
├── AccessDetailPanel.tsx       # Right slide-in: full Portal Access fields (Tier 2)
├── PageCard.tsx                # Page card in By Person view
├── GrantAccessPopover.tsx      # Contact picker for granting access
├── FramerSyncBanner.tsx        # Yellow "pending Framer sync" banner
└── ActivityLog.tsx             # Shared recent activity (portal logs) component
```

**Deleted pages** (replaced by the unified page — all in `src/components/portal/`):
- `src/components/portal/PortalCmsPage.tsx`
- `src/components/portal/PortalAccessPage.tsx`
- `src/components/portal/PortalLogsPage.tsx`

**Retained features from existing pages** (must be carried forward):
- Linked contact photo + company logo resolution (`useLinkedImages` pattern from PortalAccessPage)
- Collaborator display + selection (assignee field, `buildCollaboratorOptions` pattern)
- Linked record picker for contacts (`LinkedRecordPicker` component)
- Context menu with delete confirmation on access records
- Inline click-to-edit on all editable fields (existing `EditableFormRow` pattern)
- Grouped list by company/stage/none (By Person view inherits this from PortalAccessPage)
- Section toggle dots in page list (from PortalCmsPage)
- "Contacts with Access" cross-reference (now the core of the access list section)
- URL validation + `shell:openExternal` with scheme allowlist

### Layout: By Page View

Three panels:

```
┌──────────────┬─────────────────────────────┬──────────────────────┐
│  PageList     │  PageDetail                  │  AccessDetailPanel   │
│  (260px)      │  (flex-1, min 400px)         │  (300px, conditional)│
│               │                              │                      │
│  [By Page]    │  ⚠ Framer Sync Banner       │  Appears when a      │
│  [By Person]  │                              │  person is clicked   │
│               │  Page Settings               │  in the access list  │
│  [search]     │  (url, title, subtitle,      │                      │
│               │   deck, prepared_for,        │  Shows Tier 2 fields:│
│  • Page 1  3  │   thank_you, sections)       │  budget, lead source,│
│  • Page 2  1  │                              │  services, assignee, │
│  • Page 3  2  │  People with Access          │  follow-up, decision │
│               │  [+ Grant Access]            │  maker, start date,  │
│               │  name, email, company,       │  position, phone,    │
│               │  stage, date, notes          │  website, industry,  │
│               │                              │  address, full notes │
│  [+ New Page] │  Recent Activity (logs)      │  + "Other Pages"     │
└──────────────┴─────────────────────────────┴──────────────────────┘
```

### Layout: By Person View

Two panels (no right detail — person IS the detail):

```
┌──────────────┬──────────────────────────────────────────────────────┐
│  PersonList   │  PersonDetail                                        │
│  (260px)      │  (flex-1)                                            │
│               │                                                      │
│  [By Page]    │  Person Header (avatar, name, email, company, stage) │
│  [By Person]  │                                                      │
│               │  Pages with Access                                   │
│  Group:       │  [page cards with section pills, clickable → By Page]│
│  Co|Stage|None│                                                      │
│               │  Details (all Tier 2 fields inline)                  │
│  ACME CORP    │                                                      │
│  • Sarah   2  │  Notes                                               │
│  • James   1  │                                                      │
│               │  Recent Activity (filtered to this person)           │
│  BETA IND     │                                                      │
│  • Anna    1  │                                                      │
│               │                                                      │
│  [+ Grant]    │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Field Tiers

**Tier 1 — Visible in access list rows (By Page view):**
- Name
- Email
- Company (from linked contact or direct field)
- Stage (color-coded badge)
- Date Added
- Notes (single-line preview, truncated)

**Tier 2 — Detail panel only (By Page) or inline (By Person):**
- Lead Source
- Services Interested In
- Project Budget
- Decision Maker
- Expected Project Start Date
- Follow-Up Date
- Assignee
- Position / Title
- Phone Number
- Website
- Industry
- Address
- Full Notes (editable)

### Grant Access Flow

1. User clicks "+ Grant Access" on a page
2. Popover opens with a contact search field
3. All contacts are loaded client-side via `window.electronAPI.contacts.getAll()` and filtered in the popover as the user types (acceptable at < 100 records). Uses the same pattern as `LinkedRecordPicker` in the existing codebase.
4. User selects a contact
5. System creates a Portal Access record via `window.electronAPI.portalAccess.create()`:
   - `page_address` = current page's `page_address` (auto-filled, never typed)
   - `name` = contact's `first_name + ' ' + last_name`
   - `email` = contact's `email`
   - `stage` = "Prospect" (default)
   - `contact_ids` = JSON array of the contact's Airtable ID: `'["' + contact.id + '"]'` (matches existing linked record convention — `parseIds()` pattern from PortalAccessPage)
   - `date_added` = today's ISO date string
6. Access list refreshes, new person appears
7. If contact doesn't exist: "Create New Contact" link at bottom of picker (opens a minimal inline form: name + email, creates Contact record first via `contacts.create()`, then Portal Access record with the new contact's ID)

### New Page Flow

1. User clicks "+ New Page"
2. System creates a Client Pages record with blank fields via `window.electronAPI.clientPages.create()`
3. Page appears selected in the list, `client_name` field is focused for editing
4. On title blur, `page_address` auto-generates via `slugify()`: lowercase, replace spaces/special chars with hyphens, strip non-alphanumeric (except hyphens), collapse consecutive hyphens, trim. E.g., "Acme Corporation" → "acme-corporation"
5. If the generated slug already exists (matches another page's `page_address`), append `-2` (then `-3`, etc.)
6. User can override the slug manually at any time
7. `slugify()` utility lives in `src/utils/slugify.ts` (new file, single function)

### Framer Sync Banner

- **Trigger:** Any edit to a Client Pages field (title, subtitle, page_address, deck_url, prepared_for, thank_you, section toggles)
- **Display:** Yellow banner at top of middle panel: "Page edited — Changes need to be published in Framer" + "Open Framer" button
- **Scope:** Per-page (each page tracks its own dirty state)
- **Storage:** React state (not persisted to DB). Resets on app restart
- **Dismiss:** X button on the banner. Navigating to a different page clears the banner for the previous page. Each page tracks its own dirty state via `Set<string>` of dirty page IDs
- **"Open Framer" button:** Calls `shell:openExternal` with the Framer project URL
- **Does NOT trigger** for Portal Access edits (those don't affect Framer-rendered content)

### Sidebar Navigation Change

**Before (Activity section in `NAV_SECTIONS`):**
- Portal CMS (`/portal-cms`)
- Portal Access (`/portal`)

**After (1 item):**
- Client Portal (`/client-portal`)

Update `src/config/routes.ts`:
- Remove `/portal-cms` and `/portal` from `NAV_SECTIONS`
- Remove their entries from `ROUTE_TITLES`
- Add `/client-portal` with icon `lock` and label "Client Portal"
- Portal Logs had no nav item (only in `ROUTE_TITLES`) — remove that entry too
- No `newPath` for this route (Cmd+N not applicable — use the + buttons in each view instead)

### Data Loading

`ClientPortalPage.tsx` loads all three datasets using the existing `useEntityList` hook pattern (provides automatic reload on `sync-complete` IPC events):

```typescript
const { items: pages, reload: reloadPages } = useEntityList('clientPages')
const { items: accessRecords, reload: reloadAccess } = useEntityList('portalAccess')
const { items: logs, reload: reloadLogs } = useEntityList('portalLogs')
```

**Person identity resolution:** Portal Access records may have `email` (direct field) and/or `contact_email_lookup` (from linked contact). The canonical email for grouping/matching is resolved as: `record.contact_email_lookup || record.email`, lowercased and trimmed. This matches the existing `resolvedPortalEmail()` pattern in PortalCmsPage. The same resolution applies to name (`contact_name_lookup || name`) and company (`contact_company_lookup || company`).

**By Person grouping:** Build a `Map<string, PortalAccess[]>` keyed by canonical email. Each unique email = one "person" in the list. The person's display name, company, and stage come from their first access record (arbitrary but stable — sorted by date_added desc).

Filtering is client-side:
- By Page: `accessRecords.filter(r => r.page_address === selectedPage.page_address)`
- By Person: `accessRecords.filter(r => resolveEmail(r) === selectedPerson.email)`
- Logs by page: extract slug from `page_url` via `page_url.split('/ils-clients/')[1]?.split('?')[0]` and compare with exact `===` against `page_address` (avoids prefix false positives per CLAUDE.md lesson)
- Logs by person: `logs.filter(l => l.client_email?.toLowerCase() === selectedPerson.email)`

### Cross-View Navigation

- In By Person view, clicking a page card's arrow switches to By Page view with that page selected
- In By Page view, the AccessDetailPanel shows "Other Pages" — clicking one switches the selected page
- View toggle (By Page / By Person) preserves search text when possible

## Out of Scope

- **Framer CMS automation** — Deferred to future session. Investigate `unframer` MCP for direct CMS push.
- **Airtable schema changes** — No new tables or fields. Using existing `page_address` string match.
- **Portal Access linked record to Client Pages** — Would be ideal (Airtable linked record instead of string match) but requires Airtable schema change. Defer.
- **Bulk grant access** — Grant one person at a time for now.
- **Portal Logs deletion/management** — Remains read-only, display only.
- **Attachments field** — Portal Access has an `attachments` field (`fldCvoIAUEUg0DraC`). Not displayed in either tier. Can be added later if needed.

## Risks

1. **Large component** — `ClientPortalPage.tsx` orchestrates 3 data sources + 2 view modes. Keep it as a thin coordinator; push logic into child components.
2. **Performance** — Loading all 3 tables at once. Acceptable for current data size (< 100 records per table). If it grows, add pagination.
3. **page_address string matching** — Fragile if slugs have trailing slashes or case differences. Normalize on comparison.

## Testing

- Verify By Page view shows correct access count badges
- Verify By Person view groups correctly by company
- Verify Grant Access auto-fills page_address (never typed manually)
- Verify Framer sync banner appears only for Client Pages edits
- Verify cross-view navigation (page card arrow → By Page, Other Pages link → switches page)
- Verify new page creates record with auto-slugified address
- `npx tsc --noEmit` exits 0
- Dark mode renders correctly (all CSS vars, no hardcoded colors)
