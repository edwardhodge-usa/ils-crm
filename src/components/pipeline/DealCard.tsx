import { StageBadge } from '@/components/shared'
import type { DealItem } from '@/types'

interface DealCardProps {
  deal: DealItem
  isSelected: boolean
  onClick: () => void
}

export function DealCard({ deal, isSelected, onClick }: DealCardProps) {
  const { dealName, companyName, value, probability, stage, daysInStage } = deal

  return (
    <div
      onClick={onClick}
      className={`deal-card p-3 rounded-xl cursor-default transition-all duration-[150ms] border ${
        isSelected
          ? 'deal-card--selected bg-[var(--bg-sheet)] border-[var(--color-accent)] shadow-[0_0_0_1px_var(--color-accent-translucent)]'
          : 'bg-[var(--bg-card)] border-transparent hover:bg-[var(--bg-sheet)] hover:border-[var(--separator)]'
      }`}
    >
      {/* Company name */}
      {companyName && (
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] truncate mb-0.5">
          {companyName}
        </div>
      )}

      {/* Deal name */}
      <div className="text-[12px] font-medium text-[var(--text-primary)] leading-tight mb-2 line-clamp-2">
        {dealName}
      </div>

      {/* Value */}
      <div className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight mb-2">
        {value != null ? `$${value.toLocaleString()}` : '—'}
      </div>

      {/* Bottom row: probability + days */}
      <div className="flex items-center justify-between gap-2">
        <StageBadge stage={stage} />
        <div className="flex items-center gap-2 flex-shrink-0">
          {probability != null && (
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
              {probability}%
            </span>
          )}
          {daysInStage != null && (
            <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
              {daysInStage}d
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
