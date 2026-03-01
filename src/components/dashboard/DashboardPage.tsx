import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../shared/StatusBadge'

interface DashboardStats {
  contactCount: number
  companyCount: number
  activeOpportunities: number
  activeTasks: number
  totalPipelineValue: number
  wonValue: number
}

interface PipelineStage {
  sales_stage: string
  count: number
  total_value: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tasksDue, setTasksDue] = useState<Record<string, unknown>[]>([])
  const [followUps, setFollowUps] = useState<Record<string, unknown>[]>([])
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tasksRes, alertsRes, pipelineRes] = await Promise.all([
          window.electronAPI.dashboard.getStats(),
          window.electronAPI.dashboard.getTasksDueToday(),
          window.electronAPI.dashboard.getFollowUpAlerts(),
          window.electronAPI.dashboard.getPipelineSnapshot(),
        ])

        if (statsRes.success && statsRes.data) setStats(statsRes.data as DashboardStats)
        if (tasksRes.success && tasksRes.data) setTasksDue(tasksRes.data as Record<string, unknown>[])
        if (alertsRes.success && alertsRes.data) setFollowUps(alertsRes.data as Record<string, unknown>[])
        if (pipelineRes.success && pipelineRes.data) setPipeline(pipelineRes.data as PipelineStage[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      }
    }
    load()
  }, [])

  const formatCurrency = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0 })}`

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Contacts" value={stats?.contactCount ?? 0} />
        <StatCard label="Companies" value={stats?.companyCount ?? 0} />
        <StatCard label="Active Pipeline" value={stats?.activeOpportunities ?? 0} subtitle={stats ? formatCurrency(stats.totalPipelineValue) : undefined} />
        <StatCard label="Active Tasks" value={stats?.activeTasks ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline Snapshot */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Pipeline by Stage</h3>
          {pipeline.length > 0 ? (() => {
            const maxCount = Math.max(...pipeline.map(s => s.count))
            return (
              <div className="space-y-3">
                {pipeline.map(stage => (
                  <div key={stage.sales_stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={stage.sales_stage} />
                        <span className="text-base text-[var(--text-tertiary)]">{stage.count} {stage.count === 1 ? 'deal' : 'deals'}</span>
                      </div>
                      <span className="text-base text-[var(--text-primary)] font-medium">
                        {formatCurrency(stage.total_value)}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--bg-window)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                        style={{ width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          })() : (
            <p className="text-base text-[var(--text-tertiary)]">No active pipeline data</p>
          )}
          {stats && stats.wonValue > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--separator-opaque)] flex justify-between">
              <span className="text-base text-[var(--text-tertiary)]">Total Won</span>
              <span className="text-base text-[var(--color-green)] font-medium">{formatCurrency(stats.wonValue)}</span>
            </div>
          )}
        </div>

        {/* Tasks Due Today */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Tasks Due Today</h3>
          {tasksDue.length > 0 ? (
            <div className="space-y-2">
              {tasksDue.map((t, i) => (
                <div
                  key={(t.id as string) || i}
                  className="flex items-center justify-between cursor-default hover:bg-[var(--bg-hover)] -mx-1 px-1 rounded transition-colors"
                  onClick={() => navigate(`/tasks/${t.id as string}/edit`)}
                >
                  <span className="text-base text-[var(--text-primary)]">{t.task as string}</span>
                  <StatusBadge value={t.priority as string} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base text-[var(--text-tertiary)]">No tasks due today</p>
          )}
        </div>
      </div>

      {/* Follow-Up Alerts */}
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Follow-Up Alerts
          <span className="ml-2 text-[var(--text-tertiary)] font-normal">30+ days since last contact</span>
        </h3>
        {followUps.length > 0 ? (
          <div className="space-y-2">
            {followUps.slice(0, 10).map((c, i) => (
              <div
                key={(c.id as string) || i}
                className="flex items-center justify-between cursor-default hover:bg-[var(--bg-hover)] -mx-1 px-1 rounded transition-colors"
                onClick={() => navigate(`/contacts/${c.id as string}`)}
              >
                <div>
                  <span className="text-[var(--text-primary)]">{c.contact_name as string}</span>
                  {Boolean(c.company) && <span className="text-[var(--text-tertiary)] ml-2">{c.company as string}</span>}
                </div>
                <span className="text-[var(--color-orange)]">
                  Last: {c.last_contact_date as string}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base text-[var(--text-tertiary)]">All contacts recently reached</p>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: number; subtitle?: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
      <p className="text-base text-[var(--text-tertiary)] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
      {subtitle && <p className="text-base text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
    </div>
  )
}
