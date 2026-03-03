# ILS CRM Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean-slate rewrite of the ILS CRM Electron app with best-in-class Apple HIG-compliant UI, replacing all of `src/` and hardening `electron/`.

**Architecture:** 3-column layout (Sidebar 192px + List 240px + Detail flex-1) with Pipeline as the sole full-width Kanban exception. Electron backend stays (sync engine already fixed); frontend is a complete rewrite using the approved design system. All data continues to flow through sql.js local cache ↔ Airtable sync.

**Tech Stack:** Electron 28 · React 18 · TypeScript · Vite · Tailwind CSS · sql.js · Airtable REST API

**Design spec:** `docs/plans/2026-03-01-ils-crm-rebuild-design.md`
**Approved mockups:** `/Desktop/CLAUDE MOCKUPS/ils-crm-*.html`

---

## Setup

### Task 0: Create rebuild branch + install Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Create feature branch**
```bash
git checkout -b feature/rebuild-v2
```

**Step 2: Install Vitest + testing library**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Create vitest config**
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

**Step 4: Create test setup file**
```ts
// src/test-setup.ts
import '@testing-library/jest-dom'
```

**Step 5: Add test script to package.json**
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 6: Verify type check still passes**
```bash
npx tsc --noEmit
```
Expected: no errors

**Step 7: Commit**
```bash
git add package.json vitest.config.ts src/test-setup.ts
git commit -m "chore: add Vitest + testing-library for rebuild"
```

---

## Phase 1: Design System

### Task 1: Replace design tokens

The existing `src/styles/tokens.css` and `reset.css` are from the old design. Replace them entirely with the approved specs.

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/reset.css`
- Modify: `src/styles/globals.css`

**Step 1: Replace tokens.css**

Replace the full file with the approved token set from the design doc. Key values:

```css
/* src/styles/tokens.css */
:root {
  /* Accent — systemIndigo */
  --color-accent: #5856D6;
  --color-accent-dark: #5E5CE6;
  --color-accent-hover: #4847B8;
  --color-accent-translucent: rgba(88,86,214,0.15);

  /* Backgrounds — Light */
  --bg-window: #F5F5F5;
  --bg-sidebar: rgba(235,235,235,0.88);
  --bg-card: rgba(0,0,0,0.04);
  --bg-input: rgba(0,0,0,0.04);
  --bg-hover: rgba(0,0,0,0.05);
  --bg-sheet: #FFFFFF;

  /* Text — Light (verified WCAG AA) */
  --text-primary: rgba(0,0,0,0.85);      /* 15:1 */
  --text-secondary: rgba(0,0,0,0.60);    /* 5.7:1 */
  --text-tertiary: rgba(0,0,0,0.55);     /* 5.1:1 */
  --text-label: rgba(0,0,0,0.52);        /* bold uppercase: 3.8:1 */
  --text-placeholder: rgba(0,0,0,0.32);  /* placeholder — informational */

  /* Separators */
  --separator: rgba(0,0,0,0.08);
  --separator-strong: rgba(0,0,0,0.12);

  /* Stage colors — Light */
  --stage-prospecting: #006A96;
  --stage-qualified: #4847A8;
  --stage-proposal: #A04B00;
  --stage-negotiation: #A0002A;
  --stage-won: #1A7834;

  /* Semantic */
  --color-red: #FF3B30;
  --color-green: #34C759;
  --color-orange: #FF9500;

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;

  /* Radii */
  --radius-sm: 4px;  --radius-md: 8px;
  --radius-lg: 12px; --radius-xl: 14px;

  /* Timing */
  --ease-standard: cubic-bezier(0.25,0.46,0.45,0.94);
  --ease-decelerate: cubic-bezier(0,0,0.2,1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
}

/* Dark mode overrides */
.dark, [data-theme="dark"] {
  --color-accent: #5E5CE6;
  --color-accent-hover: #7270F0;
  --color-accent-translucent: rgba(94,92,230,0.20);

  --bg-window: #0D0D0F;
  --bg-sidebar: #111115;
  --bg-card: rgba(255,255,255,0.07);
  --bg-input: rgba(255,255,255,0.07);
  --bg-hover: rgba(255,255,255,0.06);
  --bg-sheet: #1A1A20;

  --text-primary: rgba(255,255,255,0.92);
  --text-secondary: rgba(255,255,255,0.65);
  --text-tertiary: rgba(255,255,255,0.55);
  --text-label: rgba(255,255,255,0.42);
  --text-placeholder: rgba(255,255,255,0.28);

  --separator: rgba(255,255,255,0.08);
  --separator-strong: rgba(255,255,255,0.12);

  --stage-prospecting: #5AC8FA;
  --stage-qualified: #A5A3FF;
  --stage-proposal: #FF9500;
  --stage-negotiation: #FF375F;
  --stage-won: #30D158;
}
```

**Step 2: Replace reset.css** — use the HIG toolkit reset verbatim (see apple-hig skill Section 4a). Key additions for this app:
```css
/* Add after existing reset: */
button { cursor: default; } /* macOS never uses pointer on buttons */
```

**Step 3: Update globals.css** — remove any old color references, ensure tokens are imported first.

**Step 4: Wire dark mode to system preference in App.tsx**
```tsx
// src/App.tsx — add at top of component
useEffect(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = (e: MediaQueryListEvent | MediaQueryList) => {
    document.documentElement.classList.toggle('dark', e.matches)
  }
  apply(mq)
  mq.addEventListener('change', apply)
  return () => mq.removeEventListener('change', apply)
}, [])
```

**Step 5: Type check**
```bash
npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add src/styles/
git commit -m "feat: replace design tokens with approved HIG system (indigo accent, dark/light)"
```

---

### Task 2: Build shared UI primitives

These are used everywhere — build them once, right.

**Files:**
- Create: `src/components/shared/Badge.tsx`
- Create: `src/components/shared/StageBadge.tsx`
- Create: `src/components/shared/RatingDots.tsx`
- Create: `src/components/shared/Avatar.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/index.ts`
- Create: `src/components/shared/Badge.test.tsx`

**Step 1: Write failing test for Badge**
```tsx
// src/components/shared/Badge.test.tsx
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

test('renders children with correct stage color class', () => {
  render(<Badge variant="proposal">Proposal Sent</Badge>)
  const badge = screen.getByText('Proposal Sent')
  expect(badge).toBeInTheDocument()
  expect(badge).toHaveClass('badge--proposal')
})
```

**Step 2: Run to confirm fail**
```bash
npm test -- Badge
```

**Step 3: Implement Badge**
```tsx
// src/components/shared/Badge.tsx
type BadgeVariant = 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  prospecting: 'bg-[rgba(90,200,250,0.15)] text-[var(--stage-prospecting)]',
  qualified:   'bg-[rgba(94,92,230,0.15)] text-[var(--stage-qualified)]',
  proposal:    'bg-[rgba(255,149,0,0.15)] text-[var(--stage-proposal)]',
  negotiation: 'bg-[rgba(255,55,95,0.15)] text-[var(--stage-negotiation)]',
  won:         'bg-[rgba(48,209,88,0.15)] text-[var(--stage-won)]',
  default:     'bg-[var(--bg-card)] text-[var(--text-secondary)]',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge--${variant} inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
```

**Step 4: Implement StageBadge** (wraps Badge with stage name + dot)
```tsx
// src/components/shared/StageBadge.tsx
import { Badge } from './Badge'
type Stage = 'Prospecting' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Closed Won'
const stageToVariant = {
  'Prospecting': 'prospecting', 'Qualified': 'qualified',
  'Proposal Sent': 'proposal', 'Negotiation': 'negotiation', 'Closed Won': 'won'
} as const

export function StageBadge({ stage }: { stage: Stage }) {
  const variant = stageToVariant[stage] ?? 'default'
  return <Badge variant={variant as any}>{stage}</Badge>
}
```

**Step 5: Implement RatingDots** (5-dot quality rating)
```tsx
// src/components/shared/RatingDots.tsx
export function RatingDots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < value ? 'bg-[var(--color-accent)]' : 'bg-[var(--bg-card)]'}`} />
      ))}
    </div>
  )
}
```

**Step 6: Implement Avatar** (initials from name, consistent indigo bg)
```tsx
// src/components/shared/Avatar.tsx
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)] font-bold flex items-center justify-center flex-shrink-0">
      {initials(name)}
    </div>
  )
}
```

**Step 7: Run tests**
```bash
npm test
```
Expected: all pass

**Step 8: Commit**
```bash
git add src/components/shared/
git commit -m "feat: add Badge, StageBadge, RatingDots, Avatar shared primitives"
```

---

## Phase 2: App Shell

### Task 3: Rebuild the app shell (window + sidebar + routing)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/config/routes.ts`

**Step 1: Update routes.ts** — ensure these nav items exist with correct paths:
```ts
// src/config/routes.ts
export const NAV_SECTIONS = [
  { label: null, items: [{ id: 'dashboard', label: 'Overview', path: '/', icon: 'grid' }] },
  { label: 'People', items: [
    { id: 'contacts', label: 'Contacts', path: '/contacts', icon: 'person' },
    { id: 'companies', label: 'Companies', path: '/companies', icon: 'building' },
  ]},
  { label: 'Work', items: [
    { id: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: 'chart-bar' },
    { id: 'rfqs', label: 'RFQs', path: '/rfqs', icon: 'list' },
    { id: 'projects', label: 'Projects', path: '/projects', icon: 'folder' },
    { id: 'proposals', label: 'Proposals', path: '/proposals', icon: 'doc-check' },
    { id: 'contracts', label: 'Contracts', path: '/contracts', icon: 'clock' },
  ]},
  { label: 'Activity', items: [
    { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'checkbox' },
    { id: 'interactions', label: 'Interactions', path: '/interactions', icon: 'bubble' },
  ]},
  { label: 'Tools', items: [
    { id: 'imported', label: 'Imported Contacts', path: '/imported', icon: 'inbox' },
    { id: 'portal', label: 'Portal Access', path: '/portal', icon: 'lock' },
  ]},
] as const
```

**Step 2: Rebuild Sidebar.tsx** using the new design tokens. Key styles:
```tsx
// Sidebar container
className="w-[192px] flex-shrink-0 flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--separator)] pt-[44px] overflow-y-auto overflow-x-hidden"

// Section label
className="text-[10px] font-semibold text-[var(--text-label)] uppercase tracking-[0.06em] px-3 pt-4 pb-1"

// Nav item (default)
className="flex items-center gap-2 px-2.5 py-[5px] mx-1.5 rounded-lg text-[13px] text-[var(--text-secondary)] cursor-default transition-colors duration-150 hover:bg-[var(--bg-hover)]"

// Nav item (active)
className="... bg-[var(--color-accent-translucent)] text-[var(--color-accent)] font-medium"
```

**Step 3: Rebuild Layout.tsx** — 3-column shell. Pipeline gets special treatment (no list pane):
```tsx
// src/components/layout/Layout.tsx
// The Layout wraps: <Sidebar /> + <Outlet /> (react-router)
// Non-pipeline routes render: ListPane + DetailPane
// Pipeline route renders: full-width KanbanBoard
```

**Step 4: Type check + visual smoke test**
```bash
npx tsc --noEmit && npm run dev
```
Expected: app opens, sidebar visible with correct sections, routing works

**Step 5: Commit**
```bash
git add src/App.tsx src/components/layout/ src/config/routes.ts
git commit -m "feat: rebuild app shell with new sidebar nav + 3-column layout"
```

---

## Phase 3: Contacts View

### Task 4: Contacts list pane

**Files:**
- Modify: `src/components/contacts/ContactList.tsx`
- Create: `src/components/contacts/ContactRow.tsx`
- Create: `src/components/contacts/ContactRow.test.tsx`

**Step 1: Write failing test**
```tsx
// src/components/contacts/ContactRow.test.tsx
import { render, screen } from '@testing-library/react'
import { ContactRow } from './ContactRow'

const mockContact = {
  id: '1', firstName: 'Eric', lastName: 'Gutierrez',
  jobTitle: 'SVP Production', companyName: 'Broadway Capital',
  qualityRating: 3, specialtyNames: ['Broadway Producer'],
  specialtyColors: ['indigo'], daysSinceContact: 8,
}

test('renders name, role, company, specialty, days badge', () => {
  render(<ContactRow contact={mockContact} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Eric Gutierrez')).toBeInTheDocument()
  expect(screen.getByText(/SVP Production/)).toBeInTheDocument()
  expect(screen.getByText('Broadway Capital')).toBeInTheDocument()
  expect(screen.getByText('Broadway Producer')).toBeInTheDocument()
  expect(screen.getByText('8d')).toBeInTheDocument()
})
```

**Step 2: Run to confirm fail**
```bash
npm test -- ContactRow
```

**Step 3: Implement ContactRow**

3-line row structure per design doc:
- Line 1: `<RatingDots value={qualityRating} />` + `firstName lastName`
- Line 2: `jobTitle · companyName`
- Line 3: specialty tag(s) + `Xd` days badge (right-aligned)

```tsx
// src/components/contacts/ContactRow.tsx
import { RatingDots } from '../shared'
import type { ContactListItem } from '../../types'

interface Props {
  contact: ContactListItem
  isSelected: boolean
  onClick: () => void
}

export function ContactRow({ contact, isSelected, onClick }: Props) {
  const { firstName, lastName, jobTitle, companyName, qualityRating,
          specialtyNames, specialtyColors, daysSinceContact } = contact

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 cursor-default border-b border-[var(--separator)] transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: rating + name */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <RatingDots value={qualityRating} />
        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
          {firstName} {lastName}
        </span>
      </div>
      {/* Line 2: title · company */}
      <div className="text-[11px] text-[var(--text-secondary)] mb-1 truncate">
        {jobTitle}{jobTitle && companyName ? ' · ' : ''}{companyName}
      </div>
      {/* Line 3: specialty + days */}
      <div className="flex items-center gap-1.5">
        {specialtyNames[0] && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)]">
            {specialtyNames[0]}
          </span>
        )}
        {daysSinceContact !== null && (
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
            {daysSinceContact}d
          </span>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Run tests**
```bash
npm test -- ContactRow
```
Expected: PASS

**Step 5: Build ContactList.tsx** — wraps ContactRow list, handles loading/empty states, search input at top.

**Step 6: Add `ContactListItem` type to `src/types/index.ts`** if not already there.

**Step 7: Type check**
```bash
npx tsc --noEmit
```

**Step 8: Commit**
```bash
git add src/components/contacts/
git commit -m "feat: rebuild contacts list pane with 3-line rows (rating, specialty, days)"
```

---

### Task 5: Contact 360 detail panel (Variant A — Actions First)

**Files:**
- Modify: `src/components/contacts/ContactDetail.tsx`
- Create: `src/components/contacts/ContactActions.tsx`
- Create: `src/components/contacts/ContactStats.tsx`

**Step 1: Build ContactDetail layout** — sections in this order:
1. **Hero block**: Avatar (48px) + name (16px bold) + title · company + specialty tags
2. **Action buttons row**: "Log Interaction" · "Add to Opportunity" · "Email" (3 equal ghost buttons)
3. **Stats strip**: 3 stat chips — open opps count, total meetings, days since contact
4. **Contact Info section**: Email (clickable mailto), Mobile, LinkedIn (clickable), Categorization badge, Event Tags
5. **Open Opportunities section**: Up to 3 deal cards (deal name, value, stage badge, days)
6. **Recent Interactions section**: Timeline list (type icon + date + note preview)

Key CSS pattern for each section:
```tsx
// Section wrapper
<div className="px-4 py-3 border-b border-[var(--separator)]">
  <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-label)] mb-2">
    Section Title
  </div>
  {/* content */}
</div>
```

**Step 2: Stats strip component**
```tsx
// src/components/contacts/ContactStats.tsx
interface Stat { label: string; value: string | number }
export function ContactStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[var(--separator)]">
      {stats.map(s => (
        <div key={s.label} className="flex-1 text-center">
          <div className="text-[15px] font-bold text-[var(--text-primary)]">{s.value}</div>
          <div className="text-[10px] text-[var(--text-tertiary)]">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Wire to data** — `ContactDetail` receives a full contact object from the contacts query. Opportunities and interactions come from linked record lookups already available in the database.

**Step 4: Type check + smoke test**
```bash
npx tsc --noEmit && npm run dev
```

**Step 5: Commit**
```bash
git add src/components/contacts/
git commit -m "feat: Contact 360 detail panel (Variant A — actions first)"
```

---

## Phase 4: Pipeline — Kanban

### Task 6: Full-width Kanban board

**Files:**
- Modify: `src/components/pipeline/PipelineView.tsx`
- Create: `src/components/pipeline/KanbanBoard.tsx`
- Create: `src/components/pipeline/KanbanColumn.tsx`
- Create: `src/components/pipeline/DealCard.tsx`
- Create: `src/components/pipeline/DealCard.test.tsx`

**Step 1: Write failing test for DealCard**
```tsx
test('renders company, deal name, value, probability, days', () => {
  render(<DealCard deal={mockDeal} isSelected={false} onClick={() => {}} />)
  expect(screen.getByText('Broadway Capital Group')).toBeInTheDocument()
  expect(screen.getByText('Times Square Renovation')).toBeInTheDocument()
  expect(screen.getByText('$480,000')).toBeInTheDocument()
  expect(screen.getByText('65%')).toBeInTheDocument()
  expect(screen.getByText('8d')).toBeInTheDocument()
})
```

**Step 2: Implement DealCard**

Card structure (per approved mockup):
- Company name (11px semibold, secondary)
- Deal name (12px medium, primary, 2-line max)
- Value (15px bold, primary, letter-spacing -0.3px)
- Bottom row: probability Badge (stage variant) + days (right-aligned)

Selected state: `border-[var(--color-accent)] shadow-[0_0_0_1px_var(--color-accent-translucent)]`

**Step 3: Implement KanbanColumn**

```tsx
// KanbanColumn receives: stageName, stageVariant, deals[], selectedDealId, onSelectDeal
// Structure:
// - Header: colored dot + stage name (uppercase bold) + count badge + column total ($)
// - Scrollable card list
// - "+ Add deal" dashed button at bottom
```

Stage dot colors come from CSS variables `--stage-{variant}`.

**Step 4: Implement KanbanBoard**

```tsx
// KanbanBoard: horizontally scrolling flex container
// 5 KanbanColumn children, each 232px wide
// Overflow-x: auto with custom scrollbar (6px, subtle)
// Padding: 16px all sides
```

**Step 5: PipelineView layout** — no list pane, board fills content area:
```tsx
// PipelineView
// - Toolbar: "Pipeline" title + filter pills (All Active, Mine, Q1 2026) + "+ New Deal" button
// - KanbanBoard (flex: 1)
// - Slide-in DealDetail panel (300px, position: absolute right-0, shown when deal selected)
```

**Step 6: @dnd-kit drag behavior** — use delay-based activation (not distance) to distinguish click from drag:
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { delay: 150, tolerance: 5 }, // click vs drag
  })
)
```

**Step 7: Run tests**
```bash
npm test
npx tsc --noEmit
```

**Step 8: Commit**
```bash
git add src/components/pipeline/
git commit -m "feat: rebuild Pipeline as full-width Kanban with slide-in deal detail"
```

---

### Task 7: Deal detail slide-in panel

**Files:**
- Create: `src/components/pipeline/DealDetail.tsx`
- Create: `src/components/pipeline/StageProgress.tsx`

**Step 1: Implement StageProgress** (5-step progress bar)
```tsx
const STAGES = ['Prospecting','Qualified','Proposal Sent','Negotiation','Closed Won']
export function StageProgress({ currentStage }: { currentStage: string }) {
  const idx = STAGES.indexOf(currentStage)
  return (
    <div className="flex gap-1">
      {STAGES.map((s, i) => (
        <div key={s} className={`flex-1 h-[3px] rounded-full ${
          i < idx ? 'bg-[var(--color-accent)]' :
          i === idx ? 'bg-[var(--color-accent)] opacity-50' :
          'bg-[var(--separator-strong)]'
        }`} />
      ))}
    </div>
  )
}
```

**Step 2: Implement DealDetail panel** — sections:
1. Stage badge + deal name + company · contact
2. Value ($480,000, 26px bold)
3. StageProgress
4. Probability · weighted value · days in stage (11px row)
5. Actions: "Log Activity" · "Edit Deal" · "Email"
6. Contact section: Avatar chip + name + title
7. Details section: Close date, Source, Deal Type
8. Open Tasks section: checkbox rows with due dates

**Step 3: Slide-in animation** — panel slides in from right edge of PipelineView:
```css
/* position: absolute, top: 44px (below toolbar), right: 0, bottom: 0, width: 300px */
/* transition: transform 250ms var(--ease-decelerate) */
/* hidden: translateX(100%) */
/* visible: translateX(0) */
```

**Step 4: Type check + smoke test**
```bash
npx tsc --noEmit && npm run dev
```

**Step 5: Commit**
```bash
git add src/components/pipeline/
git commit -m "feat: deal detail slide-in panel with stage progress + tasks"
```

---

## Phase 5: Quick Entry Forms

### Task 8: Sheet component + New Contact form

**Files:**
- Create: `src/components/shared/Sheet.tsx`
- Create: `src/components/forms/NewContactSheet.tsx`
- Create: `src/components/forms/FormField.tsx`
- Create: `src/components/forms/NewContactSheet.test.tsx`

**Step 1: Build Sheet base component** (reusable modal overlay)
```tsx
// src/components/shared/Sheet.tsx
// Props: isOpen, onClose, title, children
// - Overlay: rgba(0,0,0,0.45), flex center
// - Sheet: bg-[var(--bg-sheet)], border-radius 14px, shadow-lg
// - No max-height — Apple HIG: size to content (see design doc §7)
// - Animation: scale(0.95)→scale(1) + opacity 0→1, 250ms ease-decelerate
// - Escape key closes
// - Header: title (14px bold) + ✕ button (24px circle)
// - Footer: cancel + primary buttons (passed as children or props)
```

**Step 2: Build FormField wrapper** (label + input)
```tsx
// src/components/forms/FormField.tsx
// Props: label, children (the actual input element), className
// Label: 11px semibold uppercase, 0.05em tracking, text-[var(--text-label)]
// Input base: bg-[var(--bg-input)], border border-[var(--separator-strong)],
//   rounded-lg, p-2, text-[13px], text-[var(--text-primary)]
// Focus ring: border-[var(--color-accent)] + shadow 0 0 0 3px var(--color-accent-translucent)
```

**Step 3: Write failing test for NewContactSheet**
```tsx
test('renders all 10 required fields', () => {
  render(<NewContactSheet isOpen onClose={() => {}} onSave={() => {}} />)
  expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/categorization/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/event.*where/i)).toBeInTheDocument()
})
```

**Step 4: Implement NewContactSheet**

Fields in order (from approved form design):
1. First Name + Last Name (row)
2. Company (lookup dropdown → typeahead against companies table)
3. Title + Categorization (row — Categorization is singleSelect: Theater, Film, Live Events, Television, Music, Corporate, Sports, Other)
4. Email + Mobile (row)
5. LinkedIn URL
6. Specialties (tag input — linked records lookup)
7. Event / Where We Met (text input — maps to `eventTags` field)
8. Quality Rating (5-dot selector)
9. Notes (textarea, min-height 60px)

**Step 5: Ensure no scrolling** — Sheet sizes to content. Test by rendering and confirming the sheet-body has no overflow-y set.

**Step 6: Run tests**
```bash
npm test
```

**Step 7: Commit**
```bash
git add src/components/shared/Sheet.tsx src/components/forms/
git commit -m "feat: Sheet component + NewContactSheet with 10 fields, no forced scrolling"
```

---

### Task 9: New Deal + Log Interaction sheets

**Files:**
- Create: `src/components/forms/NewDealSheet.tsx`
- Create: `src/components/forms/LogInteractionSheet.tsx`
- Create: `src/components/forms/StageSegment.tsx`

**Step 1: Build StageSegment** (5-button segmented control, maps to pipeline stages, auto-fills probability)

Default probability by stage: Prospecting 25%, Qualified 45%, Proposal Sent 65%, Negotiation 80%, Closed Won 100%

**Step 2: Implement NewDealSheet** — fields:
1. Deal Name
2. Company (lookup) + Contact (lookup, filtered by company)
3. Value ($) + Close Date (row)
4. Stage (StageSegment)
5. Probability (auto-fills from stage, shown in indigo info box, still editable)
6. Deal Type (dropdown)

**Step 3: Implement LogInteractionSheet** — fields:
1. Type (5 icon buttons: 📞 Call / 👥 Meeting / ✉️ Email / 💬 Text / 📝 Other)
2. Contact(s) (chip input — multiple contacts)
3. Date (defaults today) + Duration (shown for Call/Meeting only)
4. Notes (textarea)
5. Follow-up task toggle → inline expansion (task name, due date, priority) — **no second sheet**

**Step 4: Keyboard shortcut wiring** — in main content area:
- `Cmd+N` → opens New Contact sheet (when in Contacts view)
- `Cmd+N` → opens New Deal sheet (when in Pipeline view)
- Log Interaction button in Contact 360 detail → opens LogInteractionSheet pre-filled with that contact

**Step 5: Run tests + type check**
```bash
npm test && npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add src/components/forms/
git commit -m "feat: NewDealSheet with stage segment, LogInteractionSheet with inline follow-up"
```

---

## Phase 6: Dashboard

### Task 10: Dashboard stat cards + pipeline widget

**Files:**
- Modify: `src/components/dashboard/Dashboard.tsx`
- Create: `src/components/dashboard/StatCard.tsx`
- Create: `src/components/dashboard/PipelineWidget.tsx`

**Step 1: Implement StatCard**
```tsx
// Props: label, value, subtitle?, trend? (+X vs last month), accentColor?
// Structure: value (24px bold) + label (11px secondary) + optional subtitle
// Hover: subtle bg lift
```

**Step 2: Dashboard layout** — 2-row grid:
- Row 1: 4 stat cards (Tasks Due Today · Follow-ups Due · Active Contracts $ · Open Proposals count)
- Row 2: Pipeline widget (full width, configurable)

**Step 3: Implement PipelineWidget**
3 modes (set in Settings, default: Active Opportunities):
- **Active Opportunities**: horizontal bar showing deal count per stage + total value
- **Active Contracts**: list of active contracts with value + close date
- **Combined Total**: single number — closed + active contracts total value

Mode selector: gear icon ⚙ → opens a popover with 3 radio options.

**Step 4: Wire to real data** — stat values come from database queries. For Tasks Due Today:
```sql
SELECT COUNT(*) FROM tasks WHERE due_date = date('now') AND status != 'Complete'
```

**Step 5: Type check + smoke test**
```bash
npx tsc --noEmit && npm run dev
```

**Step 6: Commit**
```bash
git add src/components/dashboard/
git commit -m "feat: rebuild Dashboard with 4 stat cards + configurable pipeline widget"
```

---

## Phase 7: Remaining Entity Views

### Task 11: Companies view

Same 3-column pattern as Contacts. List row: company name + industry badge + contact count. Detail: company overview, linked contacts list, open opportunities.

**Files:** `src/components/companies/` — CompanyList.tsx, CompanyRow.tsx, CompanyDetail.tsx

### Task 12: Work views (Projects, Proposals, RFQs, Contracts)

All follow 3-column pattern. Key differences:
- **Projects**: status badge (Active/On Hold/Complete), linked contacts, linked opportunities
- **Proposals**: linked to opportunity + contact, status badge, value
- **RFQs**: similar to Proposals, request date, response deadline
- **Contracts**: value, start/end dates, status, linked contact + opportunity

**Files:** `src/components/{projects,proposals,rfqs,contracts}/` — each needs List + Row + Detail

### Task 13: Activity views (Tasks, Interactions)

- **Tasks**: list grouped by due date (Overdue / Today / Upcoming), checkbox to complete, linked entity chip
- **Interactions**: timeline list (most recent first), type icon, contact chip, note preview, date

**Files:** `src/components/{tasks,interactions}/`

**For all Tasks 11–13:**
1. Build List + Row components using established patterns
2. Build Detail panel reusing shared primitives
3. `npx tsc --noEmit` after each
4. Commit per view: `"feat: add [X] list + detail view"`

---

## Phase 8: Tools + Settings

### Task 14: Imported Contacts + Portal Access

These are existing working views — port to new design system.

**Imported Contacts**: staging table. Each row has "Approve" / "Reject" action. Show import source, import date, review status.

**Portal Access**: linked to contacts via lookup. Show contact name, access level, portal log count.

**Files:** `src/components/{imported-contacts,portal}/`

### Task 15: Settings

- Theme override (System / Light / Dark)
- Pipeline widget mode selector (carried over from Dashboard widget)
- Sync status display (last synced, force sync button)
- Airtable connection status

**Files:** `src/components/settings/Settings.tsx`

---

## Phase 9: Backend Hardening

### Task 16: Audit electron/ against lessons learned

Work through `CLAUDE.md` lessons learned section and verify each fix is in place:

**Files:** `electron/sync.ts`, `electron/ipc/`, `electron/database/`

**Checklist** (verify each is already done, fix if not):
- [ ] `isSyncing` mutex guard on sync engine with `finally` cleanup
- [ ] IPC handlers registered after `await initDatabase()` only
- [ ] `safeParseArray()` used for all JSON-parsed fields
- [ ] Column names validated against whitelist regex before SQL interpolation
- [ ] No `saveDatabase()` per-write — only 30s auto-save + end-of-sync
- [ ] Pull sync checks `_pending_push` before deleting local records
- [ ] No hardcoded base ID fallbacks — require explicit config
- [ ] `isDev` gate on all `console.log` calls

**Step 1:** Read each file in `electron/` and check each item above.

**Step 2:** Fix any that are missing. Each fix is a separate commit.

**Step 3: Final type check**
```bash
npx tsc --noEmit
```

**Step 4: Commit summary**
```bash
git commit -m "fix: verify all backend hardening lessons learned are in place"
```

---

### Task 17: Merge to main

**Step 1: Final smoke test**
```bash
npm run dev
# Manually verify: sidebar nav, contacts list/detail, pipeline kanban, all 3 sheets open
```

**Step 2: Run all tests**
```bash
npm test
```
Expected: all pass

**Step 3: Type check**
```bash
npx tsc --noEmit
```
Expected: no errors

**Step 4: Open PR**
```bash
git push origin feature/rebuild-v2
gh pr create --title "feat: ILS CRM complete UI rebuild (indigo design system, HIG-compliant)" \
  --body "Full clean-slate rewrite of src/. See docs/plans/2026-03-01-ils-crm-rebuild-design.md for design spec."
```

---

## Testing Strategy

| Layer | Tool | Command |
|-------|------|---------|
| Type safety | TypeScript | `npx tsc --noEmit` |
| Component unit tests | Vitest + testing-library | `npm test` |
| Visual smoke test | Manual + `npm run dev` | Check each view |

**What to test per component:**
- Renders without crashing with minimal props
- Shows correct text from data
- Selected/active states apply correct classes
- Empty state renders when no data

**What NOT to test (for now):**
- IPC calls to electron (mock-heavy, low value)
- Airtable API (integration test, out of scope)
- Pixel-perfect styling (visual regression, out of scope)

---

## Quick Reference

```bash
# Development
npm run dev          # Start with hot reload

# Type check (use instead of npm run build)
npx tsc --noEmit

# Tests
npm test             # Run all tests once
npm run test:watch   # Watch mode

# Branch
git checkout feature/rebuild-v2
```
