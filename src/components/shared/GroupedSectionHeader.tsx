interface Props {
  label: string
  count: number
}

export function GroupedSectionHeader({ label }: Props) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1,
      padding: '14px 12px 6px',
      background: 'var(--bg-window)',
      borderBottom: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-tertiary)',
        borderRadius: 6,
        padding: '3px 8px',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0,
        }}>{label}</span>
      </div>
    </div>
  )
}
