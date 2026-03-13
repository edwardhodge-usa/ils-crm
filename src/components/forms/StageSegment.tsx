import { PIPELINE_STAGES, type PipelineStage } from '@/config/stages'

// Active (non-terminal) stages for the segmented picker
const ACTIVE_STAGES = PIPELINE_STAGES.filter(s => s !== 'Closed Won' && s !== 'Closed Lost')

export const STAGE_PROBABILITIES: Partial<Record<PipelineStage, number>> = {
  'Initial Contact':   10,
  'Qualification':     25,
  'Meeting Scheduled': 35,
  'Proposal Sent':     50,
  'Contract Sent':     70,
  'Negotiation':       80,
  'Development':       60,
  'Investment':        40,
  'Future Client':     15,
  'Closed Won':        100,
  'Closed Lost':       0,
}

interface StageSegmentProps {
  value: PipelineStage | null
  onChange: (stage: PipelineStage, probability: number) => void
}

export function StageSegment({ value, onChange }: StageSegmentProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {ACTIVE_STAGES.map((stage) => {
        const isSelected = value === stage
        return (
          <button
            key={stage}
            type="button"
            onClick={() => onChange(stage, STAGE_PROBABILITIES[stage] ?? 0)}
            aria-pressed={isSelected}
            className={[
              'rounded-md border text-[11px] font-semibold py-1.5 px-2 transition-colors duration-150',
              isSelected
                ? 'bg-[var(--color-accent)] text-[var(--text-on-accent)] border-[var(--color-accent)]'
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
