const STAGES = ['Prospecting', 'Qualified', 'Business Development', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] as const
type Stage = typeof STAGES[number]

interface StageProgressProps {
  currentStage: Stage | string
}

export function StageProgress({ currentStage }: StageProgressProps) {
  const idx = STAGES.indexOf(currentStage as Stage)

  return (
    <div className="flex gap-1">
      {STAGES.map((stage, i) => (
        <div
          key={stage}
          title={stage}
          className={`flex-1 h-[3px] rounded-full transition-all ${
            i < idx
              ? 'bg-[var(--color-accent)]'
              : i === idx
              ? 'bg-[var(--color-accent)] opacity-60'
              : 'bg-[var(--separator-strong)]'
          }`}
        />
      ))}
    </div>
  )
}
