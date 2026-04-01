import { describe, it, expect } from 'vitest'
import { classifyCandidate } from '../../electron/gmail/classifier'
import type { EmailCandidate } from '../../electron/gmail/types'

function makeCandidate(overrides: Partial<EmailCandidate> = {}): EmailCandidate {
  return {
    email: 'sarah@acme.com', normalizedEmail: 'sarah@acme.com',
    displayName: 'Sarah Chen', firstName: 'Sarah', lastName: 'Chen',
    threadCount: 5, firstSeenDate: new Date('2026-01-01'), lastSeenDate: new Date('2026-03-01'),
    discoveredVia: 'From', fromCount: 3, toCount: 1, ccCount: 1,
    ...overrides,
  }
}

describe('classifyCandidate', () => {
  it('scores higher for more threads', () => {
    const low = classifyCandidate(makeCandidate({ threadCount: 2 }))
    const high = classifyCandidate(makeCandidate({ threadCount: 10 }))
    expect(high.confidence).toBeGreaterThan(low.confidence)
  })

  it('scores higher for From than CC-only', () => {
    const from = classifyCandidate(makeCandidate({ fromCount: 3, ccCount: 0 }))
    const cc = classifyCandidate(makeCandidate({ fromCount: 0, ccCount: 3 }))
    expect(from.confidence).toBeGreaterThan(cc.confidence)
  })

  it('confidence stays in 0-60 range', () => {
    const result = classifyCandidate(makeCandidate({ threadCount: 100, fromCount: 50 }))
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(60)
  })

  it('defaults to Unknown relationship type', () => {
    const result = classifyCandidate(makeCandidate())
    expect(result.relationshipType).toBe('Unknown')
  })
})
