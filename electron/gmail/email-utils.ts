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

// "Name" <email> or Name <email>
const QUOTED_FROM_REGEX = /^"([^"]+)"\s*<([^>]+)>$/
const UNQUOTED_FROM_REGEX = /^([^<]+?)\s*<([^>]+)>$/
const BARE_EMAIL_REGEX = /^<?([^<>]+@[^<>]+)>?$/

export function parseFromHeader(header: string): EmailAddress {
  const trimmed = header.trim()

  // Try quoted name: "Sarah Chen" <sarah@acme.com>
  const quotedMatch = trimmed.match(QUOTED_FROM_REGEX)
  if (quotedMatch) {
    return { name: quotedMatch[1].trim(), email: quotedMatch[2].trim() }
  }

  // Try unquoted name: Sarah Chen <sarah@acme.com>
  const unquotedMatch = trimmed.match(UNQUOTED_FROM_REGEX)
  if (unquotedMatch) {
    return { name: unquotedMatch[1].trim(), email: unquotedMatch[2].trim() }
  }

  // Bare email: sarah@acme.com or <sarah@acme.com>
  const bareMatch = trimmed.match(BARE_EMAIL_REGEX)
  if (bareMatch) {
    return { name: null, email: bareMatch[1].trim() }
  }

  return { name: null, email: trimmed }
}

// ─── Display Name → First/Last ──────────────────────────────

export function parseDisplayName(name: string): { first: string; last: string } {
  if (!name || name.includes('@')) {
    // Email used as display name — extract username
    const username = name.split('@')[0]
    return { first: username, last: '' }
  }

  const trimmed = name.trim()

  // Handle "Last, First" format (e.g. "Patel, Ajay" → first: "Ajay", last: "Patel")
  if (trimmed.includes(',')) {
    const [last, ...rest] = trimmed.split(',')
    const first = rest.join(',').trim()
    if (first && last.trim()) {
      return { first, last: last.trim() }
    }
  }

  const parts = trimmed.split(/\s+/)
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
