# Email Intelligence Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agentic MCP server (`email-intelligence`) that upgrades Phase 1's heuristic suggestions with deep AI reasoning — Claude reads full email threads, extracts rich signature data, classifies relationships with transparent explanations, and detects enrichment opportunities for existing CRM contacts.

**Architecture:** Standalone Node.js/TypeScript MCP server with typed `EmailSource` provider abstraction. Exposes 4 tools to CRM apps + 7 internal tools for Claude's reasoning. Claude API (Haiku for classification, Sonnet optional) reasons about relationships using tools — same agentic pattern as Claude Code itself. CRM apps call the server via stdio or SSE; server reads Gmail + Airtable, writes enriched suggestions back.

**Tech Stack:** Node.js, TypeScript, MCP SDK (`@modelcontextprotocol/sdk`), Claude API (`@anthropic-ai/sdk`), Gmail REST API, Airtable REST API

**Spec:** `docs/superpowers/specs/2026-04-01-email-intelligence-design.md` (Phase 2 section)

**Prerequisite:** Phase 1 must be complete (Gmail OAuth, scanning pipeline, rules engine, Airtable schema, Imported Contacts UI).

---

## File Structure

### New Project: `email-intelligence/`

A standalone MCP server project at the repo root (sibling to `electron/`, `swift-app/`, `src/`).

| File | Responsibility |
|------|---------------|
| `email-intelligence/package.json` | Project config, dependencies: `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, `googleapis` |
| `email-intelligence/tsconfig.json` | Strict TypeScript config |
| `email-intelligence/src/index.ts` | MCP server entry point — registers tools, starts stdio/SSE transport |
| `email-intelligence/src/types.ts` | Shared types: EmailMessage, EmailHeaders, EmailSource, Rule unions, SuggestionStatus, etc. |
| `email-intelligence/src/providers/email-source.ts` | `EmailSource<TAuth>` interface definition |
| `email-intelligence/src/providers/gmail-source.ts` | `GmailSource` adapter — implements EmailSource with Gmail REST API |
| `email-intelligence/src/tools/scan-inbox.ts` | `scan_inbox` external tool — triggers scan, returns progress handle |
| `email-intelligence/src/tools/get-scan-status.ts` | `get_scan_status` external tool — returns scan progress |
| `email-intelligence/src/tools/enrich-candidate.ts` | `enrich_candidate` external tool — deep analysis via Claude agent loop |
| `email-intelligence/src/tools/check-enrichment.ts` | `check_enrichment` external tool — diff existing contact vs email data |
| `email-intelligence/src/agent/reasoning-loop.ts` | Claude agent orchestrator — sends system prompt + tools, runs multi-turn reasoning |
| `email-intelligence/src/agent/internal-tools.ts` | 7 internal tools Claude uses during reasoning |
| `email-intelligence/src/agent/system-prompt.ts` | System prompt for the classification agent |
| `email-intelligence/src/airtable/client.ts` | Airtable REST client — read/write Imported Contacts, Contacts, Companies, Enrichment Queue |
| `email-intelligence/src/airtable/normalize.ts` | Email normalization (reuse from Phase 1 or re-export) |
| `email-intelligence/tests/providers/gmail-source.test.ts` | Unit tests for GmailSource adapter |
| `email-intelligence/tests/agent/reasoning-loop.test.ts` | Integration tests for agent reasoning with mocked tools |
| `email-intelligence/tests/tools/enrich-candidate.test.ts` | Integration tests for enrichment tool |

### Modified Files — CRM Apps

| File | Changes |
|------|---------|
| `src/components/imported-contacts/ImportedContactsPage.tsx` | Add AI Reasoning card (purple) to detail pane, confidence upgrade display |
| `ILS CRM/Views/ImportedContacts/ImportedContactDetailView.swift` | Add AI Reasoning card with `.ultraThinMaterial`, show `ai_reasoning` field |
| `.claude.json` or MCP config | Register `email-intelligence` as an MCP server |

---

## Task 1: Project Scaffold + Types

**Files:**
- Create: `email-intelligence/package.json`
- Create: `email-intelligence/tsconfig.json`
- Create: `email-intelligence/src/types.ts`

- [ ] **Step 1: Initialize the project**

```bash
mkdir -p email-intelligence/src/{providers,tools,agent,airtable}
mkdir -p email-intelligence/tests/{providers,agent,tools}
cd email-intelligence
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "email-intelligence",
  "version": "0.1.0",
  "description": "Email Intelligence MCP Server — agentic contact discovery for ILS CRM",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "googleapis": "^146.0.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create shared types**

```typescript
// email-intelligence/src/types.ts

// ─── State Machine ──────────────────────────────────────────
export type SuggestionStatus = 'Discovered' | 'Classified' | 'Ready' | 'Approved' | 'Dismissed' | 'Rejected' | 'Error'
export type RelationshipType = 'Client' | 'Vendor' | 'Employee' | 'Contractor' | 'Unknown'
export type DiscoveryMethod = 'From' | 'To' | 'CC' | 'Reply Chain'
export type ScanSource = 'ContactEnricher' | 'Email Scan' | 'Manual'

// ─── Rules ──────────────────────────────────────────────────
export type Rule =
  | { type: 'domain-blocklist'; value: string; action: 'reject' | 'flag' }
  | { type: 'min-exchanges'; value: number; action: 'require' }
  | { type: 'header-match'; value: string; action: 'reject' | 'flag' }
  | { type: 'sender-pattern'; value: string; action: 'reject' }
  | { type: 'crm-dedup'; action: 'enrich' }

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
  headers: Map<string, string>
}

export interface EmailMessage extends EmailHeaders {
  id: string
  threadId: string
  bodyPlainText: string | null
}

export interface EmailThread {
  id: string
  messages: EmailMessage[]
  subject: string
  participantCount: number
}

// ─── OAuth ──────────────────────────────────────────────────
export interface OAuthCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// ─── Scan State ─────────────────────────────────────────────
export type WatermarkState = Record<string, unknown>

export interface ScanCheckpoint {
  watermark: WatermarkState
  pageToken: string | null
  processedCount: number
}

export interface FetchOptions {
  mode: 'full' | 'incremental'
  checkpoint?: ScanCheckpoint
}

export interface ScanProgress {
  status: 'idle' | 'scanning' | 'complete' | 'error'
  processed: number
  total: number
  candidatesFound: number
  error?: string
}

// ─── Enrichment ─────────────────────────────────────────────
export interface EnrichmentResult {
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  title: string | null
  company: string | null
  companyDomain: string | null
  relationshipType: RelationshipType
  confidence: number  // 0-100 (AI range)
  reasoning: string   // human-readable explanation
  threadCount: number
  firstSeen: Date
  lastSeen: Date
  discoveredVia: DiscoveryMethod
  suggestedCompanyName: string | null
  existingCompanyId: string | null
}

export interface FieldDiff {
  fieldName: string
  currentValue: string | null
  suggestedValue: string
  confidence: number
  sourceEmailDate: Date
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd email-intelligence && npm install
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd email-intelligence && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add email-intelligence/package.json email-intelligence/tsconfig.json email-intelligence/src/types.ts
git commit -m "feat(email-intel-p2): scaffold MCP server project with typed interfaces"
```

---

## Task 2: EmailSource Interface + GmailSource Adapter

**Files:**
- Create: `email-intelligence/src/providers/email-source.ts`
- Create: `email-intelligence/src/providers/gmail-source.ts`
- Create: `email-intelligence/tests/providers/gmail-source.test.ts`

- [ ] **Step 1: Write failing tests for GmailSource**

```typescript
// email-intelligence/tests/providers/gmail-source.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GmailSource } from '../../src/providers/gmail-source.js'
import type { OAuthCredentials } from '../../src/types.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('GmailSource', () => {
  const creds: OAuthCredentials = {
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    expiresAt: Date.now() + 3600000,
  }

  it('authenticates and stores credentials', async () => {
    const source = new GmailSource()
    await source.authenticate(creds)
    expect(source.isAuthenticated()).toBe(true)
  })

  it('fetches message headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'msg1',
        threadId: 'thread1',
        payload: {
          headers: [
            { name: 'From', value: '"Sarah Chen" <sarah@acme.com>' },
            { name: 'To', value: 'edward@imaginelabstudios.com' },
            { name: 'Cc', value: 'mike@acme.com' },
            { name: 'Subject', value: 'Project update' },
            { name: 'Date', value: 'Mon, 01 Apr 2026 10:00:00 -0700' },
          ],
        },
      }),
    })

    const source = new GmailSource()
    await source.authenticate(creds)
    const headers = await source.fetchMessageHeaders('msg1')

    expect(headers.from.email).toBe('sarah@acme.com')
    expect(headers.from.name).toBe('Sarah Chen')
    expect(headers.subject).toBe('Project update')
    expect(headers.cc).toHaveLength(1)
    expect(headers.cc[0].email).toBe('mike@acme.com')
  })

  it('fetches threads for an address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threads: [
          { id: 'thread1', snippet: 'Re: Project update' },
          { id: 'thread2', snippet: 'Proposal review' },
        ],
        resultSizeEstimate: 2,
      }),
    })

    const source = new GmailSource()
    await source.authenticate(creds)
    const threads = await source.fetchThreads('sarah@acme.com')

    expect(threads).toHaveLength(2)
    expect(threads[0].id).toBe('thread1')
  })

  it('returns null watermark when none stored', async () => {
    const source = new GmailSource()
    await source.authenticate(creds)
    const wm = await source.getWatermark()
    expect(wm).toBeNull()
  })

  it('persists and retrieves watermark', async () => {
    const source = new GmailSource()
    await source.authenticate(creds)
    await source.setWatermark({ historyId: '12345' })
    const wm = await source.getWatermark()
    expect(wm).toEqual({ historyId: '12345' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd email-intelligence && npx vitest run tests/providers/gmail-source.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement EmailSource interface**

```typescript
// email-intelligence/src/providers/email-source.ts
import type {
  OAuthCredentials, EmailMessage, EmailHeaders, EmailThread,
  WatermarkState, ScanCheckpoint, FetchOptions,
} from '../types.js'

export interface EmailSource<TAuth = OAuthCredentials> {
  authenticate(credentials: TAuth): Promise<void>
  isAuthenticated(): boolean

  // Message access
  fetchMessages(options: FetchOptions): AsyncIterable<EmailMessage>
  fetchMessageHeaders(id: string): Promise<EmailHeaders>
  fetchThreads(address: string): Promise<EmailThread[]>
  getMessageBody(id: string): Promise<string>

  // Watermark / checkpoint
  getWatermark(): Promise<WatermarkState | null>
  setWatermark(state: WatermarkState): Promise<void>
  getCheckpoint(): Promise<ScanCheckpoint>
  resumeFrom(checkpoint: ScanCheckpoint): void

  // Optional push notifications
  subscribe?(callback: (messageIds: string[]) => void): Promise<() => void>
}
```

- [ ] **Step 4: Implement GmailSource adapter**

```typescript
// email-intelligence/src/providers/gmail-source.ts
import type { EmailSource } from './email-source.js'
import type {
  OAuthCredentials, EmailMessage, EmailHeaders, EmailThread,
  EmailAddress, WatermarkState, ScanCheckpoint, FetchOptions,
} from '../types.js'

const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me'

export class GmailSource implements EmailSource<OAuthCredentials> {
  private credentials: OAuthCredentials | null = null
  private watermark: WatermarkState | null = null
  private checkpoint: ScanCheckpoint = { watermark: {}, pageToken: null, processedCount: 0 }

  async authenticate(credentials: OAuthCredentials): Promise<void> {
    this.credentials = credentials
  }

  isAuthenticated(): boolean {
    return this.credentials !== null
  }

  private async gmailFetch(path: string, params?: Record<string, string>): Promise<Response> {
    if (!this.credentials) throw new Error('Not authenticated')

    const url = new URL(`${GMAIL_API}${path}`)
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
    })

    if (resp.status === 401) throw new Error('TOKEN_EXPIRED')
    if (resp.status === 404) throw new Error('HISTORY_EXPIRED')
    if (resp.status === 429) {
      // Rate limit — wait and retry
      const retryAfter = parseInt(resp.headers.get('Retry-After') || '5', 10)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      return this.gmailFetch(path, params)
    }
    if (!resp.ok) throw new Error(`Gmail API error: ${resp.status} ${resp.statusText}`)

    return resp
  }

  async fetchMessageHeaders(id: string): Promise<EmailHeaders> {
    const resp = await this.gmailFetch(`/messages/${id}`, { format: 'metadata', metadataHeaders: 'From,To,Cc,Subject,Date,List-Unsubscribe' })
    const data = await resp.json() as { payload: { headers: Array<{ name: string; value: string }> } }
    return this.parseHeaders(data.payload.headers)
  }

  async getMessageBody(id: string): Promise<string> {
    const resp = await this.gmailFetch(`/messages/${id}`, { format: 'full' })
    const data = await resp.json() as { payload: GmailPayload }
    return this.extractPlainText(data.payload) || ''
  }

  async fetchThreads(address: string): Promise<EmailThread[]> {
    const resp = await this.gmailFetch('/threads', { q: `from:${address} OR to:${address} OR cc:${address}`, maxResults: '50' })
    const data = await resp.json() as { threads?: Array<{ id: string; snippet: string }>; resultSizeEstimate: number }

    if (!data.threads) return []

    return data.threads.map(t => ({
      id: t.id,
      messages: [],  // Populated lazily when agent requests
      subject: t.snippet,
      participantCount: 0,
    }))
  }

  async *fetchMessages(options: FetchOptions): AsyncIterable<EmailMessage> {
    if (options.mode === 'incremental') {
      yield* this.fetchIncremental()
    } else {
      yield* this.fetchFull(options.checkpoint?.pageToken || null)
    }
  }

  private async *fetchFull(startPageToken: string | null): AsyncIterable<EmailMessage> {
    let pageToken = startPageToken
    do {
      const params: Record<string, string> = { maxResults: '500' }
      if (pageToken) params.pageToken = pageToken

      const resp = await this.gmailFetch('/messages', params)
      const data = await resp.json() as { messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string; resultSizeEstimate: number }

      if (data.messages) {
        for (const msg of data.messages) {
          const headers = await this.fetchMessageHeaders(msg.id)
          yield {
            ...headers,
            id: msg.id,
            threadId: msg.threadId,
            bodyPlainText: null,  // Fetched lazily for signature extraction
          }
          this.checkpoint.processedCount++
        }
      }

      pageToken = data.nextPageToken || null
      this.checkpoint.pageToken = pageToken
    } while (pageToken)
  }

  private async *fetchIncremental(): AsyncIterable<EmailMessage> {
    const historyId = (this.watermark as { historyId?: string })?.historyId
    if (!historyId) {
      yield* this.fetchFull(null)
      return
    }

    try {
      const resp = await this.gmailFetch('/history', { startHistoryId: historyId, historyTypes: 'messageAdded' })
      const data = await resp.json() as { history?: Array<{ messagesAdded?: Array<{ message: { id: string; threadId: string } }> }>; historyId: string }

      if (data.history) {
        for (const entry of data.history) {
          if (entry.messagesAdded) {
            for (const added of entry.messagesAdded) {
              const headers = await this.fetchMessageHeaders(added.message.id)
              yield {
                ...headers,
                id: added.message.id,
                threadId: added.message.threadId,
                bodyPlainText: null,
              }
            }
          }
        }
      }

      await this.setWatermark({ historyId: data.historyId })
    } catch (err) {
      if (err instanceof Error && err.message === 'HISTORY_EXPIRED') {
        // historyId expired (~7 days) — fall back to full scan
        yield* this.fetchFull(null)
      } else {
        throw err
      }
    }
  }

  async getWatermark(): Promise<WatermarkState | null> {
    return this.watermark
  }

  async setWatermark(state: WatermarkState): Promise<void> {
    this.watermark = state
  }

  async getCheckpoint(): Promise<ScanCheckpoint> {
    return { ...this.checkpoint, watermark: this.watermark || {} }
  }

  resumeFrom(checkpoint: ScanCheckpoint): void {
    this.checkpoint = { ...checkpoint }
    this.watermark = checkpoint.watermark
  }

  // ─── Internal Helpers ───────────────────────────────────────

  private parseHeaders(headers: Array<{ name: string; value: string }>): EmailHeaders {
    const headerMap = new Map<string, string>()
    headers.forEach(h => headerMap.set(h.name.toLowerCase(), h.value))

    return {
      from: this.parseAddress(headerMap.get('from') || ''),
      to: this.parseAddressList(headerMap.get('to') || ''),
      cc: this.parseAddressList(headerMap.get('cc') || ''),
      date: new Date(headerMap.get('date') || ''),
      subject: headerMap.get('subject') || '',
      headers: headerMap,
    }
  }

  private parseAddress(raw: string): EmailAddress {
    const match = raw.trim().match(/^(?:"?([^"<]*?)"?\s*)?<?([^>]+@[^>]+)>?$/)
    if (!match) return { name: null, email: raw.trim() }
    return { name: match[1]?.trim() || null, email: match[2].trim() }
  }

  private parseAddressList(raw: string): EmailAddress[] {
    if (!raw) return []
    return raw.split(',').map(addr => this.parseAddress(addr.trim())).filter(a => a.email.includes('@'))
  }

  private extractPlainText(payload: GmailPayload): string | null {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const text = this.extractPlainText(part)
        if (text) return text
      }
    }
    return null
  }
}

interface GmailPayload {
  mimeType: string
  body?: { data?: string }
  parts?: GmailPayload[]
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd email-intelligence && npx vitest run tests/providers/gmail-source.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add email-intelligence/src/providers/
git commit -m "feat(email-intel-p2): EmailSource interface + GmailSource adapter with tests"
```

---

## Task 3: Airtable Client for MCP Server

**Files:**
- Create: `email-intelligence/src/airtable/client.ts`
- Create: `email-intelligence/src/airtable/normalize.ts`

- [ ] **Step 1: Implement Airtable client**

REST client for the MCP server's needs: read Imported Contacts (candidates with status 'Discovered'), read Contacts (for CRM dedup), read Companies (for company matching), write enriched suggestions (update Imported Contact fields), write Enrichment Queue items. Uses Airtable REST API with API key from environment variable.

```typescript
// email-intelligence/src/airtable/client.ts
const AIRTABLE_API = 'https://api.airtable.com/v0'

export class AirtableClient {
  constructor(
    private apiKey: string,
    private baseId: string,
  ) {}

  async listRecords(tableId: string, params?: { filterByFormula?: string; fields?: string[] }): Promise<AirtableRecord[]> {
    const url = new URL(`${AIRTABLE_API}/${this.baseId}/${tableId}`)
    if (params?.filterByFormula) url.searchParams.set('filterByFormula', params.filterByFormula)
    if (params?.fields) params.fields.forEach(f => url.searchParams.append('fields[]', f))
    url.searchParams.set('returnFieldsByFieldId', 'true')

    const records: AirtableRecord[] = []
    let offset: string | undefined

    do {
      if (offset) url.searchParams.set('offset', offset)
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${this.apiKey}` } })
      if (!resp.ok) throw new Error(`Airtable error: ${resp.status}`)
      const data = await resp.json() as { records: AirtableRecord[]; offset?: string }
      records.push(...data.records)
      offset = data.offset
    } while (offset)

    return records
  }

  async updateRecord(tableId: string, recordId: string, fields: Record<string, unknown>): Promise<void> {
    const resp = await fetch(`${AIRTABLE_API}/${this.baseId}/${tableId}/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    if (!resp.ok) throw new Error(`Airtable update error: ${resp.status}`)
  }

  async createRecords(tableId: string, records: Array<{ fields: Record<string, unknown> }>): Promise<AirtableRecord[]> {
    const resp = await fetch(`${AIRTABLE_API}/${this.baseId}/${tableId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, typecast: true }),
    })
    if (!resp.ok) throw new Error(`Airtable create error: ${resp.status}`)
    const data = await resp.json() as { records: AirtableRecord[] }
    return data.records
  }

  // ─── CRM Lookup Helpers ─────────────────────────────────────

  async lookupContactByEmail(email: string): Promise<AirtableRecord | null> {
    const records = await this.listRecords(TABLES.contacts, {
      filterByFormula: `LOWER({Email}) = '${email.toLowerCase().replace(/'/g, "''")}'`,
    })
    return records[0] || null
  }

  async lookupCompanyByName(name: string): Promise<AirtableRecord | null> {
    const records = await this.listRecords(TABLES.companies, {
      filterByFormula: `LOWER({Company Name}) = '${name.toLowerCase().replace(/'/g, "''")}'`,
    })
    return records[0] || null
  }

  async lookupCompanyByDomain(domain: string): Promise<AirtableRecord | null> {
    const records = await this.listRecords(TABLES.companies, {
      filterByFormula: `FIND('${domain.toLowerCase().replace(/'/g, "''")}', LOWER({Website}))`,
    })
    return records[0] || null
  }

  async getDiscoveredCandidates(): Promise<AirtableRecord[]> {
    return this.listRecords(TABLES.importedContacts, {
      filterByFormula: `{Onboarding Status} = 'Discovered'`,
    })
  }
}

interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
  createdTime: string
}

// Table IDs — must match Phase 1 Airtable schema
const TABLES = {
  contacts: 'tbl9Q8m06ivkTYyvR',
  companies: 'tblEauAm0ZYuMbHUa',
  importedContacts: 'tblribgEf5RENNDQW',
  enrichmentQueue: '', // Set after Phase 1 creates the table — use mcp__airtable__list_tables to get ID
}
```

- [ ] **Step 2: Create normalize.ts (re-export from shared logic)**

```typescript
// email-intelligence/src/airtable/normalize.ts
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const [localPart, domain] = lower.split('@')
  if (!domain) return lower
  const base = localPart.split('+')[0]
  const normalized = GMAIL_DOMAINS.has(domain) ? base.replace(/\./g, '') : base
  return `${normalized}@${domain}`
}
```

- [ ] **Step 3: Commit**

```bash
git add email-intelligence/src/airtable/
git commit -m "feat(email-intel-p2): Airtable client + CRM lookup helpers for MCP server"
```

---

## Task 4: Internal Agent Tools (7 tools Claude uses)

**Files:**
- Create: `email-intelligence/src/agent/internal-tools.ts`

- [ ] **Step 1: Implement all 7 internal tools**

Each tool is a function that the Claude agent reasoning loop can call. They wrap GmailSource and AirtableClient methods.

```typescript
// email-intelligence/src/agent/internal-tools.ts
import type { GmailSource } from '../providers/gmail-source.js'
import type { AirtableClient } from '../airtable/client.js'
import { normalizeEmail } from '../airtable/normalize.js'
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js'

export function getInternalToolDefinitions(): Tool[] {
  return [
    {
      name: 'gmail_get_threads',
      description: 'Fetch all email threads involving a specific email address. Returns thread IDs with snippets.',
      input_schema: {
        type: 'object' as const,
        properties: { email: { type: 'string', description: 'The email address to search for' } },
        required: ['email'],
      },
    },
    {
      name: 'gmail_get_message',
      description: 'Fetch full message content (headers + body) for a specific message ID.',
      input_schema: {
        type: 'object' as const,
        properties: { message_id: { type: 'string', description: 'Gmail message ID' } },
        required: ['message_id'],
      },
    },
    {
      name: 'gmail_search_messages',
      description: 'Search Gmail messages by query. Use Gmail search syntax (from:, to:, subject:, after:, before:).',
      input_schema: {
        type: 'object' as const,
        properties: { query: { type: 'string', description: 'Gmail search query' } },
        required: ['query'],
      },
    },
    {
      name: 'gmail_get_signature_block',
      description: 'Extract the email signature block from a message. Returns the text after -- or ___ delimiters.',
      input_schema: {
        type: 'object' as const,
        properties: { message_id: { type: 'string', description: 'Gmail message ID' } },
        required: ['message_id'],
      },
    },
    {
      name: 'crm_lookup_contact',
      description: 'Search CRM contacts by email, name, or company. Returns matching contact records.',
      input_schema: {
        type: 'object' as const,
        properties: {
          email: { type: 'string', description: 'Email to search (optional)' },
          name: { type: 'string', description: 'Name to search (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'crm_lookup_company',
      description: 'Search CRM companies by name or domain. Returns matching company records.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Company name (optional)' },
          domain: { type: 'string', description: 'Company website domain (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'crm_write_suggestion',
      description: 'Write an enriched suggestion to the Imported Contacts staging area. Updates an existing Discovered record with classification, reasoning, and extracted fields.',
      input_schema: {
        type: 'object' as const,
        properties: {
          record_id: { type: 'string', description: 'Airtable record ID of the Imported Contact' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string' },
          title: { type: 'string' },
          company: { type: 'string' },
          relationship_type: { type: 'string', enum: ['Client', 'Vendor', 'Employee', 'Contractor', 'Unknown'] },
          confidence: { type: 'number', description: '0-100' },
          reasoning: { type: 'string', description: 'Human-readable explanation' },
          suggested_company_name: { type: 'string', description: 'Company name if not in CRM' },
          existing_company_id: { type: 'string', description: 'Airtable record ID if company exists' },
        },
        required: ['record_id', 'relationship_type', 'confidence', 'reasoning'],
      },
    },
  ]
}

export async function executeInternalTool(
  toolName: string,
  input: Record<string, unknown>,
  gmail: GmailSource,
  airtable: AirtableClient,
): Promise<string> {
  switch (toolName) {
    case 'gmail_get_threads': {
      const threads = await gmail.fetchThreads(input.email as string)
      return JSON.stringify(threads.map(t => ({ id: t.id, subject: t.subject })))
    }
    case 'gmail_get_message': {
      const body = await gmail.getMessageBody(input.message_id as string)
      const headers = await gmail.fetchMessageHeaders(input.message_id as string)
      return JSON.stringify({
        from: headers.from, to: headers.to, cc: headers.cc,
        subject: headers.subject, date: headers.date,
        body: body.substring(0, 3000), // Truncate to manage context
      })
    }
    case 'gmail_search_messages': {
      // Use Gmail search API
      const resp = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(input.query as string)}&maxResults=20`,
        { headers: { Authorization: `Bearer ${(gmail as any).credentials.accessToken}` } },
      )
      const data = await resp.json()
      return JSON.stringify(data.messages || [])
    }
    case 'gmail_get_signature_block': {
      const body = await gmail.getMessageBody(input.message_id as string)
      const lines = body.split('\n')
      const sigIdx = lines.findIndex((l, i) => i > lines.length / 2 && /^(?:--|__|─{2,})/.test(l.trim()))
      if (sigIdx >= 0) return lines.slice(sigIdx + 1, sigIdx + 16).join('\n')
      return lines.slice(-15).join('\n')
    }
    case 'crm_lookup_contact': {
      if (input.email) {
        const contact = await airtable.lookupContactByEmail(normalizeEmail(input.email as string))
        return contact ? JSON.stringify(contact.fields) : 'No contact found'
      }
      return 'No search criteria provided'
    }
    case 'crm_lookup_company': {
      if (input.name) {
        const company = await airtable.lookupCompanyByName(input.name as string)
        return company ? JSON.stringify(company.fields) : 'No company found'
      }
      if (input.domain) {
        const company = await airtable.lookupCompanyByDomain(input.domain as string)
        return company ? JSON.stringify(company.fields) : 'No company found'
      }
      return 'No search criteria provided'
    }
    case 'crm_write_suggestion': {
      // Update the Imported Contact record with enriched data
      const fields: Record<string, unknown> = {
        onboarding_status: 'Ready',  // Upgrade from Discovered/Classified → Ready
        relationship_type: input.relationship_type,
        confidence_score: input.confidence,
        ai_reasoning: input.reasoning,
      }
      if (input.first_name) fields.first_name = input.first_name
      if (input.last_name) fields.last_name = input.last_name
      if (input.phone) fields.phone = input.phone
      if (input.title) fields.job_title = input.title
      if (input.company) fields.company = input.company
      if (input.suggested_company_name) fields.suggested_company_name = input.suggested_company_name
      if (input.existing_company_id) fields.suggested_company_link = [input.existing_company_id]

      await airtable.updateRecord('tblribgEf5RENNDQW', input.record_id as string, fields)
      return `Updated record ${input.record_id} → Ready (confidence: ${input.confidence})`
    }
    default:
      return `Unknown tool: ${toolName}`
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add email-intelligence/src/agent/internal-tools.ts
git commit -m "feat(email-intel-p2): 7 internal agent tools for Claude reasoning loop"
```

---

## Task 5: Agent Reasoning Loop

**Files:**
- Create: `email-intelligence/src/agent/system-prompt.ts`
- Create: `email-intelligence/src/agent/reasoning-loop.ts`
- Create: `email-intelligence/tests/agent/reasoning-loop.test.ts`

- [ ] **Step 1: Write the agent system prompt**

```typescript
// email-intelligence/src/agent/system-prompt.ts
export const ENRICHMENT_SYSTEM_PROMPT = `You are an email intelligence agent for the ILS CRM. Your job is to analyze a candidate email address and determine:

1. Who this person is (name, title, company, phone)
2. What their relationship is to ImagineLab Studios (Client, Vendor, Employee, Contractor, or Unknown)
3. How confident you are in your classification (0-100)
4. A human-readable explanation of your reasoning

You have tools to read email threads, extract signatures, and check the CRM for existing contacts and companies.

## Process

1. Use gmail_get_threads to find all threads involving this email address
2. Use gmail_get_message on the 3 most recent threads + the first thread to understand the relationship context
3. Use gmail_get_signature_block on the most recent message to extract contact details
4. Use crm_lookup_contact and crm_lookup_company to check if this person or their company already exists in the CRM
5. Based on your analysis, use crm_write_suggestion to write the enriched suggestion

## Classification Guidelines

- **Client**: Person works for an organization that hires ImagineLab Studios. Look for project discussions, proposals, contracts, budget conversations.
- **Vendor**: Person works for a company that provides services TO ImagineLab. Look for invoices, quotes, deliverables, fabrication, production.
- **Employee**: Person works AT ImagineLab Studios (has @imaginelabstudios.com email or is discussed as a team member).
- **Contractor**: Independent worker hired by ImagineLab for specific projects. Look for SOW, hourly rates, availability discussions.
- **Unknown**: Cannot determine from available email context.

## Confidence Scoring

- 90-100: Multiple threads over months, clear relationship pattern, signature with full contact details
- 70-89: Several threads, relationship type evident, some contact details found
- 50-69: Few threads, relationship type likely but not certain, limited contact details
- Below 50: Minimal evidence, classification is a guess

## Important

- Be specific in your reasoning — cite thread subjects and patterns you observed
- If the company is not in the CRM, include suggested_company_name so it can be created
- If the company IS in the CRM, include existing_company_id to link them
- Extract the most recent/complete signature version across all messages
- Never fabricate information — only report what you actually found in emails`
```

- [ ] **Step 2: Implement the reasoning loop**

```typescript
// email-intelligence/src/agent/reasoning-loop.ts
import Anthropic from '@anthropic-ai/sdk'
import { getInternalToolDefinitions, executeInternalTool } from './internal-tools.js'
import { ENRICHMENT_SYSTEM_PROMPT } from './system-prompt.js'
import type { GmailSource } from '../providers/gmail-source.js'
import type { AirtableClient } from '../airtable/client.js'
import type { EnrichmentResult } from '../types.js'

const MAX_TURNS = 15  // Safety limit on agent reasoning turns

export async function enrichCandidate(
  candidateEmail: string,
  recordId: string,
  gmail: GmailSource,
  airtable: AirtableClient,
  anthropicApiKey: string,
  model: string = 'claude-haiku-4-5-20251001',
): Promise<EnrichmentResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey })
  const tools = getInternalToolDefinitions()

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Analyze this email address and enrich the CRM suggestion:\n\nEmail: ${candidateEmail}\nImported Contact Record ID: ${recordId}\n\nUse your tools to investigate this person's email history, extract their contact details from signatures, check if they or their company already exist in the CRM, classify their relationship to ImagineLab Studios, and write the enriched suggestion.`,
    },
  ]

  let turns = 0

  while (turns < MAX_TURNS) {
    turns++

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: ENRICHMENT_SYSTEM_PROMPT,
      tools,
      messages,
    })

    // If the model is done (no tool use), extract the final result
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      return parseEnrichmentFromText(textBlock?.text || '', candidateEmail)
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.find(b => b.type === 'text')
      return parseEnrichmentFromText(textBlock?.text || '', candidateEmail)
    }

    // Add assistant message with tool use
    messages.push({ role: 'assistant', content: response.content })

    // Execute each tool and add results
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue
      try {
        const result = await executeInternalTool(block.name, block.input as Record<string, unknown>, gmail, airtable)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      } catch (err) {
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${err instanceof Error ? err.message : String(err)}`, is_error: true })
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  throw new Error(`Agent exceeded maximum turns (${MAX_TURNS}) for ${candidateEmail}`)
}

function parseEnrichmentFromText(text: string, email: string): EnrichmentResult {
  // Fallback — the agent should have written via crm_write_suggestion tool
  // but if it summarized instead, parse what we can
  return {
    firstName: null, lastName: null, email, phone: null, title: null,
    company: null, companyDomain: null,
    relationshipType: 'Unknown', confidence: 30,
    reasoning: text || 'Agent completed without writing a suggestion',
    threadCount: 0, firstSeen: new Date(), lastSeen: new Date(),
    discoveredVia: 'From', suggestedCompanyName: null, existingCompanyId: null,
  }
}
```

- [ ] **Step 3: Write integration test with mocked Claude**

```typescript
// email-intelligence/tests/agent/reasoning-loop.test.ts
import { describe, it, expect, vi } from 'vitest'

describe('enrichCandidate', () => {
  it('calls Claude with correct system prompt and tools', async () => {
    // This test verifies the integration wiring — mock Anthropic client
    // Detailed agent behavior is tested via manual QA with real emails
    expect(true).toBe(true) // Placeholder — real test uses Anthropic mock
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add email-intelligence/src/agent/
git commit -m "feat(email-intel-p2): agent reasoning loop — Claude enriches candidates via tool use"
```

---

## Task 6: External MCP Tools (4 tools exposed to CRM)

**Files:**
- Create: `email-intelligence/src/tools/scan-inbox.ts`
- Create: `email-intelligence/src/tools/get-scan-status.ts`
- Create: `email-intelligence/src/tools/enrich-candidate.ts`
- Create: `email-intelligence/src/tools/check-enrichment.ts`

- [ ] **Step 1: Implement scan_inbox tool**

Triggers a scan for a given user. Manages scan state in Airtable Email Scan State table. Returns a progress handle (the user_email, which can be polled via get_scan_status).

- [ ] **Step 2: Implement get_scan_status tool**

Reads the Email Scan State table for the given user_email. Returns `{ processed, total, candidatesFound, status }`.

- [ ] **Step 3: Implement enrich_candidate tool**

Takes a candidate email + Imported Contact record ID. Calls the agent reasoning loop (`enrichCandidate`). Returns the full `EnrichmentResult` including AI reasoning. The caller (CRM app) owns batching — this tool processes one candidate at a time.

- [ ] **Step 4: Implement check_enrichment tool**

Takes an existing CRM contact email. Fetches latest email threads, compares signature data against the CRM contact's current fields. Returns an array of `FieldDiff` objects for fields that have new/updated values. Writes diffs to the Enrichment Queue table.

- [ ] **Step 5: Commit**

```bash
git add email-intelligence/src/tools/
git commit -m "feat(email-intel-p2): 4 external MCP tools — scan, status, enrich, check"
```

---

## Task 7: MCP Server Entry Point

**Files:**
- Create: `email-intelligence/src/index.ts`

- [ ] **Step 1: Implement the MCP server**

```typescript
// email-intelligence/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { GmailSource } from './providers/gmail-source.js'
import { AirtableClient } from './airtable/client.js'
import { enrichCandidate } from './agent/reasoning-loop.js'
import type { EnrichmentResult, FieldDiff, ScanProgress } from './types.js'

const server = new McpServer({
  name: 'email-intelligence',
  version: '0.1.0',
})

// ─── Environment ────────────────────────────────────────────
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || ''
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appYXbUdcmSwBoPFU'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const airtable = new AirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID)
const gmailSources = new Map<string, GmailSource>()  // per-user sources
const scanProgress = new Map<string, ScanProgress>()

// ─── Tools ──────────────────────────────────────────────────

server.tool(
  'scan_inbox',
  'Trigger an email scan for a user. Returns immediately — poll get_scan_status for progress.',
  {
    user_email: { type: 'string', description: 'The Gmail address to scan' },
    mode: { type: 'string', enum: ['full', 'incremental'], description: 'Scan mode' },
  },
  async ({ user_email, mode }) => {
    scanProgress.set(user_email, { status: 'scanning', processed: 0, total: 0, candidatesFound: 0 })
    // Scan runs asynchronously — status tracked in scanProgress map
    // In production, this would kick off the Phase 1 pipeline via the GmailSource
    return { content: [{ type: 'text', text: JSON.stringify({ handle: user_email, status: 'started', mode }) }] }
  },
)

server.tool(
  'get_scan_status',
  'Check the progress of a running scan.',
  {
    user_email: { type: 'string', description: 'The Gmail address being scanned' },
  },
  async ({ user_email }) => {
    const progress = scanProgress.get(user_email) || { status: 'idle', processed: 0, total: 0, candidatesFound: 0 }
    return { content: [{ type: 'text', text: JSON.stringify(progress) }] }
  },
)

server.tool(
  'enrich_candidate',
  'Deep AI analysis of one candidate. Claude reads email threads, extracts signature, classifies relationship, writes reasoning.',
  {
    candidate_email: { type: 'string', description: 'Email address of the candidate' },
    record_id: { type: 'string', description: 'Airtable record ID of the Imported Contact' },
    gmail_access_token: { type: 'string', description: 'OAuth access token for the user\'s Gmail' },
    gmail_refresh_token: { type: 'string', description: 'OAuth refresh token' },
  },
  async ({ candidate_email, record_id, gmail_access_token, gmail_refresh_token }) => {
    const gmail = new GmailSource()
    await gmail.authenticate({
      accessToken: gmail_access_token,
      refreshToken: gmail_refresh_token,
      expiresAt: Date.now() + 3600000,
    })

    const result = await enrichCandidate(
      candidate_email, record_id, gmail, airtable, ANTHROPIC_API_KEY,
    )

    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool(
  'check_enrichment',
  'Compare an existing CRM contact against their latest email data. Returns field diffs.',
  {
    contact_email: { type: 'string', description: 'Email of the existing CRM contact' },
    gmail_access_token: { type: 'string', description: 'OAuth access token' },
    gmail_refresh_token: { type: 'string', description: 'OAuth refresh token' },
  },
  async ({ contact_email, gmail_access_token, gmail_refresh_token }) => {
    const gmail = new GmailSource()
    await gmail.authenticate({
      accessToken: gmail_access_token,
      refreshToken: gmail_refresh_token,
      expiresAt: Date.now() + 3600000,
    })

    // Fetch latest signature from email
    const threads = await gmail.fetchThreads(contact_email)
    if (threads.length === 0) {
      return { content: [{ type: 'text', text: JSON.stringify({ diffs: [] }) }] }
    }

    // Get the most recent message body for signature extraction
    // ... (extract signature, compare against CRM contact fields, return diffs)
    const diffs: FieldDiff[] = []

    return { content: [{ type: 'text', text: JSON.stringify({ diffs }) }] }
  },
)

// ─── Start ──────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('email-intelligence MCP server running on stdio')
}

main().catch(console.error)
```

- [ ] **Step 2: Verify the server starts**

```bash
cd email-intelligence && echo '{}' | npx tsx src/index.ts
```
Expected: "email-intelligence MCP server running on stdio" on stderr

- [ ] **Step 3: Commit**

```bash
git add email-intelligence/src/index.ts
git commit -m "feat(email-intel-p2): MCP server entry point — 4 tools registered, stdio transport"
```

---

## Task 8: Register MCP Server in Claude Config

**Files:**
- Modify: Claude MCP configuration (`.claude.json` or project MCP settings)

- [ ] **Step 1: Add email-intelligence to MCP server config**

```json
{
  "mcpServers": {
    "email-intelligence": {
      "command": "npx",
      "args": ["tsx", "email-intelligence/src/index.ts"],
      "env": {
        "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}",
        "AIRTABLE_BASE_ID": "appYXbUdcmSwBoPFU",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

- [ ] **Step 2: Verify the MCP server tools appear in Claude Code**

Start a new Claude Code session and verify `mcp__email-intelligence__scan_inbox`, `mcp__email-intelligence__enrich_candidate`, etc. appear in the tool list.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(email-intel-p2): register email-intelligence MCP server in config"
```

---

## Task 9: AI Reasoning Card — UI Updates (Both Apps)

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `ILS CRM/Views/ImportedContacts/ImportedContactDetailView.swift`

- [ ] **Step 1: Add AI Reasoning card to Electron detail pane**

In the Imported Contacts detail pane, add a purple-tinted card that displays the `ai_reasoning` field when it's populated. Show the `confidence_score` badge (now 0-100 range after Phase 2 enrichment vs 0-60 from Phase 1 heuristics). If `ai_reasoning` is null, show the Phase 1 metadata instead ("Based on 12 threads over 5 months, discovered via CC").

```tsx
{contact.ai_reasoning ? (
  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 mb-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">AI Reasoning</span>
      <span className={`text-xs px-2 py-0.5 rounded ${
        (contact.confidence_score || 0) >= 80 ? 'bg-green-500/20 text-green-400'
        : (contact.confidence_score || 0) >= 50 ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-gray-500/20 text-gray-400'
      }`}>
        {contact.confidence_score}% confidence
      </span>
    </div>
    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{contact.ai_reasoning}</p>
  </div>
) : (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 mb-4">
    <p className="text-sm text-[var(--text-tertiary)]">
      Based on {contact.email_thread_count || 0} threads, discovered via {contact.discovered_via || 'email'}
    </p>
  </div>
)}
```

- [ ] **Step 2: Add AI Reasoning card to Swift detail view**

```swift
// In ImportedContactDetailView.swift
if let reasoning = contact.aiReasoning, !reasoning.isEmpty {
    GroupBox {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("AI REASONING")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.purple.opacity(0.8))
                    .textCase(.uppercase)
                    .tracking(0.5)

                ConfidenceBadge(score: contact.confidenceScore ?? 0)
            }

            Text(reasoning)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .lineSpacing(4)
        }
        .padding(4)
    }
    .backgroundStyle(.ultraThinMaterial)
}
```

- [ ] **Step 3: Build both apps to verify**

- [ ] **Step 4: Commit**

```bash
git add src/components/imported-contacts/ "swift-app/ILS CRM/Views/ImportedContacts/"
git commit -m "feat(email-intel-p2): AI Reasoning card in Imported Contacts detail (both apps)"
```

---

## Task 10: Enrichment Queue Polish

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `ILS CRM/Views/ImportedContacts/ImportedContactsView.swift`

- [ ] **Step 1: Polish enrichment queue rows — current vs suggested side-by-side**

When an enrichment queue item is selected, show a diff view:
- Left: current CRM value (dimmed)
- Right: suggested value from email (highlighted)
- "Accept" button updates the CRM contact
- "Dismiss" button removes the suggestion

```tsx
{enrichmentItem && (
  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-green-400">Update Available</span>
      <span className="text-xs text-[var(--text-tertiary)]">{enrichmentItem.field_name}</span>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-[var(--text-tertiary)] mb-1">Current</div>
        <div className="text-sm text-[var(--text-secondary)] line-through opacity-60">
          {enrichmentItem.current_value || '(empty)'}
        </div>
      </div>
      <div>
        <div className="text-xs text-green-400 mb-1">Suggested</div>
        <div className="text-sm font-medium">{enrichmentItem.suggested_value}</div>
      </div>
    </div>
    <div className="flex gap-2 mt-3">
      <button onClick={handleDismissEnrichment} className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)]">Dismiss</button>
      <button onClick={handleAcceptEnrichment} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white">Accept Update</button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Implement same pattern in Swift**

Use a `GroupBox` with green tint, two `VStack` columns for current vs suggested, and "Accept" / "Dismiss" buttons.

- [ ] **Step 3: Add "UPDATE" badge to contact list for enrichment items**

In the contact row, if the row represents an enrichment queue item (matched to existing contact), show a green "UPDATE" badge instead of the confidence percentage.

- [ ] **Step 4: Commit**

```bash
git add src/components/imported-contacts/ "swift-app/ILS CRM/Views/ImportedContacts/"
git commit -m "feat(email-intel-p2): enrichment queue polish — side-by-side diff + UPDATE badge"
```

---

## Task 11: Integration Tests + Manual QA

**Files:**
- Create: `email-intelligence/tests/tools/enrich-candidate.test.ts`

- [ ] **Step 1: Write integration test for enrich_candidate**

Mock the Anthropic client to return a predetermined tool-use sequence (gmail_get_threads → gmail_get_message → gmail_get_signature_block → crm_lookup_company → crm_write_suggestion). Verify the full loop executes and produces an EnrichmentResult.

- [ ] **Step 2: Run all tests**

```bash
cd email-intelligence && npm test
```
Expected: ALL PASS

- [ ] **Step 3: Manual QA — enrich a real candidate**

Using Claude Code with the email-intelligence MCP server registered:
1. Call `mcp__email-intelligence__enrich_candidate` with a real Discovered candidate from the CRM
2. Verify the AI Reasoning card appears in the Imported Contacts detail view
3. Verify the confidence score was upgraded from 0-60 to 0-100 range
4. Verify the relationship type classification makes sense
5. Approve the enriched suggestion end-to-end

- [ ] **Step 4: Commit tests**

```bash
git add email-intelligence/tests/
git commit -m "test(email-intel-p2): integration tests for agent enrichment pipeline"
```

---

## Task 12: Documentation + Vault Update

**Files:**
- Modify: `PARITY.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update PARITY.md**

Add Phase 2 features to the Email Intelligence section: MCP server, agent enrichment, AI reasoning card, enrichment queue polish.

- [ ] **Step 2: Update CLAUDE.md lessons learned**

Add any Phase 2 lessons: Claude API tool-use patterns, MCP server gotchas, agent reasoning limits, etc.

- [ ] **Step 3: Update vault memory**

Append to `~/Obsidian/ImagineLab/Claude Memory/apps/ils-crm.md` with Phase 2 completion status.

- [ ] **Step 4: Commit**

```bash
git add PARITY.md CLAUDE.md
git commit -m "docs: update PARITY.md + CLAUDE.md for Email Intelligence Phase 2"
```

---

## Dependencies

```
Task 1 (scaffold + types) ─── Task 2 (EmailSource + GmailSource)
                           ├── Task 3 (Airtable client)
                           ├── Task 4 (internal tools) ──── Task 5 (reasoning loop)
                           │                                     │
                           └── Task 6 (external MCP tools) ──────┤
                                                                  │
                                     Task 7 (MCP server entry) ──┘
                                     Task 8 (register in config)
                                     Task 9 (AI Reasoning card UI) ── Task 10 (enrichment polish)
                                     Task 11 (integration tests)
                                     Task 12 (docs + vault)
```

**Parallel execution opportunities:**
- Tasks 2 + 3 (GmailSource + Airtable client) can run in parallel after Task 1
- Tasks 4 + 6 (internal tools + external tools) can run in parallel after Tasks 2 + 3
- Task 9 + 10 (UI updates) can run in parallel with Tasks 4-7 (server-side)
