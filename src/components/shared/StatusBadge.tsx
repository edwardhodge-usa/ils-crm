const colorMap: Record<string, string> = {
  // Task/Proposal status
  'To Do': 'bg-[#636366]/20 text-[#98989D]',
  'In Progress': 'bg-[#0A84FF]/15 text-[#0A84FF]',
  'Waiting': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Completed': 'bg-[#34C759]/15 text-[#34C759]',
  'Cancelled': 'bg-[#636366]/20 text-[#636366]',
  'Draft': 'bg-[#636366]/20 text-[#98989D]',
  'Pending Approval': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Approved': 'bg-[#34C759]/15 text-[#34C759]',
  'Rejected': 'bg-[#FF3B30]/15 text-[#FF3B30]',
  'Sent to Client': 'bg-[#0A84FF]/15 text-[#0A84FF]',

  // Pipeline stages
  'Initial Contact': 'bg-[#636366]/20 text-[#98989D]',
  'Qualification': 'bg-[#0A84FF]/15 text-[#0A84FF]',
  'Meeting Scheduled': 'bg-[#5E5CE6]/15 text-[#5E5CE6]',
  'Proposal Sent': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Negotiation': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Contract Sent': 'bg-[#BF5AF2]/15 text-[#BF5AF2]',
  'Closed Won': 'bg-[#34C759]/15 text-[#34C759]',
  'Closed Lost': 'bg-[#FF3B30]/15 text-[#FF3B30]',
  'Future Client': 'bg-[#5E5CE6]/15 text-[#5E5CE6]',

  // Categorization
  'Lead': 'bg-[#0A84FF]/15 text-[#0A84FF]',
  'Customer': 'bg-[#34C759]/15 text-[#34C759]',
  'Partner': 'bg-[#5E5CE6]/15 text-[#5E5CE6]',
  'Vendor': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Talent': 'bg-[#BF5AF2]/15 text-[#BF5AF2]',
  'Other': 'bg-[#636366]/20 text-[#98989D]',
  'Unknown': 'bg-[#636366]/20 text-[#636366]',

  // Priority
  'High': 'bg-[#FF3B30]/15 text-[#FF3B30]',
  'Medium': 'bg-[#FF9F0A]/15 text-[#FF9F0A]',
  'Low': 'bg-[#34C759]/15 text-[#34C759]',

  // Company type
  'Active Client': 'bg-[#34C759]/15 text-[#34C759]',
  'Prospect': 'bg-[#0A84FF]/15 text-[#0A84FF]',
  'Past Client': 'bg-[#636366]/20 text-[#98989D]',

  // Portal
  'ACTIVE': 'bg-[#34C759]/15 text-[#34C759]',
  'IN-ACTIVE': 'bg-[#636366]/20 text-[#636366]',
}

const defaultColor = 'bg-[#636366]/20 text-[#98989D]'

export default function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null
  const color = colorMap[value] || defaultColor

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
      {value}
    </span>
  )
}
