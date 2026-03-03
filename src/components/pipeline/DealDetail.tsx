import { useEffect, useState } from 'react'
import { StageBadge } from '@/components/shared'
import { StageProgress } from './StageProgress'
import type { Stage } from '@/components/shared'

interface DealDetailProps {
  dealId: string | null
  onClose: () => void
}

export function DealDetail({ dealId, onClose }: DealDetailProps) {
  const [deal, setDeal] = useState<Record<string, unknown> | null>(null)
  const [linkedTasks, setLinkedTasks] = useState<Record<string, unknown>[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!dealId) {
      setVisible(false)
      // Delay clearing deal data until slide-out animation completes
      const t = setTimeout(() => {
        setDeal(null)
        setLinkedTasks([])
      }, 250)
      return () => clearTimeout(t)
    }

    setVisible(false)
    setDeal(null)
    setLinkedTasks([])

    let cancelled = false

    async function load() {
      if (!dealId) return

      const [dealRes, tasksRes] = await Promise.all([
        window.electronAPI.opportunities.getById(dealId),
        window.electronAPI.tasks.getAll(),
      ])

      if (cancelled) return

      if (dealRes.success && dealRes.data) {
        setDeal(dealRes.data as Record<string, unknown>)
      }

      if (tasksRes.success && tasksRes.data) {
        const allTasks = tasksRes.data as Record<string, unknown>[]
        const filtered = allTasks.filter(t => {
          const raw = t.sales_opportunities_ids
          if (!raw) return false
          try {
            const ids: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray(ids) && ids.includes(dealId)
          } catch {
            return false
          }
        })
        setLinkedTasks(filtered)
      }

      // Trigger slide-in after data is ready
      requestAnimationFrame(() => {
        if (!cancelled) setVisible(true)
      })
    }

    load()
    return () => { cancelled = true }
  }, [dealId])

  // Trigger slide-in when panel first mounts with a dealId
  useEffect(() => {
    if (dealId && deal) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [dealId, deal])

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-[300px] bg-[var(--bg-sheet)] border-l border-[var(--separator)] z-10 flex flex-col"
      style={{
        boxShadow: 'var(--shadow-lg)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms cubic-bezier(0,0,0.2,1)',
      }}
    >
      {deal ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--separator)] flex-shrink-0">
            <StageBadge stage={(deal.sales_stage as Stage) || 'Prospecting'} />
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[13px] cursor-default"
            >
              ✕
            </button>
          </div>

          {/* Deal name + company */}
          <div className="px-4 pt-3 pb-2 border-b border-[var(--separator)] flex-shrink-0">
            <div className="text-[15px] font-bold text-[var(--text-primary)] leading-tight mb-0.5">
              {(deal.opportunity_name as string) || '—'}
            </div>
            {Boolean(deal.company_name) && (
              <div className="text-[12px] text-[var(--text-secondary)]">{deal.company_name as string}</div>
            )}
          </div>

          {/* Value + stage progress */}
          <div className="px-4 py-3 border-b border-[var(--separator)] flex-shrink-0">
            <div className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight leading-none">
              {deal.deal_value != null ? `$${Number(deal.deal_value).toLocaleString()}` : '—'}
            </div>
            <div className="mt-2">
              <StageProgress currentStage={(deal.sales_stage as string) || ''} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[12px] text-[var(--text-tertiary)]">
              {deal.probability_value != null && (
                <span>{deal.probability_value as number}% probability</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
            {['Log Activity', 'Edit Deal', 'Email'].map(label => (
              <button
                key={label}
                className="flex-1 py-1.5 text-[12px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-lg hover:opacity-80 transition-opacity duration-[150ms] cursor-default"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Details section */}
          <div className="px-4 py-3 border-b border-[var(--separator)] flex-shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">Details</div>
            <div className="flex flex-col gap-1.5 text-[12px]">
              {Boolean(deal.expected_close_date) && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Close Date</span>
                  <span className="text-[var(--text-primary)]">{deal.expected_close_date as string}</span>
                </div>
              )}
              {Boolean(deal.quals_type) && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Type</span>
                  <span className="text-[var(--text-primary)]">{deal.quals_type as string}</span>
                </div>
              )}
              {Boolean(deal.lead_source) && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Lead Source</span>
                  <span className="text-[var(--text-primary)]">{deal.lead_source as string}</span>
                </div>
              )}
            </div>
          </div>

          {/* Open Tasks section */}
          <div className="px-4 py-3 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">Tasks</div>
            {linkedTasks.length === 0 ? (
              <div className="text-[12px] text-[var(--text-tertiary)] italic">No tasks</div>
            ) : (
              linkedTasks.map(task => (
                <div
                  key={task.id as string}
                  className="flex items-start gap-2 py-1.5 border-b border-[var(--separator)] last:border-0"
                >
                  <div className="w-3.5 h-3.5 rounded border border-[var(--separator-strong)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text-primary)] leading-tight truncate">
                      {(task.task as string) || '—'}
                    </div>
                    {Boolean(task.due_date) && (
                      <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{task.due_date as string}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Loading state while data fetches */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>
        </div>
      )}
    </div>
  )
}
