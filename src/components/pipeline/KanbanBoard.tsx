import type { DealItem } from '@/types'
import { KanbanColumn } from './KanbanColumn'

const STAGES = ['Prospecting', 'Qualified', 'Business Development', 'Proposal Sent', 'Negotiation'] as const

interface KanbanBoardProps {
  deals: DealItem[]
  selectedDealId: string | null
  onSelectDeal: (id: string) => void
}

export function KanbanBoard({ deals, selectedDealId, onSelectDeal }: KanbanBoardProps) {
  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage)
    return acc
  }, {} as Record<string, DealItem[]>)

  return (
    <div className="flex gap-4 h-full overflow-x-auto px-4 py-4 pb-6">
      {STAGES.map(stage => (
        <KanbanColumn
          key={stage}
          stage={stage}
          deals={dealsByStage[stage] ?? []}
          selectedDealId={selectedDealId}
          onSelectDeal={onSelectDeal}
        />
      ))}
    </div>
  )
}
