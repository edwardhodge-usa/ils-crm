import StatusBadge from '../shared/StatusBadge'

interface ContractRowProps {
  contract: {
    id: string
    name: string
    status: string | null
    value: number | null
    startDate: string | null
  }
  isSelected: boolean
  onClick: () => void
}

export function ContractRow({ contract, isSelected, onClick }: ContractRowProps) {
  const { name, status, value, startDate } = contract

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: contract name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: status badge + value + start date */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && <StatusBadge value={status} />}
        {value !== null && (
          <span className="text-[11px] font-semibold text-[var(--color-green)] leading-none">
            ${value.toLocaleString()}
          </span>
        )}
        {Boolean(startDate) && (
          <span className="ml-auto text-[12px] text-[var(--text-tertiary)] leading-none flex-shrink-0 tabular-nums">
            {startDate}
          </span>
        )}
      </div>
    </div>
  )
}
