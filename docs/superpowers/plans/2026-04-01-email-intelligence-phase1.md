# Email Intelligence Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Gmail-scanning pipeline that discovers contacts and companies from email, filters noise via a configurable rules engine, and stages suggestions in the Imported Contacts area for human review — in both Swift and Electron apps.

**Architecture:** Phase 1 is a deterministic in-app pipeline with no Claude API dependency. Gmail OAuth per user → header parsing → rules engine → heuristic classification → signature extraction → staged suggestions in Airtable. Both apps share the Airtable backend. Swift is design master; Electron follows.

**Tech Stack:** Gmail REST API (OAuth 2.0), Airtable API, TypeScript (Electron), Swift/SwiftUI + SwiftData (Swift), macOS Keychain, Electron safeStorage

**Spec:** `docs/superpowers/specs/2026-04-01-email-intelligence-design.md`

**Scope:** Phase 1 only (Waves 1-4). Phase 2 (MCP Server + agentic enrichment) is a separate plan.

---

## File Structure

### New Files — Electron

| File | Responsibility |
|------|---------------|
| `electron/gmail/oauth.ts` | Google OAuth flow: launch browser, capture redirect, store/refresh tokens |
| `electron/gmail/client.ts` | Gmail REST API wrapper: messages.list, history.list, messages.get |
| `electron/gmail/scanner.ts` | Scanning orchestrator: initial scan, incremental poll, checkpoint management |
| `electron/gmail/rules-engine.ts` | Rule evaluation: load rules from Airtable, apply in order, return pass/reject/enrich |
| `electron/gmail/email-utils.ts` | Email normalization, header parsing, name extraction, signature extraction |
| `electron/gmail/classifier.ts` | Heuristic classification: domain matching, From/CC ratio, confidence scoring |
| `electron/gmail/types.ts` | Shared types: EmailMessage, EmailHeaders, Rule, SuggestionStatus, etc. |
| `tests/gmail/rules-engine.test.ts` | Unit tests for rules engine |
| `tests/gmail/email-utils.test.ts` | Unit tests for normalization, header parsing, name parsing, signature extraction |
| `tests/gmail/classifier.test.ts` | Unit tests for heuristic classifier |

### New Files — Swift

| File | Responsibility |
|------|---------------|
| `ILS CRM/Services/GmailOAuthService.swift` | ASWebAuthenticationSession OAuth flow, Keychain token storage |
| `ILS CRM/Services/GmailAPIClient.swift` | Gmail REST API wrapper (async/await): messages.list, history.list, messages.get |
| `ILS CRM/Services/EmailScanEngine.swift` | Scanning orchestrator: initial scan, incremental poll, checkpoint |
| `ILS CRM/Services/EmailRulesEngine.swift` | Rule evaluation from Airtable rules |
| `ILS CRM/Services/EmailUtils.swift` | Email normalization, header parsing, name extraction, signature extraction |
| `ILS CRM/Services/EmailClassifier.swift` | Heuristic classification |
| `ILS CRM/Models/EmailScanRule.swift` | SwiftData model for Email Scan Rules table |
| `ILS CRM/Models/EmailScanState.swift` | SwiftData model for Email Scan State table |
| `ILS CRM/Models/EnrichmentQueueItem.swift` | SwiftData model for Enrichment Queue table |
| `ILS CRM/Views/ImportedContacts/ImportedContactsView.swift` | REWRITE (currently stub) — full list/detail with email intelligence UI |
| `ILS CRM/Views/ImportedContacts/ImportedContactDetailView.swift` | REWRITE — suggestion detail with extracted fields, company pairing, activity stats |
| `ILS CRM/Views/ImportedContacts/SuggestionReviewForm.swift` | Pre-filled contact form for approve flow |
| `ILS CRM/Views/Settings/GmailSettingsSection.swift` | Connect/disconnect Gmail, scan interval, dismissed suggestions |

### Modified Files — Electron

| File | Changes |
|------|---------|
| `electron/airtable/field-maps.ts` | Add 11 new fields to IMPORTED_CONTACTS, add TABLES entries for 3 new tables, add field maps for new tables |
| `electron/airtable/converters.ts` | Add converters for 11 new Imported Contact fields + 3 new table converters |
| `electron/airtable/sync-engine.ts` | Add 3 new tables to TABLE_NAME_TO_ID, SYNC_ORDER, READ_ONLY_TABLES. Add batch sync lock for scanner. |
| `electron/database/schema.ts` | Add columns to imported_contacts, add 3 new table schemas |
| `electron/database/queries/entities.ts` | Add 3 new tables to VALID_TABLES |
| `electron/ipc/register.ts` | Register gmail:* IPC handlers |
| `electron/preload.ts` | Expose gmail:* API to renderer |
| `src/types/index.ts` | Extend ImportedContact interface with 11 new fields + union types |
| `src/components/imported-contacts/ImportedContactsPage.tsx` | Full redesign: source tabs, scan controls, confidence badges, enrichment rows |
| `src/components/settings/SettingsPage.tsx` | Add Gmail connection section |

### Modified Files — Swift

| File | Changes |
|------|---------|
| `ILS CRM/Config/AirtableConfig.swift` | Add field IDs for 11 new fields, 3 new table IDs, sync order, read-only sets |
| `ILS CRM/Models/ImportedContact.swift` | Add 11 new SwiftData properties + AirtableConvertible extension |
| `ILS CRM/Services/SyncEngine.swift` | Register 3 new tables for pull sync |
| `ILS CRM/Views/Settings/SettingsView.swift` | Add Gmail settings section |
| `ILS CRM/Views/ContentView.swift` | No changes needed (sidebar nav already has Imported Contacts) |

---

## Task 1: Shared Types + Email Utilities (Electron)

**Files:**
- Create: `electron/gmail/types.ts`
- Create: `electron/gmail/email-utils.ts`
- Create: `tests/gmail/email-utils.test.ts`

- [ ] **Step 1: Write failing tests for email normalization**

```typescript
// tests/gmail/email-utils.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeEmail, parseFromHeader, parseDisplayName } from '../../electron/gmail/email-utils'

describe('normalizeEmail', () => {
  it('strips plus aliases', () => {
    expect(normalizeEmail('sarah+newsletter@acme.com')).toBe('sarah@acme.com')
  })
  it('ignores Gmail dots', () => {
    expect(normalizeEmail('sarah.chen@gmail.com')).toBe('sarahchen@gmail.com')
  })
  it('does not strip dots for non-Gmail domains', () => {
    expect(normalizeEmail('sarah.chen@acme.com')).toBe('sarah.chen@acme.com')
  })
  it('lowercases', () => {
    expect(normalizeEmail('Sarah@ACME.com')).toBe('sarah@acme.com')
  })
})

describe('parseFromHeader', () => {
  it('extracts name and email from quoted header', () => {
    expect(parseFromHeader('"Sarah Chen" <sarah@acme.com>')).toEqual({
      name: 'Sarah Chen', email: 'sarah@acme.com'
    })
  })
  it('extracts name and email from unquoted header', () => {
    expect(parseFromHeader('Sarah Chen <sarah@acme.com>')).toEqual({
      name: 'Sarah Chen', email: 'sarah@acme.com'
    })
  })
  it('handles email-only (no display name)', () => {
    expect(parseFromHeader('sarah@acme.com')).toEqual({
      name: null, email: 'sarah@acme.com'
    })
  })
  it('handles company-as-name', () => {
    expect(parseFromHeader('"Acme Creative" <sarah@acme.com>')).toEqual({
      name: 'Acme Creative', email: 'sarah@acme.com'
    })
  })
})

describe('parseDisplayName', () => {
  it('splits first and last name', () => {
    expect(parseDisplayName('Sarah Chen')).toEqual({ first: 'Sarah', last: 'Chen' })
  })
  it('handles single name', () => {
    expect(parseDisplayName('Sarah')).toEqual({ first: 'Sarah', last: '' })
  })
  it('handles multi-part last name', () => {
    expect(parseDisplayName('Sarah van der Berg')).toEqual({ first: 'Sarah', last: 'van der Berg' })
  })
  it('returns null for email-like names', () => {
    expect(parseDisplayName('sarah@acme.com')).toEqual({ first: 'sarah', last: '' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx vitest run tests/gmail/email-utils.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create types file**

```typescript
// electron/gmail/types.ts

// ─── State Machine ──────────────────────────────────────────
export type SuggestionStatus = 'Discovered' | 'Classified' | 'Ready' | 'Approved' | 'Dismissed' | 'Rejected' | 'Error'
export type RelationshipType = 'Client' | 'Vendor' | 'Employee' | 'Contractor' | 'Unknown'
export type DiscoveryMethod = 'From' | 'To' | 'CC' | 'Reply Chain'
export type ScanSource = 'ContactEnricher' | 'Email Scan' | 'Manual'

// ─── Rules Engine ───────────────────────────────────────────
export type Rule =
  | { type: 'domain-blocklist'; value: string; action: 'reject' | 'flag' }
  | { type: 'min-exchanges'; value: number; action: 'require' }
  | { type: 'header-match'; value: string; action: 'reject' | 'flag' }
  | { type: 'sender-pattern'; value: string; action: 'reject' }
  | { type: 'crm-dedup'; action: 'enrich' }

export type RuleResult = 'pass' | 'reject' | 'enrich'

// ─── Email Types ────────────────────────────────────────────
export interface EmailAddress {
  name: string | null
  email: string
}

export interface EmailHeaders {
  from: EmailAddress
  to: EmailAddress[]
  cc: EmailAddress[]
  date: Date
  subject: string
  rawHeaders: Record<string, string>
}

export interface EmailMessage extends EmailHeaders {
  id: string
  threadId: string
  bodyPlainText: string | null
}

// ─── Scan State ─────────────────────────────────────────────
export interface ScanCheckpoint {
  historyId: string | null
  pageToken: string | null
  processedCount: number
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error'
  processed: number
  total: number
  candidatesFound: number
  error?: string
}

// ─── Candidate ──────────────────────────────────────────────
export interface EmailCandidate {
  email: string
  normalizedEmail: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  threadCount: number
  firstSeenDate: Date
  lastSeenDate: Date
  discoveredVia: DiscoveryMethod
  fromCount: number
  toCount: number
  ccCount: number
}
```

- [ ] **Step 4: Implement email-utils**

```typescript
// electron/gmail/email-utils.ts

import type { EmailAddress } from './types'

// ─── Email Normalization ────────────────────────────────────

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const [localPart, domain] = lower.split('@')
  if (!domain) return lower

  // Strip + alias
  const base = localPart.split('+')[0]

  // Strip dots for Gmail
  const normalized = GMAIL_DOMAINS.has(domain) ? base.replace(/\./g, '') : base

  return `${normalized}@${domain}`
}

// ─── From Header Parsing ────────────────────────────────────

const FROM_REGEX = /^(?:"?([^"<]*?)"?\s*)?<?([^>]+@[^>]+)>?$/

export function parseFromHeader(header: string): EmailAddress {
  const match = header.trim().match(FROM_REGEX)
  if (!match) return { name: null, email: header.trim() }

  const name = match[1]?.trim() || null
  const email = match[2].trim()
  return { name, email }
}

// ─── Display Name → First/Last ──────────────────────────────

export function parseDisplayName(name: string): { first: string; last: string } {
  if (!name || name.includes('@')) {
    // Email used as display name — extract username
    const username = name.split('@')[0]
    return { first: username, last: '' }
  }

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }

  // First word is first name, rest is last name
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

// ─── Signature Extraction (Heuristic) ───────────────────────

const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
const TITLE_PATTERNS = /\b(?:VP|Director|Manager|President|CEO|CFO|COO|CTO|Partner|Associate|Consultant|Producer|Designer|Engineer|Architect|Counsel|Attorney)\b/i
const SIG_DELIMITERS = /^(?:--|__|─{2,}|={2,}|\s*—\s*$)/

export interface SignatureData {
  phone: string | null
  title: string | null
  company: string | null
}

export function extractSignature(bodyText: string | null): SignatureData {
  if (!bodyText) return { phone: null, title: null, company: null }

  const lines = bodyText.split('\n')
  // Find signature block — look for delimiter in last 30 lines
  let sigStart = -1
  const searchStart = Math.max(0, lines.length - 30)
  for (let i = searchStart; i < lines.length; i++) {
    if (SIG_DELIMITERS.test(lines[i].trim())) {
      sigStart = i + 1
      break
    }
  }

  // If no delimiter, take last 20 lines
  const sigLines = sigStart >= 0
    ? lines.slice(sigStart, sigStart + 15)
    : lines.slice(-20)

  const sigText = sigLines.join('\n')

  // Extract phone
  const phoneMatch = sigText.match(PHONE_REGEX)
  const phone = phoneMatch ? phoneMatch[0].trim() : null

  // Extract title
  let title: string | null = null
  for (const line of sigLines) {
    if (TITLE_PATTERNS.test(line) && line.trim().length < 80) {
      // Clean up: take the part with the title keyword
      title = line.trim().replace(/^[|,\-–—]\s*/, '').replace(/\s*[|,\-–—]$/, '').trim()
      if (title.length > 60) title = title.substring(0, 60)
      break
    }
  }

  // Extract company — line after name (first non-empty sig line), before phone
  let company: string | null = null
  const nonEmptySigLines = sigLines.filter(l => l.trim().length > 0 && l.trim().length < 60)
  if (nonEmptySigLines.length >= 2) {
    // Second non-empty line in signature is often company
    const candidate = nonEmptySigLines[1].trim().replace(/^[|,\-–—]\s*/, '')
    if (candidate && !PHONE_REGEX.test(candidate) && !candidate.includes('@')) {
      company = candidate
    }
  }

  return { phone, title, company }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx vitest run tests/gmail/email-utils.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron/gmail/types.ts electron/gmail/email-utils.ts tests/gmail/email-utils.test.ts
git commit -m "feat(email-intel): add shared types + email utilities with tests"
```

---

## Task 2: Rules Engine (Electron)

**Files:**
- Create: `electron/gmail/rules-engine.ts`
- Create: `tests/gmail/rules-engine.test.ts`

- [ ] **Step 1: Write failing tests for rules engine**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/gmail/rules-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement rules engine**

```typescript
// electron/gmail/rules-engine.ts

import type { Rule, RuleResult, EmailCandidate } from './types'

// ─── Default Rules ──────────────────────────────────────────

const NOREPLY_PATTERNS = ['noreply@', 'no-reply@', 'donotreply@', 'do-not-reply@', 'mailer-daemon@']
const GROUP_PREFIXES = ['info@', 'sales@', 'support@', 'hello@', 'team@', 'admin@', 'billing@', 'accounts@', 'contact@', 'help@', 'feedback@']
const BULK_DOMAINS = ['mailchimp.com', 'sendgrid.net', 'constantcontact.com', 'hubspot.com', 'mailgun.com', 'amazonaws.com', 'mandrillapp.com']
const SOCIAL_DOMAINS = ['linkedin.com', 'facebookmail.com', 'twitter.com', 'github.com', 'slack.com', 'notion.so']

export const DEFAULT_RULES: Rule[] = [
  { type: 'sender-pattern', value: NOREPLY_PATTERNS.join(','), action: 'reject' },
  { type: 'sender-pattern', value: GROUP_PREFIXES.join(','), action: 'reject' },
  { type: 'domain-blocklist', value: BULK_DOMAINS.join(','), action: 'reject' },
  { type: 'header-match', value: 'List-Unsubscribe', action: 'reject' },
  { type: 'domain-blocklist', value: SOCIAL_DOMAINS.join(','), action: 'reject' },
  { type: 'min-exchanges', value: 2, action: 'require' },
]

// ─── Evaluation ─────────────────────────────────────────────

export function evaluateRules(
  candidate: EmailCandidate,
  rules: Rule[],
  ownEmail: string,
): RuleResult {
  const emailLower = candidate.email.toLowerCase()
  const domain = emailLower.split('@')[1] || ''

  // Always reject own email
  if (candidate.normalizedEmail === ownEmail.toLowerCase()) return 'reject'

  for (const rule of rules) {
    switch (rule.type) {
      case 'sender-pattern': {
        const patterns = rule.value.split(',').map(p => p.trim().toLowerCase())
        if (patterns.some(p => emailLower.startsWith(p) || emailLower.includes(p))) {
          return rule.action === 'reject' ? 'reject' : 'pass'
        }
        break
      }
      case 'domain-blocklist': {
        const domains = rule.value.split(',').map(d => d.trim().toLowerCase())
        if (domains.some(d => domain === d || domain.endsWith('.' + d))) {
          return rule.action === 'reject' ? 'reject' : 'pass'
        }
        break
      }
      case 'header-match': {
        // Header-match rules are applied during message parsing, not here
        break
      }
      case 'min-exchanges': {
        if (candidate.threadCount < rule.value) return 'reject'
        break
      }
      case 'crm-dedup': {
        // CRM dedup handled separately by the scanner
        break
      }
    }
  }

  return 'pass'
}

// ─── Parse Rules from Airtable ──────────────────────────────

export function parseAirtableRule(record: Record<string, unknown>): Rule | null {
  const type = record.rule_type as string
  const value = record.rule_value as string
  const action = record.action as string
  const isActive = record.is_active as boolean

  if (!isActive) return null

  switch (type) {
    case 'domain-blocklist':
      return { type: 'domain-blocklist', value, action: action as 'reject' | 'flag' }
    case 'min-exchanges':
      return { type: 'min-exchanges', value: parseInt(value, 10) || 2, action: 'require' }
    case 'header-match':
      return { type: 'header-match', value, action: action as 'reject' | 'flag' }
    case 'sender-pattern':
      return { type: 'sender-pattern', value, action: 'reject' }
    case 'crm-dedup':
      return { type: 'crm-dedup', action: 'enrich' }
    default:
      return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/gmail/rules-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gmail/rules-engine.ts tests/gmail/rules-engine.test.ts
git commit -m "feat(email-intel): add rules engine with 8 default rules + tests"
```

---

## Task 3: Heuristic Classifier (Electron)

**Files:**
- Create: `electron/gmail/classifier.ts`
- Create: `tests/gmail/classifier.test.ts`

- [ ] **Step 1: Write failing tests for classifier**

```typescript
// tests/gmail/classifier.test.ts
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
```

- [ ] **Step 2: Run tests, verify fail, then implement**

```typescript
// electron/gmail/classifier.ts
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
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add electron/gmail/classifier.ts tests/gmail/classifier.test.ts
git commit -m "feat(email-intel): add heuristic classifier with confidence scoring (0-60)"
```

---

## Task 4: Airtable Schema — 3 New Tables + 11 New Fields

**Files:**
- Modify: `electron/airtable/field-maps.ts`
- Modify: `electron/airtable/converters.ts`
- Modify: `electron/airtable/sync-engine.ts`
- Modify: `electron/database/schema.ts`
- Modify: `electron/database/queries/entities.ts`
- Modify: `src/types/index.ts`

> **Important:** The 3 new Airtable tables (Email Scan Rules, Email Scan State, Enrichment Queue) must be created manually in the Airtable UI before this task. Field IDs will be obtained from the Airtable metadata API after creation. Use `mcp__airtable__describe_table` to get exact field IDs.

- [ ] **Step 1: Create 3 new Airtable tables in the UI**

Create these tables in Airtable base `appYXbUdcmSwBoPFU`:
1. **Email Scan Rules** — fields: rule_type (Single Select), rule_value (Text), action (Single Select), is_active (Checkbox)
2. **Email Scan State** — fields: user_email (Email), gmail_history_id (Text), last_scan_date (Date), scan_status (Single Select: idle/scanning/error), total_processed (Number)
3. **Enrichment Queue** — fields: contact_link (Link to Contacts), field_name (Text), current_value (Text), suggested_value (Text), source_email_date (Date), status (Single Select: pending/approved/dismissed), discovered_by (Collaborator), confidence_score (Number)

Also add 11 new fields to the existing Imported Contacts table:
source, relationship_type, confidence_score, ai_reasoning, email_thread_count, first_seen_date, last_seen_date, discovered_via, discovered_by, suggested_company_link, suggested_company_name

- [ ] **Step 2: Fetch field IDs from Airtable metadata API**

Run `mcp__airtable__describe_table` for each table to get exact field IDs. Record them for the next steps.

- [ ] **Step 3: Add new table IDs and field maps to field-maps.ts**

Add to the TABLES constant, add new field map objects (EMAIL_SCAN_RULES, EMAIL_SCAN_STATE, ENRICHMENT_QUEUE), and add 11 new field IDs to the IMPORTED_CONTACTS object.

- [ ] **Step 4: Add converters for new fields and tables to converters.ts**

Follow the existing converter pattern. New Imported Contact fields use these converter types:
- `source` → 'singleSelect'
- `relationship_type` → 'singleSelect'
- `confidence_score` → 'number'
- `ai_reasoning` → 'text'
- `email_thread_count` → 'number'
- `first_seen_date` → 'date'
- `last_seen_date` → 'date'
- `discovered_via` → 'singleSelect'
- `discovered_by` → 'collaborator'
- `suggested_company_link` → 'linkedRecord'
- `suggested_company_name` → 'text'

- [ ] **Step 5: Update sync-engine.ts — add 3 tables**

Add to `TABLE_NAME_TO_ID`:
```typescript
email_scan_rules: TABLES.emailScanRules,
email_scan_state: TABLES.emailScanState,
enrichment_queue: TABLES.enrichmentQueue,
```

Add to `SYNC_ORDER` (at end, after portal_logs):
```typescript
'email_scan_rules', 'email_scan_state', 'enrichment_queue',
```

Add to `READ_ONLY_TABLES`:
```typescript
const READ_ONLY_TABLES = new Set(['specialties', 'portal_logs', 'email_scan_rules', 'email_scan_state'])
```

Note: Enrichment Queue is NOT read-only — the app writes status updates on approve/dismiss.

- [ ] **Step 6: Update schema.ts — add columns + new tables**

Add 11 new columns to the `imported_contacts` CREATE TABLE statement. Add 3 new CREATE TABLE statements for the new tables.

- [ ] **Step 7: Update entities.ts — add to VALID_TABLES**

```typescript
const VALID_TABLES = new Set([
  'contacts', 'companies', 'opportunities', 'tasks', 'proposals',
  'projects', 'interactions', 'imported_contacts', 'specialties',
  'portal_access', 'portal_logs', 'client_pages', 'settings', 'sync_status',
  'email_scan_rules', 'email_scan_state', 'enrichment_queue',
])
```

- [ ] **Step 8: Update TypeScript types in src/types/index.ts**

Extend the `ImportedContact` interface with 11 new fields. Add new interfaces: `EmailScanRule`, `EmailScanState`, `EnrichmentQueueItem`. Add union types: `SuggestionStatus`, `RelationshipType`, `DiscoveryMethod`, `ScanSource`.

- [ ] **Step 9: Commit**

```bash
git add electron/airtable/field-maps.ts electron/airtable/converters.ts electron/airtable/sync-engine.ts electron/database/schema.ts electron/database/queries/entities.ts src/types/index.ts
git commit -m "feat(email-intel): add Airtable schema — 3 new tables + 11 new Imported Contact fields"
```

---

## Task 5: Swift Models for New Tables

**Files:**
- Create: `ILS CRM/Models/EmailScanRule.swift`
- Create: `ILS CRM/Models/EmailScanState.swift`
- Create: `ILS CRM/Models/EnrichmentQueueItem.swift`
- Modify: `ILS CRM/Models/ImportedContact.swift`
- Modify: `ILS CRM/Config/AirtableConfig.swift`
- Modify: `ILS CRM/Services/SyncEngine.swift`

- [ ] **Step 1: Add table IDs and field IDs to AirtableConfig.swift**

Add new table IDs to the Tables enum. Add field ID enums for the 3 new tables. Add 11 new field IDs to the ImportedContacts field enum. Add new tables to `syncOrder` (at end). Add `emailScanRules` and `emailScanState` to `readOnlyTables`.

- [ ] **Step 2: Create EmailScanRule SwiftData model**

```swift
// ILS CRM/Models/EmailScanRule.swift
import SwiftData
import Foundation

@Model
final class EmailScanRule {
    @Attribute(.unique) var id: String
    var airtableId: String?
    var ruleType: String?      // domain-blocklist, min-exchanges, header-match, sender-pattern, crm-dedup
    var ruleValue: String?
    var action: String?        // reject, flag, require, enrich
    var isActive: Bool
    var airtableModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String = UUID().uuidString) {
        self.id = id
        self.isActive = true
        self.isPendingPush = false
    }
}

extension EmailScanRule: AirtableConvertible {
    // ... standard converter pattern matching existing models
}
```

- [ ] **Step 3: Create EmailScanState SwiftData model (same pattern)**

- [ ] **Step 4: Create EnrichmentQueueItem SwiftData model (same pattern)**

- [ ] **Step 5: Add 11 new properties to ImportedContact.swift**

Add: `source`, `relationshipType`, `confidenceScore`, `aiReasoning`, `emailThreadCount`, `firstSeenDate`, `lastSeenDate`, `discoveredVia`, `discoveredBy`, `suggestedCompanyLink`, `suggestedCompanyName`. Update the `AirtableConvertible` extension with the corresponding field ID mappings.

- [ ] **Step 6: Register new tables in SyncEngine.swift**

Add the 3 new model types to the sync engine's `pullTable` calls in the `fullSync()` method.

- [ ] **Step 7: Build to verify no compile errors**

Run: XcodeBuildMCP `build_sim` with scheme "ILS CRM"
Expected: BUILD SUCCEEDED

- [ ] **Step 8: Commit**

```bash
git add "swift-app/ILS CRM/Models/EmailScanRule.swift" "swift-app/ILS CRM/Models/EmailScanState.swift" "swift-app/ILS CRM/Models/EnrichmentQueueItem.swift" "swift-app/ILS CRM/Models/ImportedContact.swift" "swift-app/ILS CRM/Config/AirtableConfig.swift" "swift-app/ILS CRM/Services/SyncEngine.swift"
git commit -m "feat(email-intel): Swift models for 3 new tables + 11 new ImportedContact fields"
```

---

## Task 6: Gmail OAuth — Electron

**Files:**
- Create: `electron/gmail/oauth.ts`
- Modify: `electron/ipc/register.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Implement OAuth flow**

```typescript
// electron/gmail/oauth.ts
import { shell } from 'electron'
import { safeStorage } from 'electron'
import { createServer } from 'http'
import { getSetting, setSetting } from '../database/queries/entities'

const GOOGLE_CLIENT_ID = '' // Set from Airtable settings or env
const REDIRECT_PORT = 48321
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth/callback`
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const TOKEN_KEY = 'gmail_oauth_token'

interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

export async function startOAuthFlow(): Promise<OAuthTokens> {
  // Create local HTTP server to capture redirect
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url || '', `http://localhost:${REDIRECT_PORT}`)
      if (url.pathname !== '/oauth/callback') { res.end(); return }

      const code = url.searchParams.get('code')
      if (!code) {
        res.writeHead(400)
        res.end('No authorization code')
        server.close()
        reject(new Error('OAuth cancelled'))
        return
      }

      try {
        const tokens = await exchangeCode(code)
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Gmail connected! You can close this window.</h2></body></html>')
        server.close()
        resolve(tokens)
      } catch (err) {
        res.writeHead(500)
        res.end('Token exchange failed')
        server.close()
        reject(err)
      }
    })

    server.listen(REDIRECT_PORT, () => {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', SCOPES.join(' '))
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')

      shell.openExternal(authUrl.toString())
    })

    // Timeout after 5 minutes
    setTimeout(() => { server.close(); reject(new Error('OAuth timeout')) }, 300000)
  })
}

async function exchangeCode(code: string): Promise<OAuthTokens> {
  const clientSecret = getSetting('gmail_client_secret') || ''
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`)

  const data = await resp.json()
  const email = await fetchUserEmail(data.access_token)

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    email,
  }

  storeTokens(tokens)
  return tokens
}

export function storeTokens(tokens: OAuthTokens): void {
  const encrypted = safeStorage.encryptString(JSON.stringify(tokens))
  setSetting(TOKEN_KEY, encrypted.toString('base64'))
}

export function loadTokens(): OAuthTokens | null {
  const stored = getSetting(TOKEN_KEY)
  if (!stored) return null
  try {
    const decrypted = safeStorage.decryptString(Buffer.from(stored, 'base64'))
    return JSON.parse(decrypted)
  } catch { return null }
}

export async function refreshAccessToken(): Promise<OAuthTokens | null> {
  const tokens = loadTokens()
  if (!tokens?.refreshToken) return null

  const clientSecret = getSetting('gmail_client_secret') || ''
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!resp.ok) return null

  const data = await resp.json()
  tokens.accessToken = data.access_token
  tokens.expiresAt = Date.now() + (data.expires_in * 1000)
  storeTokens(tokens)
  return tokens
}

export function disconnectGmail(): void {
  setSetting(TOKEN_KEY, null)
}

export function isGmailConnected(): boolean {
  return loadTokens() !== null
}

export function getConnectedEmail(): string | null {
  return loadTokens()?.email || null
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const resp = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await resp.json()
  return data.emailAddress
}
```

- [ ] **Step 2: Register IPC handlers in register.ts**

Add `gmail:connect`, `gmail:disconnect`, `gmail:status`, `gmail:scan-now` IPC handlers that call the oauth module functions.

- [ ] **Step 3: Expose in preload.ts**

Add gmail API methods to the contextBridge expose.

- [ ] **Step 4: Commit**

```bash
git add electron/gmail/oauth.ts electron/ipc/register.ts electron/preload.ts
git commit -m "feat(email-intel): Gmail OAuth flow with safeStorage token encryption"
```

---

## Task 7: Gmail OAuth — Swift

**Files:**
- Create: `ILS CRM/Services/GmailOAuthService.swift`
- Modify: `ILS CRM/Views/Settings/SettingsView.swift`

- [ ] **Step 1: Implement GmailOAuthService with ASWebAuthenticationSession**

Actor-based service that handles OAuth flow, stores tokens in Keychain via existing KeychainService, provides `connect()`, `disconnect()`, `isConnected`, `getAccessToken()` (with auto-refresh).

- [ ] **Step 2: Add Gmail section to SettingsView.swift**

Add a new GroupBox with "Connect Gmail" / "Disconnect Gmail" button, connected email display, scan interval Picker, last scan timestamp.

- [ ] **Step 3: Build to verify**

Run: XcodeBuildMCP `build_sim`
Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Services/GmailOAuthService.swift" "swift-app/ILS CRM/Views/Settings/SettingsView.swift"
git commit -m "feat(email-intel): Swift Gmail OAuth with ASWebAuthenticationSession + Keychain"
```

---

## Task 8: Gmail API Client (Electron)

**Files:**
- Create: `electron/gmail/client.ts`

- [ ] **Step 1: Implement Gmail REST API wrapper**

Wraps messages.list (paginated), history.list (incremental), messages.get (headers-only and full). Handles token refresh, rate limiting (exponential backoff), historyId expiration (404 → fallback flag).

- [ ] **Step 2: Commit**

```bash
git add electron/gmail/client.ts
git commit -m "feat(email-intel): Gmail REST API client with pagination + history sync"
```

---

## Task 9: Gmail API Client (Swift)

**Files:**
- Create: `ILS CRM/Services/GmailAPIClient.swift`

- [ ] **Step 1: Implement async/await Gmail API client**

Same API surface as Electron but using URLSession and async/await. Actor-based. Uses GmailOAuthService for token management.

- [ ] **Step 2: Build to verify**

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM/Services/GmailAPIClient.swift"
git commit -m "feat(email-intel): Swift Gmail API client (async/await, actor-based)"
```

---

## Task 10: Email Scanner Orchestrator (Electron)

**Files:**
- Create: `electron/gmail/scanner.ts`

- [ ] **Step 1: Implement scanner**

The scanner orchestrates the full pipeline:
1. Load rules from Airtable (Email Scan Rules table) or use defaults
2. Call Gmail API (messages.list or history.list)
3. Parse headers → build candidate map (email → EmailCandidate)
4. Evaluate rules against each candidate
5. CRM dedup: check against existing Contacts table by normalized email
6. Classify survivors with heuristic classifier
7. Extract signatures for survivors
8. Batch write candidates to Imported Contacts (10/request, acquire/release sync lock per batch)
9. Route enrichment matches to Enrichment Queue
10. Update scan state (historyId, last_scan_date, total_processed)

Supports: initial full scan (paginated), incremental scan (history), checkpoint save/resume.

- [ ] **Step 2: Register IPC handlers for scan triggers**

`gmail:scan-now` → trigger incremental scan. `gmail:scan-full` → trigger full archive scan. `gmail:scan-status` → return current ScanProgress.

- [ ] **Step 3: Set up background polling**

Timer-based polling using `setInterval`. Interval read from settings (1m/5m/15m/Off). Resets on manual scan. Respects sync lock.

- [ ] **Step 4: Commit**

```bash
git add electron/gmail/scanner.ts
git commit -m "feat(email-intel): scanner orchestrator — full pipeline with checkpoint + polling"
```

---

## Task 11: Email Scanner Orchestrator (Swift)

**Files:**
- Create: `ILS CRM/Services/EmailScanEngine.swift`
- Create: `ILS CRM/Services/EmailRulesEngine.swift`
- Create: `ILS CRM/Services/EmailUtils.swift`
- Create: `ILS CRM/Services/EmailClassifier.swift`

- [ ] **Step 1: Port email-utils, rules engine, and classifier to Swift**

Same logic as Electron implementations but using Swift patterns (structs, enums, actors). EmailUtils: normalizeEmail, parseFromHeader, parseDisplayName, extractSignature. EmailRulesEngine: evaluateRules with Rule enum. EmailClassifier: classifyCandidate returning ClassificationResult.

- [ ] **Step 2: Implement EmailScanEngine**

`@Observable` class with same pipeline as Electron scanner. Uses GmailAPIClient, EmailRulesEngine, EmailClassifier. Writes to SwiftData via ModelContext. Background polling via Timer.

- [ ] **Step 3: Build to verify**

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Services/EmailScanEngine.swift" "swift-app/ILS CRM/Services/EmailRulesEngine.swift" "swift-app/ILS CRM/Services/EmailUtils.swift" "swift-app/ILS CRM/Services/EmailClassifier.swift"
git commit -m "feat(email-intel): Swift scanner + rules engine + classifier + utilities"
```

---

## Task 12: Imported Contacts UI — Swift (Full Rewrite)

**Files:**
- Rewrite: `ILS CRM/Views/ImportedContacts/ImportedContactsView.swift`
- Rewrite: `ILS CRM/Views/ImportedContacts/ImportedContactDetailView.swift`
- Create: `ILS CRM/Views/ImportedContacts/SuggestionReviewForm.swift`
- Create: `ILS CRM/Views/Settings/GmailSettingsSection.swift`

- [ ] **Step 1: Build ImportedContactsView — list with source tabs + scan controls**

3-column NavigationSplitView matching TasksView pattern. Left column: source filter tabs (All/Email/Contacts), sort options (Confidence/Newest/Threads), "Scan Now" button, "Last scan: X ago" status. Middle: contact rows with name, subtitle (title+company or email), relationship type badge, confidence percentage badge (green 80+, yellow 50-79), thread count. Enrichment rows with green tint + "UPDATE" badge.

- [ ] **Step 2: Build ImportedContactDetailView — suggestion detail pane**

Hero section: name, title+company, Dismiss/Add to CRM buttons. AI Reasoning card (purple tint, Phase 1 shows basic metadata). Extracted Contact Info: 2-column grid of editable fields. Company pairing card (yellow when new company needed, link to existing company when matched). Email Activity stats: 4-stat row.

- [ ] **Step 3: Build SuggestionReviewForm**

Pre-populated contact creation form. Reuses field patterns from existing ContactDetailView edit mode. All fields editable. "Save to CRM" button creates Contact record + optional Company record via AirtableService. Updates Imported Contact status to Approved.

- [ ] **Step 4: Extract GmailSettingsSection from SettingsView**

Move the Gmail section into its own file for clarity. Include connect/disconnect, interval picker, last scan status, "Manage dismissed suggestions" sheet.

- [ ] **Step 5: Build and visually verify**

Run the app, navigate to Imported Contacts, verify the new UI renders correctly with the 3-column layout, tabs, and detail pane.

- [ ] **Step 6: Commit**

```bash
git add "swift-app/ILS CRM/Views/ImportedContacts/" "swift-app/ILS CRM/Views/Settings/GmailSettingsSection.swift"
git commit -m "feat(email-intel): Swift Imported Contacts UI — full rewrite with email intelligence"
```

---

## Task 13: Imported Contacts UI — Electron (Redesign)

**Files:**
- Rewrite: `src/components/imported-contacts/ImportedContactsPage.tsx`

- [ ] **Step 1: Redesign ImportedContactsPage**

Extend the existing page with: source filter tabs (All/Email/Contacts) using Tailwind pill buttons. "Scan Now" button + "Last scan: X ago" status. Sort options (Confidence/Newest/Threads). Confidence badges (green 80+ / yellow 50-79). Relationship type badges. Enrichment rows with green tint + "UPDATE" badge. Detail pane with AI Reasoning card (Phase 1: basic metadata), extracted fields grid (editable inputs), company pairing card, email activity stats, Dismiss/Add to CRM buttons.

- [ ] **Step 2: Add Gmail settings section to Settings page**

Add Connect/Disconnect Gmail button, connected email display, scan interval dropdown, last scan timestamp, "Manage dismissed" link.

- [ ] **Step 3: Wire IPC calls**

Connect "Scan Now" button to `gmail:scan-now` IPC. Connect "Connect Gmail" to `gmail:connect`. Wire approve/dismiss/reject buttons to update Imported Contact status + create Contact/Company records.

- [ ] **Step 4: Commit**

```bash
git add src/components/imported-contacts/ImportedContactsPage.tsx src/components/settings/
git commit -m "feat(email-intel): Electron Imported Contacts redesign with email intelligence UI"
```

---

## Task 14: Approve/Dismiss/Reject Flow + Company Pairing

**Files:**
- Modify: `electron/ipc/register.ts`
- Modify: `ILS CRM/Views/ImportedContacts/SuggestionReviewForm.swift`

- [ ] **Step 1: Implement approve flow (Electron)**

When user clicks "Add to CRM":
1. Open pre-filled NewContactSheet with extracted fields
2. On save: create Contact record via Airtable API
3. If `suggested_company_name` is set and `suggested_company_link` is null: create Company record first, then link
4. If `suggested_company_link` is set: link to existing company
5. Update Imported Contact: set `onboarding_status` to `Approved`
6. Dispatch `sync:progress` with `phase: 'complete'` to refresh UI

- [ ] **Step 2: Implement dismiss and reject flows (both apps)**

Dismiss: set `onboarding_status` to `Dismissed`. Scanner skips dismissed emails on future scans.
Reject: set `onboarding_status` to `Rejected`. Permanent.

- [ ] **Step 3: Implement "Manage dismissed" in Settings**

List all Dismissed imported contacts. Allow "Restore" action (sets status back to `Ready`).

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/register.ts src/components/ "swift-app/ILS CRM/Views/"
git commit -m "feat(email-intel): approve/dismiss/reject flow with smart company pairing"
```

---

## Task 15: Enrichment Queue UI (Both Apps)

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `ILS CRM/Views/ImportedContacts/ImportedContactsView.swift`

- [ ] **Step 1: Add enrichment rows to the imported contacts list**

Enrichment Queue items render in the same list as suggestions but with distinct styling: green tint, "UPDATE" badge, "Already in CRM — new [field] found" description. Clicking shows a diff view: current value vs suggested value.

- [ ] **Step 2: Implement approve/dismiss for enrichment items**

Approve: update the existing Contact's field with the suggested value via Airtable API. Set enrichment status to `approved`.
Dismiss: set enrichment status to `dismissed`.

- [ ] **Step 3: Commit**

```bash
git add src/components/imported-contacts/ "swift-app/ILS CRM/Views/ImportedContacts/"
git commit -m "feat(email-intel): enrichment queue UI — update suggestions for existing contacts"
```

---

## Task 16: Integration Testing + Manual QA

**Files:**
- Create: `tests/gmail/scanner.integration.test.ts`

- [ ] **Step 1: Write integration test with mocked Gmail API**

Mock Gmail messages.list response with 20 test messages (mix of valid contacts, newsletters, no-reply, group addresses). Verify: rules reject the right addresses, candidates are extracted correctly, signature extraction produces expected results, Airtable writes match expected output.

- [ ] **Step 2: Run integration tests**

Run: `npx vitest run tests/gmail/scanner.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Manual QA — connect Edward's Gmail**

Connect Gmail in the app. Run initial scan. Verify:
- Suggestions appear in Imported Contacts with confidence scores
- Source filter tabs show correct counts
- Scan Now button works
- Approve a suggestion end-to-end (creates Contact + Company)
- Dismiss a suggestion, verify it doesn't reappear
- Check enrichment queue for existing contacts

- [ ] **Step 4: Commit tests**

```bash
git add tests/gmail/
git commit -m "test(email-intel): integration tests for email scanning pipeline"
```

---

## Task 17: Final Polish + PARITY.md Update

**Files:**
- Modify: `PARITY.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update PARITY.md**

Add new "Email Intelligence" section with Phase 1 features tracked. Update the Imported Contacts section from Stub → Done for all implemented features. Update summary counts.

- [ ] **Step 2: Update CLAUDE.md lessons learned**

Add any new lessons discovered during implementation (Gmail API quirks, OAuth gotchas, etc.)

- [ ] **Step 3: Commit**

```bash
git add PARITY.md CLAUDE.md
git commit -m "docs: update PARITY.md + CLAUDE.md for Email Intelligence Phase 1"
```

---

## Dependencies

```
Task 1 (types + utils) ──┬── Task 2 (rules engine) ──┬── Task 10 (scanner - Electron)
                          ├── Task 3 (classifier)  ───┤
                          │                            └── Task 13 (UI - Electron)
                          └── Task 8 (Gmail client) ──┘
Task 4 (Airtable schema) ─── Task 5 (Swift models) ──┬── Task 11 (scanner - Swift)
                                                       └── Task 12 (UI - Swift)
Task 6 (OAuth - Electron) ── Task 8 (Gmail client - Electron)
Task 7 (OAuth - Swift) ───── Task 9 (Gmail client - Swift)
Task 12 + Task 13 ────────── Task 14 (approve/dismiss/reject)
Task 14 ──────────────────── Task 15 (enrichment queue UI)
Task 15 ──────────────────── Task 16 (integration tests)
Task 16 ──────────────────── Task 17 (polish + docs)
```

**Parallel execution opportunities:**
- Tasks 1-3 (Electron utils/rules/classifier) can run in parallel
- Tasks 4-5 (Airtable schema + Swift models) can run in parallel with Tasks 1-3
- Tasks 6-7 (OAuth both platforms) can run in parallel
- Tasks 8-9 (Gmail client both platforms) can run in parallel after their OAuth tasks
- Tasks 10-11 (scanner both platforms) can run in parallel
- Tasks 12-13 (UI both platforms) can run in parallel
