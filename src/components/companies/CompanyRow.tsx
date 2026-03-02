interface CompanyRowProps {
  company: {
    id: string
    name: string
    industry: string | null
    type: string | null
    contactCount: number
  }
  isSelected: boolean
  onClick: () => void
}

export function CompanyRow({ company, isSelected, onClick }: CompanyRowProps) {
  const { name, industry, type, contactCount } = company

  const categoryLabel = industry || type || null

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: company name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: industry/type badge + contact count */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(categoryLabel) && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] leading-none truncate max-w-[130px]">
            {categoryLabel}
          </span>
        )}
        {contactCount > 0 && (
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] leading-none tabular-nums flex-shrink-0">
            {contactCount} {contactCount === 1 ? 'contact' : 'contacts'}
          </span>
        )}
      </div>
    </div>
  )
}
