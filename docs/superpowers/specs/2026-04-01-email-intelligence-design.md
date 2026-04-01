# Email Intelligence — Design Spec

> Automatic contact discovery from Gmail, with AI-powered relationship classification and enrichment.

**Date:** 2026-04-01
**Status:** Approved
**Platforms:** Swift (design master) + Electron

---

## Overview

Email Intelligence scans each CRM user's Gmail inbox to discover contacts and companies that should be in the CRM. It filters out spam, newsletters, and noise using a configurable rules engine, then classifies survivors by relationship type (Client, Vendor, Employee, Contractor) with confidence scoring. Suggestions flow into the existing Imported Contacts staging area for human review before being added to the CRM.

The system also detects enrichment opportunities — when an existing CRM contact has new information in recent emails (new phone number, updated title, etc.) — and queues those updates for user approval.

### Key Decisions

- **Gmail only** (Google Workspace) via OAuth 2.0 with `gmail.readonly` scope
- **Both apps** — Swift is design master, Electron follows
- **Imported Contacts** as the staging area (extends existing approve/reject workflow)
- **Background polling + on-demand** scanning
- **Full archive** on first run, incremental via `historyId` watermark after
- **Rules + heuristics** in Phase 1 (no Claude dependency), AI reasoning in Phase 2
- **Pre-populated review form** before adding to CRM (never auto-approve)
- **Smart company linking** — pair new contacts with existing companies, create new companies when needed
- **Enrichment flags** on existing contacts when new info is discovered
- **Multi-user** ready (5+ team members, per-user OAuth)

---

## Architecture

Two-phase hybrid system:

### Phase 1 — Pipeline (in-app)

Runs inside both Electron and Swift apps. Extends the existing sync engine pattern.

```
Gmail API → Header Parser (From/To/CC/Reply Chain) → Rules Engine → CRM Matcher (dedup) → Candidates (Airtable)
```

- **Gmail API client** wraps Google's REST API. OAuth 2.0 per user, `gmail.readonly` scope only.
- **Header Parser** extracts unique email addresses from From, To, CC fields and reply chain participants.
- **Rules Engine** applies configurable rules from the Email Scan Rules Airtable table. First matching `reject` rule eliminates an address. Rules execute in order.
- **CRM Matcher** deduplicates against existing Contacts (by normalized email — strips `+` aliases, ignores Gmail dots). Known contacts route to the Enrichment Queue. Unknown contacts become candidates. Uses read-then-write-if-absent with email uniqueness check to prevent multi-user race conditions.
- **Heuristic Classification** — no Claude API in Phase 1. Classifies relationship type using domain matching (known client/vendor domains), From vs CC ratio (direct correspondents score higher), thread frequency, and email domain patterns. Assigns heuristic confidence score (0-60 range). Phase 2 upgrades to AI-scored (0-100).
- **Heuristic Signature Extraction** — regex-based parsing of the last 20 lines for phone numbers, titles, and company names (~70% accuracy).
- **Name Parsing** — extracts display name from `From` header (`"Sarah Chen" <sarah@acme.com>`). Splits on last space for first/last name. Handles edge cases: email-as-name, company-as-name (falls back to email username).

### Phase 2 — Agent (MCP Server)

Standalone `email-intelligence` MCP server (Node.js/TypeScript). Claude reasons about relationships using tools.

```
Candidates → Claude Agent (thread analysis) → Signature Parser (AI) → Relationship Classifier → Rich Suggestions
```

- **MCP Server** exposes tools to CRM apps and provides internal tools for Claude's reasoning.
- **Provider Abstraction** — `EmailSource` interface with `GmailSource` as first adapter. `OutlookSource` and `IMAPSource` are future slots.
- **Agentic Enrichment** — Claude reads full email threads, extracts signatures with structured output, classifies relationships with reasoning, and writes rich suggestions.

### Data Ownership Protocol

Phase 1 and Phase 2 write to the same Airtable tables. To prevent race conditions, each phase owns specific state transitions:

- **Phase 1** writes new records with `onboarding_status: 'Discovered'` only
- **Phase 2** reads `Discovered` records and upgrades them to `Classified` → `Ready`
- **User actions** transition `Ready` → `Approved` or `Dismissed`
- One writer per state transition — no concurrent updates to the same record

### Phase 1 ships standalone. Phase 2 upgrades intelligence but is not required.

### Prerequisite: Swift Imported Contacts Page

Swift's Imported Contacts is currently at `Stub` status (placeholder UI, no logic). The full Imported Contacts list/detail page must be built as a prerequisite before adding Email Intelligence UI. This is included in the shipping plan as Wave 3.

---

## Data Model

### Imported Contacts — New Fields (11)

| Field | Type | Purpose |
|-------|------|---------|
| `source` | Single Select | Where this record came from: `ContactEnricher` / `Email Scan` / `Manual` |
| `relationship_type` | Single Select | `Client` / `Vendor` / `Employee` / `Contractor` / `Unknown` |
| `confidence_score` | Number (0-100) | AI confidence in the suggestion. Used for sorting + display. |
| `ai_reasoning` | Long Text | Human-readable explanation of why this person was suggested |
| `email_thread_count` | Number | How many email threads this person appeared in |
| `first_seen_date` | Date | Earliest email involving this person |
| `last_seen_date` | Date | Most recent email involving this person |
| `discovered_via` | Single Select | Primary discovery method (most frequent role across threads): `From` / `To` / `CC` / `Reply Chain` |
| `discovered_by` | Collaborator | Which CRM user's inbox surfaced this person |
| `suggested_company_link` | Link to Companies | If matched to existing Company. Null if new company needed. |
| `suggested_company_name` | Text | Company name extracted from signature (for new company creation) |

### New Table: Email Scan Rules

Configurable filtering rules — editable in Airtable UI, no code changes needed.

| Field | Type | Purpose |
|-------|------|---------|
| `rule_type` | Single Select | `domain-blocklist` / `min-exchanges` / `header-match` / `sender-pattern` |
| `rule_value` | Text | The pattern, domain, or count |
| `action` | Single Select | `reject` / `flag` / `require` |
| `is_active` | Checkbox | Whether the rule is currently applied |

**Default rules:**
1. No-reply addresses (`sender-pattern`, reject) — `noreply@`, `no-reply@`, `donotreply@`
2. Group/role addresses (`sender-pattern`, reject) — `info@`, `sales@`, `support@`, `hello@`, `team@`, `admin@`, `billing@`, `accounts@`, `contact@`
3. Bulk sender domains (`domain-blocklist`, reject) — mailchimp.com, sendgrid.net, constantcontact.com, hubspot.com
4. Newsletter header (`header-match`, reject) — `List-Unsubscribe` header present
5. Own email address (`sender-pattern`, reject) — skip the authenticated user's own address (not all @imaginelabstudios.com — other internal addresses may be new employees not yet in CRM)
6. Social/notifications (`domain-blocklist`, reject) — linkedin.com, facebookmail.com, notifications@github.com
7. Minimum exchange count (`min-exchanges`, require) — must appear in 2+ threads
8. Already in CRM (`crm-dedup`, enrich) — email matches existing Contact (by normalized email) → route to Enrichment Queue

### New Table: Email Scan State

Per-user scan tracking.

| Field | Type | Purpose |
|-------|------|---------|
| `user_email` | Email | The CRM user's email |
| `gmail_history_id` | Text | Watermark for incremental sync |
| `last_scan_date` | Date | Timestamp of last completed scan |
| `scan_status` | Single Select | `idle` / `scanning` / `error` |
| `total_processed` | Number | Running count of emails scanned |

### New Table: Enrichment Queue

Update suggestions for existing CRM contacts.

| Field | Type | Purpose |
|-------|------|---------|
| `contact_link` | Link to Contacts | The existing CRM contact |
| `field_name` | Text | Which field has new data |
| `current_value` | Text | What's in CRM now |
| `suggested_value` | Text | New data from email |
| `source_email_date` | Date | When the email was sent |
| `status` | Single Select | `pending` / `approved` / `dismissed` |
| `discovered_by` | Collaborator | Which user found the new data |
| `confidence_score` | Number (0-100) | Confidence in the suggested value |

### State Machine — Suggestion Lifecycle

Maps to `onboarding_status` single select on Imported Contacts. Existing values extended with new states:

```
Discovered → Classified → Ready → Approved
    ↓            ↓          ↓   → Dismissed
  Error        Error      Error → Rejected
```

**States:**
- **Discovered** — Phase 1 pipeline created this record. Has basic metadata (email, thread count, discovered_via). No classification yet.
- **Classified** — Heuristic classification applied (Phase 1) or AI classification applied (Phase 2). Has relationship_type and confidence_score. Transition trigger: heuristic scoring completes (Phase 1) or `enrich_candidate` completes (Phase 2).
- **Ready** — All extractable fields populated (name, title, company, phone from signature). Pre-filled review form is complete. Transition trigger: signature extraction completes successfully. If Phase 2 is not running, Phase 1 moves directly from Classified → Ready after heuristic extraction.
- **Approved** — User reviewed and confirmed. Contact + optional Company created in CRM. Terminal state. (Replaces the previous concept of separate "Approved" and "In CRM" — they are the same action.)
- **Dismissed** — User saw this suggestion and chose "not interested." Not the same as Rejected — dismissals are reversible via Settings > "Manage dismissed suggestions." Scanner skips dismissed email addresses on future scans.
- **Rejected** — User reviewed in detail and actively decided against adding. Permanent. Not shown again.
- **Error** — Reachable from any state. Signature extraction failed, API returned garbage, domain unresolvable. Shows error reason in UI. Can be retried.

---

## UI Design

Swift is the design master. Electron follows the same layout and patterns.

### Imported Contacts Page — Redesigned

**Layout:** Same list/detail split as existing Imported Contacts, extended with new elements.

**Left panel (list):**
- **Source filter tabs** — capsule pills: "All (23)", "Email (18)", "Contacts (5)". Future-proof for additional sources.
- **Scan controls** — "Last scan: 3 min ago" status + "Scan Now" button
- **Sort options** — Confidence / Newest / Threads
- **Contact rows** show: name, title + company (or email if no title), relationship type badge (Client/Vendor/Employee/Contractor), confidence percentage badge (green 80+, yellow 50-79), thread count
- **Enrichment rows** — visually distinct (green tint + "UPDATE" badge). Shows "Already in CRM — new phone found" style description.

**Right panel (detail):**
- **Hero section** — name, title + company, Dismiss and "Add to CRM" buttons
- **AI Reasoning card** — purple-tinted card with confidence badge. Human-readable explanation of why this person was suggested and what the AI found across their email threads. (Phase 2 — Phase 1 shows basic metadata instead.)
- **Extracted Contact Info** — 2-column grid of editable fields: First Name, Last Name, Email, Phone, Title, Relationship Type. All fields are inputs, not display-only.
- **Company pairing card** — yellow-tinted card shown when a new Company will be created alongside the Contact. Shows company name and domain. If the company already exists in CRM, shows a link to the existing record instead.
- **Email Activity stats** — 4-stat row: Threads count, Time span, First seen method (From/To/CC), Last seen method.

**"Add to CRM" flow:** Button opens the existing contact create form, pre-populated with all extracted fields. User reviews/edits, then confirms. If a new Company is paired, it's created and linked in the same transaction.

### Settings Page — Gmail Section

New section in Settings (both apps):
- **"Connect Gmail" / "Disconnect Gmail"** button
- Connected email address display
- Scan interval picker: 1m / 5m / 15m / Off
- Last scan timestamp + status
- "Manage dismissed suggestions" link

### Platform Implementation

| Element | Swift (master) | Electron (follows) |
|---------|---------------|-------------------|
| Layout | NavigationSplitView (3-col like Tasks) | Existing list/detail split pane |
| Source tabs | Capsule pills (like Contact filter tabs) | Tailwind pill buttons |
| Confidence badge | SwiftUI overlay with color threshold | Tailwind badge component |
| AI Reasoning | Material card with `.ultraThinMaterial` | CSS card with `backdrop-filter` |
| Company pairing | Grouped Form section | Yellow-tinted card |
| Form on approve | Reuse existing contact create form | Reuse existing contact create form |
| Scan Now | Toolbar button (like Force Sync) | Button in list header |

---

## Gmail Integration

### OAuth Flow

1. User clicks "Connect Gmail" in Settings
2. Platform-specific OAuth:
   - **Swift:** `ASWebAuthenticationSession` — native in-app browser sheet, handles redirect automatically
   - **Electron:** `shell.openExternal` to launch system browser → local HTTP server on `localhost:<port>` captures the OAuth redirect callback
3. Scope: `gmail.readonly` only (read-only access to messages)
4. On success: store access token + refresh token
   - Swift: macOS Keychain via `KeychainService`
   - Electron: `safeStorage` (OS keychain backend)
5. Initial archive scan begins automatically

**Error cases:** User closes consent screen → show "Connection cancelled" in Settings. Google Workspace admin blocks third-party apps → show "Your organization's admin has restricted this app. Contact your IT admin." OAuth implementations are platform-specific and share only the client ID and scope.

Uses the existing ILS Google Workspace OAuth client. Add `gmail.readonly` to the existing scope list.

### Scanning Modes

**Initial Archive Scan:**
- Uses `messages.list` API (paginated, 500/page)
- Fetches headers only on first pass (fast)
- Builds unique email address → thread count map
- Rules engine filters in-memory
- Survivors get full message fetch for signature extraction
- Batched writes to Airtable (10/request)
- Progress shown in UI: "Scanning... 2,340 of ~8,500 messages"
- Saves `historyId` watermark on completion
- Resumable: saves checkpoint (page token + candidates found) if interrupted
- Estimate: 10K email archive ≈ 3-5 min headers, 1-2 min full fetch of ~200 survivors

**Background Poll:**
- Uses `history.list` API with stored `historyId`
- Returns only messages added since last check (typically 0-10)
- Same pipeline: parse → rules → extract → stage
- Updates `historyId` watermark
- **historyId expiration:** Gmail history IDs expire after ~7 days. If `history.list` returns 404, automatically fall back to a full re-scan (same as initial archive scan). This handles users who don't open the app for a week.
- Configurable interval: 1m / 5m / 15m / Off
- **Sync lock protocol:** Does NOT hold the sync lock for the full scan. Acquires/releases the lock only for each batch write (10 records, ~1 second). This prevents blocking the CRM sync engine during long scans. The existing sync engine force-breaks locks after 120s — batch locking avoids this.
- API cost: ~1 call per poll. Negligible.

**On-Demand:**
- Same as background poll but user-triggered via "Scan Now" button
- Resets the poll timer (avoids double-scan)
- Shows progress spinner on button
- Toast notification on completion: "Found 3 new suggestions"

### Rules Engine

Rules execute in order. First matching `reject` rule eliminates the address. Configurable via the Email Scan Rules Airtable table.

Processing estimate for a typical 10K email archive:
~8,000 unique addresses → ~5,500 rejected by rules (including group addresses) → ~1,200 rejected by min-exchange filter → **~300 candidates** with heuristic classification (Phase 1) → Phase 2 upgrades survivors with AI confidence scoring

### Signature Extraction

**Phase 1 — Heuristic + Regex:**
- Scan last 20 lines of plain-text body for signature block
- Look for `--` or `___` signature delimiters
- Regex for phone, title patterns, company name
- Works for ~70% of signatures

**Phase 2 — Claude Extraction:**
- Send signature block + email context to Claude API
- Structured output: name, title, company, phone, address, social links
- Cross-references across multiple emails from same person
- Picks most recent/complete signature version
- Works for ~95%+ of signatures

---

## Phase 2 — MCP Server

### Server Identity

- **Name:** `email-intelligence`
- **Stack:** Node.js / TypeScript / MCP SDK
- **Transport:** stdio (local) or SSE (remote)
- **Dependencies:** Claude API, Gmail API, Airtable API

### Tools Exposed to CRM Apps (4)

| Tool | Purpose |
|------|---------|
| `scan_inbox` | Trigger a scan. Params: `user_email`, `mode: full \| incremental`. Returns progress handle. Caller polls `get_scan_status` at recommended 2s interval until `status: 'complete'`. |
| `get_scan_status` | Check progress. Returns `{ processed, total, candidates_found, status: 'scanning' \| 'complete' \| 'error' }` |
| `enrich_candidate` | Deep analysis of one candidate. Claude reads threads, extracts signature, classifies, writes reasoning. Returns the enriched suggestion including AI reasoning (used for the detail pane AI Reasoning card). Caller owns batching logic (priority sort, progress UI, cancellation). |
| `check_enrichment` | Compare existing contact against latest email data. Returns field diffs for the Enrichment Queue. |

### Internal Agent Tools (7)

Tools Claude uses during reasoning:

| Tool | Purpose |
|------|---------|
| `gmail_get_threads` | Fetch all threads involving an email address |
| `gmail_get_message` | Fetch full message content (headers + body) |
| `gmail_search_messages` | Search by subject, date range, or other criteria. Enables cross-reference: "Did anyone else email this person?" |
| `gmail_get_signature_block` | Extract the signature portion from a message body |
| `crm_lookup_contact` | Search CRM by email (normalized), name, or company |
| `crm_lookup_company` | Search Companies by name or domain |
| `crm_write_suggestion` | Write enriched suggestion to Imported Contacts |

### Provider Abstraction

```typescript
interface OAuthCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface EmailMessage {
  id: string
  threadId: string
  from: { name: string | null; email: string }
  to: Array<{ name: string | null; email: string }>
  cc: Array<{ name: string | null; email: string }>
  date: Date
  subject: string
  headers: Map<string, string>
  bodyPlainText: string | null
}

interface EmailHeaders {
  from: { name: string | null; email: string }
  to: Array<{ name: string | null; email: string }>
  cc: Array<{ name: string | null; email: string }>
  date: Date
  subject: string
  headers: Map<string, string>  // includes List-Unsubscribe etc.
}

// Opaque watermark — serialized to JSON for storage
// Gmail stores historyId (string), Outlook stores deltaLink (URL)
type WatermarkState = Record<string, unknown>

interface ScanCheckpoint {
  watermark: WatermarkState
  pageToken: string | null
  processedCount: number
}

interface EmailSource<TAuth = OAuthCredentials> {
  authenticate(credentials: TAuth): Promise<void>
  fetchMessages(options: FetchOptions): AsyncIterable<EmailMessage>
  fetchMessageHeaders(id: string): Promise<EmailHeaders>  // headers-only fast path
  fetchThreads(address: string): Promise<EmailThread[]>
  getMessageBody(id: string): Promise<string>
  getWatermark(): Promise<WatermarkState | null>
  setWatermark(state: WatermarkState): Promise<void>
  getCheckpoint(): Promise<ScanCheckpoint>       // for resumable scans
  resumeFrom(checkpoint: ScanCheckpoint): void   // restore scan position
  subscribe?(callback: (messageIds: string[]) => void): Promise<() => void>  // optional push notifications
}
```

**Adapters:**
- `GmailSource` — Gmail REST API + History API. OAuth 2.0. Implements `subscribe` via Gmail Pub/Sub `users.watch`. (Phase 1)
- `OutlookSource` — Microsoft Graph API. `deltaLink` watermarks. Implements `subscribe` via Graph subscriptions. (Future)
- `IMAPSource` — Generic IMAP for iCloud Mail, Fastmail, etc. Implements `subscribe` via IMAP IDLE. (Future)

### Type Definitions for Rules Engine

```typescript
type Rule =
  | { type: 'domain-blocklist'; value: string; action: 'reject' | 'flag' }
  | { type: 'min-exchanges'; value: number; action: 'require' }
  | { type: 'header-match'; value: string; action: 'reject' | 'flag' }
  | { type: 'sender-pattern'; value: string; action: 'reject' }
  | { type: 'crm-dedup'; action: 'enrich' }

type SuggestionStatus = 'Discovered' | 'Classified' | 'Ready' | 'Approved' | 'Dismissed' | 'Rejected' | 'Error'
type RelationshipType = 'Client' | 'Vendor' | 'Employee' | 'Contractor' | 'Unknown'
type DiscoveryMethod = 'From' | 'To' | 'CC' | 'Reply Chain'
type ScanSource = 'ContactEnricher' | 'Email Scan' | 'Manual'
```

These union types enforce valid values at compile time. The existing `ImportedContact` interface should use these instead of `string | null` for single select fields.

### Agent Reasoning Flow

When enriching a candidate (e.g., `sarah.chen@acmecreative.com`):

1. **Gather threads** — `gmail_get_threads` → 12 threads
2. **Read key messages** — `gmail_get_message` on 3 most recent + first. Understand context.
3. **Extract signature** — `gmail_get_signature_block` on latest message
4. **Check CRM** — `crm_lookup_company("Acme Creative")` → not found. `crm_lookup_contact(email)` → not found.
5. **Classify** — Based on thread content: vendor (scenic fabrication). Confidence: 94%.
6. **Write suggestion** — `crm_write_suggestion` with all extracted fields + reasoning

### Cost Estimate

| Metric | Cost |
|--------|------|
| Per candidate (Haiku) | ~$0.02 |
| Initial scan (300 candidates) | ~$6 |
| Ongoing per user per month | ~$0.50 |
| 5 users ongoing monthly | ~$2.50 |

Sonnet available for higher-confidence reasoning at ~10x cost.

---

## Error Handling

| Scenario | Behavior | User Experience |
|----------|----------|----------------|
| OAuth token expires | Auto-refresh via refresh token. If refresh fails, mark `error`. | Settings shows "Gmail disconnected — reconnect" button. |
| OAuth consent rejected | User closes consent screen or admin blocks app. | "Connection cancelled" or "Your organization's admin has restricted this app." |
| Gmail API rate limit | Exponential backoff (1s, 2s, 4s, max 60s). | Initial scan may slow. No user action needed. |
| historyId expired (~7 days) | `history.list` returns 404. Automatically fall back to full re-scan from scratch. | "Re-scanning full inbox (sync marker expired)" — progress bar as normal. |
| Initial scan interrupted | Save checkpoint (page token + candidates). Resume from checkpoint on relaunch. | "Scan paused — will resume next launch." Partial suggestions visible. |
| Duplicate across users | Read-then-write-if-absent by normalized email. If race creates duplicate, post-write dedup sweep removes it. | No duplicates in queue. |
| Claude API unavailable | Phase 1 pipeline continues (no Claude dependency). Candidates queue with heuristic scores. Phase 2 enrichment retries when API returns. | Suggestions appear with heuristic confidence (0-60). "Pending analysis" badge. |
| Airtable sync conflict | Batch locking — acquires/releases sync lock per 10-record write batch (~1s), not for full scan. | Transparent. CRM sync not blocked. |
| Dismissed contact re-scan | Rejection set stored (Dismissed state on Imported Contact). Scanner skips. Reversible via Settings > "Manage dismissed suggestions." | Dismissed contacts stay gone unless user restores them. |
| Group/role email addresses | Caught by rule #2 (group-address-pattern). `info@`, `sales@`, etc. auto-rejected. | Never shown. |
| Email aliases / plus-addressing | Normalized before dedup: strip `+` suffix, ignore Gmail dots. `sarah+newsletter@` and `sarah@` = same person. | Single suggestion, not duplicates. |
| Forwarded emails | Phase 1 header parser attributes to forwarder (header From). Phase 2 agent can detect forwarding patterns in body and extract original sender. | Phase 1: forwarder suggested. Phase 2: original sender suggested. |
| Signature extraction fails | Record moves to `Error` state with reason. Retryable — user or next scan can re-trigger. | "Could not extract contact details" with retry button. |

---

## Security & Privacy

**What we do:**
- `gmail.readonly` scope only — cannot send, delete, or modify emails
- Per-user OAuth — each person authenticates their own account
- Token storage: Swift uses macOS Keychain, Electron uses `safeStorage`
- No email content stored — bodies read transiently for extraction, never persisted
- Claude API calls use ephemeral context (not retained per API terms)
- Disconnect button revokes token and deletes all credentials

**What we don't do:**
- Never store full email bodies in Airtable or local DB
- Never use a shared service account across users
- Never send or modify emails
- Never share one user's email data with another user
- Never auto-approve suggestions — human always reviews
- Never scan personal email — only @imaginelabstudios.com accounts

---

## Shipping Plan

### Phase 1 — Pipeline + Basic Classification

**Wave 1: Gmail + OAuth**
- Google OAuth flow (both apps)
- Token storage (Keychain / safeStorage)
- Gmail API client wrapper
- Settings UI: Connect/Disconnect

**Wave 2: Scan + Rules**
- Header parser (From/To/CC/Reply Chain) with name extraction from display names
- Rules engine + Airtable rules table (including group-address-pattern rule)
- Email normalization (strip `+` aliases, ignore Gmail dots)
- Initial archive scan (paginated, resumable via checkpoint)
- Incremental scan (historyId watermark with 7-day expiration fallback)
- Background polling (configurable interval, batch sync locking)

**Wave 3: Staging + UI**
- Airtable schema changes: 11 new fields on Imported Contacts. Follow the Airtable field checklist from CLAUDE.md for each field: (1) create in Airtable, (2) add to `field-maps.ts` + `converters.ts` (Electron), (3) add to `AirtableConfig.swift` + SwiftData model + `AirtableConvertible` extension (Swift), (4) update SQLite schema, (5) update TypeScript `ImportedContact` interface with union types
- New tables: Email Scan Rules, Email Scan State, Enrichment Queue — all three created in this wave (Enrichment Queue needed by CRM dedup rule in Wave 2). Register in sync engine: `SYNC_ORDER`, `TABLE_NAME_TO_ID`, `TABLE_CONVERTERS`, `VALID_TABLES` whitelist in entities.ts. Email Scan Rules and State are read-only in sync engine (scanner writes directly via API, sync engine pulls).
- Build Swift Imported Contacts page from scratch (currently Stub status) — list/detail split matching Tasks pattern
- Imported Contacts UI redesign (source tabs, scan controls, sort) — both apps
- Confidence badges and relationship type badges

**Wave 4: Classify + Approve**
- Heuristic classification (domain matching, From/CC ratio, thread frequency) — no Claude API dependency
- Heuristic signature extraction (regex)
- CRM dedup + smart company matching (normalized email comparison)
- Pre-filled review form (reuse existing contact create form)
- Approve/dismiss/reject flow + state machine transitions
- Enrichment Queue basic UI (existing contact diff display — approval UI for updates)

### Phase 2 — Agentic Intelligence Layer

**Wave 5: MCP Server**
- `email-intelligence` MCP server scaffold (Node.js/TypeScript)
- Typed `EmailSource` interface + `GmailSource` adapter (with `fetchMessageHeaders`, checkpoint support, optional `subscribe` for push)
- 4 external tools + 7 internal agent tools
- stdio + SSE transport
- Typed rule discriminated unions, `SuggestionStatus` union types

**Wave 6: Agent Enrichment**
- Claude agent reasoning flow (enrich_candidate tool)
- Deep signature extraction (structured output, cross-references across emails)
- AI relationship classification with human-readable reasoning
- Confidence score upgrade: heuristic (0-60) → AI-scored (0-100)
- AI Reasoning card in UI (both apps)
- `gmail_search_messages` for cross-user thread discovery

**Wave 7: Enrichment Polish**
- Enrichment Queue approval UI polish (current vs suggested value side-by-side)
- "UPDATE" badge in contact list
- Dismissal pattern learning (optional): track dismissed domains to adjust future confidence scores downward

---

## Testing Strategy

- **Unit tests:** Rules engine (each rule type including group-address-pattern), signature parser (regex patterns), CRM dedup matcher with email normalization, state machine transitions (all valid/invalid transitions), name parser (display name splitting, edge cases), heuristic classifier (domain matching, From/CC ratio scoring)
- **Integration tests:** Gmail API mock → full pipeline → Airtable write. Verify candidates pass/fail rules correctly. Test checkpoint save/resume. Test batch sync lock acquire/release.
- **Manual QA:** Connect Edward's Gmail, run initial scan, verify suggestions are sensible. Check signature extraction against 10 real emails. Approve 3 suggestions end-to-end. Verify enrichment queue for existing contacts with new data.
- **Edge cases:** Expired OAuth token, OAuth consent rejection, interrupted scan resume, historyId expiration (7-day gap), duplicate across users (concurrent scan race), dismissed re-scan, email with no signature, CC-only contact, reply chain extraction, group addresses (`info@`, `sales@`), email aliases (`sarah+newsletter@`), Gmail dot normalization, forwarded email attribution, company-as-display-name in From header, Error state retry
