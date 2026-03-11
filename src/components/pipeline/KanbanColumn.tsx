import { useDroppable } from '@dnd-kit/core'
import type { DealItem } from '@/types'
import { DealCard } from './DealCard'

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': 'var(--color-yellow)',
  'Qualified': 'var(--color-orange)',
  'Business Development': 'var(--color-purple)',
  'Proposal Sent': 'var(--color-indigo)',
  'Negotiation': 'var(--color-teal)',
  'Closed Won': 'var(--color-green)',
  'Closed Lost': 'var(--color-red)',
}

interface KanbanColumnProps {
  stage: string
  deals: DealItem[]
  selectedDealId: string | null
  onSelectDeal: (id: string) => void
}

export function KanbanColumn({ stage, deals, selectedDealId, onSelectDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const stageColor = STAGE_COLORS[stage] ?? 'var(--text-secondary)'

  return (
    <div className="flex flex-col flex-shrink-0 w-[200px]">
      {/* Column header */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ padding: '0 4px 8px' }}
      >
        {/* Colored dot */}
        <div
          className="flex-shrink-0"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: stageColor,
          }}
        />
        {/* Stage name */}
        <span
          className="flex-1 truncate"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {stage}
        </span>
        {/* Count badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '2px 6px',
            borderRadius: 9999,
            lineHeight: 1,
          }}
        >
          {deals.length}
        </span>
      </div>

      {/* Column total */}
      <div
        className="flex-shrink-0"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          padding: '0 4px 6px',
        }}
      >
        {totalValue > 0 ? `$${totalValue.toLocaleString()}` : '—'}
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex flex-col flex-1 min-h-0"
        style={{
          background: isOver ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
          borderRadius: 12,
          padding: 8,
          gap: 8,
          overflowY: 'auto',
          transition: 'background 150ms',
        }}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            id={deal.id}
            deal={deal}
            isSelected={selectedDealId === deal.id}
            onClick={() => onSelectDeal(deal.id)}
          />
        ))}
        {deals.length === 0 && (
          <div
            className="text-center"
            style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '16px 0' }}
          >
            No deals
          </div>
        )}
      </div>
    </div>
  )
}
