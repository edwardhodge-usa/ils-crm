import StatusBadge from '../shared/StatusBadge'

interface ProposalRowProps {
  proposal: {
    id: string
    name: string
    status: string | null
    value: number | null
    companyName: string | null
  }
  isSelected: boolean
  onClick: () => void
}

export function ProposalRow({ proposal, isSelected, onClick }: ProposalRowProps) {
  const { name, status, value, companyName } = proposal

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: proposal name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: status badge + value + company */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && <StatusBadge value={status} />}
        {value !== null && (
          <span className="text-[10px] font-semibold text-[var(--color-green)] leading-none">
            ${value.toLocaleString()}
          </span>
        )}
        {Boolean(companyName) && (
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] leading-none truncate flex-shrink-0 max-w-[80px]">
            {companyName}
          </span>
        )}
      </div>
    </div>
  )
}
