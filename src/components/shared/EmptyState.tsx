interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 8,
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', maxWidth: 320 }}>
          {subtitle}
        </div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
