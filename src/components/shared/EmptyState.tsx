interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-8 text-center">
      <div className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</div>
      {subtitle && (
        <div className="text-[13px] text-[var(--text-secondary)] max-w-xs">{subtitle}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
