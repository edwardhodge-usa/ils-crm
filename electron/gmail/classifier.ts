import type { EmailCandidate, RelationshipType } from './types'

export interface ClassificationResult {
  relationshipType: RelationshipType
  confidence: number // 0-60 (heuristic range)
}

export function classifyCandidate(candidate: EmailCandidate): ClassificationResult {
  let score = 0

  // Thread frequency (0-20 points)
  score += Math.min(candidate.threadCount * 3, 20)

  // From vs CC ratio (0-15 points) — direct correspondents score higher
  const total = candidate.fromCount + candidate.toCount + candidate.ccCount
  if (total > 0) {
    const directRatio = (candidate.fromCount + candidate.toCount) / total
    score += Math.round(directRatio * 15)
  }

  // Time span (0-10 points) — longer relationships score higher
  const daySpan = (candidate.lastSeenDate.getTime() - candidate.firstSeenDate.getTime()) / (1000 * 60 * 60 * 24)
  score += Math.min(Math.round(daySpan / 10), 10)

  // Discovery method bonus (0-5 points)
  if (candidate.discoveredVia === 'From') score += 5
  else if (candidate.discoveredVia === 'To') score += 3
  else if (candidate.discoveredVia === 'CC') score += 1

  // Has display name (0-5 points)
  if (candidate.displayName) score += 5

  // Cap at 60
  const confidence = Math.min(score, 60)

  // Relationship type — heuristic (Phase 2 upgrades with AI)
  const relationshipType: RelationshipType = 'Unknown'

  return { relationshipType, confidence }
}
