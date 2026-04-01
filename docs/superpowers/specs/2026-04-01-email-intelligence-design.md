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
- **Rules + AI** hybrid: fast rule-based filtering, then Claude for nuanced classification
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
- **CRM Matcher** deduplicates against existing Contacts (by email). Known contacts route to the Enrichment Queue. Unknown contacts become candidates.
- **Basic Classification** — batch Claude API call (Haiku) to classify relationship type and assign confidence score for each candidate.
- **Heuristic Signature Extraction** — regex-based parsing of the last 20 lines for phone numbers, titles, and company names (~70% accuracy).

### Phase 2 — Agent (MCP Server)

Standalone `email-intelligence` MCP server (Node.js/TypeScript). Claude reasons about relationships using tools.

```
Candidates → Claude Agent (thread analysis) → Signature Parser (AI) → Relationship Classifier → Rich Suggestions
```

- **MCP Server** exposes tools to CRM apps and provides internal tools for Claude's reasoning.
- **Provider Abstraction** — `EmailSource` interface with `GmailSource` as first adapter. `OutlookSource` and `IMAPSource` are future slots.
- **Agentic Enrichment** — Claude reads full email threads, extracts signatures with structured output, classifies relationships with reasoning, and writes rich suggestions.

### Phase 1 ships standalone. Phase 2 upgrades intelligence but is not required.

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
2. Bulk sender domains (`domain-blocklist`, reject) — mailchimp.com, sendgrid.net, constantcontact.com, hubspot.com
3. Newsletter header (`header-match`, reject) — `List-Unsubscribe` header present
4. Own email address (`sender-pattern`, reject) — skip the authenticated user's own address (not all @imaginelabstudios.com — other internal addresses may be new employees not yet in CRM)
5. Social/notifications (`domain-blocklist`, reject) — linkedin.com, facebookmail.com, notifications@github.com
6. Minimum exchange count (`min-exchanges`, require) — must appear in 2+ threads
7. Already in CRM (`crm-dedup`, enrich) — email matches existing Contact → route to Enrichment Queue

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
Discovered → Classified → Ready → Approved → In CRM
                                 → Rejected
```

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
2. App opens browser to Google OAuth consent screen
3. Scope: `gmail.readonly` only (read-only access to messages)
4. On success: store access token + refresh token
   - Swift: macOS Keychain via `KeychainService`
   - Electron: `safeStorage` (OS keychain backend)
5. Initial archive scan begins automatically

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
- Configurable interval: 1m / 5m / 15m / Off
- Respects Airtable sync lock (`/tmp/ils-crm-sync.lock`)
- API cost: ~1 call per poll. Negligible.

**On-Demand:**
- Same as background poll but user-triggered via "Scan Now" button
- Resets the poll timer (avoids double-scan)
- Shows progress spinner on button
- Toast notification on completion: "Found 3 new suggestions"

### Rules Engine

Rules execute in order. First matching `reject` rule eliminates the address. Configurable via the Email Scan Rules Airtable table.

Processing estimate for a typical 10K email archive:
~8,000 unique addresses → ~6,500 rejected by rules → ~1,200 rejected by min-exchange filter → **~300 candidates** → ~200 suggestions after AI scoring

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

### Tools Exposed to CRM Apps (6)

| Tool | Purpose |
|------|---------|
| `scan_inbox` | Trigger a scan. Params: `user_email`, `mode: full \| incremental`. Returns progress handle. |
| `get_scan_status` | Check progress. Returns `{ processed, total, candidates_found, status }` |
| `enrich_candidate` | Deep analysis of one candidate. Claude reads threads, extracts signature, classifies, writes reasoning. |
| `enrich_batch` | Enrich up to 20 candidates in sequence. Prioritizes by thread count. |
| `check_enrichment` | Compare existing contact against latest email data. Returns field diffs. |
| `get_relationship_summary` | Generate AI summary for the detail pane AI Reasoning card. |

### Internal Agent Tools (6)

Tools Claude uses during reasoning:

| Tool | Purpose |
|------|---------|
| `gmail_get_threads` | Fetch all threads involving an email address |
| `gmail_get_message` | Fetch full message content (headers + body) |
| `gmail_get_signature_block` | Extract the signature portion from a message body |
| `crm_lookup_contact` | Search CRM by email, name, or company |
| `crm_lookup_company` | Search Companies by name or domain |
| `crm_write_suggestion` | Write enriched suggestion to Imported Contacts |

### Provider Abstraction

```typescript
interface EmailSource {
  authenticate(credentials): Promise<void>
  fetchMessages(options): AsyncIterable<EmailMessage>
  fetchThreads(address): Promise<EmailThread[]>
  getMessageBody(id): Promise<string>
  getWatermark(): Promise<string | null>
  setWatermark(id): Promise<void>
}
```

**Adapters:**
- `GmailSource` — Gmail REST API + History API. OAuth 2.0. (Phase 1)
- `OutlookSource` — Microsoft Graph API. (Future)
- `IMAPSource` — Generic IMAP for iCloud Mail, Fastmail, etc. (Future)

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
| OAuth token expires | Auto-refresh via refresh token. If fails, mark `error`. | Settings shows "Gmail disconnected — reconnect" button. |
| Gmail API rate limit | Exponential backoff (1s, 2s, 4s, max 60s). | Initial scan may slow. No user action needed. |
| Initial scan interrupted | Save checkpoint (page token + candidates). Resume on relaunch. | "Scan paused — will resume next launch." Partial suggestions visible. |
| Duplicate across users | Dedup by email in Imported Contacts. First discoverer wins. | No duplicates in queue. |
| Claude API unavailable | Phase 1 pipeline continues. Candidates queue without enrichment. | Suggestions appear with basic info. "Pending analysis" badge. |
| Airtable sync conflict | Respects existing sync lock. Waits for CRM sync to complete. | Transparent. |
| Dismissed contact re-scan | Rejection set stored. Scanner skips permanently. Clearable in Settings. | Dismissed contacts stay gone. |

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
- Header parser (From/To/CC/Reply Chain)
- Rules engine + Airtable rules table
- Initial archive scan (paginated, resumable)
- Incremental scan (historyId watermark)
- Background polling (configurable interval)

**Wave 3: Staging + UI**
- Airtable schema changes (11 new fields on Imported Contacts)
- New tables (Email Scan Rules, Email Scan State)
- Imported Contacts UI redesign (source tabs, scan controls, sort)
- Confidence badges and relationship type badges

**Wave 4: Classify + Approve**
- Basic Claude API classification (Haiku, batch)
- Heuristic signature extraction (regex)
- CRM dedup + smart company matching
- Pre-filled review form
- Approve/dismiss flow + rejection set

### Phase 2 — Agentic Intelligence Layer

**Wave 5: MCP Server**
- `email-intelligence` MCP server scaffold
- `EmailSource` interface + `GmailSource` adapter
- 6 external tools + 6 internal agent tools
- stdio + SSE transport

**Wave 6: Agent Enrichment**
- Claude agent reasoning flow
- Deep signature extraction (structured output)
- Relationship classification with human-readable reasoning
- AI Reasoning card in UI

**Wave 7: Enrichment Queue**
- Enrichment Queue Airtable table
- Existing contact diff detection
- Update approval UI (current vs suggested value)
- "UPDATE" badge in contact list

---

## Testing Strategy

- **Unit tests:** Rules engine (each rule type), signature parser (regex patterns), CRM dedup matcher, state machine transitions
- **Integration tests:** Gmail API mock → full pipeline → Airtable write. Verify candidates pass/fail rules correctly.
- **Manual QA:** Connect Edward's Gmail, run initial scan, verify suggestions are sensible. Check signature extraction against 10 real emails. Approve 3 suggestions end-to-end.
- **Edge cases:** Expired OAuth token, interrupted scan resume, duplicate across users, dismissed re-scan, email with no signature, CC-only contact, reply chain extraction
