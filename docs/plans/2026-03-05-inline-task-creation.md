# Inline Task Creation + UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite task creation and detail pane to match Apple Reminders UX — instant creation in the detail pane, smart date suggestions, reordered layout with title+notes first.

**Architecture:** Replace the `/tasks/new` route navigation with instant DB creation + detail pane editing. Add a new `DateSuggestionPicker` component for Reminders-style date selection. Reorder the TaskDetail layout to put title and notes above form fields. Default `assigned_to` to logged-in user on creation.

**Tech Stack:** React (existing TasksPage.tsx, EditableFormRow.tsx), Electron IPC (settings:get for user_name)

**Project root:** `/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm`

---

## Wave 1: Date Suggestion Picker Component

### Task 1: Create DateSuggestionPicker component

**Files:**
- Create: `src/components/shared/DateSuggestionPicker.tsx`

**What this component does:**
A Reminders-style date picker that shows suggestion shortcuts (Today, Tomorrow, This Weekend, Next Week) plus a Custom option that reveals a native date input. Also shows "Remove Date" when a date is already set.

**Full component code:**

```tsx
import { useState, useRef, useEffect } from 'react'

interface DateSuggestionPickerProps {
  value: string | null  // ISO date string (YYYY-MM-DD) or null
  onSave: (date: string | null) => Promise<void>
}

function getDateSuggestions(): { label: string; sublabel: string; date: string }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const display = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // This Weekend = next Saturday (or today if already Saturday)
  const dayOfWeek = today.getDay()
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + (6 - dayOfWeek))

  // Next Week = next Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + (8 - dayOfWeek) % 7 || 7)

  return [
    { label: 'Today', sublabel: display(today), date: fmt(today) },
    { label: 'Tomorrow', sublabel: display(tomorrow), date: fmt(tomorrow) },
    { label: 'This Weekend', sublabel: display(saturday), date: fmt(saturday) },
    { label: 'Next Week', sublabel: display(monday), date: fmt(monday) },
  ]
}

export default function DateSuggestionPicker({ value, onSave }: DateSuggestionPickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (showCustom && inputRef.current) inputRef.current.focus()
  }, [showCustom])

  const handleSelect = async (date: string | null) => {
    setOpen(false)
    setShowCustom(false)
    await onSave(date)
  }

  const handleCustomConfirm = async () => {
    if (customValue) {
      await handleSelect(customValue)
    }
  }

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const suggestions = getDateSuggestions()

  // Calendar icon (simple inline SVG)
  const calIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.2" />
      <path d="M1.5 7h13" stroke="var(--text-tertiary)" strokeWidth="1.2" />
      <path d="M5 1.5v3M11 1.5v3" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Row display */}
      <div
        onClick={() => setOpen(!open)}
        className="cursor-default"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', minHeight: 36,
          background: 'transparent', transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
          Due Date
        </span>
        <span style={{
          fontSize: 13, fontWeight: 400,
          color: displayValue ? 'var(--text-primary)' : 'var(--text-tertiary)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {displayValue || 'Add Date'}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>⌃</span>
        </span>
      </div>

      {/* Suggestions popover */}
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute', right: 14, top: '100%', zIndex: 200,
            background: 'var(--bg-card)', border: '1px solid var(--separator)',
            borderRadius: 8, padding: 4,
            minWidth: 220, boxShadow: 'var(--shadow-menu)',
          }}
        >
          {!showCustom ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', padding: '6px 10px 4px' }}>
                Suggestions
              </div>
              {suggestions.map(s => (
                <div
                  key={s.label}
                  onClick={() => handleSelect(s.date)}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 6,
                    background: 'transparent', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {calIcon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.sublabel}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
              <div
                onClick={() => { setShowCustom(true); setCustomValue(value || '') }}
                className="cursor-default"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 6,
                  background: 'transparent', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {calIcon}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Custom...</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Use the calendar to pick a date</div>
                </div>
              </div>
              {value && (
                <>
                  <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
                  <div
                    onClick={() => handleSelect(null)}
                    className="cursor-default"
                    style={{
                      padding: '7px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                      color: 'var(--color-red)', background: 'transparent', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Remove Date
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Pick a date
              </div>
              <input
                ref={inputRef}
                type="date"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomConfirm(); if (e.key === 'Escape') { setShowCustom(false); setOpen(false) } }}
                style={{
                  width: '100%', fontSize: 13, padding: '6px 8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--separator)',
                  borderRadius: 6, color: 'var(--text-primary)',
                  fontFamily: 'inherit', outline: 'none', cursor: 'default',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCustom(false) }}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    border: 'none', cursor: 'default',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCustomConfirm}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                    background: 'var(--color-accent)', color: 'var(--text-on-accent)',
                    border: 'none', cursor: 'default',
                  }}
                >
                  Set Date
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Done when:** Component file exists and exports `DateSuggestionPicker`.

---

## Wave 2: Rewrite TaskDetail + Inline Creation

### Task 2: Rewrite TaskDetail layout and add inline creation

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx`

**Changes to TaskDetail component (lines ~538-721):**

1. **Add title editing state.** After the `if (!task)` early return, add:

```typescript
const [editingTitle, setEditingTitle] = useState(false)
const [titleDraft, setTitleDraft] = useState(task.title === '(Untitled task)' ? '' : task.title)
const titleRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  setTitleDraft(task.title === '(Untitled task)' ? '' : task.title)
}, [task.id, task.title])
```

Add `useRef` to the existing imports at the top of the file. Add `isNewTask` to TaskDetailProps.

2. **Auto-focus title on new tasks.** Add:

```typescript
useEffect(() => {
  if (isNewTask && titleRef.current) {
    titleRef.current.focus()
  }
}, [isNewTask])
```

3. **Replace the current header section** (the title div + overdue label + Complete/Delete buttons) with an editable title input:

```tsx
{/* Editable Title */}
<div style={{ marginBottom: 8 }}>
  <input
    ref={titleRef}
    value={titleDraft}
    placeholder="New Task"
    onChange={e => setTitleDraft(e.target.value)}
    onBlur={() => {
      const trimmed = titleDraft.trim()
      if (trimmed !== task.title) {
        window.electronAPI.tasks.update(task.id, { task: trimmed || null })
        onReload()
      }
      setEditingTitle(false)
    }}
    onKeyDown={e => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      if (e.key === 'Escape') { setTitleDraft(task.title === '(Untitled task)' ? '' : task.title); (e.target as HTMLInputElement).blur() }
    }}
    style={{
      width: '100%', fontSize: 17, fontWeight: 600,
      color: 'var(--text-primary)', background: 'transparent',
      border: 'none', outline: 'none', padding: '2px 0',
      fontFamily: 'inherit', cursor: 'default',
    }}
  />
  {Boolean(overdueLabel) && (
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{overdueLabel}</div>
  )}
</div>
```

4. **Move Notes directly below title** (before the form fields card). Use the existing EditableFormRow for notes but render it in its own card:

```tsx
{/* Notes — directly below title */}
<div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
  <EditableFormRow
    field={{ key: 'notes', label: '', type: 'textarea' }}
    value={task.notes}
    isLast
    onSave={async (key, val) => {
      await window.electronAPI.tasks.update(task.id, { [key]: val })
      onReload()
    }}
  />
</div>
```

5. **Render Details card with DateSuggestionPicker for Due Date.** Replace the current form fields card. Import `DateSuggestionPicker` at the top. Remove `due_date` from `buildTaskEditableFields` and render it separately:

```tsx
{/* Details */}
<div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
  Details
</div>
<div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
  <DateSuggestionPicker
    value={task.due_date}
    onSave={async (date) => {
      await window.electronAPI.tasks.update(task.id, { due_date: date })
      onReload()
    }}
  />
  <div style={{ height: 1, background: 'var(--separator)', margin: '0 14px' }} />
  {buildTaskEditableFields(assigneeOptions).map((field, idx, arr) => (
    <EditableFormRow
      key={field.key}
      field={field}
      value={task[field.key as keyof TaskItem]}
      isLast={idx === arr.length - 1}
      onSave={async (key, val) => {
        await window.electronAPI.tasks.update(task.id, { [key]: val })
        onReload()
      }}
    />
  ))}
</div>
```

6. **Keep Linked Records section** as-is (already below Details in new order).

7. **Move action buttons** (Complete + Delete) to a compact row at the bottom of the pane, below everything:

```tsx
{/* Actions */}
<div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
  {!completed && (
    <button onClick={() => onComplete(task.id)} style={{
      fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 8,
      background: 'var(--color-accent)', color: 'var(--text-on-accent)',
      border: 'none', cursor: 'default', transition: 'background 150ms',
    }}>
      Complete
    </button>
  )}
  <button onClick={() => onDelete(task.id)} style={{
    fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 8,
    color: 'var(--color-red)', background: 'none',
    border: 'none', cursor: 'default', transition: 'background 150ms',
  }}>
    Delete
  </button>
</div>
```

8. **Update `buildTaskEditableFields`** — remove `due_date` and `completed_date` from the array (Due Date now uses DateSuggestionPicker; Completed Date is set automatically by the Complete button).

9. **Update TaskDetailProps** — add `isNewTask: boolean`. Pass it from the parent.

**Done when:** Detail pane shows: Title (editable) → Notes → Details (with DateSuggestionPicker) → Linked Records → Actions.

---

### Task 3: Replace "+ New Task" navigation with instant creation

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx` (main TasksPage component)

**Changes:**

1. **Add state for tracking new task.** In the TasksPage component:

```typescript
const [newTaskId, setNewTaskId] = useState<string | null>(null)
```

2. **Load user name on mount:**

```typescript
const [userName, setUserName] = useState<string | null>(null)
useEffect(() => {
  window.electronAPI.settings.get('user_name').then((name: string | null) => setUserName(name))
}, [])
```

3. **Replace the `navigate('/tasks/new')` onClick** on the "+ New Task" button with instant creation:

```typescript
const handleNewTask = useCallback(async () => {
  const result = await window.electronAPI.tasks.create({
    task: '',
    status: 'To Do',
    assigned_to: userName,
  })
  if (result?.id) {
    setNewTaskId(result.id)
    setSelectedId(result.id)
    reload()
  }
}, [userName, reload])
```

4. **Update the button onClick:**

```tsx
<button onClick={handleNewTask} ...>
  + New Task
</button>
```

5. **Pass `isNewTask` to TaskDetail:**

```tsx
<TaskDetail
  task={selectedTask}
  isNewTask={selectedId === newTaskId}
  assigneeOptions={assigneeOptions}
  onComplete={handleComplete}
  onDelete={handleDelete}
  onReload={reload}
/>
```

6. **Clear `newTaskId` when selecting a different task.** In the category/assignee change handlers and when clicking a different task row, if `selectedId` changes away from `newTaskId`, clear it:

```typescript
// Add to the effect or callbacks:
// When selectedId changes, if it's no longer the new task, clear newTaskId
useEffect(() => {
  if (newTaskId && selectedId !== newTaskId) setNewTaskId(null)
}, [selectedId, newTaskId])
```

**Done when:** Clicking "+ New Task" creates a task instantly, selects it, and shows the detail pane with title auto-focused. No page navigation.

---

## Wave 3: Cleanup

### Task 4: Remove /tasks/new route and unused TaskForm imports

**Files:**
- Modify: `src/App.tsx` — remove the `/tasks/new` Route and `TaskForm` import (keep `/tasks/:id/edit` for now as other pages may link to it)
- Modify: `src/config/routes.ts` — remove `newPath: '/tasks/new'` from tasks route config

**Done when:** No dead routes. `/tasks/new` no longer navigable.

---

### Task 5: Type check + commit

**Files:** All modified

**Steps:**
1. `npx tsc --noEmit` — fix any errors
2. Verify in running app:
   - [ ] "+ New Task" creates task instantly, title is focused
   - [ ] Title editable inline, saves on blur/Enter
   - [ ] Notes directly below title
   - [ ] Due Date shows "Add Date", clicking shows suggestions popover
   - [ ] Today/Tomorrow/This Weekend/Next Week set the date correctly
   - [ ] Custom opens date input, Set Date saves it
   - [ ] Remove Date clears the date (only shows when date is set)
   - [ ] Assigned To defaults to logged-in user on new tasks
   - [ ] Complete/Delete buttons at bottom
   - [ ] Existing tasks still editable, all fields save correctly
3. Commit

```bash
git add src/components/shared/DateSuggestionPicker.tsx src/components/tasks/TasksPage.tsx src/App.tsx src/config/routes.ts
git commit -m "feat: inline task creation + Reminders-style date picker + detail pane reorder"
```

**Done when:** All checks pass, TypeScript clean, committed.
