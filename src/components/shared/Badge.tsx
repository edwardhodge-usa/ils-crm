export type BadgeVariant = 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  prospecting: 'bg-[var(--stage-prospecting-bg)] text-[var(--stage-prospecting)]',
  qualified:   'bg-[var(--stage-qualified-bg)] text-[var(--stage-qualified)]',
  proposal:    'bg-[var(--stage-proposal-bg)] text-[var(--stage-proposal)]',
  negotiation: 'bg-[var(--stage-negotiation-bg)] text-[var(--stage-negotiation)]',
  won:         'bg-[var(--stage-won-bg)] text-[var(--stage-won)]',
  default:     'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`badge--${variant} inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium leading-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
