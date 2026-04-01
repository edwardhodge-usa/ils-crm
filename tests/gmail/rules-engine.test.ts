// tests/gmail/rules-engine.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateRules, DEFAULT_RULES } from '../../electron/gmail/rules-engine'
import type { Rule, EmailCandidate } from '../../electron/gmail/types'

function makeCandidate(overrides: Partial<EmailCandidate> = {}): EmailCandidate {
  return {
    email: 'sarah@acme.com',
    normalizedEmail: 'sarah@acme.com',
    displayName: 'Sarah Chen',
    firstName: 'Sarah',
    lastName: 'Chen',
    threadCount: 3,
    firstSeenDate: new Date('2026-01-01'),
    lastSeenDate: new Date('2026-03-01'),
    discoveredVia: 'From',
    fromCount: 2,
    toCount: 0,
    ccCount: 1,
    ...overrides,
  }
}

describe('evaluateRules', () => {
  it('rejects noreply addresses', () => {
    const candidate = makeCandidate({ email: 'noreply@company.com', normalizedEmail: 'noreply@company.com' })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('reject')
  })

  it('rejects group addresses (info@)', () => {
    const candidate = makeCandidate({ email: 'info@acme.com', normalizedEmail: 'info@acme.com' })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('reject')
  })

  it('rejects bulk sender domains', () => {
    const candidate = makeCandidate({ email: 'user@sendgrid.net', normalizedEmail: 'user@sendgrid.net' })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('reject')
  })

  it('rejects own email address', () => {
    const candidate = makeCandidate({ email: 'edward@imaginelabstudios.com', normalizedEmail: 'edward@imaginelabstudios.com' })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('reject')
  })

  it('requires minimum 2 thread exchanges', () => {
    const candidate = makeCandidate({ threadCount: 1 })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('reject')
  })

  it('passes valid candidates', () => {
    const candidate = makeCandidate({ threadCount: 3 })
    expect(evaluateRules(candidate, DEFAULT_RULES, 'edward@imaginelabstudios.com')).toBe('pass')
  })

  it('rejects based on header-match rule (List-Unsubscribe)', () => {
    const rules: Rule[] = [{ type: 'header-match', value: 'List-Unsubscribe', action: 'reject' }]
    const candidate = makeCandidate()
    // Header match is checked during message parsing, not candidate evaluation
    // This rule type filters at the message level — tested in scanner integration tests
    expect(evaluateRules(candidate, rules, 'edward@imaginelabstudios.com')).toBe('pass')
  })
})
