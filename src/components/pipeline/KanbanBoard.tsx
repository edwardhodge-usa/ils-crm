import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { DealItem } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { DealCard } from './DealCard'
import { PIPELINE_STAGES } from '@/config/stages'

// Active pipeline columns — exclude terminal stages from the Kanban board
const STAGES = PIPELINE_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost')

interface KanbanBoardProps {
  deals: DealItem[]
  selectedDealId: string | null
  onSelectDeal: (id: string) => void
  onMove: (dealId: string, toStage: string) => void
}

export function KanbanBoard({ deals, selectedDealId, onSelectDeal, onMove }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage)
    return acc
  }, {} as Record<string, DealItem[]>)

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const overId = over.id as string

    // Determine target stage: over.id could be a stage name or a deal id
    let targetStage: string | undefined
    if ((STAGES as readonly string[]).includes(overId)) {
      targetStage = overId
    } else {
      // Find which stage the over deal belongs to
      for (const stage of STAGES) {
        if (dealsByStage[stage]?.some(d => d.id === overId)) {
          targetStage = stage
          break
        }
      }
    }

    if (!targetStage) return

    // Find the active deal's current stage
    const activeDealObj = deals.find(d => d.id === (active.id as string))
    if (!activeDealObj) return

    // Only move if the stage actually changed
    if (activeDealObj.stage !== targetStage) {
      onMove(active.id as string, targetStage)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
      <DragOverlay>
        {activeDeal ? (
          <div style={{ opacity: 0.9 }}>
            <DealCard
              id={activeDeal.id}
              deal={activeDeal}
              isSelected={false}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
