/**
 * Badge — pipeline stage badge using rgba(stageColor, 0.10) background formula.
 * Uses design tokens from tokens.css (--stage-* variables).
 * Variants match Airtable "Sales Stage" field options exactly (verified 2026-03-12).
 */

export type BadgeVariant =
  | 'initial'       // Initial Contact
  | 'qualified'     // Qualification
  | 'meeting'       // Meeting Scheduled
  | 'proposal'      // Proposal Sent
  | 'contract'      // Contract Sent
  | 'negotiation'   // Negotiation
  | 'bizdev'        // Development
  | 'investment'    // Investment
  | 'future'        // Future Client
  | 'won'           // Closed Won
  | 'lost'          // Closed Lost
  // Legacy aliases (kept for any remaining callers)
  | 'prospecting'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const style = variantStyle(variant)

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap' as const,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function variantStyle(variant: BadgeVariant): { color: string; background: string } {
  switch (variant) {
    case 'initial':
    case 'prospecting':  // legacy alias → same as Initial Contact
      return { color: 'var(--stage-initial)', background: 'var(--stage-initial-bg)' }
    case 'qualified':
      return { color: 'var(--stage-qualification)', background: 'var(--stage-qualification-bg)' }
    case 'meeting':
      return { color: 'var(--stage-meeting)', background: 'var(--stage-meeting-bg)' }
    case 'proposal':
      return { color: 'var(--stage-proposal)', background: 'var(--stage-proposal-bg)' }
    case 'contract':
      return { color: 'var(--stage-contract)', background: 'var(--stage-contract-bg)' }
    case 'negotiation':
      return { color: 'var(--stage-negotiation)', background: 'var(--stage-negotiation-bg)' }
    case 'bizdev':
      return { color: 'var(--stage-development)', background: 'var(--stage-development-bg)' }
    case 'investment':
      return { color: 'var(--stage-investment)', background: 'var(--stage-investment-bg)' }
    case 'future':
      return { color: 'var(--stage-future)', background: 'var(--stage-future-bg)' }
    case 'won':
      return { color: 'var(--stage-won)', background: 'var(--stage-won-bg)' }
    case 'lost':
      return { color: 'var(--stage-lost)', background: 'var(--stage-lost-bg)' }
    default:
      return { color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }
  }
}
