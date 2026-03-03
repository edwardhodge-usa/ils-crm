import { useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import useEntityList from '../../hooks/useEntityList'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string | null
  priorityClean: string | null
  due_date: string | null
  type: string | null
  notes: string | null
  contacts_ids: string | null
  sales_opportunities_ids: string | null
  projects_ids: string | null
  proposal_ids: string | null
}

type Section = 'overdue' | 'today' | 'upcoming' | 'waiting' | 'nodate'
type CategoryFilter = 'all' | Section | 'completed' | string

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPES = [
  'Schedule Meeting', 'Send Qualifications', 'Follow-up Email', 'Follow-up Call',
  'Other', 'Presentation Deck', 'Research', 'Administrative',
  'Send Proposal', 'Internal Review', 'Project', 'Travel',
] as const

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  'Schedule Meeting':     { bg: 'rgba(100,210,255,0.10)', fg: '#64D2FF' },
  'Send Qualifications':  { bg: 'rgba(10,132,255,0.10)',  fg: '#0A84FF' },
  'Follow-up Email':      { bg: 'rgba(191,90,242,0.10)',  fg: '#BF5AF2' },
  'Follow-up Call':       { bg: 'rgba(52,211,153,0.10)',   fg: '#34D399' },
  'Other':                { bg: 'rgba(118,118,128,0.10)',  fg: 'var(--text-secondary)' },
  'Presentation Deck':    { bg: 'rgba(255,159,10,0.10)',   fg: '#FF9F0A' },
  'Research':             { bg: 'rgba(255,55,95,0.10)',    fg: '#FF375F' },
  'Administrative':       { bg: 'rgba(94,92,230,0.10)',    fg: '#5E5CE6' },
  'Send Proposal':        { bg: 'rgba(90,200,250,0.10)',   fg: '#5AC8FA' },
  'Internal Review':      { bg: 'rgba(255,149,0,0.10)',    fg: '#FF9500' },
  'Project':              { bg: 'rgba(52,199,89,0.10)',    fg: '#34C759' },
  'Travel':               { bg: 'rgba(255,69,58,0.10)',    fg: '#FF453A' },
}

const TYPE_SWATCH_COLORS: Record<string, string> = {
  'Schedule Meeting': '#64D2FF', 'Send Qualifications': '#0A84FF',
  'Follow-up Email': '#BF5AF2', 'Follow-up Call': '#30D158',
  'Other': '#8E8E93', 'Presentation Deck': '#FF9F0A',
  'Research': '#FF375F', 'Administrative': '#5E5CE6',
  'Send Proposal': '#5AC8FA', 'Internal Review': '#FF9500',
  'Project': '#34C759', 'Travel': '#FF453A',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function cleanPriority(raw: string | null): string | null {
  if (!raw) return null
  const p = raw.toLowerCase()
  if (p.includes('high')) return 'High'
  if (p.includes('medium')) return 'Medium'
  if (p.includes('low')) return 'Low'
  return raw
}

function priorityBorderColor(p: string | null): string {
  if (!p) return 'var(--text-tertiary)'
  if (p === 'High') return 'var(--color-red)'
  if (p === 'Medium') return 'var(--color-orange)'
  return 'var(--text-tertiary)'
}

function priorityDotColor(p: string | null): string {
  if (!p) return 'transparent'
  if (p === 'High') return 'var(--color-red)'
  if (p === 'Medium') return 'var(--color-orange)'
  return 'transparent'
}

function toTaskItem(row: Record<string, unknown>): TaskItem {
  const raw = (row.priority as string | null) ?? null
  return {
    id:            row.id as string,
    title:         (row.task as string | null) ?? '(Untitled task)',
    status:        (row.status as string | null) ?? '',
    priority:      raw,
    priorityClean: cleanPriority(raw),
    due_date:      (row.due_date as string | null) ?? null,
    type:          (row.type as string | null) ?? null,
    notes:         (row.notes as string | null) ?? null,
    contacts_ids:  (row.contacts_ids as string | null) ?? null,
    sales_opportunities_ids: (row.sales_opportunities_ids as string | null) ?? null,
    projects_ids:  (row.projects_ids as string | null) ?? null,
    proposal_ids:  (row.proposal_ids as string | null) ?? null,
  }
}

function isCompleted(t: TaskItem): boolean {
  return t.status === 'Complete' || t.status === 'Completed' || t.status === 'Cancelled'
}

function classifyTask(t: TaskItem, today: string): Section | 'complete' {
  if (isCompleted(t)) return 'complete'
  if (t.status === 'Waiting') return 'waiting'
  if (!t.due_date) return 'nodate'
  if (t.due_date < today) return 'overdue'
  if (t.due_date === today) return 'today'
  return 'upcoming'
}

function formatDue(due: string | null, section: Section): { text: string; cls: string } {
  if (!due) return { text: '', cls: '' }
  const [y, m, d] = due.split('-').map(Number)
  const today = todayStr()
  if (due === today) return { text: 'Today', cls: 'today' }
  const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    text: label,
    cls: section === 'overdue' ? 'overdue' : 'upcoming',
  }
}

// ─── Categories Pane ─────────────────────────────────────────────────────────

interface CategoriesPaneProps {
  active: CategoryFilter
  onSelect: (cat: CategoryFilter) => void
  counts: Record<string, number>
  typeCounts: Record<string, number>
}

function CategoriesPane({ active, onSelect, counts, typeCounts }: CategoriesPaneProps) {
  const smartLists: { key: CategoryFilter; label: string; color: string }[] = [
    { key: 'all',       label: 'All Tasks',  color: '#0A84FF' },
    { key: 'overdue',   label: 'Overdue',    color: '#FF453A' },
    { key: 'today',     label: 'Today',      color: '#FF9F0A' },
    { key: 'upcoming',  label: 'Scheduled',  color: '#64D2FF' },
    { key: 'nodate',    label: 'No Date',    color: '#8E8E93' },
    { key: 'waiting',   label: 'Waiting',    color: '#FFD60A' },
    { key: 'completed', label: 'Completed',  color: '#30D158' },
  ]

  return (
    <div style={{
      width: 210, flexShrink: 0, borderRight: '1px solid var(--separator)',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Smart Lists */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', padding: '10px 12px 5px' }}>
        Smart Lists
      </div>
      {smartLists.map(item => {
        const isActive = active === item.key
        const count = counts[item.key] ?? 0
        return (
          <div
            key={item.key}
            onClick={() => onSelect(item.key)}
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
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0, margin: '0 4px',
              background: isActive ? 'rgba(255,255,255,0.85)' : item.color,
            }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isActive ? 'var(--text-on-accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
              background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            }}>
              {count}
            </span>
          </div>
        )
      })}

      <div style={{ height: 1, background: 'var(--separator)', margin: '6px 12px' }} />

      {/* By Type */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', padding: '14px 12px 5px' }}>
        By Type
      </div>
      {TASK_TYPES.map(type => {
        const catKey = `type:${type}`
        const isActive = active === catKey
        const count = typeCounts[type] ?? 0
        return (
          <div
            key={type}
            onClick={() => onSelect(catKey)}
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
              width: 12, height: 8, borderRadius: 2, flexShrink: 0, margin: '0 3px 0 4px',
              background: TYPE_SWATCH_COLORS[type] ?? '#8E8E93',
            }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isActive ? 'var(--text-on-accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {type}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
              background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              opacity: count === 0 ? 0.4 : 1,
            }}>
              {count}
            </span>
          </div>
        )
      })}
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 12px 8px', lineHeight: 1.3 }}>
        Auto-populated from Airtable
      </div>
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  count: number
  icon: ReactNode
  iconColor: string
  labelColor?: string
  collapsed: boolean
  onToggle: () => void
}

function SectionHeader({ label, count, icon, iconColor, labelColor, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <div
      onClick={onToggle}
      className="cursor-default"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px 6px', transition: 'background 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <span style={{ fontSize: 11, flexShrink: 0, color: iconColor }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: labelColor || 'var(--text-secondary)', flex: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 9999 }}>
        {count}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        {collapsed ? '▶' : '▼'}
      </span>
    </div>
  )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: TaskItem
  section: Section
  isSelected: boolean
  onSelect: () => void
  onComplete: () => void
}

function TaskRow({ task, section, isSelected, onSelect, onComplete }: TaskRowProps) {
  const due = formatDue(task.due_date, section)
  const completed = isCompleted(task)
  const borderColor = completed ? 'var(--color-green)' : priorityBorderColor(task.priorityClean)
  const dotColor = priorityDotColor(task.priorityClean)
  const typeColor = task.type ? TYPE_COLORS[task.type] : null

  return (
    <div
      onClick={onSelect}
      className="cursor-default"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '11px 14px 12px',
        borderLeft: '2.5px solid',
        borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--color-accent-translucent)' : '' }}
    >
      {/* Circular checkbox */}
      <div
        onClick={e => { e.stopPropagation(); onComplete() }}
        style={{
          width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${completed ? 'var(--color-green)' : borderColor}`,
          background: completed ? 'var(--color-green)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1, transition: 'all 150ms', cursor: 'default',
        }}
      >
        {completed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 14, fontWeight: 500, color: completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flex: 1, minWidth: 0, textDecoration: completed ? 'line-through' : undefined,
          }}>
            {task.title}
          </span>
          {dotColor !== 'transparent' && !completed && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          {Boolean(due.text) && (
            <span style={{
              fontSize: 11, fontWeight: 500, flexShrink: 0,
              color: due.cls === 'overdue' ? 'var(--color-red)' : due.cls === 'today' ? 'var(--color-orange)' : 'var(--text-tertiary)',
            }}>
              {due.text}
            </span>
          )}
          {typeColor && task.type && (
            <span style={{
              fontSize: 10, fontWeight: 500, padding: '2px 6px',
              borderRadius: 4, flexShrink: 0, opacity: 0.85,
              background: typeColor.bg, color: typeColor.fg,
            }}>
              {task.type}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Task Detail Pane ────────────────────────────────────────────────────────

interface TaskDetailProps {
  task: TaskItem | null
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onNavigateEdit: (id: string) => void
}

function TaskDetail({ task, onComplete, onDelete, onNavigateEdit }: TaskDetailProps) {
  if (!task) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Select a task to view details
      </div>
    )
  }

  const completed = isCompleted(task)
  const borderColor = completed ? 'var(--color-green)' : priorityBorderColor(task.priorityClean)
  const typeColor = task.type ? TYPE_COLORS[task.type] : null

  // Calculate overdue days
  let overdueLabel = ''
  if (task.due_date && !completed) {
    const today = new Date()
    const [y, m, d] = task.due_date.split('-').map(Number)
    const due = new Date(y, m - 1, d)
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 0) overdueLabel = `Overdue by ${diffDays} day${diffDays === 1 ? '' : 's'}`
    else if (diffDays === 0) overdueLabel = 'Due today'
  }

  const formatDetailDate = (raw: string | null) => {
    if (!raw) return '—'
    const [y, m, d] = raw.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Priority badge
  const priorityBadge = task.priorityClean ? (
    <span style={{
      fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: task.priorityClean === 'High' ? 'rgba(255,69,58,0.12)' : task.priorityClean === 'Medium' ? 'rgba(255,159,10,0.12)' : 'rgba(118,118,128,0.12)',
      color: task.priorityClean === 'High' ? 'var(--color-red)' : task.priorityClean === 'Medium' ? 'var(--color-orange)' : 'var(--text-secondary)',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${priorityBorderColor(task.priorityClean)}`, flexShrink: 0 }} />
      {task.priorityClean}
    </span>
  ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>

  // Status badge
  const statusBadge = task.status ? (
    <span style={{
      fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
      background: 'rgba(10,132,255,0.12)', color: 'var(--color-accent)',
    }}>
      {task.status}
    </span>
  ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>

  // Type badge
  const typeBadge = task.type && typeColor ? (
    <span style={{
      fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
      background: typeColor.bg, color: typeColor.fg,
    }}>
      {task.type}
    </span>
  ) : <span style={{ color: 'var(--text-secondary)' }}>—</span>

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <div
          onClick={() => onComplete(task.id)}
          style={{
            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${completed ? 'var(--color-green)' : borderColor}`,
            background: completed ? 'var(--color-green)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 2, cursor: 'default', transition: 'all 150ms',
          }}
        >
          {completed && (
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
            lineHeight: 1.3, marginBottom: 3, borderRadius: 4, padding: '2px 4px', marginLeft: -4,
          }}>
            {task.title}
          </div>
          {Boolean(overdueLabel) && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{overdueLabel}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {!completed && (
            <button
              onClick={() => onComplete(task.id)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
                background: 'var(--color-accent)', color: 'var(--text-on-accent)',
                border: 'none', cursor: 'default', minHeight: 24,
                display: 'inline-flex', alignItems: 'center', transition: 'background 150ms',
              }}
            >
              Complete
            </button>
          )}
          <button
            onClick={() => onNavigateEdit(task.id)}
            title="Edit task"
            style={{
              fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              border: 'none', cursor: 'default', minHeight: 24,
              display: 'inline-flex', alignItems: 'center', transition: 'background 150ms',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
              color: 'var(--color-red)', background: 'none',
              border: 'none', cursor: 'default', minHeight: 24,
              display: 'inline-flex', alignItems: 'center', transition: 'background 150ms',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Apple form rows */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {/* Due Date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Due Date</span>
          <span style={{
            fontSize: 13, fontWeight: 400,
            color: task.due_date && task.due_date < todayStr() && !completed ? 'var(--color-red)' : 'var(--text-secondary)',
          }}>
            {formatDetailDate(task.due_date)}
          </span>
        </div>
        {/* Priority */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Priority</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {priorityBadge}
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>⌃</span>
          </div>
        </div>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Status</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {statusBadge}
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>⌃</span>
          </div>
        </div>
        {/* Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', minHeight: 36 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Type</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {typeBadge}
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>⌃</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
        Notes
      </div>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '10px 12px',
        minHeight: 60, fontSize: 13, lineHeight: 1.5, marginBottom: 16,
        color: task.notes ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontStyle: task.notes ? 'normal' : 'italic',
      }}>
        {task.notes || 'No notes added yet.'}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const navigate = useNavigate()
  const { data: rawTasks, loading, error, reload } = useEntityList(() => window.electronAPI.tasks.getAll())
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const today = todayStr()
  const allTasks = useMemo(() => rawTasks.map(toTaskItem), [rawTasks])

  // Counts for categories
  const { counts, typeCounts, sectionGroups } = useMemo(() => {
    const counts: Record<string, number> = { all: 0, overdue: 0, today: 0, upcoming: 0, nodate: 0, waiting: 0, completed: 0 }
    const typeCounts: Record<string, number> = {}
    const sectionGroups: Record<string, TaskItem[]> = { overdue: [], today: [], upcoming: [], waiting: [], nodate: [] }

    for (const t of allTasks) {
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

    // Sort each section by due_date
    const byDate = (a: TaskItem, b: TaskItem) =>
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
    for (const key of Object.keys(sectionGroups)) {
      sectionGroups[key].sort(byDate)
    }

    return { counts, typeCounts, sectionGroups }
  }, [allTasks, today])

  // Filtered tasks based on category
  const filteredTasks = useMemo(() => {
    let tasks: TaskItem[]

    if (activeCategory === 'all') {
      tasks = allTasks.filter(t => !isCompleted(t))
    } else if (activeCategory === 'completed') {
      tasks = allTasks.filter(t => isCompleted(t))
    } else if (activeCategory.startsWith('type:')) {
      const type = activeCategory.slice(5)
      tasks = allTasks.filter(t => t.type === type)
    } else {
      tasks = sectionGroups[activeCategory] || []
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q))
    }

    return tasks
  }, [activeCategory, allTasks, sectionGroups, searchQuery])

  // Group filtered tasks into sections (only for "all" view)
  const showSections = activeCategory === 'all'

  const selectedTask = useMemo(() => allTasks.find(t => t.id === selectedId) ?? null, [allTasks, selectedId])

  const handleComplete = useCallback(async (id: string) => {
    await window.electronAPI.tasks.update(id, { status: 'Completed' })
    reload()
  }, [reload])

  const handleDelete = useCallback(async (id: string) => {
    await window.electronAPI.tasks.delete(id)
    setSelectedId(null)
    reload()
  }, [reload])

  const toggleSection = useCallback((key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-red)]">
        {error}
      </div>
    )
  }

  // Section rendering for "All Tasks" view
  const sectionOrder: { key: Section; label: string; icon: ReactNode; iconColor: string; labelColor?: string }[] = [
    { key: 'overdue', label: 'Overdue', icon: '⚠', iconColor: 'var(--color-red)', labelColor: 'var(--color-red)' },
    { key: 'today', label: 'Today', icon: '◉', iconColor: 'var(--color-orange)' },
    { key: 'upcoming', label: 'Upcoming', icon: '◎', iconColor: 'var(--text-secondary)' },
    { key: 'waiting', label: 'Waiting On', icon: '⏳', iconColor: 'var(--color-yellow)' },
    { key: 'nodate', label: 'No Date', icon: '○', iconColor: 'var(--text-tertiary)' },
  ]

  const categoryLabel = activeCategory === 'all' ? 'All Tasks'
    : activeCategory === 'completed' ? 'Completed'
    : activeCategory.startsWith('type:') ? activeCategory.slice(5)
    : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Categories pane */}
      <CategoriesPane
        active={activeCategory}
        onSelect={cat => { setActiveCategory(cat); setSelectedId(null) }}
        counts={counts}
        typeCounts={typeCounts}
      />

      {/* Task List pane */}
      <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid var(--separator)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px 10px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
        }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2 }}>{categoryLabel}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 6 }}>{filteredTasks.length}</span>
          </div>
          <button
            onClick={() => navigate('/tasks/new')}
            style={{
              background: 'var(--color-accent)', color: 'var(--text-on-accent)',
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8,
              border: 'none', cursor: 'default', minHeight: 24, transition: 'background 150ms',
            }}
          >
            + New Task
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', fontSize: 12, padding: '6px 12px',
              borderRadius: 9999, border: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showSections ? (
            // Grouped by section
            sectionOrder.map(({ key, label, icon, iconColor, labelColor }) => {
              const tasks = sectionGroups[key] || []
              if (tasks.length === 0 && key !== 'today') return null
              const isCollapsed = collapsed[key] ?? false
              return (
                <div key={key} style={{ borderBottom: '1px solid var(--separator)' }}>
                  <SectionHeader
                    label={label}
                    count={tasks.length}
                    icon={icon}
                    iconColor={iconColor}
                    labelColor={labelColor}
                    collapsed={isCollapsed}
                    onToggle={() => toggleSection(key)}
                  />
                  {!isCollapsed && (
                    tasks.length === 0 ? (
                      <div style={{ padding: '8px 14px 12px', fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        No tasks
                      </div>
                    ) : (
                      tasks.map(t => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          section={key}
                          isSelected={t.id === selectedId}
                          onSelect={() => setSelectedId(t.id)}
                          onComplete={() => handleComplete(t.id)}
                        />
                      ))
                    )
                  )}
                </div>
              )
            })
          ) : (
            // Flat list (filtered by category)
            filteredTasks.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No tasks
              </div>
            ) : (
              filteredTasks.map(t => {
                const section = classifyTask(t, today)
                return (
                  <TaskRow
                    key={t.id}
                    task={t}
                    section={section === 'complete' ? 'upcoming' : section}
                    isSelected={t.id === selectedId}
                    onSelect={() => setSelectedId(t.id)}
                    onComplete={() => handleComplete(t.id)}
                  />
                )
              })
            )
          )}
        </div>
      </div>

      {/* Task Detail pane */}
      <TaskDetail
        task={selectedTask}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onNavigateEdit={id => navigate(`/tasks/${id}/edit`)}
      />
    </div>
  )
}
