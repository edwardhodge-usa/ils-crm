// DashboardPage — Gold standard grouped container pattern
// Layout: Greeting → 4 stat cards (single container) → 2 widgets (Tasks + Follow-ups) → Pipeline Snapshot
// Scrollable content, token-based colors, inline styles for design tokens

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from './StatCard'
import PipelineWidget from './PipelineWidget'
import { CompanyLogo } from '../shared/CompanyLogo'
import { Avatar } from '../shared/Avatar'

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
  companyLogoUrl?: string | null
  contact_photo_url?: string | null
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

const MAX_WIDGET_ROWS = 4

// ── Hoverable row component ──

function HoverRow({
  children,
  isLast,
  style,
}: {
  children: React.ReactNode
  isLast: boolean
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        cursor: 'default',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 150ms',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [userName, setUserName] = useState('there')
  const [tasksDueToday, setTasksDueToday] = useState<TaskItem[]>([])
  const [followUps, setFollowUps] = useState<FollowUpContact[]>([])
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [activeContractsValue, setActiveContractsValue] = useState<number>(0)
  const [activeContractsCount, setActiveContractsCount] = useState<number>(0)
  const [openProposalsCount, setOpenProposalsCount] = useState<number>(0)
  const [openProposalsValue, setOpenProposalsValue] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean>(true)

  const overdueCount = useMemo(() => {
    return tasksDueToday.filter((t) => t.due_date && dueLabel(t.due_date).overdue).length
  }, [tasksDueToday])

  useEffect(() => {
    window.electronAPI.auth.getCurrentUser().then(result => {
      if (result.success && result.data?.name) {
        const firstName = result.data.name.split(' ')[0]
        setUserName(firstName)
      }
    })
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, alertsRes, pipelineRes, projectsRes, proposalsRes, companiesRes] = await Promise.all([
          window.electronAPI.dashboard.getTasksDueToday(),
          window.electronAPI.dashboard.getFollowUpAlerts(),
          window.electronAPI.dashboard.getPipelineSnapshot(),
          window.electronAPI.projects.getAll(),
          window.electronAPI.proposals.getAll(),
          window.electronAPI.companies.getAll(),
        ])

        if (tasksRes.success && tasksRes.data) setTasksDueToday(tasksRes.data as TaskItem[])
        if (pipelineRes.success && pipelineRes.data) setPipelineStages(pipelineRes.data as PipelineStage[])

        // Build company name → logo URL map for follow-up enrichment
        const companyNameToLogo = new Map<string, string>()
        if (companiesRes.success && companiesRes.data) {
          for (const c of companiesRes.data as Record<string, unknown>[]) {
            if (c.logo_url && c.company_name) {
              companyNameToLogo.set(c.company_name as string, c.logo_url as string)
            }
          }
        }

        if (alertsRes.success && alertsRes.data) {
          const enriched = (alertsRes.data as FollowUpContact[]).map(f => ({
            ...f,
            companyLogoUrl: f.company ? companyNameToLogo.get(f.company) || null : null,
          }))
          setFollowUps(enriched)
        }

        if (projectsRes.success && projectsRes.data) {
          const projects = projectsRes.data as Record<string, unknown>[]
          const active = projects.filter((p) => p.status === 'Active')
          setActiveContractsValue(
            active.reduce((sum, p) => {
              const v = Number(p.contract_value)
              return sum + (isNaN(v) ? 0 : v)
            }, 0),
          )
          setActiveContractsCount(active.length)
        }

        if (proposalsRes.success && proposalsRes.data) {
          const proposals = proposalsRes.data as Record<string, unknown>[]
          const open = proposals.filter((p) => p.status !== 'Accepted' && p.status !== 'Rejected')
          setOpenProposalsCount(open.length)
          setOpenProposalsValue(
            open.reduce((sum, p) => {
              const v = Number(p.value || p.proposal_value || 0)
              return sum + (isNaN(v) ? 0 : v)
            }, 0),
          )
        }

        // Check if API key is configured
        try {
          const settingsRes = await window.electronAPI.settings.get('airtable_api_key')
          setHasApiKey(Boolean(settingsRes?.data))
        } catch {
          setHasApiKey(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-red)',
          fontSize: 14,
        }}
      >
        {error}
      </div>
    )
  }

  const visibleTasks = tasksDueToday.slice(0, MAX_WIDGET_ROWS)
  const visibleFollowUps = followUps.slice(0, MAX_WIDGET_ROWS)

  return (
    <div style={{ padding: 20, overflowY: 'auto', height: '100%', width: '100%' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 2,
          }}
        >
          {getGreeting()}, {userName}
        </div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{formatDate()}</div>
      </div>

      {/* 4 Stat Cards — single grouped container */}
      <div
        style={{
          background: 'var(--bg-grouped)',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          marginBottom: 12,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <StatCard
          icon={'\u{23F0}'}
          value={tasksDueToday.length}
          label="Tasks Due Today"
          subtitle={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
          variant={tasksDueToday.length > 0 ? 'red' : 'default'}
        />
        <StatCard
          icon={'\u{1F4DE}'}
          value={followUps.length}
          label="Follow-ups Due"
          subtitle=">14 days silent"
          variant={followUps.length > 0 ? 'red' : 'default'}
        />
        <StatCard
          icon={'\u{1F4C4}'}
          value={formatCurrency(activeContractsValue)}
          label="Active Contracts"
          subtitle={activeContractsCount > 0 ? `${activeContractsCount} contract${activeContractsCount === 1 ? '' : 's'}` : undefined}
          variant="green"
        />
        <StatCard
          icon={'\u{1F4CB}'}
          value={openProposalsCount}
          label="Open Proposals"
          subtitle={openProposalsValue > 0 ? `${formatCurrency(openProposalsValue)} pending` : undefined}
          variant="indigo"
          isLast
        />
      </div>

      {/* Two widgets side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Tasks Due Today */}
        <div style={{ background: 'var(--bg-grouped)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid var(--separator)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
              }}
            >
              Tasks Due Today
            </span>
            <button
              onClick={() => navigate('/tasks')}
              style={{
                fontSize: 12,
                color: 'var(--color-accent)',
                cursor: 'default',
                background: 'none',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              View all
            </button>
          </div>
          {visibleTasks.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              No tasks due today
            </p>
          ) : (
            <div>
              {visibleTasks.map((task, i) => {
                const due = dueLabel(task.due_date)
                return (
                  <HoverRow key={task.id} isLast={i === visibleTasks.length - 1}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '1.5px solid var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.task || 'Untitled task'}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        flexShrink: 0,
                        color: due.overdue ? 'var(--color-red)' : 'var(--text-secondary)',
                      }}
                    >
                      {due.text}
                    </span>
                  </HoverRow>
                )
              })}
            </div>
          )}
        </div>

        {/* Follow-up Alerts */}
        <div style={{ background: 'var(--bg-grouped)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid var(--separator)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
              }}
            >
              Follow-up Alerts
            </span>
            <button
              onClick={() => navigate('/contacts')}
              style={{
                fontSize: 12,
                color: 'var(--color-accent)',
                cursor: 'default',
                background: 'none',
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              View all
            </button>
          </div>
          {visibleFollowUps.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                padding: '24px 0',
                textAlign: 'center',
              }}
            >
              No follow-ups due
            </p>
          ) : (
            <div>
              {visibleFollowUps.map((contact, i) => {
                const name = contact.contact_name || 'Unknown'
                const days = contact.last_contact_date ? daysSince(contact.last_contact_date) : 0
                const isDanger = days >= 21
                return (
                  <HoverRow key={contact.id} isLast={i === visibleFollowUps.length - 1}>
                    <Avatar name={name} size={26} photoUrl={contact.contact_photo_url} />
                    <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </div>
                      {contact.company && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          {contact.companyLogoUrl && (
                            <CompanyLogo name={contact.company} logoUrl={contact.companyLogoUrl} size={16} />
                          )}
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.company}</span>
                        </div>
                      )}
                    </div>
                    {Boolean(contact.categorization) && (() => {
                      let display = contact.categorization || ''
                      try {
                        const parsed = JSON.parse(display)
                        if (Array.isArray(parsed)) display = parsed.join(', ')
                      } catch { /* use as-is */ }
                      return display ? (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-hover)',
                            color: 'var(--text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          {display}
                        </span>
                      ) : null
                    })()}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                        color: isDanger ? 'var(--color-red)' : 'var(--color-orange)',
                      }}
                    >
                      {days}d
                    </span>
                  </HoverRow>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Snapshot */}
      <PipelineWidget stages={pipelineStages} />

      {/* Settings hint — only when API key is NOT configured */}
      {!hasApiKey && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: '10px 14px',
            marginTop: 16,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Settings</span>
          <span>: Add your Airtable API key to enable sync</span>
        </div>
      )}
    </div>
  )
}
