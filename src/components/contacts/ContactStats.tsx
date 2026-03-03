interface Stat {
  label: string
  value: string | number
}

interface ContactStatsProps {
  stats: Stat[]
}

export function ContactStats({ stats }: ContactStatsProps) {
  return (
    <div className="flex border-b border-[var(--separator)]">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex-1 px-3 py-3 text-center ${i < stats.length - 1 ? 'border-r border-[var(--separator)]' : ''}`}
        >
          <div className="text-[15px] font-bold text-[var(--text-primary)] leading-tight">
            {stat.value}
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 leading-tight">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
