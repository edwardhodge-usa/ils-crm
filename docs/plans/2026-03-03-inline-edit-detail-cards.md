# Inline-Editable Detail Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all detail card form rows actually editable inline (Apple Contacts click-to-edit pattern) instead of read-only with misleading hover/chevron indicators.

**Architecture:** Build a shared `EditableFormRow` component that handles text, number, date, singleSelect, multiSelect, and checkbox field types. Each detail view defines its editable fields declaratively (field key, label, type, options) and delegates rendering/saving to the shared component. Saving calls `window.electronAPI.{entity}.update(id, { field: newValue })` on blur/selection.

**Tech Stack:** React 18, TypeScript, inline styles (Apple HIG design tokens via CSS vars), existing IPC bridge

---

## Wave 1 — Shared Component (foundation)

### Task 1: Create EditableFormRow component

**Files:**
- Create: `src/components/shared/EditableFormRow.tsx`

**Step 1: Create the component file**

```tsx
// src/components/shared/EditableFormRow.tsx
import { useState, useRef, useEffect } from 'react'

export type EditableFieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'singleSelect' | 'multiSelect' | 'checkbox' | 'readonly'

export interface EditableField {
  key: string
  label: string
  type: EditableFieldType
  options?: string[]   // for singleSelect / multiSelect
  prefix?: string      // e.g. '$' for currency display
  isLink?: boolean     // render value as accent-colored link
}

interface EditableFormRowProps {
  field: EditableField
  value: unknown
  isLast?: boolean
  onSave: (key: string, value: unknown) => Promise<void>
}

export function EditableFormRow({ field, value, isLast, onSave }: EditableFormRowProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editValue, setEditValue] = useState<unknown>(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  // Sync editValue when value prop changes (e.g. after save)
  useEffect(() => { setEditValue(value) }, [value])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      // Select all text in text inputs
      if (inputRef.current instanceof HTMLInputElement && field.type !== 'date') {
        inputRef.current.select()
      }
    }
  }, [editing])

  const isReadonly = field.type === 'readonly'
  const isCheckbox = field.type === 'checkbox'
  const isDropdown = field.type === 'singleSelect' || field.type === 'multiSelect'

  // Format display value
  function displayValue(): string {
    if (value == null || value === '') return '—'
    if (field.type === 'currency') return `$${Number(value).toLocaleString()}`
    if (field.type === 'checkbox') return value ? 'Yes' : 'No'
    if (field.type === 'multiSelect') {
      try {
        const arr = typeof value === 'string' ? JSON.parse(value) : value
        if (Array.isArray(arr) && arr.length > 0) return arr.join(', ')
      } catch { /* not JSON */ }
      return String(value)
    }
    if (field.type === 'date' && typeof value === 'string') {
      // Format ISO date to readable
      const parts = value.split('T')[0].split('-')
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }
    return String(value)
  }

  async function handleSave(newValue: unknown) {
    if (newValue === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(field.key, newValue)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  // Checkbox: toggle immediately on click
  if (isCheckbox) {
    const checked = value === 1 || value === true
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
          {field.label}
        </span>
        <div
          onClick={() => handleSave(checked ? 0 : 1)}
          style={{
            width: 42, height: 24, borderRadius: 12, cursor: 'default',
            background: checked ? 'var(--color-green)' : 'var(--bg-tertiary)',
            transition: 'background 200ms', position: 'relative',
            opacity: saving ? 0.5 : 1,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 10,
            background: 'white', position: 'absolute', top: 2,
            left: checked ? 20 : 2,
            transition: 'left 200ms',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
    )
  }

  // Readonly: no interactivity
  if (isReadonly) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
          {field.label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>
          {displayValue()}
        </span>
      </div>
    )
  }

  // Edit mode: render appropriate input
  if (editing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        background: 'var(--bg-hover)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
          {field.label}
        </span>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
          {renderEditor()}
        </div>
      </div>
    )
  }

  // Display mode: clickable value
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', minHeight: 36,
      borderBottom: isLast ? 'none' : '1px solid var(--separator)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
        {field.label}
      </span>
      <span
        onClick={() => setEditing(true)}
        style={{
          fontSize: 13, fontWeight: 400,
          color: field.isLink ? 'var(--color-accent)' : 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 5,
          cursor: 'default', borderRadius: 4, padding: '2px 6px', margin: '-2px -6px',
          transition: 'background 150ms',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0, textAlign: 'right' as const,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {saving ? 'Saving...' : displayValue()}
        {isDropdown && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4, flexShrink: 0 }}>⌃</span>}
      </span>
    </div>
  )

  function renderEditor() {
    const inputStyle: React.CSSProperties = {
      fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
      background: 'var(--bg-primary)', border: '1px solid var(--color-accent)',
      borderRadius: 4, padding: '4px 8px', outline: 'none',
      fontFamily: 'inherit', textAlign: 'right' as const,
      maxWidth: 200, width: '100%',
    }

    switch (field.type) {
      case 'text':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={(editValue as string) ?? ''}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleSave(editValue || null)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(editValue || null); if (e.key === 'Escape') setEditing(false) }}
            style={inputStyle}
          />
        )

      case 'textarea':
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={(editValue as string) ?? ''}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleSave(editValue || null)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            style={{ ...inputStyle, textAlign: 'left', minHeight: 60, resize: 'vertical', maxWidth: '100%' }}
          />
        )

      case 'number':
      case 'currency':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={editValue != null ? String(editValue) : ''}
            onChange={e => setEditValue(e.target.value ? Number(e.target.value) : null)}
            onBlur={() => handleSave(editValue)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(editValue); if (e.key === 'Escape') setEditing(false) }}
            style={inputStyle}
          />
        )

      case 'date':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={((editValue as string) ?? '').split('T')[0]}
            onChange={e => { setEditValue(e.target.value || null); handleSave(e.target.value || null) }}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            style={inputStyle}
          />
        )

      case 'singleSelect':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={(editValue as string) ?? ''}
            onChange={e => { setEditValue(e.target.value || null); handleSave(e.target.value || null) }}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
            style={{ ...inputStyle, cursor: 'default' }}
          >
            <option value="">—</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'multiSelect': {
        const selected: string[] = (() => {
          try {
            const parsed = typeof editValue === 'string' ? JSON.parse(editValue) : editValue
            return Array.isArray(parsed) ? parsed : []
          } catch { return [] }
        })()

        function toggleOption(opt: string) {
          const next = selected.includes(opt)
            ? selected.filter(s => s !== opt)
            : [...selected, opt]
          const jsonVal = next.length > 0 ? JSON.stringify(next) : null
          setEditValue(jsonVal)
        }

        return (
          <div
            style={{
              background: 'var(--bg-primary)', border: '1px solid var(--color-accent)',
              borderRadius: 8, padding: 6, maxWidth: 240, maxHeight: 200, overflowY: 'auto',
            }}
          >
            {(field.options ?? []).map(opt => (
              <label
                key={opt}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                  fontSize: 12, color: 'var(--text-primary)', cursor: 'default',
                  borderRadius: 4, transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  style={{ cursor: 'default' }}
                />
                {opt}
              </label>
            ))}
            <button
              onClick={() => {
                const jsonVal = selected.length > 0 ? JSON.stringify(selected) : null
                handleSave(jsonVal)
              }}
              style={{
                marginTop: 4, padding: '4px 12px', fontSize: 11, fontWeight: 500,
                background: 'var(--color-accent)', color: 'var(--text-on-accent)',
                border: 'none', borderRadius: 6, cursor: 'default', width: '100%',
              }}
            >
              Done
            </button>
          </div>
        )
      }

      default:
        return <span>{displayValue()}</span>
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors from EditableFormRow.tsx

**Step 3: Commit**

```bash
git add src/components/shared/EditableFormRow.tsx
git commit -m "feat: add shared EditableFormRow component for inline editing"
```

---

## Wave 2 — Integrate into detail views (parallel — different files)

### Task 2: TaskDetail inline editing

**Files:**
- Modify: `src/components/tasks/TasksPage.tsx` (TaskDetail section, ~lines 377-593)

**Step 1: Import EditableFormRow and define task fields**

At the top of `TasksPage.tsx`, add:
```tsx
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
```

Add task editable fields constant (near the other constants at top):
```tsx
const TASK_EDITABLE_FIELDS: EditableField[] = [
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'priority', label: 'Priority', type: 'singleSelect',
    options: ['🔴 High', '🟡 Medium', '🟢 Low'] },
  { key: 'status', label: 'Status', type: 'singleSelect',
    options: ['To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled'] },
  { key: 'type', label: 'Type', type: 'singleSelect',
    options: ['Administrative', 'Follow-up Call', 'Follow-up Email', 'Internal Review', 'Other', 'Presentation Deck', 'Research', 'Schedule Meeting', 'Send Proposal', 'Send Qualifications'] },
  { key: 'assigned_to', label: 'Assigned To', type: 'readonly' },
]
```

**Step 2: Replace hardcoded form rows in TaskDetail with EditableFormRow**

Replace the `{/* Apple form rows */}` grouped container (lines ~535-577) with:
```tsx
{/* Apple form rows — inline editable */}
<div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
  {TASK_EDITABLE_FIELDS.map((field, idx) => (
    <EditableFormRow
      key={field.key}
      field={field}
      value={task[field.key as keyof TaskItem]}
      isLast={idx === TASK_EDITABLE_FIELDS.length - 1}
      onSave={async (key, val) => {
        await window.electronAPI.tasks.update(task.id, { [key]: val })
        reload()
      }}
    />
  ))}
</div>
```

**Step 3: Make notes editable**

Replace the static notes `<div>` (lines ~580-590) with an `EditableFormRow`:
```tsx
<div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
  Notes
</div>
<div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
  <EditableFormRow
    field={{ key: 'notes', label: '', type: 'textarea' }}
    value={task.notes}
    isLast
    onSave={async (key, val) => {
      await window.electronAPI.tasks.update(task.id, { [key]: val })
      reload()
    }}
  />
</div>
```

**Step 4: Remove unused badge/color code from TaskDetail**

Remove the `priorityBadge`, `statusBadge`, `typeBadge` variable blocks and the `statusColors` constant inside `TaskDetail` — they are no longer needed since EditableFormRow handles display.

**Step 5: Run type check**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```bash
git add src/components/tasks/TasksPage.tsx
git commit -m "feat: inline-editable task detail card"
```

---

### Task 3: DealDetail inline editing

**Files:**
- Modify: `src/components/pipeline/DealDetail.tsx`

**Step 1: Import EditableFormRow and define fields**

```tsx
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'

const DEAL_EDITABLE_FIELDS: EditableField[] = [
  { key: 'sales_stage', label: 'Stage', type: 'singleSelect',
    options: ['Qualification', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'Initial Contact', 'Contract Sent', 'Development', 'Investment', 'Future Client'] },
  { key: 'deal_value', label: 'Value', type: 'currency' },
  { key: 'probability', label: 'Probability', type: 'singleSelect',
    options: ['Cold', 'Low', '02 Medium', '01 High', '04 FUTURE ROADMAP'] },
  { key: 'expected_close_date', label: 'Close Date', type: 'date' },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support', 'Executive Producing'] },
  { key: 'quals_type', label: 'Quals Type', type: 'singleSelect',
    options: ['Standard Capabilities Deck', 'Customized Quals', 'Both'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Partnership'] },
  { key: 'referred_by', label: 'Referred By', type: 'text' },
  { key: 'next_meeting_date', label: 'Next Meeting', type: 'date' },
  { key: 'qualifications_sent', label: 'Quals Sent', type: 'checkbox' },
]
```

**Step 2: Replace grouped container with EditableFormRow loop**

Replace the `{/* Grouped container — deal fields */}` section with:
```tsx
<div style={{ margin: '0 12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
  {DEAL_EDITABLE_FIELDS.map((field, idx) => (
    <EditableFormRow
      key={field.key}
      field={field}
      value={(deal as Record<string, unknown>)[field.key]}
      isLast={idx === DEAL_EDITABLE_FIELDS.length - 1}
      onSave={async (key, val) => {
        await window.electronAPI.opportunities.update(deal.id as string, { [key]: val })
        // Reload deal data
        const res = await window.electronAPI.opportunities.getById(deal.id as string)
        if (res.success && res.data) setDeal(res.data as Record<string, unknown>)
      }}
    />
  ))}
</div>
```

**Step 3: Remove the old local FormRow component and formatEngagementType helper**

Delete the `FormRow` function component (lines 10-44) and `formatEngagementType` (lines 136-143) — no longer used.

**Step 4: Remove the bottom Edit/Delete buttons** (the inline editing replaces Edit)

Keep a small Delete button but remove "Edit" since fields are now editable inline.

**Step 5: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/pipeline/DealDetail.tsx
git commit -m "feat: inline-editable deal detail card"
```

---

### Task 4: ProjectDetail inline editing

**Files:**
- Modify: `src/components/projects/ProjectDetail.tsx`

**Step 1: Import EditableFormRow and define fields**

```tsx
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'

const PROJECT_EDITABLE_FIELDS: EditableField[] = [
  { key: 'project_lead', label: 'Project Lead', type: 'readonly' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'target_completion', label: 'End Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'singleSelect',
    options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },
  { key: 'contract_value', label: 'Contract Value', type: 'currency' },
  { key: 'location', label: 'Location', type: 'text' },
]
```

**Step 2: Replace the Project Info section with EditableFormRow loop**

Replace the `{/* 3. Project details */}` grouped container with:
```tsx
<div style={{ marginTop: 16, marginBottom: 16 }}>
  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
    Project Info
  </div>
  <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
    {PROJECT_EDITABLE_FIELDS.map((field, idx) => (
      <EditableFormRow
        key={field.key}
        field={field}
        value={(project as Record<string, unknown>)[field.key]}
        isLast={idx === PROJECT_EDITABLE_FIELDS.length - 1}
        onSave={async (key, val) => {
          await window.electronAPI.projects.update(projectId!, { [key]: val })
          const res = await window.electronAPI.projects.getById(projectId!)
          if (res.success && res.data) setProject(res.data as Record<string, unknown>)
        }}
      />
    ))}
  </div>
</div>
```

**Step 3: Make description/milestones editable**

Replace the static Notes section with editable rows.

**Step 4: Remove local DetailFormRow, PencilIcon import, and edit button**

Delete `DetailFormRow` function, remove pencil icon edit button from top bar, remove `formatMultiSelect` helper.

**Step 5: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/projects/ProjectDetail.tsx
git commit -m "feat: inline-editable project detail card"
```

---

### Task 5: Company360Page inline editing

**Files:**
- Modify: `src/components/companies/Company360Page.tsx`

**Step 1: Read the full file to understand current structure**

Read `Company360Page.tsx` in full — it has a hero section, linked records (contacts, opps, projects), and company info fields displayed in Apple form rows.

**Step 2: Import EditableFormRow and define company fields**

```tsx
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'

const COMPANY_EDITABLE_FIELDS: EditableField[] = [
  { key: 'type', label: 'Type', type: 'singleSelect',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other', 'Culture', 'Sports', 'Cruise', 'Hospitality/Casino', 'Consulting', 'Theme Parks', 'Entertainment', 'Marketing', 'Design', 'Education', 'Real Estate', 'Media'] },
  { key: 'company_size', label: 'Size', type: 'singleSelect',
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Wynn Entertainment'] },
  { key: 'website', label: 'Website', type: 'text', isLink: true },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state_region', label: 'State/Region', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'annual_revenue', label: 'Annual Revenue', type: 'text' },
  { key: 'founding_year', label: 'Founded', type: 'number' },
  { key: 'referred_by', label: 'Referred By', type: 'text' },
]
```

**Step 3: Replace the company info section**

Replace existing read-only fields section with EditableFormRow loop using the same pattern as Tasks/Deals/Projects.

**Step 4: Make company description and notes editable**

Add `EditableFormRow` with `type: 'textarea'` for description and notes fields.

**Step 5: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/companies/Company360Page.tsx
git commit -m "feat: inline-editable company 360 page"
```

---

### Task 6: Contact360Page inline editing

**Files:**
- Modify: `src/components/contacts/Contact360Page.tsx`

**Step 1: Read the full file to understand current structure**

Contact360Page already has the most developed form row implementation with SectionLabel and FormRow components. It has sections: Contact Info, CRM, Partner/Vendor, Notes, Interactions, Linked Records.

**Step 2: Import EditableFormRow and define contact fields by section**

```tsx
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'

const CONTACT_INFO_FIELDS: EditableField[] = [
  { key: 'job_title', label: 'Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'text', isLink: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'mobile_phone', label: 'Mobile', type: 'text' },
  { key: 'work_phone', label: 'Work Phone', type: 'text' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'text', isLink: true },
  { key: 'website', label: 'Website', type: 'text', isLink: true },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
]

const CONTACT_CRM_FIELDS: EditableField[] = [
  { key: 'categorization', label: 'Categorization', type: 'singleSelect',
    options: ['Lead', 'Customer', 'Partner', 'Other', 'Unknown', 'Vendor', 'Talent'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Real Estate', 'Consulting', 'Other', 'Hospitality', 'Logistics', 'Fitness', 'Legal', 'Media', 'Design', 'Venture Capital', 'Retail', 'Entertainment'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Website', 'Inbound', 'Outbound', 'Event', 'Social Media', 'Other', 'LinkedIn', 'Cold Call'] },
  { key: 'qualification_status', label: 'Qualification', type: 'singleSelect',
    options: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Nurturing'] },
  { key: 'tags', label: 'Tags', type: 'multiSelect',
    options: ['VIP', 'Investor', 'Speaker', 'Press', 'Influencer', 'Board Member', 'Advisor'] },
  { key: 'lead_score', label: 'Lead Score', type: 'number' },
  { key: 'last_contact_date', label: 'Last Contact', type: 'date' },
]

const CONTACT_PARTNER_FIELDS: EditableField[] = [
  { key: 'partner_type', label: 'Partner Type', type: 'singleSelect',
    options: ['Fabricator', 'AV/Lighting', 'Scenic/Set Builder', 'Architect', 'Interior Designer', 'Graphic Designer', 'F&B Consultant', 'Tech/Interactive', 'Operations Consultant', 'Production Company', 'Freelancer/Individual', 'Other', 'Client'] },
  { key: 'partner_status', label: 'Partner Status', type: 'singleSelect',
    options: ['Active - Preferred', 'Active', 'Inactive', 'Do Not Use'] },
  { key: 'quality_rating', label: 'Quality', type: 'singleSelect',
    options: ['⭐⭐⭐⭐⭐ Excellent', '⭐⭐⭐⭐ Good', '⭐⭐⭐ Average', '⭐⭐ Below Average', '⭐ Poor'] },
  { key: 'reliability_rating', label: 'Reliability', type: 'singleSelect',
    options: ['⭐⭐⭐⭐⭐ Excellent', '⭐⭐⭐⭐ Good', '⭐⭐⭐ Average', '⭐⭐ Below Average', '⭐ Poor'] },
  { key: 'rate_info', label: 'Rate Info', type: 'text' },
]
```

**Step 3: Replace each section's FormRow usage with EditableFormRow loops**

For each section (Contact Info, CRM, Partner/Vendor), replace the manually-coded form rows with `EditableFormRow` arrays using the same onSave pattern:
```tsx
onSave={async (key, val) => {
  await window.electronAPI.contacts.update(id!, { [key]: val })
  // Reload contact
  const res = await window.electronAPI.contacts.getById(id!)
  if (res.success && res.data) setContact(res.data as Record<string, unknown>)
}}
```

**Step 4: Make notes section editable**

Replace static notes display with `EditableFormRow` using `type: 'textarea'`.

**Step 5: Remove old FormRow and SectionLabel components**

Delete the local `FormRow` and replace `SectionLabel` usage — or keep `SectionLabel` if it's still useful for section headers above the grouped containers.

**Step 6: Run type check and commit**

```bash
npx tsc --noEmit
git add src/components/contacts/Contact360Page.tsx
git commit -m "feat: inline-editable contact 360 page"
```

---

## Wave 3 — Verification

### Task 7: Full type check + visual review

**Step 1: Run type check**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

**Step 2: Launch dev server and visually verify**

Run: `npm run dev`
Check each detail view:
- Tasks → select a task → verify fields are editable
- Pipeline → click a deal card → verify deal detail edits
- Projects → select a project → verify project detail edits
- Companies → click a company → verify 360 page edits
- Contacts → click a contact → verify 360 page edits

**Step 3: Verify save persistence**

1. Edit a field value in any detail view
2. Navigate away and back
3. Confirm the change persisted (went through IPC → SQLite → will sync to Airtable)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: inline-editable detail cards across all entity views"
```
