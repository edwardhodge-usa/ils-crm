# Unified Client Portal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace three separate portal tabs (Portal CMS, Portal Access, Portal Logs) with one unified Client Portal page featuring By Page and By Person views.

**Architecture:** Single `ClientPortalPage` coordinator loads all three datasets via `useEntityList` hooks, manages view toggle state, and renders either `ByPageView` (3-panel) or `ByPersonView` (2-panel). All portal data stays in existing Airtable tables — no schema changes. Shared utilities handle person identity resolution and slug generation.

**Tech Stack:** React 18, TypeScript, Vite, Electron IPC (`window.electronAPI`), sql.js, CSS design tokens from `src/styles/tokens.css`

**Spec:** `docs/superpowers/specs/2026-03-11-unified-client-portal-design.md`
**Mockups:** `.superpowers/brainstorm/39470-1773270472/unified-layout.html` (By Page), `by-person-view.html` (By Person)

---

## Chunk 1: Foundation

### Task 1: Utilities — slugify + portal resolution helpers

**Files:**
- Create: `src/utils/slugify.ts`
- Create: `src/utils/portal-helpers.ts`
- Create: `src/hooks/useLinkedImages.ts`

- [ ] **Step 1: Create `src/utils/slugify.ts`**

```typescript
/**
 * Convert a string to a URL-safe slug.
 * "Acme Corporation" → "acme-corporation"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // collapse consecutive hyphens
    .replace(/^-|-$/g, '')         // trim leading/trailing hyphens
}

/**
 * Generate a unique slug by appending -2, -3, etc. if it already exists.
 */
export function uniqueSlug(base: string, existing: string[]): string {
  const slug = slugify(base)
  if (!slug) return ''
  if (!existing.includes(slug)) return slug
  let n = 2
  while (existing.includes(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}
```

- [ ] **Step 2: Create `src/utils/portal-helpers.ts`**

Extract `resolvedPortalName`, `resolvedPortalEmail`, and `resolveLookup` from `src/components/portal/PortalCmsPage.tsx` (lines 26-56) into a shared utility. Add `resolvedPortalCompany`. These are currently defined inline in PortalCmsPage and will be needed by multiple components.

```typescript
/**
 * Safely extract a display string from a lookup value that may be a JSON array.
 * Handles: null, string, JSON-encoded array, native array.
 */
export function resolveLookup(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        const arr = JSON.parse(val)
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      } catch { /* not JSON, use as-is */ }
    }
    return val
  }
  if (Array.isArray(val) && val.length > 0) return String(val[0])
  return String(val)
}

/** Canonical name for a Portal Access record. Prefers linked contact name. */
export function resolvedPortalName(row: Record<string, unknown>): string {
  const name = row.name as string | null
  if (name && name !== row.airtable_id) return name
  const contactName = resolveLookup(row.contact_name_lookup)
  if (contactName) return contactName
  const email = row.email as string | null
  if (email) return email
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  return name || 'Unnamed'
}

/** Canonical email for a Portal Access record. Prefers linked contact email. */
export function resolvedPortalEmail(row: Record<string, unknown>): string | null {
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail.toLowerCase().trim()
  const email = row.email as string | null
  return email ? email.toLowerCase().trim() : null
}

/** Canonical company for a Portal Access record. Prefers linked contact company. */
export function resolvedPortalCompany(row: Record<string, unknown>): string | null {
  const contactCompany = resolveLookup(row.contact_company_lookup)
  if (contactCompany) return contactCompany
  return (row.company as string | null) || null
}

/**
 * Extract the page slug from a full portal log URL.
 * "https://www.imaginelabstudios.com/ils-clients/acme-corp?token=..." → "acme-corp"
 * Returns null if URL doesn't match the expected pattern.
 */
export function extractPageSlug(pageUrl: string | null | undefined): string | null {
  if (!pageUrl) return null
  const parts = pageUrl.split('/ils-clients/')
  if (parts.length < 2) return null
  return parts[1].split('?')[0].split('#')[0] || null
}

/**
 * Group Portal Access records by canonical email → unique persons.
 * Returns a Map keyed by lowercase email. Each value is all access records for that person.
 * Records within each group are sorted by date_added desc.
 */
export function groupByPerson(
  records: Record<string, unknown>[]
): Map<string, Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>[]>()
  for (const r of records) {
    const email = resolvedPortalEmail(r)
    if (!email) continue
    const group = map.get(email) || []
    group.push(r)
    map.set(email, group)
  }
  // Sort each group by date_added desc
  for (const [, group] of map) {
    group.sort((a, b) => {
      const da = (a.date_added as string) || ''
      const db = (b.date_added as string) || ''
      return db.localeCompare(da)
    })
  }
  return map
}
```

- [ ] **Step 3: Extract `useLinkedImages` hook to `src/hooks/useLinkedImages.ts`**

Copy the `useLinkedImages` function from `src/components/portal/PortalAccessPage.tsx` (lines ~15-70) into a shared hook. This hook resolves contact photos and company logos from linked records. It's needed by `AccessDetailPanel` and `PersonDetail`.

```typescript
import { useState, useEffect } from 'react'
import { parseIds } from '../utils/linked-records'

/**
 * Resolve contact photo URL and company logo URL from a record's linked contact.
 * Follows the chain: record.contact_ids → Contact → contact_photo_url + company_ids → Company → logo_url
 */
export default function useLinkedImages(record: Record<string, unknown> | null) {
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null)
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setContactPhotoUrl(null)
    setCompanyLogoUrl(null)
    if (!record) return

    let cancelled = false

    async function load() {
      const contactIds = parseIds(record!.contact_ids)
      if (contactIds.length > 0) {
        const res = await window.electronAPI.contacts.getById(contactIds[0])
        if (!cancelled && res.success && res.data) {
          const contact = res.data as Record<string, unknown>
          if (contact.contact_photo_url) setContactPhotoUrl(contact.contact_photo_url as string)

          const companyIds = parseIds(contact.company_ids ?? contact.companies_ids)
          if (companyIds.length > 0) {
            const compRes = await window.electronAPI.companies.getById(companyIds[0])
            if (!cancelled && compRes.success && compRes.data) {
              const company = compRes.data as Record<string, unknown>
              if (company.logo_url) setCompanyLogoUrl(company.logo_url as string)
            }
          }
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [record?.id])

  return { contactPhotoUrl, companyLogoUrl }
}
```

- [ ] **Step 4: Update PortalCmsPage to import from shared utils**

In `src/components/portal/PortalCmsPage.tsx`, replace the inline `resolveLookup`, `resolvedPortalName`, and `resolvedPortalEmail` functions (lines ~26-56) with imports from `src/utils/portal-helpers.ts`. This prevents duplication and confirms the extraction works. The old pages still need to work until the unified page is complete.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: Exit 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/slugify.ts src/utils/portal-helpers.ts src/hooks/useLinkedImages.ts src/components/portal/PortalCmsPage.tsx
git commit -m "feat: extract portal-helpers, slugify, and useLinkedImages for unified client portal"
```

---

### Task 2: Routes + App.tsx — wire the new route

**Files:**
- Modify: `src/config/routes.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `src/config/routes.ts`**

In the `NAV_SECTIONS` array, find the `Activity` section. Replace:
```typescript
{ id: 'portal-cms', label: 'Portal CMS', path: '/portal-cms', icon: 'doc' },
{ id: 'portal', label: 'Portal Access', path: '/portal', icon: 'lock' },
```
With:
```typescript
{ id: 'client-portal', label: 'Client Portal', path: '/client-portal', icon: 'lock' },
```

In `ROUTE_TITLES`, remove entries for `/portal-cms`, `/portal`, `/portal-logs`. Add:
```typescript
'/client-portal': 'Client Portal',
```

- [ ] **Step 2: Update `src/App.tsx`**

Add import at top:
```typescript
import ClientPortalPage from './components/client-portal/ClientPortalPage'
```

Replace the three portal routes:
```typescript
<Route path="/portal" element={<PortalAccessPage />} />
<Route path="/portal-cms" element={<PortalCmsPage />} />
<Route path="/portal-logs" element={<PortalLogsPage />} />
```
With:
```typescript
<Route path="/client-portal" element={<ClientPortalPage />} />
```

Keep the old imports for now (they'll be removed in the cleanup task). The new `ClientPortalPage` won't exist yet — create a stub.

- [ ] **Step 3: Create stub `src/components/client-portal/ClientPortalPage.tsx`**

```typescript
export default function ClientPortalPage() {
  return (
    <div style={{ padding: 20, color: 'var(--text-secondary)' }}>
      Client Portal — implementation in progress
    </div>
  )
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`
Expected: Exit 0. (Old portal pages still exist, imports still valid.)

```bash
git add src/config/routes.ts src/App.tsx src/components/client-portal/ClientPortalPage.tsx
git commit -m "feat: add /client-portal route, replace portal-cms + portal-access nav items"
```

---

### Task 3: Shared subcomponents — ActivityLog + FramerSyncBanner

**Files:**
- Create: `src/components/client-portal/ActivityLog.tsx`
- Create: `src/components/client-portal/FramerSyncBanner.tsx`

- [ ] **Step 1: Create `ActivityLog.tsx`**

Shared component used in both By Page and By Person views. Renders portal log entries as a compact list.

```typescript
import { extractPageSlug } from '../../utils/portal-helpers'

interface ActivityLogProps {
  logs: Record<string, unknown>[]
  /** If provided, filter logs to this page slug */
  pageSlug?: string
  /** If provided, filter logs to this person's email */
  personEmail?: string
  /** Max entries to show. Default 10 */
  limit?: number
}

export default function ActivityLog({ logs, pageSlug, personEmail, limit = 10 }: ActivityLogProps) {
  const filtered = logs.filter((l) => {
    if (pageSlug) {
      const slug = extractPageSlug(l.page_url as string | null)
      if (slug !== pageSlug) return false
    }
    if (personEmail) {
      const email = (l.client_email as string | null)?.toLowerCase()
      if (email !== personEmail) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const ta = (a.timestamp as string) || ''
    const tb = (b.timestamp as string) || ''
    return tb.localeCompare(ta)
  })

  const visible = sorted.slice(0, limit)

  if (visible.length === 0) {
    return (
      <div style={{ padding: '12px 0', fontSize: 'var(--font-secondary)', color: 'var(--text-tertiary)' }}>
        No activity yet
      </div>
    )
  }

  return (
    <div>
      {visible.map((log, i) => {
        const name = (log.client_name as string) || (log.client_email as string) || 'Unknown'
        const resolvedName = name.startsWith('[') ? (() => { try { const a = JSON.parse(name); return Array.isArray(a) ? a[0] : name } catch { return name } })() : name
        const city = log.city as string | null
        const country = log.country as string | null
        const location = [city, country].filter(Boolean).join(', ')
        const ts = log.timestamp as string | null
        const pageUrl = log.page_url as string | null
        const slug = extractPageSlug(pageUrl)

        return (
          <div
            key={`${log.id}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 0',
              gap: 10,
              fontSize: 'var(--font-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--color-green)',
                opacity: 0.6,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {resolvedName}
            </span>
            {!personEmail && slug && (
              <span>
                visited <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>/ils-clients/{slug}</span>
              </span>
            )}
            {personEmail && !pageSlug && slug && (
              <span>
                visited <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>/ils-clients/{slug}</span>
              </span>
            )}
            {location && <span>from {location}</span>}
            <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontSize: 'var(--font-small)' }}>
              {ts ? formatRelativeTime(ts) : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  const diffW = Math.floor(diffD / 7)
  return `${diffW}w ago`
}
```

- [ ] **Step 2: Create `FramerSyncBanner.tsx`**

**Note on colors:** The warning banner uses `rgba(255,165,0,...)` (system orange) because `tokens.css` has no `--color-warning` token. This is an intentional exception — warning banners are ephemeral UI, not part of the permanent design system. Same applies to stage badge colors in `AccessRow` (green, orange, purple for Client/Lead/Partner). These match the existing `StatusBadge` color patterns already in the codebase.

```typescript
interface FramerSyncBannerProps {
  visible: boolean
  onDismiss: () => void
}

const FRAMER_PROJECT_URL = 'https://framer.com/projects'  // TODO: make configurable if needed

export default function FramerSyncBanner({ visible, onDismiss }: FramerSyncBannerProps) {
  if (!visible) return null

  const handleOpenFramer = () => {
    window.electronAPI?.shell?.openExternal?.(FRAMER_PROJECT_URL)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '12px 20px',
        padding: '10px 14px',
        background: 'rgba(255,165,0,0.08)',
        border: '1px solid rgba(255,165,0,0.15)',
        borderRadius: 10,
        fontSize: 'var(--font-secondary)',
        color: 'rgba(255,165,0,0.9)',
      }}
    >
      <span style={{ fontSize: 14 }}>&#9888;</span>
      <span style={{ flex: 1 }}>
        <strong>Page edited</strong> — Changes need to be published in Framer
      </span>
      <button
        onClick={handleOpenFramer}
        style={{
          padding: '4px 12px',
          background: 'rgba(255,165,0,0.15)',
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 'var(--font-small)',
          color: 'rgba(255,165,0,0.95)',
          border: 'none',
          cursor: 'default',
          whiteSpace: 'nowrap',
        }}
      >
        Open Framer
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,165,0,0.6)',
          fontSize: 16,
          cursor: 'default',
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        &#10005;
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit`
Expected: Exit 0.

```bash
git add src/components/client-portal/ActivityLog.tsx src/components/client-portal/FramerSyncBanner.tsx
git commit -m "feat: add ActivityLog and FramerSyncBanner shared components"
```

---

## Chunk 2: List Components

### Task 4: PageList — left panel for By Page view

**Files:**
- Create: `src/components/client-portal/PageList.tsx`

- [ ] **Step 1: Create `PageList.tsx`**

Left panel showing all Client Pages with search, section indicator dots, and access count badges. Reference the mockup at `.superpowers/brainstorm/39470-1773270472/unified-layout.html` for exact visual design.

**Props interface:**
```typescript
interface PageListProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearchChange: (s: string) => void
  onNewPage: () => void
}
```

**Key behaviors:**
- Filter pages by `search` against `client_name`, `page_address`, `page_title` (case-insensitive)
- Sort by `client_name` alphabetically
- Each row shows: colored dot (deterministic from page index), `client_name`, `/ils-clients/{page_address}` as subtitle, access count badge
- Access count: `accessRecords.filter(r => r.page_address === page.page_address).length`
- Section dots: show green/grey dots for `head`, `v_prmagic`, `v_highlight`, `v_360`, `v_full_l` checkboxes
- Selected row uses `var(--color-accent)` background + white text (HIG sidebar pattern)
- Bottom: "+ New Page" button
- All styling via inline `style={}` using CSS var tokens. No hardcoded hex colors.
- `cursor: 'default'` everywhere (macOS HIG — no pointer cursor)

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/PageList.tsx
git commit -m "feat: add PageList component for unified client portal"
```

---

### Task 5: PersonList — left panel for By Person view

**Files:**
- Create: `src/components/client-portal/PersonList.tsx`

- [ ] **Step 1: Create `PersonList.tsx`**

Left panel showing all unique persons grouped by company/stage/none. Reference mockup at `.superpowers/brainstorm/39470-1773270472/by-person-view.html`.

**Props interface:**
```typescript
type GroupBy = 'company' | 'stage' | 'none'

interface PersonListProps {
  accessRecords: Record<string, unknown>[]
  selectedEmail: string | null
  onSelect: (email: string) => void
  search: string
  onSearchChange: (s: string) => void
  groupBy: GroupBy
  onGroupByChange: (g: GroupBy) => void
}
```

**Key behaviors:**
- Use `groupByPerson()` from `portal-helpers.ts` to deduplicate by email
- Each person: avatar initials (use `Avatar` component pattern — first letter of first+last name), name, email subtitle, page count badge
- Group headers: uppercase, `var(--text-tertiary)`, `var(--font-small)`, border-top separator
- Group by company: `resolvedPortalCompany()` on the first record of each person
- Group by stage: `stage` field on the first record
- Group by none: flat list sorted by name
- Filter by search against name, email, company (case-insensitive)
- Selected person uses accent background + white text
- Bottom: "+ Grant Access" button (fires callback — actual popover handled by parent)

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/PersonList.tsx
git commit -m "feat: add PersonList component with grouping for unified client portal"
```

---

## Chunk 3: Detail Components

### Task 6: AccessRow + AccessDetailPanel — access list in By Page view

**Files:**
- Create: `src/components/client-portal/AccessRow.tsx`
- Create: `src/components/client-portal/AccessDetailPanel.tsx`

- [ ] **Step 1: Create `AccessRow.tsx`**

Single person row in the "People with Access" list. Shows Tier 1 fields.

```typescript
import { resolvedPortalName, resolvedPortalEmail, resolvedPortalCompany } from '../../utils/portal-helpers'

interface AccessRowProps {
  record: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}
```

**Displays:** Avatar (initials), name, email + company subtitle, notes preview (single line truncated), stage badge (color-coded), date_added.

Stage colors (from existing `StatusBadge` patterns):
- Client: `--color-green` with 0.12 alpha bg
- Prospect: `--color-accent` with 0.12 alpha bg
- Lead: orange (`rgba(255,159,10,...)`)
- Past Client: `--text-tertiary`
- Partner: purple (`rgba(191,90,242,...)`)

- [ ] **Step 2: Create `AccessDetailPanel.tsx`**

Right slide-in panel showing all Tier 2 fields for a Portal Access record. Uses `EditableFormRow` for each field.

```typescript
import useLinkedImages from '../../hooks/useLinkedImages'
import { parseIds } from '../../utils/linked-records'
import { parseCollaboratorName } from '../../utils/collaborator'
import EditableFormRow from '../shared/EditableFormRow'

interface AccessDetailPanelProps {
  record: Record<string, unknown>
  allAccessRecords: Record<string, unknown>[]  // for building collaborator options
  onFieldSave: (key: string, value: unknown) => Promise<void>
  onClose: () => void
  /** Other pages this person has access to (excluding current page) */
  otherPages: { pageAddress: string; dateAdded: string }[]
  onNavigateToPage: (pageAddress: string) => void
}
```

**Key imports and patterns:**
- `useLinkedImages(record)` → `{ contactPhotoUrl, companyLogoUrl }` for avatar/logo display
- `parseIds(record.contact_ids)` from `src/utils/linked-records.ts` for linked contact resolution
- `parseCollaboratorName(record.assignee)` from `src/utils/collaborator.ts` for assignee display

**Sections:**
1. Header: Avatar (with `contactPhotoUrl` if available, else initials), name, email (read-only display)
2. Portal Fields section — these are ALL **Portal Access table fields** (editable via `onFieldSave`):
   - `stage` (singleSelect: Prospect, Lead, Client, Past Client, Partner)
   - `status` (singleSelect: ACTIVE, IN-ACTIVE, PENDING, EXPIRED, REVOKED) — **retained from existing UI**
   - `lead_source` (singleSelect)
   - `services_interested_in` (multiSelect)
   - `project_budget` (currency)
   - `follow_up_date` (date)
   - `assignee` (singleSelect — built from unique collaborators across all access records)
   - `decision_maker` (text)
   - `expected_project_start_date` (date)
3. Contact Info section — these are **Portal Access direct fields** (NOT linked Contact fields):
   - `position_title`, `phone_number`, `website`, `industry`, `address` — all text via `EditableFormRow`
   - These are portal-specific copies. The linked Contact's own fields are read-only lookups.
4. Notes section: `notes` field in editable textarea
5. Other Pages section: list of other pages this person has access to, clickable

**Collaborator field (assignee):**
Build the options list locally in the component (same pattern as existing `PortalAccessPage`):
```typescript
const collaboratorOptions = useMemo(() => {
  const seen = new Map<string, string>()
  for (const r of allAccessRecords) {
    const name = parseCollaboratorName(r.assignee)
    if (name) seen.set(name, r.assignee as string)
  }
  return Array.from(seen.keys())
}, [allAccessRecords])
```
Pass `options={collaboratorOptions}` to the `EditableFormRow` for `assignee` field with `type: 'singleSelect'`.

On save, the assignee value needs to be resolved back to the collaborator JSON format. Read the existing `PortalAccessPage` to see the exact save pattern — it stores the full `{id, email, name}` JSON, not just the name string.

- `services_interested_in` is `multiSelect` type
- URL validation for `website` field: use `normalizeUrl()` if it exists in utils, otherwise inline prefix check

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/AccessRow.tsx src/components/client-portal/AccessDetailPanel.tsx
git commit -m "feat: add AccessRow and AccessDetailPanel for unified client portal"
```

---

### Task 7: PageDetail — middle panel for By Page view

**Files:**
- Create: `src/components/client-portal/PageDetail.tsx`

- [ ] **Step 1: Create `PageDetail.tsx`**

Middle panel showing page settings, access list, and activity log. This is the largest component — reference the mockup carefully.

```typescript
interface PageDetailProps {
  page: Record<string, unknown>
  accessRecords: Record<string, unknown>[]  // filtered to this page
  allAccessRecords: Record<string, unknown>[]  // all records (for "Other Pages")
  logs: Record<string, unknown>[]
  onPageFieldSave: (key: string, value: unknown) => Promise<void>
  onAccessFieldSave: (recordId: string, key: string, value: unknown) => Promise<void>
  onDeleteAccess: (recordId: string) => void
  onGrantAccess: () => void
  dirtyPages: Set<string>
  onMarkDirty: (pageId: string) => void
  onDismissBanner: (pageId: string) => void
  onNavigateToPage: (pageAddress: string) => void
}
```

**Layout (top to bottom):**
1. `FramerSyncBanner` — show if `dirtyPages.has(page.id)`
2. Page URL bar: `imaginelabstudios.com/ils-clients/{page_address}` + "Open" button
3. Page title (inline editable, 20px 700wt)
4. Page subtitle (inline editable, 14px secondary)
5. Form rows: Deck URL (with "Open Deck" button), Prepared For, Thank You
6. Section toggles: Header, Practical Magic, Highlights, 360 Video, Full Length — as toggle pills with green/grey dots
7. Divider
8. "People with Access (N)" header + "+ Grant Access" button
9. List of `AccessRow` components. Clicking one sets `selectedAccessId` state and shows `AccessDetailPanel`.
10. Divider
11. "Recent Activity" header + `ActivityLog` filtered to this page's `page_address`

**Field save handler wraps `onPageFieldSave` and also calls `onMarkDirty(page.id)` for Client Pages fields.**

**Context menu on AccessRow:** Right-click shows `ContextMenu` (from `src/components/shared/ContextMenu.tsx`) with "Delete Access" (destructive). On click, show a confirmation UI using local state (e.g., `confirmDeleteId`) — render a small inline "Are you sure? Delete / Cancel" bar. Do **NOT** use `window.confirm()` — it silently returns null in Electron (per CLAUDE.md lesson). After confirmation, call `onDeleteAccess(recordId)` which calls `window.electronAPI.portalAccess.delete(id)`.

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/PageDetail.tsx
git commit -m "feat: add PageDetail component for unified client portal"
```

---

### Task 8: PersonDetail + PageCard — middle panel for By Person view

**Files:**
- Create: `src/components/client-portal/PageCard.tsx`
- Create: `src/components/client-portal/PersonDetail.tsx`

- [ ] **Step 1: Create `PageCard.tsx`**

Card showing a page in the By Person view. Reference mockup at `by-person-view.html`.

```typescript
interface PageCardProps {
  page: Record<string, unknown>
  dateAdded: string  // from the Portal Access record
  onNavigate: () => void
}
```

Displays: colored dot, page title, `/ils-clients/{slug}`, section mini-pills (on/off), date added, chevron arrow. Clickable to navigate to By Page view.

- [ ] **Step 2: Create `PersonDetail.tsx`**

Middle panel for By Person view. Shows person header, their pages, all Tier 2 fields inline, notes, and activity.

```typescript
interface PersonDetailProps {
  email: string
  records: Record<string, unknown>[]  // all Portal Access records for this person
  pages: Record<string, unknown>[]  // all Client Pages (to look up page details)
  logs: Record<string, unknown>[]
  onAccessFieldSave: (recordId: string, key: string, value: unknown) => Promise<void>
  onNavigateToPage: (pageAddress: string) => void
}
```

**Key imports:**
```typescript
import useLinkedImages from '../../hooks/useLinkedImages'
import { parseIds } from '../../utils/linked-records'
import { parseCollaboratorName } from '../../utils/collaborator'
import EditableFormRow from '../shared/EditableFormRow'
```

**Layout (top to bottom):**
1. Person header: large avatar (use `useLinkedImages(records[0])` for contact photo, fall back to initials), name, email, company, stage badge
2. "Pages with Access (N)" section: list of `PageCard` components. For each record in `records`, find the matching page from `pages` by `page_address`.
3. "Details" section: All Tier 2 fields (including `status`) via `EditableFormRow`. Use the first record's values (most recent by `date_added`). Edits save to that record via `window.electronAPI.portalAccess.update(recordId, { [key]: value })`.
4. "Notes" section: full notes textarea
5. "Recent Activity" section: `ActivityLog` filtered to this person's email

**Carry forward:** Collaborator display for assignee (same pattern as AccessDetailPanel), multiSelect for services_interested_in, `status` field with StatusBadge colors.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/PageCard.tsx src/components/client-portal/PersonDetail.tsx
git commit -m "feat: add PersonDetail and PageCard for unified client portal"
```

---

## Chunk 4: Assembly + Interactions

### Task 9: GrantAccessPopover — contact picker

**Files:**
- Create: `src/components/client-portal/GrantAccessPopover.tsx`

- [ ] **Step 1: Create `GrantAccessPopover.tsx`**

Contact picker popover for granting access. Opens below the "+ Grant Access" button.

```typescript
interface GrantAccessPopoverProps {
  pageAddress: string
  onGrant: (contactId: string, name: string, email: string) => Promise<void>
  onClose: () => void
  position: { x: number; y: number }
}
```

**Behavior:**
1. On mount, load all contacts: `window.electronAPI.contacts.getAll()`
2. Show search input at top. Filter contacts by `first_name`, `last_name`, `email` as user types.
3. Each row: name, email, company subtitle
4. On select: call `onGrant(contact.id, firstName + ' ' + lastName, email)`. Parent creates the Portal Access record via `window.electronAPI.portalAccess.create()` with:
   - `page_address` = current page's slug (auto-filled)
   - `name` = contact name
   - `email` = contact email
   - `stage` = "Prospect"
   - `contact_ids` = `JSON.stringify([contact.id])` — **must be JSON array format** matching the `parseIds()` convention from `src/utils/linked-records.ts`
   - `date_added` = `new Date().toISOString().split('T')[0]`
5. Bottom: "Create New Contact" link. Opens inline mini-form (name + email fields + Save button). On save: `window.electronAPI.contacts.create({ first_name, last_name, email })` → then grant access with the new contact's ID (returned from `create()` as `res.data`).
6. Rendered via `createPortal` to document body (same pattern as `ContextMenu` and `LinkedRecordPicker`)
7. Click outside or Escape to close

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/GrantAccessPopover.tsx
git commit -m "feat: add GrantAccessPopover contact picker for unified client portal"
```

---

### Task 10: ByPageView + ByPersonView — layout assemblies

**Files:**
- Create: `src/components/client-portal/ByPageView.tsx`
- Create: `src/components/client-portal/ByPersonView.tsx`

- [ ] **Step 1: Create `ByPageView.tsx`**

Three-panel layout: PageList (260px) | PageDetail (flex-1, min 400px) | AccessDetailPanel (300px, conditional).

```typescript
interface ByPageViewProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  search: string
  onSearchChange: (s: string) => void
  reloadPages: () => void
  reloadAccess: () => void
}
```

**Manages state:**
- `selectedPageId` — which page is selected in PageList
- `selectedAccessId` — which access record is selected (shows AccessDetailPanel)
- `dirtyPages: Set<string>` — pages with unsaved Framer changes
- `grantPopover` — position/visibility state for GrantAccessPopover

**Handlers (all use `window.electronAPI.*` IPC calls):**
- `handleNewPage`: `window.electronAPI.clientPages.create({})` → `reloadPages()` → `setSelectedPageId(res.data)`
- `handlePageFieldSave`: `window.electronAPI.clientPages.update(id, { [key]: value })` → `reloadPages()` + `setDirtyPages(prev => new Set(prev).add(id))`
- `handleAccessFieldSave`: `window.electronAPI.portalAccess.update(id, { [key]: value })` → `reloadAccess()`
- `handleDeleteAccess`: `window.electronAPI.portalAccess.delete(id)` → `reloadAccess()` + `setSelectedAccessId(null)`
- `handleGrantAccess(contactId, name, email)`: `window.electronAPI.portalAccess.create({ page_address: selectedPage.page_address, name, email, stage: 'Prospect', contact_ids: JSON.stringify([contactId]), date_added: new Date().toISOString().split('T')[0] })` → `reloadAccess()`
- `handleNavigateToPage(pageAddress)`: Find page by `page_address` match → `setSelectedPageId(page.id)`

**Layout:**
```typescript
<div style={{ display: 'flex', height: '100%', width: '100%' }}>
  <PageList ... />
  <div style={{ flex: 1, minWidth: 400, overflow: 'auto', borderLeft: ..., borderRight: ... }}>
    {selectedPage ? <PageDetail ... /> : <EmptyState />}
  </div>
  {selectedAccessRecord && <AccessDetailPanel ... />}
</div>
```

- [ ] **Step 2: Create `ByPersonView.tsx`**

Two-panel layout: PersonList (260px) | PersonDetail (flex-1).

```typescript
interface ByPersonViewProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  search: string
  onSearchChange: (s: string) => void
  onSwitchToPageView: (pageAddress: string) => void
  reloadAccess: () => void
}
```

**Manages state:**
- `selectedEmail` — which person is selected
- `groupBy: 'company' | 'stage' | 'none'`

**Handlers:**
- `handleAccessFieldSave`: `portalAccess.update(id, { [key]: value })` → reload
- `handleNavigateToPage`: calls `onSwitchToPageView(pageAddress)` to switch view + select page

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/ByPageView.tsx src/components/client-portal/ByPersonView.tsx
git commit -m "feat: add ByPageView and ByPersonView layout assemblies"
```

---

### Task 11: ClientPortalPage — root coordinator (replace stub)

**Files:**
- Modify: `src/components/client-portal/ClientPortalPage.tsx`

- [ ] **Step 1: Replace the stub with the full coordinator**

`ClientPortalPage` is a thin coordinator that:
1. Loads all 3 datasets via `useEntityList` (callback form)
2. Manages view toggle state (`'byPage' | 'byPerson'`)
3. Manages shared search state
4. Renders `ByPageView` or `ByPersonView`
5. Handles cross-view navigation

```typescript
import { useState } from 'react'
import useEntityList from '../../hooks/useEntityList'
import ByPageView from './ByPageView'
import ByPersonView from './ByPersonView'

export default function ClientPortalPage() {
  // Data loading — useEntityList takes a callback, returns { data, loading, error, reload }
  const { data: pages, loading: pagesLoading, reload: reloadPages } = useEntityList(
    () => window.electronAPI.clientPages.getAll()
  )
  const { data: accessRecords, loading: accessLoading, reload: reloadAccess } = useEntityList(
    () => window.electronAPI.portalAccess.getAll()
  )
  const { data: logs, reload: reloadLogs } = useEntityList(
    () => window.electronAPI.portalLogs.getAll()
  )

  const [view, setView] = useState<'byPage' | 'byPerson'>('byPage')
  const [search, setSearch] = useState('')
  const [pendingPageAddress, setPendingPageAddress] = useState<string | null>(null)

  const loading = pagesLoading || accessLoading

  // Cross-view navigation
  const handleSwitchToPageView = (pageAddress: string) => {
    setView('byPage')
    setPendingPageAddress(pageAddress)
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-tertiary)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {view === 'byPage' ? (
        <ByPageView
          pages={pages}
          accessRecords={accessRecords}
          logs={logs}
          search={search}
          onSearchChange={setSearch}
          reloadPages={reloadPages}
          reloadAccess={reloadAccess}
          pendingPageAddress={pendingPageAddress}
          onClearPending={() => setPendingPageAddress(null)}
          view={view}
          onViewChange={setView}
        />
      ) : (
        <ByPersonView
          pages={pages}
          accessRecords={accessRecords}
          logs={logs}
          search={search}
          onSearchChange={setSearch}
          onSwitchToPageView={handleSwitchToPageView}
          reloadAccess={reloadAccess}
          view={view}
          onViewChange={setView}
        />
      )}
    </div>
  )
}
```

**Note:** The view toggle control (segmented button) lives inside `PageList`/`PersonList` — passed as `view` + `onViewChange` props. This keeps the toggle visually in the left panel alongside search.

**Layout:** Full width, full height. No right padding — child views own their own padding.

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` → Exit 0.

```bash
git add src/components/client-portal/ClientPortalPage.tsx
git commit -m "feat: wire ClientPortalPage coordinator with data loading and view toggle"
```

---

## Chunk 5: Cleanup + Final Verification

### Task 12: Remove old portal pages + clean imports

**Files:**
- Delete: `src/components/portal/PortalCmsPage.tsx`
- Delete: `src/components/portal/PortalAccessPage.tsx`
- Delete: `src/components/portal/PortalLogsPage.tsx`
- Modify: `src/App.tsx` (remove old imports)

- [ ] **Step 1: Remove old imports from `src/App.tsx`**

Remove:
```typescript
import PortalAccessPage from './components/portal/PortalAccessPage'
import PortalCmsPage from './components/portal/PortalCmsPage'
import PortalLogsPage from './components/portal/PortalLogsPage'
```

Also remove the old route lines if they're still commented or present.

- [ ] **Step 2: Delete the old portal page files**

```bash
rm src/components/portal/PortalCmsPage.tsx
rm src/components/portal/PortalAccessPage.tsx
rm src/components/portal/PortalLogsPage.tsx
```

Check if `src/components/portal/` has any other files. If it's now empty, remove the directory too.

- [ ] **Step 3: Verify no broken imports**

Run: `npx tsc --noEmit`
Expected: Exit 0. If any other files imported from the deleted pages, fix those imports.

Also run: `grep -r "PortalCmsPage\|PortalAccessPage\|PortalLogsPage" src/` to confirm no dangling references.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old portal pages, replaced by unified Client Portal"
```

---

### Task 13: Visual QA + dark mode verification

**Files:** None (verification only)

- [ ] **Step 1: Run the app in dev mode**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm"
npm run dev
```

- [ ] **Step 2: Visual QA checklist — By Page view**

Verify against mockup (`unified-layout.html`):
- [ ] Sidebar shows "Client Portal" (not Portal CMS / Portal Access)
- [ ] Page list loads with correct pages from Airtable
- [ ] Access count badges show correct numbers
- [ ] Selecting a page shows page settings + access list + logs
- [ ] Editing a page field shows the Framer sync banner
- [ ] Dismissing the banner works (X button)
- [ ] "+ Grant Access" opens the contact picker popover
- [ ] Selecting a contact creates a Portal Access record with correct page_address
- [ ] "+ New Page" creates a blank page, focuses title field
- [ ] Typing a title and blurring auto-generates the slug
- [ ] Clicking an access row shows the detail panel (right side)
- [ ] Detail panel shows all Tier 2 fields, editable
- [ ] "Other Pages" section shows other pages this person has access to
- [ ] Recent Activity shows portal log entries for this page

- [ ] **Step 3: Visual QA checklist — By Person view**

Verify against mockup (`by-person-view.html`):
- [ ] Toggle to "By Person" switches the view
- [ ] Person list shows unique people grouped by company
- [ ] Switching group-by (Company / Stage / None) works
- [ ] Selecting a person shows their detail in the middle panel
- [ ] Page cards show the correct pages with section pills
- [ ] Clicking a page card arrow switches to By Page view with that page selected
- [ ] All Tier 2 fields are editable inline
- [ ] Notes section is editable
- [ ] Recent Activity shows logs filtered to this person

- [ ] **Step 4: Dark mode verification**

Toggle dark mode (System Preferences or app toggle). Verify:
- [ ] No hardcoded colors (all CSS vars)
- [ ] Text is readable on all backgrounds
- [ ] Framer sync banner looks correct in dark mode
- [ ] Stage badges are readable
- [ ] Borders and separators use `var(--separator)`

- [ ] **Step 5: TypeScript final check**

Run: `npx tsc --noEmit` → Exit 0.

- [ ] **Step 6: Commit any fixes**

If any visual issues were found and fixed:
```bash
git add -A
git commit -m "fix: visual QA fixes for unified client portal"
```

---

## Verification Goals (from spec)

- [ ] By Page view shows correct access count badges
- [ ] By Person view groups correctly by company
- [ ] Grant Access auto-fills page_address (never typed manually)
- [ ] Framer sync banner appears only for Client Pages edits
- [ ] Cross-view navigation works (page card arrow → By Page, Other Pages → switches page)
- [ ] New page creates record with auto-slugified address
- [ ] `npx tsc --noEmit` exits 0
- [ ] Dark mode renders correctly (all CSS vars, no hardcoded colors)
