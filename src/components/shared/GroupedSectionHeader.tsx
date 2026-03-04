interface Props {
  label: string
  count: number
}

export function GroupedSectionHeader({ label, count }: Props) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1,
      padding: '18px 12px 6px',
      fontSize: 11, fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-primary)',
      background: 'var(--bg-window)',
      borderBottom: '0.5px solid var(--separator)',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
        {count}
      </span>
    </div>
  )
}
