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

// ─── Phone Normalization ───────────────────────────────────

/**
 * Normalize a phone number for comparison.
 * Strips formatting, assumes US (+1) if 10 bare digits.
 * Returns empty string for null/empty input.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const hasPlus = phone.trim().startsWith('+')
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (!hasPlus && digits.length === 10) return `+1${digits}`
  if (hasPlus) return `+${digits}`
  return `+${digits}`
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

// ─── Quoted Content Stripping ──────────────────────────────

function stripHtmlQuotes(html: string): string {
  let result = html
  // Remove gmail_quote divs and their content
  result = result.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  // Remove yahoo_quoted divs
  result = result.replace(/<div[^>]*class="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  // Remove blockquote elements
  result = result.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
  // Strip remaining tags
  result = result.replace(/<[^>]+>/g, ' ')
  // Decode entities
  result = result.replace(/&nbsp;/g, ' ')
  result = result.replace(/&lt;/g, '<')
  result = result.replace(/&gt;/g, '>')
  result = result.replace(/&amp;/g, '&')
  // Clean whitespace
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n')
  return result.trim()
}

/**
 * Strips quoted thread content from an email body, returning only the
 * sender's own message + signature. Returns null if the remaining content
 * is too short to contain a useful signature (< 3 non-empty lines).
 *
 * @param body - Raw email body text (plain text or HTML)
 * @param isHtml - If true, strip HTML quotes before line-by-line processing
 */
export function stripQuotedContent(body: string, isHtml = false): string | null {
  let text = body

  if (isHtml) {
    text = stripHtmlQuotes(text)
  }

  const lines = text.split('\n')
  let cutIndex = lines.length

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 2+ consecutive > quoted lines
    if (line.startsWith('> ') || line === '>') {
      if (i + 1 < lines.length && (lines[i + 1].trim().startsWith('> ') || lines[i + 1].trim() === '>')) {
        cutIndex = i
        break
      }
      continue
    }

    // Outlook From: + Sent: lookahead
    if (/^From:\s+.+/.test(line)) {
      let foundSent = false
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        if (/^Sent:\s+/.test(lines[j].trim())) {
          foundSent = true
          break
        }
      }
      if (foundSent) {
        cutIndex = i
        break
      }
      continue
    }

    // "On ... wrote:" Gmail pattern (same line or next line)
    if (/^On .+wrote:\s*$/i.test(line)) {
      cutIndex = i
      break
    }
    // "wrote:" might be on the next line
    if (/^On .+/i.test(line) && i + 1 < lines.length && /^\s*wrote:\s*$/i.test(lines[i + 1])) {
      cutIndex = i
      break
    }

    // "{name} <email> wrote:" pattern
    if (/^.+<[^>]+>\s*wrote:\s*$/i.test(line)) {
      cutIndex = i
      break
    }

    // Original message dividers
    if (/^-----Original Message-----/.test(line)) { cutIndex = i; break }
    if (/^-{10,}\s*Forwarded message\s*-{10,}/.test(line)) { cutIndex = i; break }
    if (/^_{5,}/.test(line)) { cutIndex = i; break }

    // Mobile footers
    if (/^Sent from my iP(hone|ad)/i.test(line)) { cutIndex = i; break }
    if (/^Get Outlook for/i.test(line)) { cutIndex = i; break }
  }

  let result = lines.slice(0, cutIndex)

  // Cap at 50 lines
  if (result.length > 50) {
    result = result.slice(0, 50)
  }

  // Need at least 3 non-empty lines
  const nonEmpty = result.filter(l => l.trim().length > 0)
  if (nonEmpty.length < 3) return null

  return result.join('\n').trim()
}

// ─── Message Selection Scoring ─────────────────────────────

/**
 * Scores a stripped message body for signature richness.
 * Higher score = better candidate for Claude extraction.
 * @param strippedBody - Message body after stripQuotedContent (may be null)
 * @param recencyIndex - 0 = most recent, 1 = second, etc.
 */
export function scoreMessageForSignature(strippedBody: string | null, recencyIndex: number): number {
  if (!strippedBody) return -10

  let score = 0
  const lines = strippedBody.split('\n')
  const nonEmpty = lines.filter(l => l.trim().length > 0)

  // Line count
  if (nonEmpty.length >= 10) score += 2
  if (nonEmpty.length < 3) score -= 10

  // Phone number pattern
  if (/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(strippedBody)) score += 3

  // Title keyword
  if (/\b(?:VP|Director|Manager|President|CEO|CFO|COO|CTO|Partner|Associate|Consultant|Producer|Designer|Engineer|Architect|Counsel|Attorney)\b/i.test(strippedBody)) score += 2

  // URL or domain
  if (/https?:\/\/|www\.|\.com|\.org|\.net/i.test(strippedBody)) score += 1

  // Recency bonus
  if (recencyIndex === 0) score += 2
  else if (recencyIndex === 1) score += 1

  // Mobile-only footer detection
  if (/^Sent from my iP(hone|ad)/m.test(strippedBody) && nonEmpty.length <= 2) score -= 5

  return score
}
