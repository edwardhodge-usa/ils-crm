// PipelineWidget — configurable pipeline summary block for the Dashboard
// Three display modes: active-opps (bar chart by stage), active-contracts (list), combined-total (big number)

import { useState, useRef, useEffect } from 'react'

export type PipelineMode = 'active-opps' | 'active-contracts' | 'combined-total'

interface PipelineStage {
  sales_stage: string
  count: number
  total_value: number
}

interface ContractItem {
  id: string
  name: string
  value: number | null
  closeDate: string | null
}

interface PipelineWidgetProps {
  mode: PipelineMode
  onModeChange: (mode: PipelineMode) => void
  stages: PipelineStage[]
  contracts: ContractItem[]
  combinedTotal: number
}

const STAGE_DOTS: Record<string, string> = {
  Prospecting: 'bg-[var(--stage-prospecting)]',
  Qualified: 'bg-[var(--stage-qualified)]',
  'Proposal Sent': 'bg-[var(--stage-proposal)]',
  Negotiation: 'bg-[var(--stage-negotiation)]',
  'Closed Won': 'bg-[var(--stage-won)]',
}

const MODE_LABELS: Record<PipelineMode, string> = {
  'active-opps': 'Active Opportunities',
  'active-contracts': 'Active Contracts',
  'combined-total': 'Combined Total',
}

function formatCurrency(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function PipelineWidget({
  mode,
  onModeChange,
  stages,
  contracts,
  combinedTotal,
}: PipelineWidgetProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const maxCount = stages.length > 0 ? Math.max(...stages.map(s => s.count)) : 1

  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--separator)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
          Pipeline
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            title="Change view"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-0.5 rounded"
            aria-label="Pipeline view options"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="3" r="1.2" fill="currentColor" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              <circle cx="7" cy="11" r="1.2" fill="currentColor" />
            </svg>
          </button>

          {/* Inline dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-6 z-[var(--z-overlay)] w-48 bg-[var(--bg-sheet)] border border-[var(--separator-strong)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] overflow-hidden">
              {(Object.entries(MODE_LABELS) as [PipelineMode, string][]).map(([modeKey, modeLabel]) => (
                <button
                  key={modeKey}
                  onClick={() => {
                    onModeChange(modeKey)
                    setDropdownOpen(false)
                  }}
                  className={[
                    'w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 transition-colors',
                    mode === modeKey
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent-translucent)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                  ].join(' ')}
                >
                  {mode === modeKey && (
                    <span className="text-[var(--color-accent)] font-bold">✓</span>
                  )}
                  {mode !== modeKey && <span className="w-[10px]" />}
                  {modeLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mode: active-opps — horizontal bar chart by stage */}
      {mode === 'active-opps' && (
        <div>
          {stages.length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)] py-4 text-center">No active opportunities</p>
          ) : (
            <div className="space-y-2.5">
              {stages.map(stage => {
                const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
                const dotClass = STAGE_DOTS[stage.sales_stage] ?? 'bg-[var(--text-tertiary)]'
                return (
                  <div key={stage.sales_stage} className="flex items-center gap-2">
                    {/* Stage dot + name */}
                    <div className="flex items-center gap-1.5 w-[130px] flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                      <span className="text-[11px] text-[var(--text-secondary)] truncate">
                        {stage.sales_stage}
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-[var(--duration-slow)]"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    {/* Count badge */}
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] w-5 text-right flex-shrink-0">
                      {stage.count}
                    </span>
                    {/* Value */}
                    <span className="text-[11px] text-[var(--text-tertiary)] w-[72px] text-right flex-shrink-0">
                      {formatCurrency(stage.total_value)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mode: active-contracts — list */}
      {mode === 'active-contracts' && (
        <div>
          {contracts.length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)] py-4 text-center">No active contracts</p>
          ) : (
            <div className="space-y-1.5">
              {contracts.map(contract => (
                <div key={contract.id} className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-[var(--text-primary)] truncate flex-1 mr-2">
                    {contract.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] mr-3 flex-shrink-0">
                    {contract.value != null ? formatCurrency(contract.value) : '—'}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
                    {contract.closeDate ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode: combined-total — single large number */}
      {mode === 'combined-total' && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <p
              className="text-[36px] font-bold leading-tight"
              style={{ color: 'var(--color-accent)' }}
            >
              {formatCurrency(combinedTotal)}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Total closed + active contract value
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
