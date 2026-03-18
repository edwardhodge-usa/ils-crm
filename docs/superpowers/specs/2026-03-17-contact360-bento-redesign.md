# Contact 360 Bento Box Redesign

## Goal

Redesign the Contact360Page from a single-column 2000px scroll into a three-zone layout where primary info is always visible and only secondary details and timeline scroll.

## Current State

`src/components/contacts/Contact360Page.tsx` is a single scrollable column: hero (avatar + name + buttons), stats strip, contact info card, CRM info card, partner/vendor card, notes, opportunities list, interactions list, delete button. Approximately 2000px tall when all fields are populated.

## Design

### Zone 1: Hero Bar (fixed, ~90px)

Full-width card at the top of the detail pane. Never scrolls.

**Layout:** Horizontal flex — avatar left, identity center, stats right.

| Element | Spec |
|---------|------|
| Avatar | 56px circle, photo or initials. Clickable (existing photo menu) |
| Name | 15px, font-weight 600, `--text-primary` |
| Subtitle | 12px, `--text-secondary`. Format: `{title} · {company}`. Company is `--color-accent` (linked) |
| Action pills | Inline flex, 6px gap. Email (blue, label: "Email"), Phone (green, label: "Call" — dials `mobile_phone \|\| office_phone`), LinkedIn (cyan, label: "LinkedIn"). Short labels, NOT full values. Max-width 120px with ellipsis if needed. Tappable via existing `shell:openExternal` |
| Name resolution | Use existing fallback: `contact_name` -> `firstName + lastName` -> `'Unnamed Contact'` |
| Stats | Separated by `1px solid --separator-opaque` vertical line. Three stat cells: Open Opps (accent), Meetings (green), Days Since (orange). Each: value 17px bold, label 9px secondary below |

**Card style:** `--bg-secondary` background, 12px border-radius, `var(--shadow-sm)` shadow, 14px 18px padding.

### Zone 2: CRM Grouped Bento (fixed, auto height ~110-120px)

Two-column grid below the hero. Never scrolls.

**Left card — Grouped list (Apple HIG inset style):**

| Row | Label | Value |
|-----|-------|-------|
| 1 | Category | Badge pill (`--color-accent` tint) |
| 2 | Industry | Plain text |
| 3 | Lead Source | Plain text |

Card style: `--bg-secondary`, 10px radius, inset separators at `var(--separator)`.

**Right side — Two sub-zones stacked:**

Top: two stat cells side by side.

| Cell | Label | Value |
|------|-------|-------|
| Qualification | 9px uppercase label | 12px text value |
| Lead Score | 9px uppercase label | 18px bold number |

Bottom: Events tag strip — horizontal flex with colored event tag pills. `--bg-secondary` card, 10px radius.

### Zone 3: Bottom Split (fills remaining height)

CSS grid: `grid-template-columns: 280px 1fr`. Both columns scroll independently via `overflow-y: auto`.

**Left column — Detail cards:**

Card 0: "Company" — LinkedRecordPicker for `companies_ids` (editable, same component as current)

Card 1: "Details" grouped list
- Title, Office phone, Website (link color), Location (city + state)

Card 2: "Partner / Vendor" grouped list
- Partner Type, Partner Status, Quality Rating, Reliability Rating, Rate Info

Card 3: "Notes" card
- Editable textarea, `--bg-secondary`, 10px radius

**Right column — Timeline:**

Header: "Timeline" label left, filter pills right (Deals purple, Activity cyan — display only, no filtering in v1).

Timeline entries with vertical connector line (`1px solid var(--separator)`, positioned absolutely at left 9px).

Each entry:
- **Dot indicator:** 18px rounded-rect container with 6px colored circle inside. Purple (`#bf5af2`) for opportunities, cyan (`#5ac8fa`) for interactions.
- **Card:** `--bg-secondary`, 8px radius. Content varies by type.

Opportunity card:
- Row 1: Name (13px, 500 weight) + Value (12px, 600 weight, stage color) right-aligned
- Row 2: Stage badge (colored pill) + date

Interaction card:
- Row 1: Type + Subject (13px, 500 weight)
- Row 2: Summary snippet (12px, secondary color)
- Row 3: Date (11px, secondary)

**Tasks and Proposals:** The current page fetches linked tasks and proposals but they are NOT shown in the timeline (same as current — they have their own dedicated pages). The data fetching for tasks/proposals is kept for the stats computation (Open Opps count) but no UI cards are rendered for them in the timeline.

**Sort order:** Chronological descending (newest first). Opportunities sorted by `airtable_modified_at` field, interactions sorted by `date` field. Interleaved into one feed.

**Timeline cap:** Show up to 10 entries total (matching current 5+5 cap for opps+interactions). Add a "View all" link at the bottom if more exist.

**Empty state:** If no opportunities and no interactions, show a centered empty state: "No activity yet" with secondary text.

**Delete Contact:** Red text centered at the bottom of the right column, below all timeline entries.

**ConfirmDialog and error banner:** Positioned as fixed overlays on the detail pane container (same z-index behavior as current), outside both scroll areas.

### Separator between columns

`1px solid var(--separator)` border-left on the right column. 10px padding on each side of the separator.

## Field Mapping

All fields from the current Contact360Page must appear in the new layout. No fields are removed.

| Current Section | Fields | New Location |
|----------------|--------|-------------|
| Hero | Avatar, name, title, company | Zone 1: Hero bar |
| Hero actions | Email, Call, LinkedIn buttons | Zone 1: Action pills (show actual values) |
| Stats strip | Open Opps, Meetings, Days Since | Zone 1: Stats (right side of hero) |
| Contact Info | Company (linked) | Zone 1: Subtitle (display name, accent) + Zone 3 left: LinkedRecordPicker (editable) |
| Contact Info | Email, Mobile, LinkedIn | Zone 1: Action pills |
| Contact Info | Title | Zone 3 left: Details card |
| Contact Info | Office phone, Website, City, State, Country | Zone 3 left: Details card |
| CRM Info | Categorization | Zone 2: Left grouped list |
| CRM Info | Industry, Lead Source | Zone 2: Left grouped list |
| CRM Info | Qualification Status | Zone 2: Right stat cell |
| CRM Info | Lead Score | Zone 2: Right stat cell |
| CRM Info | Event Tags | Zone 2: Right events strip |
| CRM Info | Last Contact Date | Zone 1: Stats ("Days Since" computed) |
| Partner/Vendor | All 5 fields | Zone 3 left: Partner card |
| Notes | Notes textarea | Zone 3 left: Notes card |
| Opportunities | Linked opportunity rows | Zone 3 right: Timeline (purple) |
| Interactions | Linked interaction rows | Zone 3 right: Timeline (cyan) |
| Delete | Delete Contact button | Zone 3 right: Bottom of timeline |

## Files to Modify

- `src/components/contacts/Contact360Page.tsx` — primary restructure
- `src/components/contacts/ContactStats.tsx` — integrate into hero bar (may remove standalone component)

No new files needed unless extracting the grouped bento as a shared component (optional, scope for future).

## Inline Editing

All `EditableFormRow` instances remain. The click-to-edit behavior is unchanged. Only the visual layout and grouping changes.

## Reusable Pattern (future)

The "grouped bento" pattern (list card + stat cells + tag strip) should be considered for:
- Company360Page
- DealDetail
- ProjectDetail

This spec does not implement those. They would be separate tasks.

## Out of Scope

- No data model changes
- No new IPC handlers
- No Swift app changes (Swift Contact360 is a separate future task)
- No timeline filtering (filter pills are display-only labels in v1)
- No drag-to-reorder or collapsible sections
