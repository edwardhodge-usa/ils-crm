import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'

export type Stage = 'Prospecting' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Closed Won'

const stageToVariant: Record<Stage, BadgeVariant> = {
  'Prospecting': 'prospecting',
  'Qualified': 'qualified',
  'Proposal Sent': 'proposal',
  'Negotiation': 'negotiation',
  'Closed Won': 'won',
}

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const variant = stageToVariant[stage] ?? 'default'
  return <Badge variant={variant} className={className}>{stage}</Badge>
}
