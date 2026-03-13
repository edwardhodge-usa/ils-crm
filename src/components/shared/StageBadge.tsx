import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import type { PipelineStage } from '@/config/stages'

// Re-export PipelineStage as Stage for backward compatibility
export type Stage = PipelineStage

const stageToVariant: Partial<Record<Stage, BadgeVariant>> = {
  'Initial Contact':   'prospecting',
  'Qualification':     'qualified',
  'Meeting Scheduled': 'negotiation',
  'Proposal Sent':     'proposal',
  'Contract Sent':     'contract',
  'Negotiation':       'negotiation',
  'Development':       'bizdev',
  'Investment':        'investment',
  'Future Client':     'future',
  'Closed Won':        'won',
  'Closed Lost':       'lost',
}

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const variant = stageToVariant[stage] ?? 'default'
  return <Badge variant={variant} className={className}>{stage}</Badge>
}
