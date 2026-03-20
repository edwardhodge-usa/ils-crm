# Bento Detail View Redesign — Design Spec

> Redesign all CRM detail views (Contact, Company, Proposal, Task, Portal) from flat-scroll layouts to Apple-inspired bento box card grids.

## Problem

Current detail views suffer from:
- Content lost in scroll (related records, actions below the fold)
- No visual hierarchy (metadata and relationships treated equally)
- Contact detail: 25+ fields crammed into a 270px left column with 6 sections
- Company detail: single scroll with 9 Company Info fields pushing Contacts/Opps below fold
- Proposal detail: $value buried as 3rd field in a 7-field list, empty textareas waste space
- Portal detail: opens as sheet (loses list context), toggle states buried in field rows
- Partner/Vendor section shows 5 empty fields for non-vendor contacts

## Design Pattern

All views follow a consistent **Hero + Bento Grid** pattern:

1. **Hero Card** (fixed, always visible) — avatar/icon, name, subtitle, action pills, key stats
2. **Bento Grid** (full-width 2-column cards) — grouped by topic, most important info first
3. **Empty sections hidden** — don't show cards with no data (e.g., Partner/Vendor for Clients)

No split views. Full-width cards eliminate narrow column cramming.

## Typography (app-wide)

| Element | Size | Weight |
|---------|------|--------|
| Hero name | 16px | 600 |
| Hero subtitle | 12px | 400 |
| Card title (uppercase) | 11px | 700 |
| Field labels | 13px | 400 |
| Field values | 13px | 400 |
| Pills/badges | 12px | 600 |
| Chips (linked records) | 12px | 600 |
| Notes text | 13px | 400 |
| Toggle labels | 13px | 400 |
| Hero stat values | 18px | 700 |
| Hero stat labels | 10px | 600 |

Pill/badge background opacity: 0.18 (not 0.12 — better dark mode contrast).

## View Designs

### 1. Contact Detail

**Hero:** Avatar (56px circle) + name + "Title . Company" + Email/Call/LinkedIn pills + stats (Open Opps, Last Contact days, Lead Score)

**Row 1 (2-col):**
- **CRM Status** — Category (pill), Qualification (pill), Industry, Lead Source, Events (chips)
- **Contact & Location** — Email, Mobile, Office, Title, Location (city+state)

**Row 2 (2-col):**
- **Open Deals** — inline deal cards with name, stage pill, value
- **Notes** — text area + Company chip below divider

**Conditional sections:**
- Partner/Vendor card only shows if contact has `partnerType` or `partnerStatus` set
- Timeline/interactions not in bento — moved to deals card inline

### 2. Company Detail

**Hero:** Logo avatar (square, 10px radius) + name + "Industry . Location" + Website/Call pills + stats (People, Active Deals, Pipeline $)

**Row 1 (2-col):**
- **People** — contact rows with 30px avatar, name, title, dividers between rows
- **Active Deal** — deal name, stage pill, value + Projects chips below divider

**Row 2 (2-col):**
- **Company Details** — Industry, Size, Revenue, Founded, Lead Source
- **Location & Contact** — Address, City, Phone, Website

### 3. Proposal Detail

**Hero:** Name + "Company . Contact" subtitle + status/expiry/version pills + big $value stat (22px)

**Row 1 (3-col stat cards):**
- **Sent** — date, centered
- **Expires** — date (orange if near), centered
- **Approval** — status pill, centered

**Row 2 (3-col):**
- **Notes** — editable text
- **Scope Summary** — editable text (separate from Notes)
- **Linked** — Opportunity chip, Company chip, Contact chip

**Row 3 (full-width):**
- **Client Feedback** — editable text, italic placeholder when empty

### 4. Task Detail

**Hero:** Checkbox circle + task name + priority/status/type pills + stats (Overdue days, Assigned initials)

**Row 1 (2-col):**
- **Schedule** — Due Date, Status, Completed
- **Notes** — editable text

**Row 2 (2-col):**
- **Linked Records** — Opportunities, Contacts, Projects, Proposals as chips
- **Actions** — Complete/Delete buttons + created/modified metadata

### 5. Portal — By Page View

**Navigation:** Page sidebar (left, 250px) with health dots + page list

**Detail (right):**

**Hero:** Page avatar (square) + page name + slug subtitle + Live/Open pills + stats (People count, Videos On ratio)

**URL Bar:** Full portal URL + Open button

**Row 1 (2-col):**
- **Page Content** (stacked label-above-value text fields) — Page Title, Subtitle, Prepared For, Thank You, Deck URL. Each field has label above and value in an input-style bordered box.
- **Section Toggles** — Video Sections (4 macOS-style switches: Practical Magic, Highlights, 360, Full Length) + Page Sections (4 switches: Header, Photos, Team, Testimonials). Grouped with sub-headers.

**Row 2 (full-width):**
- **People with Access** — header with count + "Grant Access" button. Each person row: 32px avatar, name, "Company . email" subtitle, Stage pill, short date, **Revoke** button (red). Shows people from different companies on the same page.

### 6. Portal — By Person View

**Navigation:** Person sidebar (left, 250px) grouped by company with page count badges

**Detail (right):**

**Hero:** Person avatar + name + "Company . Title . email" + Email/LinkedIn pills + stats (page count)

**Per-page access cards** (one card per page the person has access to):
- Card header: page name + slug + ACTIVE pill + "View Page" link + **Revoke** button
- 2-col grid inside: Stage/Budget/Services (left), Follow Up/Added/Expected Start (right)

**Notes** (full-width): person-level notes

**Key architectural rule:** Section toggles (V-PrMagic, V-HighLight, etc.) belong to ClientPage, NOT PortalAccessRecord. Toggles only appear in By Page view. By Person shows per-person access details (stage, budget, services, dates) for each page they're on.

## Shared Components

All views use these shared SwiftUI components:

| Component | Purpose |
|-----------|---------|
| `BentoHeroCard` | Hero bar with avatar, info, pills, stats |
| `BentoCell` | Rounded card with title + content |
| `BentoGrid` | CSS Grid wrapper (2-col, 3-col variants) |
| `BentoFieldRow` | Label + value row inside a cell |
| `BentoToggleRow` | Label + macOS Toggle switch |
| `BentoChip` | Linked record chip (blue, tappable) |
| `BentoPill` | Status/category badge (colored bg) |
| `BentoTextInput` | Stacked label-above-value editable field |

These replace the current `DetailSection`, `DetailFieldRow`, `EditableFieldRow` pattern while keeping the same click-to-edit inline behavior.

## Interaction Model

- All field values are **click-to-edit** (existing behavior preserved)
- Toggles use native SwiftUI `Toggle` with `.switch` style
- Linked record chips are tappable (navigate to that record)
- "View Page" in By Person cross-navigates to By Page view
- "Revoke" shows confirmation dialog before deleting the PortalAccessRecord
- "Grant Access" opens the existing GrantAccessSheet

## What's NOT Changing

- Sidebar navigation (left column with filter tabs)
- List column (middle column with search + record list)
- Form sheets (create/edit still open as sheets)
- Sync engine, data models, converters
- Dashboard, Pipeline/Kanban, Interactions views

## Mockup Reference

Interactive HTML mockup: `.superpowers/brainstorm/55177-1773989166/detail-redesign-v2.html`
Open with: `open -a "Google Chrome" .superpowers/brainstorm/55177-1773989166/detail-redesign-v2.html`
