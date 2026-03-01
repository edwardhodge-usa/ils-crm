# ILS CRM — Rebuild Design Doc
**Date:** 2026-03-01
**Status:** Approved — ready for implementation planning
**Scope:** Full clean-slate rewrite of both `src/` (frontend) and `electron/` (backend)

---

## 1. Platform Decision

**Keep Electron.** Timeline is weeks-to-months, scale is 2–10 employees. Electron auto-update via `electron-updater` solves the distribution problem. SwiftUI is planned as V2 once real user feedback exists from this version.

---

## 2. Visual Language

### Color Mode
Both dark and light modes supported. System preference respected via `prefers-color-scheme`. User can override in Settings.

### Accent Color
`systemIndigo` — #5856D6 (light) / #5E5CE6 (dark). White text on solid indigo = 5.6:1 ✅

### Dark Mode Backgrounds
| Surface | Value |
|---------|-------|
| Window | #0D0D0F |
| Sidebar | #111115 |
| Cards / inputs | rgba(255,255,255,0.07) on window |
| Sheet | #1A1A20 |

### Light Mode Backgrounds
| Surface | Value |
|---------|-------|
| Window | #F5F5F5 |
| Sidebar | rgba(235,235,235,0.88) |
| Cards / inputs | rgba(0,0,0,0.04) on window |
| Sheet | #FFFFFF |

### Verified Contrast Scale (WCAG AA)
| Role | Dark | Light | Ratio |
|------|------|-------|-------|
| Primary text | rgba(255,255,255,0.92) | rgba(0,0,0,0.85) | 14–16:1 ✅ |
| Secondary text | rgba(255,255,255,0.65) | rgba(0,0,0,0.60) | 7–8:1 ✅ |
| Tertiary text | rgba(255,255,255,0.55) | rgba(0,0,0,0.55) | 5–6:1 ✅ |
| Section labels (bold uppercase) | rgba(255,255,255,0.42) | rgba(0,0,0,0.52) | 4.1:1 ✅ |
| Stage badge text (colored, on tinted bg) | solid stage color | darker stage variant | 4.7–6.7:1 ✅ |

**Rule:** Run Node.js contrast pre-check before every new mockup or component. No exceptions.

### Stage Colors
| Stage | Dark text | Light text | Dot |
|-------|-----------|------------|-----|
| Prospecting | #5AC8FA | #006A96 | #5AC8FA |
| Qualified | #A5A3FF | #4847A8 | #5E5CE6 |
| Proposal Sent | #FF9500 | #A04B00 | #FF9500 |
| Negotiation | #FF375F | #A0002A | #FF375F |
| Closed Won | #30D158 | #1A7834 | #30D158 |

Badge pattern: `background: rgba(R,G,B,0.15); color: <stage-color>` — verified passing on both dark and light card backgrounds.

---

## 3. Layout Architecture

### Global Shell
```
┌──────────────┬────────────────────────────────────────────┐
│   Sidebar    │              Content Area                  │
│   192px      │   (changes per view — see below)           │
│              │                                            │
└──────────────┴────────────────────────────────────────────┘
```

### Default: 3-Column (all views except Pipeline)
```
┌──────────────┬──────────────┬────────────────────────────┐
│   Sidebar    │  List Pane   │       Detail Panel         │
│   192px      │   240px      │          flex-1            │
└──────────────┴──────────────┴────────────────────────────┘
```
Clicking a list row instantly loads detail in the right panel — no page navigation.

### Exception: Pipeline (Full-Width Kanban)
```
┌──────────────┬────────────────────────────────────────────┐
│   Sidebar    │     Kanban Board (horizontal scroll)       │
│   192px      │  + Slide-in detail panel (300px, overlay) │
└──────────────┴────────────────────────────────────────────┘
```
Kanban earns the full-width exception because stage distribution is the primary insight. All other views stay 3-column.

---

## 4. Sidebar Navigation

```
Dashboard
─────────────────
PEOPLE
  Contacts
  Companies
─────────────────
WORK
  Pipeline
  RFQs
  Projects
  Proposals
  Contracts
─────────────────
ACTIVITY
  Tasks
  Interactions
─────────────────
TOOLS
  Imported Contacts
  Portal Access
─────────────────
[Settings — pinned bottom]
```

Active item: indigo background + white text (focused) / gray background (unfocused window).

---

## 5. Views

### Dashboard
- **Stat cards:** Tasks Due Today · Follow-ups Due · Active Contracts ($) · Open Proposals (count)
- **Pipeline widget:** Configurable in Settings (3 modes: Active Opportunities / Active Contracts / Completed + Active Contracts total value)
- **Quick actions:** New Contact, Log Interaction, New Deal

### Contacts
- **List row (3 lines):**
  - Line 1: Rating dot + Full name
  - Line 2: Job Title · Company name
  - Line 3: Specialty tag (color-coded) + Days-since-contact badge
- **Detail panel (Variant A — Actions First):**
  Hero block → Quick actions (Log Interaction, Add to Opportunity, Email) → Stats strip (open opps, meetings, days since contact) → Contact fields → Open Opportunities → Recent Interactions

### Companies
- 3-column, similar pattern to Contacts
- Detail: company stats, linked contacts list, open opportunities

### Pipeline
- Full-width Kanban board
- 5 stage columns, each 232px wide, horizontal scroll
- Card: company name, deal name, value (large), probability badge, days in stage
- Click card → 300px slide-in panel from right (deal detail, actions, linked contact, tasks)
- Column footer shows total $ value per stage

### Other Views (RFQs, Projects, Proposals, Contracts, Tasks, Interactions)
- All use 3-column layout
- List: relevant summary fields + status badge
- Detail: entity-specific fields + linked records + open tasks

---

## 6. Quick Entry Sheets

All sheets follow Apple HIG: **size to content, no forced scrolling.**

### New Contact
Fields in order: First Name + Last Name · Company · Title + Categorization · Email + Mobile · LinkedIn · Specialties (tags) · Event / Where We Met · Quality Rating (5-dot) · Notes

### New Deal
Fields: Deal Name · Company + Contact · Value + Close Date · Stage (segmented control, 5 stages) · Probability (auto-calculated from stage, editable) · Deal Type

### Log Interaction
Fields: Type (Call / Meeting / Email / Text / Other — icon buttons) · Contact(s) (chips) · Date + Duration · Notes · Follow-up task toggle (expands inline to: task name, due date, priority — no second sheet)

---

## 7. Design Principles

1. **Contrast-first.** Every text element pre-checked against its background before writing any component. No exceptions.
2. **Airtable is the single source of truth.** Every app field maps to an Airtable field. No local-only data.
3. **3-column consistency.** Only Pipeline earns a full-width exception; it earns it because stage distribution is the core insight.
4. **Sheets size to content.** Apple HIG: avoid `max-height` caps that force scrolling when content fits naturally.
5. **No page navigation.** Clicking a list row loads the 360 detail panel instantly — the list stays visible.
6. **Stage colors are semantic.** Each pipeline stage has a consistent color used across all views (list badge, kanban header, detail badge, form segment).

---

## 8. Technical Architecture

### Stack (unchanged from current)
- Electron + React + TypeScript + Vite
- Tailwind CSS (utility classes) + custom design tokens
- sql.js (SQLite in-memory, persisted to disk)
- Airtable REST API via sync engine

### Key Architecture Rules (from lessons learned)
- IPC handlers registered AFTER `await initDatabase()` — never before
- Mutex guard (`isSyncing`) on sync engine — no race conditions
- `safeParseArray()` helper for all JSON-parsed multi-select / linked record fields
- Column names validated against whitelist before SQL interpolation
- No `saveDatabase()` per-write — rely on 30s auto-save + explicit save at sync end
- Pull sync checks `_pending_push` before deleting local records

### Field Mapping Rule
When adding any new UI field:
1. Confirm it exists in Airtable (check schema snapshot)
2. If not, create it via Airtable API or UI
3. Add to `field-maps.ts` + `converters.ts`
4. Mark as `readonly` if it's a lookup/rollup (server-resolved, not pushable)

---

## 9. Mockup Reference Files
All approved mockups archived in `/Desktop/CLAUDE MOCKUPS/`:
- `ils-crm-style-options.html` — A/C style selection
- `ils-crm-dashboard-v3.html` — Dashboard (approved)
- `ils-crm-contacts.html` — Contacts list + detail Variant A (approved)
- `ils-crm-pipeline.html` — Pipeline Option 1 Kanban (approved)
- `ils-crm-forms.html` — New Contact, New Deal, Log Interaction sheets (approved)
