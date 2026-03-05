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
  onContextMenu?: (e: React.MouseEvent) => void
}

export function ProposalRow({ proposal, isSelected, onClick, onContextMenu }: ProposalRowProps) {
  const { name, status, value, companyName } = proposal

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
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
      {/* Line 1: proposal name */}
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {name}
      </div>

      {/* Line 2: status badge + value + company */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && <StatusBadge value={status} />}
        {value !== null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green)', lineHeight: 1 }}>
            ${value.toLocaleString()}
          </span>
        )}
        {Boolean(companyName) && (
          <span style={{
            marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)',
            lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', flexShrink: 0, maxWidth: 80,
          }}>
            {companyName}
          </span>
        )}
      </div>
    </div>
  )
}
