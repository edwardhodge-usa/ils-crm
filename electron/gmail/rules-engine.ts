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
        if (patterns.some(p => emailLower.startsWith(p))) {
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
