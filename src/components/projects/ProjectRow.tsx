import StatusBadge from '../shared/StatusBadge'

interface ProjectRowProps {
  project: {
    id: string
    name: string
    status: string | null
    companyName: string | null
  }
  isSelected: boolean
  onClick: () => void
}

export function ProjectRow({ project, isSelected, onClick }: ProjectRowProps) {
  const { name, status, companyName } = project

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: project name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: status badge + company name */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && (
          <StatusBadge value={status} />
        )}
        {Boolean(companyName) && (
          <span className="text-[10px] text-[var(--text-tertiary)] leading-none truncate">
            {companyName}
          </span>
        )}
      </div>
    </div>
  )
}
