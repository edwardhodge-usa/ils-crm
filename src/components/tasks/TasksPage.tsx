import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string | null
  due_date: string | null
  linked_label: string | null
}

type Section = 'overdue' | 'today' | 'upcoming'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function priorityDot(priority: string | null): { color: string; label: string } {
  if (!priority) return { color: 'bg-[var(--text-placeholder)]', label: 'None' }
  const p = priority.toLowerCase()
  if (p.includes('high'))   return { color: 'bg-[var(--color-red)]',    label: 'High' }
  if (p.includes('medium')) return { color: 'bg-[var(--color-orange)]', label: 'Medium' }
  return { color: 'bg-[var(--text-tertiary)]', label: 'Low' }
}

function toTaskItem(row: Record<string, unknown>): TaskItem {
  return {
    id:            row.id            as string,
    title:         (row.task         as string | null) ?? '(Untitled task)',
    status:        (row.status       as string | null) ?? '',
    priority:      (row.priority     as string | null) ?? null,
    due_date:      (row.due_date     as string | null) ?? null,
    linked_label:  null, // linked records not resolved locally — omit for now
  }
}

function classifyTask(t: TaskItem, today: string): Section | 'complete' {
  if (t.status === 'Complete' || t.status === 'Completed' || t.status === 'Cancelled') return 'complete'
  if (!t.due_date) return 'upcoming'
  if (t.due_date < today)  return 'overdue'
  if (t.due_date === today) return 'today'
  return 'upcoming'
}

function formatDueDate(due: string | null, section: Section): { text: string; className: string } {
  if (!due) return { text: '', className: '' }
  const [y, m, d] = due.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const isOverdue = section === 'overdue'
  return {
    text: label,
    className: isOverdue
      ? 'text-[var(--color-red)]'
      : 'text-[var(--text-tertiary)]',
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string
  count: number
  icon: string
  iconColor: string
  collapsed: boolean
  onToggle: () => void
}

function SectionHeader({ label, count, icon, iconColor, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 select-none cursor-default hover:bg-[var(--bg-hover)] transition-colors duration-[150ms] border-b border-[var(--separator)]"
      onClick={onToggle}
    >
      <span className={`text-[14px] ${iconColor}`}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] flex-1">
        {label}
      </span>
      {count > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] leading-none tabular-nums">
          {count}
        </span>
      )}
      <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
        {collapsed ? '▶' : '▼'}
      </span>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: TaskItem
  section: Section
  onComplete: (id: string) => void
  onEdit: (id: string) => void
}

function TaskRow({ task, section, onComplete, onEdit }: TaskRowProps) {
  const dot = priorityDot(task.priority)
  const due  = formatDueDate(task.due_date, section)
  const isComplete = task.status === 'Complete' || task.status === 'Completed'

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--separator)] hover:bg-[var(--bg-hover)] transition-colors duration-[150ms] cursor-default group"
      onClick={() => onEdit(task.id)}
    >
      {/* Checkbox */}
      <div
        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors duration-[150ms] ${
          isComplete
            ? 'bg-[var(--color-green)] border-[var(--color-green)]'
            : 'border-[var(--separator)] hover:border-[var(--color-accent)] group-hover:border-[var(--text-tertiary)]'
        }`}
        onClick={e => { e.stopPropagation(); onComplete(task.id) }}
      >
        {isComplete && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title */}
      <div className={`flex-1 text-[13px] min-w-0 truncate ${isComplete ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
        {task.title}
      </div>

      {/* Linked entity chip */}
      {Boolean(task.linked_label) && (
        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)] leading-none truncate max-w-[100px]">
          {task.linked_label}
        </span>
      )}

      {/* Due date */}
      {Boolean(due.text) && (
        <span className={`flex-shrink-0 text-[11px] tabular-nums ${due.className}`}>
          {due.text}
        </span>
      )}

      {/* Priority dot */}
      <div
        className={`flex-shrink-0 w-2 h-2 rounded-full ${dot.color}`}
        title={dot.label}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const navigate = useNavigate()
  const { data: rawTasks, loading, error, reload } = useEntityList(() => window.electronAPI.tasks.getAll())
  const [collapsed, setCollapsed] = useState<Record<Section, boolean>>({
    overdue: false,
    today: false,
    upcoming: false,
  })

  const today = todayStr()

  const { overdue, todayTasks, upcoming } = useMemo(() => {
    const items = rawTasks.map(toTaskItem)
    const overdue:    TaskItem[] = []
    const todayTasks: TaskItem[] = []
    const upcoming:   TaskItem[] = []
    for (const t of items) {
      const section = classifyTask(t, today)
      if (section === 'overdue')   overdue.push(t)
      else if (section === 'today') todayTasks.push(t)
      else if (section === 'upcoming') upcoming.push(t)
    }
    // Sort each section by due_date ascending
    const byDate = (a: TaskItem, b: TaskItem) =>
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
    overdue.sort(byDate)
    todayTasks.sort(byDate)
    upcoming.sort(byDate)
    return { overdue, todayTasks, upcoming }
  }, [rawTasks, today])

  const toggleSection = useCallback((section: Section) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const handleComplete = useCallback(async (id: string) => {
    await window.electronAPI.tasks.update(id, { status: 'Completed' })
    reload()
  }, [reload])

  const handleEdit = useCallback((id: string) => {
    navigate(`/tasks/${id}/edit`)
  }, [navigate])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-red)]">
        {error}
      </div>
    )
  }

  const noTasks = overdue.length === 0 && todayTasks.length === 0 && upcoming.length === 0

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--separator)] flex-shrink-0">
        <h1 className="text-[15px] font-bold text-[var(--text-primary)]">Tasks</h1>
        <PrimaryButton onClick={() => navigate('/tasks/new')}>
          + New Task
        </PrimaryButton>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {noTasks ? (
          <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)]">
            No open tasks. Click + New Task to add one.
          </div>
        ) : (
          <>
            {/* Overdue */}
            {overdue.length > 0 && (
              <div>
                <SectionHeader
                  label="Overdue"
                  count={overdue.length}
                  icon="⚠"
                  iconColor="text-[var(--color-red)]"
                  collapsed={collapsed.overdue}
                  onToggle={() => toggleSection('overdue')}
                />
                {!collapsed.overdue && overdue.map(t => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    section="overdue"
                    onComplete={handleComplete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}

            {/* Today */}
            <div>
              <SectionHeader
                label="Today"
                count={todayTasks.length}
                icon="●"
                iconColor="text-[var(--color-orange)]"
                collapsed={collapsed.today}
                onToggle={() => toggleSection('today')}
              />
              {!collapsed.today && (
                todayTasks.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[var(--text-tertiary)] italic border-b border-[var(--separator)]">
                    No tasks due today.
                  </div>
                ) : (
                  todayTasks.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      section="today"
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                    />
                  ))
                )
              )}
            </div>

            {/* Upcoming */}
            <div>
              <SectionHeader
                label="Upcoming"
                count={upcoming.length}
                icon="○"
                iconColor="text-[var(--text-secondary)]"
                collapsed={collapsed.upcoming}
                onToggle={() => toggleSection('upcoming')}
              />
              {!collapsed.upcoming && (
                upcoming.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[var(--text-tertiary)] italic border-b border-[var(--separator)]">
                    No upcoming tasks.
                  </div>
                ) : (
                  upcoming.map(t => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      section="upcoming"
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                    />
                  ))
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
