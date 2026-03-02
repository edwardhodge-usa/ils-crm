// DashboardPage — Matches approved mockup: ils-crm-dashboard-v3.html
// Layout: Greeting → 4 stat cards → 2 widgets (Tasks + Follow-ups) → Pipeline Snapshot
// Natural content height, scrollable, generous spacing for 1400×900 window

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from './StatCard'
import PipelineWidget from './PipelineWidget'

interface PipelineStage {
  sales_stage: string
  count: number
  total_value: number
}

interface TaskItem {
  id: string
  task?: string
  due_date?: string
  priority?: string
}

interface FollowUpContact {
  id: string
  contact_name?: string
  company?: string
  categorization?: string
  last_contact_date?: string
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v.toLocaleString()}`
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function dueLabel(dateStr?: string): { text: string; overdue: boolean } {
  if (!dateStr) return { text: '', overdue: false }
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, overdue: true }
  if (diff === 0) return { text: 'Today', overdue: false }
  if (diff === 1) return { text: 'Tomorrow', overdue: false }
  return { text: `In ${diff}d`, overdue: false }
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'rgba(52,211,153,0.2)', fg: '#34D399' },
  { bg: 'rgba(251,146,60,0.2)', fg: '#FB923C' },
  { bg: 'rgba(99,102,241,0.2)', fg: '#9C99FF' },
  { bg: 'rgba(244,63,94,0.2)', fg: '#F43F5E' },
  { bg: 'rgba(56,189,248,0.2)', fg: '#38BDF8' },
  { bg: 'rgba(168,85,247,0.2)', fg: '#A855F7' },
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Max rows per widget
const MAX_WIDGET_ROWS = 5

// ── Shared inline styles ──

const widgetBox: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--separator)',
  borderRadius: 10,
  overflow: 'hidden',
}

const widgetHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px 10px',
  borderBottom: '1px solid var(--separator)',
}

const headerLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
}

const linkBtn: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--color-accent)',
  cursor: 'default',
  background: 'none',
  border: 'none',
  fontFamily: 'inherit',
}

const rowBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 16px',
  borderBottom: '1px solid var(--separator)',
  cursor: 'default',
  transition: 'background 150ms',
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [tasksDueToday, setTasksDueToday] = useState<TaskItem[]>([])
  const [followUps, setFollowUps] = useState<FollowUpContact[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [activeContractsValue, setActiveContractsValue] = useState<number>(0)
  const [activeContractsCount, setActiveContractsCount] = useState<number>(0)
  const [openProposalsCount, setOpenProposalsCount] = useState<number>(0)
  const [openProposalsValue, setOpenProposalsValue] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const overdueCount = useMemo(() => {
    return tasksDueToday.filter(t => t.due_date && dueLabel(t.due_date).overdue).length
  }, [tasksDueToday])

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, alertsRes, pipelineRes, projectsRes, proposalsRes] = await Promise.all([
          window.electronAPI.dashboard.getTasksDueToday(),
          window.electronAPI.dashboard.getFollowUpAlerts(),
          window.electronAPI.dashboard.getPipelineSnapshot(),
          window.electronAPI.projects.getAll(),
          window.electronAPI.proposals.getAll(),
        ])

        if (tasksRes.success && tasksRes.data) setTasksDueToday(tasksRes.data as TaskItem[])
        if (alertsRes.success && alertsRes.data) setFollowUps(alertsRes.data as FollowUpContact[])
        if (pipelineRes.success && pipelineRes.data) setPipelineStages(pipelineRes.data as PipelineStage[])

        if (projectsRes.success && projectsRes.data) {
          const projects = projectsRes.data as Record<string, unknown>[]
          const active = projects.filter(p => p.status === 'Active')
          setActiveContractsValue(active.reduce((sum, p) => { const v = Number(p.contract_value); return sum + (isNaN(v) ? 0 : v) }, 0))
          setActiveContractsCount(active.length)
        }

        if (proposalsRes.success && proposalsRes.data) {
          const proposals = proposalsRes.data as Record<string, unknown>[]
          const open = proposals.filter(p => p.status !== 'Accepted' && p.status !== 'Rejected')
          setOpenProposalsCount(open.length)
          setOpenProposalsValue(open.reduce((sum, p) => { const v = Number(p.value || p.proposal_value || 0); return sum + (isNaN(v) ? 0 : v) }, 0))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-red)', fontSize: 14 }}>
        {error}
      </div>
    )
  }

  const visibleTasks = tasksDueToday.slice(0, MAX_WIDGET_ROWS)
  const visibleFollowUps = followUps.slice(0, MAX_WIDGET_ROWS)

  return (
    <div style={{ padding: 26, overflowY: 'auto', height: '100%', width: '100%' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 2 }}>
          {getGreeting()}, Edward
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          {formatDate()}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard icon={'\u{23F0}'} value={tasksDueToday.length} label="Tasks Due Today"
          subtitle={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
          variant={tasksDueToday.length > 0 ? 'red' : 'default'} />
        <StatCard icon={'\u{1F4DE}'} value={followUps.length} label="Follow-ups Due"
          subtitle=">14 days silent"
          variant={followUps.length > 0 ? 'red' : 'default'} />
        <StatCard icon={'\u{1F4C4}'} value={formatCurrency(activeContractsValue)} label="Active Contracts"
          subtitle={activeContractsCount > 0 ? `${activeContractsCount} contracts` : undefined}
          variant="green" />
        <StatCard icon={'\u{1F4CB}'} value={openProposalsCount} label="Open Proposals"
          subtitle={openProposalsValue > 0 ? `${formatCurrency(openProposalsValue)} pending` : undefined}
          variant="indigo" />
      </div>

      {/* Two widgets side by side — capped at 5 rows each */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Tasks Due Today */}
        <div style={widgetBox}>
          <div style={widgetHeader}>
            <span style={headerLabel}>Tasks Due Today</span>
            <button onClick={() => navigate('/tasks')} style={linkBtn}>View all →</button>
          </div>
          {visibleTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center' }}>
              No tasks due today
            </p>
          ) : (
            <div>
              {visibleTasks.map((task, i) => {
                const due = dueLabel(task.due_date)
                return (
                  <div key={task.id} className="hover:bg-[var(--bg-hover)]"
                    style={{ ...rowBase, borderBottom: i === visibleTasks.length - 1 ? 'none' : rowBase.borderBottom }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--text-placeholder)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.task || 'Untitled task'}
                    </span>
                    <span style={{ fontSize: 12, flexShrink: 0, color: due.overdue ? 'var(--color-red)' : 'var(--text-tertiary)' }}>
                      {due.text}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Follow-up Alerts */}
        <div style={widgetBox}>
          <div style={widgetHeader}>
            <span style={headerLabel}>Follow-up Alerts</span>
            <button onClick={() => navigate('/contacts')} style={linkBtn}>View all →</button>
          </div>
          {visibleFollowUps.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center' }}>
              No follow-ups due
            </p>
          ) : (
            <div>
              {visibleFollowUps.map((contact, i) => {
                const name = contact.contact_name || 'Unknown'
                const days = contact.last_contact_date ? daysSince(contact.last_contact_date) : 0
                const color = avatarColor(name)
                const isDanger = days >= 21
                return (
                  <div key={contact.id} className="hover:bg-[var(--bg-hover)]"
                    style={{ ...rowBase, borderBottom: i === visibleFollowUps.length - 1 ? 'none' : rowBase.borderBottom }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, background: color.bg, color: color.fg,
                    }}>
                      {initials(name)}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                    {Boolean(contact.categorization) && (
                      <span style={{ fontSize: 12, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {contact.categorization}
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0, color: isDanger ? 'var(--color-red)' : 'var(--color-orange)' }}>
                      {days}d
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Snapshot — shows all stages */}
      <PipelineWidget stages={pipelineStages} />

      {/* Settings hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--color-accent-translucent)',
        border: '1px solid var(--color-accent-translucent)',
        borderRadius: 6, padding: '7px 12px', marginTop: 10,
        fontSize: 12, color: 'var(--text-secondary)',
      }}>
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Settings → Dashboard</span>
        <span>: Configure what the Pipeline widget shows</span>
      </div>
    </div>
  )
}
