import type { Stage } from '@/components/shared/StageBadge'

export const STAGE_PROBABILITIES: Record<Stage, number> = {
  'Prospecting': 25,
  'Qualified': 45,
  'Proposal Sent': 65,
  'Negotiation': 80,
  'Closed Won': 100,
}

const STAGES: Stage[] = ['Prospecting', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won']

interface StageSegmentProps {
  value: Stage | null
  onChange: (stage: Stage, probability: number) => void
}

export function StageSegment({ value, onChange }: StageSegmentProps) {
  return (
    <div className="flex gap-1.5">
      {STAGES.map((stage) => {
        const isSelected = value === stage
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onChange(stage, STAGE_PROBABILITIES[stage])}
            aria-pressed={isSelected}
            className={[
              'flex-1 rounded-md border text-[10px] font-semibold py-1.5 px-1 transition-colors duration-150',
              isSelected
                ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                : 'bg-transparent text-[var(--text-secondary)] border-[var(--separator-strong)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            {stage}
          </button>
        )
      })}
    </div>
  )
}
