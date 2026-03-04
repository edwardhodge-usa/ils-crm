import { useState } from 'react'
import type { DealItem } from '@/types'
import { CompanyLogo } from '../shared/CompanyLogo'

/** Raw stage color hex values for the badge formula (rgba with 0.10 alpha) */
const STAGE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Prospecting':  { bg: 'var(--stage-prospecting-bg)', text: 'var(--stage-prospecting)' },
  'Qualified':    { bg: 'var(--stage-qualified-bg)',    text: 'var(--stage-qualified)' },
  'Proposal Sent':{ bg: 'var(--stage-proposal-bg)',     text: 'var(--stage-proposal)' },
  'Negotiation':  { bg: 'var(--stage-negotiation-bg)',  text: 'var(--stage-negotiation)' },
  'Closed Won':   { bg: 'var(--stage-won-bg)',          text: 'var(--stage-won)' },
}

interface DealCardProps {
  deal: DealItem
  isSelected: boolean
  onClick: () => void
}

export function DealCard({ deal, isSelected, onClick }: DealCardProps) {
  const { dealName, companyName, value, probability, stage } = deal
  const [hovered, setHovered] = useState(false)
  const badgeColors = STAGE_BADGE_COLORS[stage] ?? { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
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
