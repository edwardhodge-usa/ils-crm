import StatusBadge from '../shared/StatusBadge'

interface RfqRowProps {
  rfq: {
    id: string
    title: string
    status: string | null
    companyName: string | null
    requestDate: string | null
  }
  isSelected: boolean
  onClick: () => void
}

export function RfqRow({ rfq, isSelected, onClick }: RfqRowProps) {
  const { title, status, companyName, requestDate } = rfq

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: RFQ title */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {title}
      </div>

      {/* Line 2: status badge + company name + request date */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && <StatusBadge value={status} />}
        {Boolean(companyName) && (
          <span className="text-[12px] text-[var(--text-tertiary)] leading-none truncate">
            {companyName}
          </span>
        )}
        {Boolean(requestDate) && (
          <span className="ml-auto text-[12px] text-[var(--text-tertiary)] leading-none flex-shrink-0 tabular-nums">
            {requestDate}
          </span>
        )}
      </div>
    </div>
  )
}
