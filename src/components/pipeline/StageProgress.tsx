import { PIPELINE_STAGES, type PipelineStage } from '@/config/stages'

interface StageProgressProps {
  currentStage: PipelineStage | string
}

export function StageProgress({ currentStage }: StageProgressProps) {
  const idx = PIPELINE_STAGES.indexOf(currentStage as PipelineStage)

  return (
    <div className="flex gap-1">
      {PIPELINE_STAGES.map((stage, i) => (
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
