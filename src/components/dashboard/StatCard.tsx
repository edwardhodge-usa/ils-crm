// StatCard — compact metric tile used in the Dashboard top row
// Props: label, value, subtitle (optional), accentColor (optional)

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  accentColor?: string
}

export default function StatCard({ label, value, subtitle, accentColor }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] p-4 border border-[var(--separator)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-fast)]">
      <p
        className="text-[24px] font-bold leading-tight"
        style={{ color: accentColor ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)] mt-1">
        {label}
      </p>
      {Boolean(subtitle) && (
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}
