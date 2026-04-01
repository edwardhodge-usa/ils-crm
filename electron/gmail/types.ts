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
