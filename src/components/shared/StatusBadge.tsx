const colorMap: Record<string, string> = {
  // Task/Proposal status
  'To Do': 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]',
  'In Progress': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  'Waiting': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Completed': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'Cancelled': 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]',
  'Draft': 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]',
  'Pending Approval': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Approved': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'Rejected': 'bg-[var(--color-red)]/10 text-[var(--color-red)]',
  'Sent to Client': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',

  // Pipeline stages
  'Initial Contact': 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]',
  'Qualification': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  'Meeting Scheduled': 'bg-[var(--color-indigo)]/10 text-[var(--color-indigo)]',
  'Proposal Sent': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Negotiation': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Contract Sent': 'bg-[var(--color-purple)]/10 text-[var(--color-purple)]',
  'Closed Won': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'Closed Lost': 'bg-[var(--color-red)]/10 text-[var(--color-red)]',
  'Future Client': 'bg-[var(--color-indigo)]/10 text-[var(--color-indigo)]',

  // Categorization
  'Lead': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  'Customer': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'Partner': 'bg-[var(--color-indigo)]/10 text-[var(--color-indigo)]',
  'Vendor': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Talent': 'bg-[var(--color-purple)]/10 text-[var(--color-purple)]',
  'Other': 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]',
  'Unknown': 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]',

  // Priority
  'High': 'bg-[var(--color-red)]/10 text-[var(--color-red)]',
  'Medium': 'bg-[var(--color-orange)]/10 text-[var(--color-orange)]',
  'Low': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',

  // Company type
  'Active Client': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'Prospect': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  'Past Client': 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]',

  // Portal
  'ACTIVE': 'bg-[var(--color-green)]/10 text-[var(--color-green)]',
  'IN-ACTIVE': 'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]',
}

const defaultColor = 'bg-[var(--text-tertiary)]/20 text-[var(--text-secondary)]'

export default function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null
  const color = colorMap[value] || defaultColor

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
      {value}
    </span>
  )
}
