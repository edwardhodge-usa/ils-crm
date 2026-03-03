import { useEffect, useState } from 'react'
import { StageProgress } from './StageProgress'

interface DealDetailProps {
  dealId: string | null
  onClose: () => void
}

/** A single form row in the grouped container */
function FormRow({
  label,
  value,
  chevron = false,
}: {
  label: string
  value: string
  chevron?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        minHeight: 36,
        borderBottom: '1px solid var(--separator)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{label}</span>
      <span className="flex items-center gap-1" style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
        {value || '—'}
        {chevron && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 2 }}>⌃</span>}
      </span>
    </div>
  )
}

/** Status badge for tasks */
function TaskStatusBadge({ status }: { status: string }) {
  const isComplete = status?.toLowerCase().includes('complete') || status?.toLowerCase().includes('done')
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 4,
        opacity: 0.85,
        background: isComplete ? 'rgba(48, 209, 88, 0.10)' : 'rgba(118, 118, 128, 0.10)',
        color: isComplete ? 'var(--color-green)' : 'var(--text-secondary)',
        lineHeight: 1.2,
      }}
    >
      {status || 'Open'}
    </span>
  )
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

  // Format engagement type (multiSelect — may be JSON array)
  function formatEngagementType(raw: unknown): string {
    if (!raw) return '—'
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch { /* not JSON */ }
    return String(raw)
  }

  return (
    <div
      className="absolute top-0 right-0 bottom-0 flex flex-col"
      style={{
        width: 300,
        background: 'var(--bg-window)',
        borderLeft: '1px solid var(--separator)',
        zIndex: 10,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms cubic-bezier(0,0,0.2,1)',
      }}
    >
      {deal ? (
        <div className="flex flex-col flex-1 min-h-0" style={{ overflowY: 'auto' }}>
          {/* Hero */}
          <div style={{ padding: '24px 20px 16px' }}>
            {/* Close button */}
            <div className="flex justify-end" style={{ marginBottom: 8 }}>
              <button
                onClick={onClose}
                className="flex items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                ✕
              </button>
            </div>

            {/* Deal name */}
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 4 }}>
              {(deal.opportunity_name as string) || '—'}
            </div>

            {/* Company name */}
            {Boolean(deal.company_name) && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {deal.company_name as string}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2" style={{ marginTop: 16 }}>
              {['Log Activity', 'Edit Deal', 'Email'].map(label => (
                <button
                  key={label}
                  className="flex-1"
                  style={{
                    padding: '6px 0',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'default',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage progress bar */}
          <div style={{ padding: '0 20px 16px' }}>
            <StageProgress currentStage={(deal.sales_stage as string) || ''} />
          </div>

          {/* Grouped container — deal fields */}
          <div style={{ margin: '0 12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <FormRow
              label="Stage"
              value={(deal.sales_stage as string) || '—'}
              chevron
            />
            <FormRow
              label="Value"
              value={deal.deal_value != null ? `$${Number(deal.deal_value).toLocaleString()}` : '—'}
            />
            <FormRow
              label="Probability"
              value={deal.probability_value != null ? `${deal.probability_value as number}%` : '—'}
            />
            <FormRow
              label="Close Date"
              value={(deal.expected_close_date as string) || '—'}
            />
            {Boolean(deal.contact_name) && (
              <FormRow
                label="Contact"
                value={deal.contact_name as string}
              />
            )}
            <FormRow
              label="Engagement Type"
              value={formatEngagementType(deal.engagement_type)}
              chevron
            />
            {Boolean(deal.quals_type) && (
              <FormRow
                label="Type"
                value={deal.quals_type as string}
                chevron
              />
            )}
            {Boolean(deal.lead_source) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  minHeight: 36,
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>Lead Source</span>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {deal.lead_source as string}
                </span>
              </div>
            )}
          </div>

          {/* Tasks section */}
          <div style={{ padding: '0 12px 16px' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: 'var(--text-secondary)',
              padding: '0 4px 8px',
            }}>
              Tasks
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {linkedTasks.length === 0 ? (
                <div style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}>
                  No linked tasks
                </div>
              ) : (
                linkedTasks.map((task, i) => (
                  <div
                    key={task.id as string}
                    className="flex items-center justify-between"
                    style={{
                      padding: '10px 14px',
                      minHeight: 36,
                      borderBottom: i < linkedTasks.length - 1 ? '1px solid var(--separator)' : 'none',
                      cursor: 'default',
                    }}
                  >
                    <span
                      className="truncate flex-1"
                      style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', marginRight: 8 }}
                    >
                      {(task.task as string) || '—'}
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <TaskStatusBadge status={(task.status as string) || ''} />
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>⌃</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action buttons at bottom */}
          <div className="flex gap-2" style={{ padding: '8px 12px 20px' }}>
            <button
              className="flex-1"
              style={{
                padding: '8px 0',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-on-accent)',
                background: 'var(--color-accent)',
                border: 'none',
                borderRadius: 8,
                cursor: 'default',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Edit
            </button>
            <button
              className="flex-1"
              style={{
                padding: '8px 0',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-red)',
                background: 'transparent',
                border: '1px solid var(--color-red)',
                borderRadius: 8,
                cursor: 'default',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        /* Loading state while data fetches */
        <div className="flex-1 flex items-center justify-center">
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading...</div>
        </div>
      )}
    </div>
  )
}
