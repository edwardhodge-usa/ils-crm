/**
 * StatusBadge — renders a status/category label with rgba(color, 0.10) background.
 * Uses inline styles for reliable dark-mode token resolution (no Tailwind JIT issues).
 */

type BadgeSize = 'sm' | 'md'

// Status → CSS custom-property color (the solid text color; bg derives from rgba(color, 0.10))
const colorMap: Record<string, string> = {
  // Task/Proposal status
  'To Do':             'var(--text-tertiary)',
  'In Progress':       'var(--color-accent)',
  'Waiting':           'var(--color-orange)',
  'Completed':         'var(--color-green)',
  'Cancelled':         'var(--text-tertiary)',
  'Draft':             'var(--text-tertiary)',
  'Pending Approval':  'var(--color-orange)',
  'Approved':          'var(--color-green)',
  'Rejected':          'var(--color-red)',
  'Sent to Client':    'var(--color-accent)',

  // Pipeline stages
  'Initial Contact':   'var(--text-tertiary)',
  'Qualification':     'var(--color-accent)',
  'Meeting Scheduled': 'var(--color-indigo)',
  'Proposal Sent':     'var(--color-orange)',
  'Negotiation':       'var(--color-orange)',
  'Contract Sent':     'var(--color-purple)',
  'Closed Won':        'var(--color-green)',
  'Closed Lost':       'var(--color-red)',
  'Future Client':     'var(--color-indigo)',

  // Categorization
  'Lead':              'var(--color-accent)',
  'Customer':          'var(--color-green)',
  'Partner':           'var(--color-indigo)',
  'Vendor':            'var(--color-orange)',
  'Talent':            'var(--color-purple)',
  'Other':             'var(--text-tertiary)',
  'Unknown':           'var(--text-tertiary)',

  // Priority
  'High':              'var(--color-red)',
  'Medium':            'var(--color-orange)',
  'Low':               'var(--color-green)',

  // Company type
  'Active Client':     'var(--color-green)',
  'Prospect':          'var(--color-accent)',
  'Past Client':       'var(--text-tertiary)',

  // Portal
  'ACTIVE':            'var(--color-green)',
  'IN-ACTIVE':         'var(--text-tertiary)',
}

const defaultColor = 'var(--text-tertiary)'

interface StatusBadgeProps {
  value: string | null | undefined
  size?: BadgeSize
}

export default function StatusBadge({ value, size = 'sm' }: StatusBadgeProps) {
  if (!value) return null
  const color = colorMap[value] || defaultColor
  const fontSize = size === 'sm' ? 10 : 12

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.4,
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  )
}
