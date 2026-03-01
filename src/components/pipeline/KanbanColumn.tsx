import type { DealItem } from '@/types'
import { DealCard } from './DealCard'

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': 'var(--stage-prospecting)',
  'Qualified': 'var(--stage-qualified)',
  'Proposal Sent': 'var(--stage-proposal)',
  'Negotiation': 'var(--stage-negotiation)',
  'Closed Won': 'var(--stage-won)',
}

interface KanbanColumnProps {
  stage: string
  deals: DealItem[]
  selectedDealId: string | null
  onSelectDeal: (id: string) => void
}

export function KanbanColumn({ stage, deals, selectedDealId, onSelectDeal }: KanbanColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const stageColor = STAGE_COLORS[stage] ?? 'var(--text-secondary)'

  return (
    <div className="flex flex-col w-[232px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: stageColor }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-[0.06em] flex-1 truncate"
          style={{ color: stageColor }}
        >
          {stage}
        </span>
        <span className="text-[10px] font-semibold text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded-full">
          {deals.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            isSelected={selectedDealId === deal.id}
            onClick={() => onSelectDeal(deal.id)}
          />
        ))}
        {deals.length === 0 && (
          <div className="text-[11px] text-[var(--text-tertiary)] italic text-center py-4">
            No deals
          </div>
        )}
      </div>

      {/* Column footer — total */}
      <div className="pt-3 mt-1 border-t border-[var(--separator)]">
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] text-right px-1">
          {totalValue > 0 ? `$${totalValue.toLocaleString()}` : '—'}
        </div>
      </div>
    </div>
  )
}
