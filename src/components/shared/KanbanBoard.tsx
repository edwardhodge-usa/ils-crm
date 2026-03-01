import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'

export interface KanbanColumn<T> {
  id: string
  label: string
  items: T[]
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T) => React.ReactNode
  onMove: (itemId: string, fromColumn: string, toColumn: string) => void
  onCardClick?: (itemId: string) => void
}

function DroppableColumn<T extends { id: string }>({
  column,
  renderCard,
  onCardClick,
}: {
  column: KanbanColumn<T>
  renderCard: (item: T) => React.ReactNode
  onCardClick?: (itemId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] flex-shrink-0">
      <div className="flex items-center justify-between px-2 pb-2">
        <h3 className="text-base font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {column.label}
        </h3>
        <span className="text-base text-[var(--text-tertiary)] bg-[var(--separator-opaque)] px-1.5 py-0.5 rounded-full">
          {column.items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-1.5 rounded-lg min-h-[200px] transition-colors ${
          isOver ? 'bg-[var(--color-accent)]/10' : 'bg-[var(--bg-window)]'
        }`}
      >
        {column.items.map(item => (
          <DraggableCard key={item.id} id={item.id} onCardClick={onCardClick}>
            {renderCard(item)}
          </DraggableCard>
        ))}
      </div>
    </div>
  )
}

function DraggableCard({ id, children, onCardClick }: { id: string; children: React.ReactNode; onCardClick?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const didDrag = useRef(false)

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  // Track whether a drag actually occurred
  useEffect(() => {
    if (isDragging) {
      didDrag.current = true
    }
  }, [isDragging])

  function handleClick() {
    // If a drag just completed, ignore this click
    if (didDrag.current) {
      didDrag.current = false
      return
    }
    onCardClick?.(id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-shadow cursor-default ${isDragging ? 'opacity-30' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

export default function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onMove,
  onCardClick,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const allItems = columns.flatMap(c => c.items)
  const activeItem = activeId ? allItems.find(i => i.id === activeId) : null

  function findColumn(itemId: string): string | undefined {
    return columns.find(c => c.items.some(i => i.id === itemId))?.id
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeColId = findColumn(active.id as string)
    // over.id could be a column or another card
    let overColId = columns.find(c => c.id === over.id)?.id
    if (!overColId) {
      overColId = findColumn(over.id as string)
    }

    if (activeColId && overColId && activeColId !== overColId) {
      onMove(active.id as string, activeColId, overColId)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 h-full">
        {columns.map(column => (
          <DroppableColumn
            key={column.id}
            column={column}
            renderCard={renderCard}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 shadow-xl">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
