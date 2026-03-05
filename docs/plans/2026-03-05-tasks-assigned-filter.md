# Tasks "By Assigned" Filter — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "By Assigned" section to the Tasks categories sidebar that scopes all task filtering by assignee, with compound filtering against Smart Lists and By Type.

**Architecture:** Add `activeAssignee` state alongside existing `activeCategory`. The assignee filter acts as a scope — Smart List/Type counts and filtered results are pre-filtered by the selected assignee. Persist both filters to localStorage. Render initials pills (20px rounded-full) for each assignee, with an "Unassigned" option.

**Tech Stack:** React (existing TasksPage.tsx), localStorage for persistence, inline styles with CSS vars (existing pattern)

**Project root:** `/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm`

---

## Task 1: Add assignee state + persistence + helper functions

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx:36-37` (types), `:39-69` (constants), `:590-666` (state + memos)

**Step 1: Add types, constants, and helper at top of file**

After the `CategoryFilter` type (line 37), add:

```typescript
// ─── Assignee Helpers ─────────────────────────────────────────────────────────

const ASSIGNEE_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55',
  '#5856D6', '#30B0C7', '#FF3B30', '#00C7BE', '#A2845E',
]

function assigneeColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  return ASSIGNEE_COLORS[Math.abs(hash) % ASSIGNEE_COLORS.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
```

**Step 2: Add `activeAssignee` state with localStorage persistence**

In the `TasksPage` component (around line 594), change `activeCategory` and add `activeAssignee`:

```typescript
const [activeAssignee, setActiveAssignee] = useState<string | null>(
  () => localStorage.getItem('tasks-filter-assignee') || null
)
const [activeCategory, setActiveCategory] = useState<CategoryFilter>(
  () => (localStorage.getItem('tasks-filter-category') as CategoryFilter) || 'all'
)
```

**Step 3: Add persistence callbacks**

After the state declarations, add:

```typescript
const handleAssigneeChange = useCallback((assignee: string | null) => {
  setActiveAssignee(assignee)
  if (assignee) localStorage.setItem('tasks-filter-assignee', assignee)
  else localStorage.removeItem('tasks-filter-assignee')
  setSelectedId(null)
}, [])

const handleCategoryChange = useCallback((cat: CategoryFilter) => {
  setActiveCategory(cat)
  localStorage.setItem('tasks-filter-category', cat)
  setSelectedId(null)
}, [])
```

**Step 4: Pre-filter tasks by assignee scope**

Replace the current `counts`/`typeCounts`/`sectionGroups` useMemo (lines 604-629) with one that respects the assignee scope:

```typescript
// Tasks scoped by assignee (used for all counts + filtering)
const scopedTasks = useMemo(() => {
  if (!activeAssignee) return allTasks
  if (activeAssignee === '__unassigned__') return allTasks.filter(t => !t.assigned_to)
  return allTasks.filter(t => t.assigned_to === activeAssignee)
}, [allTasks, activeAssignee])

// Counts for categories (scoped by assignee)
const { counts, typeCounts, sectionGroups } = useMemo(() => {
  const counts: Record<string, number> = { all: 0, overdue: 0, today: 0, upcoming: 0, nodate: 0, waiting: 0, completed: 0 }
  const typeCounts: Record<string, number> = {}
  const sectionGroups: Record<string, TaskItem[]> = { overdue: [], today: [], upcoming: [], waiting: [], nodate: [] }

  for (const t of scopedTasks) {
    const section = classifyTask(t, today)
    if (section === 'complete') {
      counts.completed++
    } else {
      counts.all++
      counts[section]++
      sectionGroups[section].push(t)
    }
    if (t.type) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1
  }

  const byDate = (a: TaskItem, b: TaskItem) =>
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
  for (const key of Object.keys(sectionGroups)) {
    sectionGroups[key].sort(byDate)
  }

  return { counts, typeCounts, sectionGroups }
}, [scopedTasks, today])

// Assignee counts (always computed from allTasks, not scoped)
const assigneeCounts = useMemo(() => {
  const map: Record<string, number> = {}
  let unassigned = 0
  for (const t of allTasks) {
    if (t.assigned_to) map[t.assigned_to] = (map[t.assigned_to] || 0) + 1
    else unassigned++
  }
  return { named: map, unassigned }
}, [allTasks])
```

**Step 5: Update filteredTasks to use scopedTasks**

Replace `allTasks` references in the `filteredTasks` useMemo (lines 632-653) with `scopedTasks`:

```typescript
const filteredTasks = useMemo(() => {
  let tasks: TaskItem[]

  if (activeCategory === 'all') {
    tasks = scopedTasks.filter(t => !isCompleted(t))
  } else if (activeCategory === 'completed') {
    tasks = scopedTasks.filter(t => isCompleted(t))
  } else if (activeCategory.startsWith('type:')) {
    const type = activeCategory.slice(5)
    tasks = scopedTasks.filter(t => t.type === type)
  } else {
    tasks = sectionGroups[activeCategory] || []
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q))
  }

  return tasks
}, [activeCategory, scopedTasks, sectionGroups, searchQuery])
```

**Step 6: Wire new handlers into JSX**

In the return JSX (~line 718), update `CategoriesPane` to use `handleCategoryChange`:

```typescript
<CategoriesPane
  active={activeCategory}
  onSelect={handleCategoryChange}
  counts={counts}
  typeCounts={typeCounts}
/>
```

**Done when:** `activeAssignee` state exists with localStorage persistence. Selecting an assignee scopes all counts and filtered tasks. Category filter also persists. No UI for the assignee section yet (that's Task 2).

---

## Task 2: Add "By Assigned" section to CategoriesPane

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx:162-271` (CategoriesPane component)

**Step 1: Update CategoriesPane props**

Replace the `CategoriesPaneProps` interface (line 162-167):

```typescript
interface CategoriesPaneProps {
  active: CategoryFilter
  onSelect: (cat: CategoryFilter) => void
  counts: Record<string, number>
  typeCounts: Record<string, number>
  activeAssignee: string | null
  onAssigneeSelect: (assignee: string | null) => void
  assigneeOptions: string[]
  assigneeCounts: { named: Record<string, number>; unassigned: number }
  totalTaskCount: number
}
```

**Step 2: Update CategoriesPane function signature**

```typescript
function CategoriesPane({
  active, onSelect, counts, typeCounts,
  activeAssignee, onAssigneeSelect, assigneeOptions, assigneeCounts, totalTaskCount,
}: CategoriesPaneProps) {
```

**Step 3: Add "By Assigned" section at the top of the CategoriesPane return, before Smart Lists**

Insert this block right after the opening `<div>` (before the Smart Lists header):

```typescript
{/* By Assigned */}
<div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', padding: '10px 12px 5px' }}>
  Assigned
</div>

{/* All (no assignee filter) */}
<div
  onClick={() => onAssigneeSelect(null)}
  className="cursor-default"
  style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 8, margin: '1px 6px',
    background: activeAssignee === null ? 'var(--color-accent)' : undefined,
    transition: 'background 150ms',
  }}
  onMouseEnter={e => { if (activeAssignee !== null) e.currentTarget.style.background = 'var(--bg-hover)' }}
  onMouseLeave={e => { if (activeAssignee !== null) e.currentTarget.style.background = '' }}
>
  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: activeAssignee === null ? 'var(--text-on-accent)' : 'var(--text-primary)', paddingLeft: 28 }}>
    All
  </span>
  <span style={{
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
    background: activeAssignee === null ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
    color: activeAssignee === null ? 'var(--text-on-accent)' : 'var(--text-secondary)',
  }}>
    {totalTaskCount}
  </span>
</div>

{/* Named assignees */}
{assigneeOptions.map(name => {
  const isActive = activeAssignee === name
  const count = assigneeCounts.named[name] ?? 0
  const color = assigneeColor(name)
  return (
    <div
      key={name}
      onClick={() => onAssigneeSelect(name)}
      className="cursor-default"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 8, margin: '1px 6px',
        background: isActive ? 'var(--color-accent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
          {initials(name)}
        </span>
      </div>
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500,
        color: isActive ? 'var(--text-on-accent)' : 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
        color: isActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      }}>
        {count}
      </span>
    </div>
  )
})}

{/* Unassigned */}
<div
  onClick={() => onAssigneeSelect('__unassigned__')}
  className="cursor-default"
  style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', borderRadius: 8, margin: '1px 6px',
    background: activeAssignee === '__unassigned__' ? 'var(--color-accent)' : undefined,
    transition: 'background 150ms',
  }}
  onMouseEnter={e => { if (activeAssignee !== '__unassigned__') e.currentTarget.style.background = 'var(--bg-hover)' }}
  onMouseLeave={e => { if (activeAssignee !== '__unassigned__') e.currentTarget.style.background = '' }}
>
  <div style={{
    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
    background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1 }}>
      —
    </span>
  </div>
  <span style={{
    flex: 1, fontSize: 13, fontWeight: 500,
    color: activeAssignee === '__unassigned__' ? 'var(--text-on-accent)' : 'var(--text-primary)',
  }}>
    Unassigned
  </span>
  <span style={{
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
    background: activeAssignee === '__unassigned__' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
    color: activeAssignee === '__unassigned__' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
    opacity: assigneeCounts.unassigned === 0 ? 0.4 : 1,
  }}>
    {assigneeCounts.unassigned}
  </span>
</div>

<div style={{ height: 1, background: 'var(--separator)', margin: '6px 12px' }} />
```

**Step 4: Pass new props from TasksPage**

In the main return JSX, update the `<CategoriesPane>` call:

```typescript
<CategoriesPane
  active={activeCategory}
  onSelect={handleCategoryChange}
  counts={counts}
  typeCounts={typeCounts}
  activeAssignee={activeAssignee}
  onAssigneeSelect={handleAssigneeChange}
  assigneeOptions={assigneeOptions}
  assigneeCounts={assigneeCounts}
  totalTaskCount={allTasks.length}
/>
```

**Step 5: Update the header label to show assignee scope**

Update the `categoryLabel` computation (~line 708) to include assignee context:

```typescript
const assigneeLabel = activeAssignee === '__unassigned__' ? 'Unassigned'
  : activeAssignee ? activeAssignee
  : null

const categoryLabel = activeCategory === 'all' ? 'All Tasks'
  : activeCategory === 'completed' ? 'Completed'
  : activeCategory.startsWith('type:') ? activeCategory.slice(5)
  : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)

const fullLabel = assigneeLabel ? `${categoryLabel} — ${assigneeLabel}` : categoryLabel
```

Then use `fullLabel` instead of `categoryLabel` in the header JSX.

**Done when:** "By Assigned" section renders at top of sidebar with All, named assignees (initials pills), and Unassigned. Clicking an assignee scopes all counts and task list. State persists across navigations via localStorage.

---

## Task 3: Type check + visual verification

**Files:**
- All modified files

**Step 1: Run TypeScript check**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Fix any type errors**

Address any issues from the type check.

**Step 3: Run the app**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npm run dev
```

**Step 4: Verify these behaviors**

- [ ] "By Assigned" section appears at top of categories sidebar
- [ ] "All" row shows total task count, no pill
- [ ] Each assignee shows initials pill (colored) + full name + count
- [ ] "Unassigned" shows grey pill with dash + count
- [ ] Clicking an assignee scopes Smart List and By Type counts
- [ ] Compound filtering works: assignee + smart list + type
- [ ] State persists when navigating away and back to Tasks
- [ ] Default is "All" on fresh localStorage

**Step 5: Commit**

```bash
git add src/components/tasks/TasksPage.tsx
git commit -m "feat: add By Assigned filter to Tasks sidebar with compound filtering and state persistence"
```

**Done when:** All verification checks pass, TypeScript compiles clean, committed.

---

## Final Verification

After implementation, Edward will send screenshots for `/apple-hig` and `/cupertino` verification.
