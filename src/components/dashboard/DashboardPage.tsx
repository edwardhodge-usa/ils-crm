import { useState, useEffect } from 'react'
import StatCard from './StatCard'
import PipelineWidget, { type PipelineMode } from './PipelineWidget'

interface PipelineStage {
  sales_stage: string
  count: number
  total_value: number
}

export default function DashboardPage() {
  // Stat card values
  const [tasksDueTodayCount, setTasksDueTodayCount] = useState<number | null>(null)
  const [followUpsDueCount, setFollowUpsDueCount] = useState<number | null>(null)
  const [activeContractsValue, setActiveContractsValue] = useState<number | null>(null)
  const [openProposalsCount, setOpenProposalsCount] = useState<number | null>(null)

  // Pipeline widget
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [combinedTotal, setCombinedTotal] = useState(0)
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>('active-opps')

  const [error, setError] = useState<string | null>(null)

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

        // Tasks due today — count
        if (tasksRes.success && tasksRes.data) {
          setTasksDueTodayCount((tasksRes.data as unknown[]).length)
        } else {
          setTasksDueTodayCount(0)
        }

        // Follow-ups due — count of contacts needing follow-up
        if (alertsRes.success && alertsRes.data) {
          setFollowUpsDueCount((alertsRes.data as unknown[]).length)
        } else {
          setFollowUpsDueCount(0)
        }

        // Pipeline stages
        if (pipelineRes.success && pipelineRes.data) {
          setPipelineStages(pipelineRes.data as PipelineStage[])
        }

        // Active contracts value — sum contract_value from projects with Active status
        if (projectsRes.success && projectsRes.data) {
          const projects = projectsRes.data as Record<string, unknown>[]
          const contractsTotal = projects
            .filter(p => p.status === 'Active')
            .reduce((sum, p) => {
              const v = Number(p.contract_value)
              return sum + (isNaN(v) ? 0 : v)
            }, 0)
          setActiveContractsValue(contractsTotal)

          // Combined total: active contract value + won opportunities value (from pipeline snapshot)
          // We'll update this after both pieces of data are available
          const stagesData = pipelineRes.success && pipelineRes.data
            ? (pipelineRes.data as PipelineStage[])
            : []
          const activeOppsTotal = stagesData.reduce((sum, s) => sum + s.total_value, 0)
          setCombinedTotal(contractsTotal + activeOppsTotal)
        } else {
          setActiveContractsValue(0)
        }

        // Open proposals — count proposals not Accepted or Rejected
        if (proposalsRes.success && proposalsRes.data) {
          const proposals = proposalsRes.data as Record<string, unknown>[]
          const open = proposals.filter(
            p => p.status !== 'Accepted' && p.status !== 'Rejected'
          ).length
          setOpenProposalsCount(open)
        } else {
          setOpenProposalsCount(0)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      }
    }
    load()
  }, [])

  function formatCurrency(v: number): string {
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-red)] text-[12px]">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      {/* Top row: 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Tasks Due Today"
          value={tasksDueTodayCount ?? '—'}
          accentColor={
            tasksDueTodayCount != null && tasksDueTodayCount > 0
              ? 'var(--color-orange)'
              : undefined
          }
        />
        <StatCard
          label="Follow-ups Due"
          value={followUpsDueCount ?? '—'}
          subtitle="30+ days since last contact"
          accentColor={
            followUpsDueCount != null && followUpsDueCount > 0
              ? 'var(--color-red)'
              : undefined
          }
        />
        <StatCard
          label="Active Contracts ($)"
          value={activeContractsValue != null ? formatCurrency(activeContractsValue) : '—'}
          accentColor="var(--color-green)"
        />
        <StatCard
          label="Open Proposals"
          value={openProposalsCount ?? '—'}
          accentColor={
            openProposalsCount != null && openProposalsCount > 0
              ? 'var(--color-accent)'
              : undefined
          }
        />
      </div>

      {/* Pipeline Widget (full width) */}
      <PipelineWidget
        mode={pipelineMode}
        onModeChange={setPipelineMode}
        stages={pipelineStages}
        contracts={[]}
        combinedTotal={combinedTotal}
      />
    </div>
  )
}
