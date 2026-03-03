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
      className="cursor-default"
      style={{
        padding: '9px 12px',
        borderLeft: '2.5px solid',
        borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Line 1: project name */}
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {name}
      </div>

      {/* Line 2: status badge + company name */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && (
          <StatusBadge value={status} />
        )}
        {Boolean(companyName) && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {companyName}
          </span>
        )}
      </div>
    </div>
  )
}
