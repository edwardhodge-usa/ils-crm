import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { DealItem } from '@/types'
import { CompanyLogo } from '../shared/CompanyLogo'
import { stageBadgeTokens } from '@/config/stages'

interface DealCardProps {
  id: string
  deal: DealItem
  isSelected: boolean
  onClick: () => void
}

export function DealCard({ id, deal, isSelected, onClick }: DealCardProps) {
  const { dealName, companyName, value, probability, stage } = deal
  const [hovered, setHovered] = useState(false)
  const badgeColors = stageBadgeTokens(stage)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const didDrag = useRef(false)

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
    onClick()
  }

  const dragStyle = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...listeners}
      {...attributes}
      style={{
        ...dragStyle,
        background: isSelected
          ? 'var(--bg-hover)'
          : hovered
            ? 'var(--bg-hover)'
            : 'var(--bg-secondary)',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'default',
        transition: 'background 150ms',
        border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {/* Company name + logo */}
      {companyName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          {deal.companyLogoUrl && (
            <CompanyLogo name={companyName} logoUrl={deal.companyLogoUrl} size={16} />
          )}
          <span
            className="truncate"
            style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}
          >
            {companyName}
          </span>
        </div>
      )}

      {/* Deal name */}
      <div
        className="line-clamp-2"
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 8 }}
      >
        {dealName}
      </div>

      {/* Value */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        {value != null ? `$${value.toLocaleString()}` : '—'}
      </div>

      {/* Bottom row: stage badge + probability */}
      <div className="flex items-center justify-between gap-2">
        {/* Stage badge — badge formula */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: badgeColors.text,
            background: badgeColors.bg,
            padding: '2px 6px',
            borderRadius: 4,
            lineHeight: 1.2,
          }}
        >
          {stage}
        </span>
        {probability != null && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
            {probability}%
          </span>
        )}
      </div>
    </div>
  )
}
