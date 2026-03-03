/**
 * Badge — pipeline stage badge using rgba(stageColor, 0.10) background formula.
 * Uses design tokens from tokens.css (--stage-* variables).
 */

export type BadgeVariant = 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'default'

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
    case 'prospecting':
      return { color: 'var(--stage-prospecting)', background: 'var(--stage-prospecting-bg)' }
    case 'qualified':
      return { color: 'var(--stage-qualified)', background: 'var(--stage-qualified-bg)' }
    case 'proposal':
      return { color: 'var(--stage-proposal)', background: 'var(--stage-proposal-bg)' }
    case 'negotiation':
      return { color: 'var(--stage-negotiation)', background: 'var(--stage-negotiation-bg)' }
    case 'won':
      return { color: 'var(--stage-won)', background: 'var(--stage-won-bg)' }
    default:
      return { color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }
  }
}
