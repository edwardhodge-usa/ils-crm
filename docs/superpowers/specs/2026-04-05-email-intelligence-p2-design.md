# Email Intelligence Phase 2 — Design Spec

> Fix enrichment pipeline ordering, add Claude-powered enrichment comparison, batch operations, multi-message analysis, and scan management. Builds on existing infrastructure — not greenfield.

**Date:** 2026-04-05
**Status:** Approved
**Platforms:** Electron + Swift (Electron first, Swift follows)
**Depends on:** Email Intelligence Cleanup (v3.5.3, complete)

---

## Overview

Phase 1 discovers new contacts from email. Phase 2 keeps existing contacts fresh.

The Enrichment Queue table, schema, sync registration, field maps, converters, and basic UI **already exist** (shipped in Phase 1). But the enrichment writer has critical bugs: it runs before Claude extraction (so it only compares header-parsed names, not phone/title), has no dedup, no cooldown, and hardcodes `confidence_score: 0`. Phase 2 fixes the pipeline, adds Claude-powered enrichment comparison, and layers batch operations, multi-message context, and scan history on top.

### Why Not the MCP Server

The original P2 plan proposed a standalone `email-intelligence` MCP server with an agentic Claude reasoning loop. This was designed before the Cleanup iteration shipped Claude Haiku classification directly in the scanner. The MCP server approach is now wrong because:

1. **Claude classification already exists in-app** — the MCP server would duplicate `claude-client.ts` / `ClaudeClient.swift`
2. **Token relay problem** — the server would need Gmail OAuth tokens from Electron's `safeStorage` / Swift's Keychain
3. **Two Airtable clients** with hardcoded table IDs that must stay in sync
4. **No Swift integration path** — MCP SDK is Node.js
5. **Agent reasoning loop is slow** — multi-turn tool-use takes 5-15s/candidate vs 1s for single-call
6. **`EmailSource` provider abstraction is YAGNI** — only Google Workspace is used

All P2 features are implemented inside the existing apps, extending the current scanner pipeline.

### Key Decisions

- **Enrichment compares 3 fields** — Phone, Job Title, Email (secondary). Company excluded (text-vs-linked-record noise — same problem the 3NF migration solved).
- **Enrichment cooldown** — contacts only re-checked when a new email arrives, not every scan. Full scans check contacts not enrichment-checked in 7+ days.
- **No separate UI page** — enrichment items already appear in the Imported Contacts list. P2 upgrades the existing rendering with section dividers and better diff cards.
- **Multi-message context** — Claude receives top 3 message bodies instead of 1.
- **Batch operations** — checkbox selection + batch approve/dismiss for both new contacts and enrichment items.

---

## Existing Infrastructure (already shipped)

Before describing what P2 changes, here's what already exists and works:

### Enrichment Queue — Airtable + Sync

- **Airtable table:** `tbliKcirq0FuQloJH` with 7 fields (field-maps.ts:457-465)
- **Field maps:** `ENRICHMENT_QUEUE` object with `fieldName`, `currentValue`, `suggestedValue`, `sourceEmailDate`, `status`, `confidenceScore`, `contact` (linked record)
- **Converters:** `ENRICHMENT_QUEUE_MAPPINGS` (converters.ts:549-556)
- **Sync engine:** registered in `SYNC_ORDER`, `TABLE_NAME_TO_ID`, full CRUD (not read-only) (sync-engine.ts:116-130)
- **SQLite schema:** `enrichment_queue` table (schema.ts:483)
- **VALID_TABLES:** registered (entities.ts:588)

### Enrichment Queue — Scanner Writer

`writeToEnrichmentQueue()` in scanner.ts:335-392:
- Called from `processCandidates()` when crm-dedup rule matches (line 784-786)
- Compares `firstName`, `lastName` (from header parsing) and `_extractedPhone`, `_extractedTitle` (from Claude)
- Writes diffs to local SQLite with `_pending_push: 1`

### Enrichment Queue — UI

ImportedContactsPage.tsx already:
- Loads enrichment items via `window.electronAPI.enrichmentQueue.getAll()` (line 956)
- Merges them into the contact list with `_type: 'enrichment'` marker (line 982-1024)
- Renders enrichment rows with green tint background and "UPDATE" badge (line 116-175)
- Routes to `EnrichmentDetail` component in detail pane (line 1331-1334)
- Handles approve/dismiss via `enrichmentQueue.approve(id)` / `enrichmentQueue.dismiss(id)` (line 1145-1151)
- Includes enrichment items in source tab counts (line 1059-1068)

### What's Broken

1. **Pipeline ordering:** `writeToEnrichmentQueue()` runs inside `processCandidates()` which executes BEFORE `classifyCandidates()`. The `_extractedPhone` and `_extractedTitle` fields are only populated by Claude during classification. So enrichment only ever compares `firstName`/`lastName` from header parsing — the phone and title comparison code path exists but the fields are always undefined.
2. **No dedup:** Every scan creates duplicate enrichment rows for the same contact + field + value.
3. **No cooldown:** Known contacts are enrichment-checked on every scan regardless of whether new emails arrived.
4. **`confidence_score: 0` always:** Hardcoded because Claude hasn't run yet when enrichment writes happen.
5. **No phone normalization:** Phone comparison uses raw string equality — formatting differences create false diffs.
6. **`discovered_by` never written:** The Airtable field exists but the scanner never populates it.

---

## Wave 1: Fix Enrichment Pipeline + Batch Operations

### Bug Fix: Pipeline Reordering

**The core fix:** Move enrichment from `processCandidates()` (which runs before Claude) to a new phase that runs AFTER `classifyCandidates()`.

#### Current pipeline (broken):

```
messages → aggregate → rules → crm-dedup (writes enrichment HERE) → classify with Claude → write new contacts
```

#### Fixed pipeline:

```
messages → aggregate → rules → crm-dedup (COLLECT known contacts) → classify new contacts with Claude → write new contacts → ENRICH known contacts with Claude → write enrichment diffs
```

#### Implementation (scanner.ts)

1. In `processCandidates()`: when crm-dedup matches, push `{ candidate, contactId }` to a `knownContacts` array instead of calling `writeToEnrichmentQueue()`. Remove the current `writeToEnrichmentQueue()` call from inside the loop.

2. Return `knownContacts` alongside `survivors` from `processCandidates()`.

3. In `scanFull()` and `scanIncremental()`: after `classifyCandidates()` completes for new contacts, run a new `enrichKnownContacts()` function that:
   - Applies cooldown filter (skip contacts with recent `last_enrichment_check`)
   - Caps at `MAX_ENRICHMENT_CANDIDATES = 100`
   - For each known contact: fetches best message bodies, sends to Claude (same `classifyWithClaude()` + `buildExtractionPrompt()`), compares extracted fields against CRM record
   - Writes diffs to enrichment queue with Claude's `confidence_score` and `discovered_by`
   - Updates `last_enrichment_check` on the contact

4. The existing `writeToEnrichmentQueue()` function is refactored into the new enrichment phase with fixes applied (dedup, phone normalization, confidence from Claude).

#### Swift (EmailScanEngine.swift)

Same reordering: collect known contacts during pipeline, enrich after classification. The Swift scanner has the same structural issue — enrichment happens during the rules/dedup phase before Claude runs.

### Enrichment Cooldown

#### New field on Contacts table (Airtable)

| Field | Type | Purpose |
|-------|------|---------|
| `last_enrichment_check` | Date | When this contact was last checked for enrichment |

Create manually in Airtable UI, add field ID to `CONTACTS` in field-maps.ts and converters.

#### Cooldown logic

- **Incremental scans:** Only enrich contacts who appear in new messages (the incremental scan's `historyId` naturally provides only new messages).
- **Full scans:** Only enrich contacts where `last_enrichment_check` is null or older than 7 days.
- After enrichment check (regardless of whether diffs are found), update `last_enrichment_check` to now.

### Enrichment Dedup

Before writing an enrichment row, query local DB:

```sql
SELECT id FROM enrichment_queue 
WHERE contact_ids LIKE ? AND field_name = ? AND suggested_value = ? AND status = 'Pending'
LIMIT 1
```

If a matching Pending row exists, skip the write.

### Phone Normalization

New function `normalizePhone()` in `email-utils.ts` / `EmailUtils.swift`:

```
1. Strip all characters except digits and leading +
2. If no + prefix and exactly 10 digits → prepend +1 (US assumption)
3. Return normalized string
```

Used in enrichment comparison: `normalizePhone(crmPhone) !== normalizePhone(claudePhone)` determines if a diff exists.

### Field Comparison (upgraded)

After Claude extracts fields from the known contact's latest emails:

| Field | CRM source | Claude key | Normalization |
|-------|-----------|-----------|---------------|
| Phone | `phone` | `phone` | `normalizePhone()` — strip formatting, US default |
| Job Title | `job_title` | `job_title` | Case-insensitive trim comparison |
| Email (secondary) | `email` | Only if Claude finds a *different* email in signature | `normalizeEmail()` (existing) |

**Rules:**
- Only write diff if suggested is non-null AND differs from current (after normalization)
- Null/empty current + non-null suggested = diff (new data discovered)
- Non-null current + null suggested = NOT a diff (absence is not deletion)
- Dedup check before each write

**Company intentionally excluded.** Text-vs-linked-record matching produces constant false diffs.

### Enrichment Writer (upgraded)

The refactored `writeEnrichmentDiff()` replaces the existing `writeToEnrichmentQueue()`:

- Receives Claude classification result (has confidence, reasoning)
- Writes `confidence_score` from Claude (not hardcoded 0)
- Writes `discovered_by` from authenticated user's email
- Performs dedup check before write
- Inserts into local DB with `_pending_push: 1` (existing pattern for sync engine to push)

### Progress Indication

Extend existing scan progress to three phases:

```
Scanning... 8,500 messages           ← existing
Classifying 200 new contacts...      ← existing
Checking 87 existing contacts...     ← NEW (enrichment phase)
```

### UI Upgrades

The existing enrichment UI already handles: green tint rows, UPDATE badge, detail pane routing, approve/dismiss. P2 adds:

#### Section Divider

When the list includes both enrichment and new-contact items, add a section header between them:

```
── Updates for existing contacts (4) ──────────
  [enrichment rows]
── New contact suggestions (18) ───────────────
  [new contact rows]
```

Modify the `mergedContacts` memo in `ImportedContactsPage.tsx` to sort enrichment items first, then insert divider elements. Divider not shown when one section is empty.

#### Diff Card in Detail Pane

Upgrade `EnrichmentDetail` to show a proper diff card:

```
┌─────────────────────────────────────────────┐
│  Phone                                      │
│  Current:   +1-555-867-5309        (muted)  │
│  Suggested: +1-555-123-4567  ← NEW (bold)   │
│  Source: email from 2026-04-03              │
│  Confidence: 87%                            │
└─────────────────────────────────────────────┘
```

**Live current_value:** On detail pane open, re-read the contact's current field value from local DB. If it now matches `suggested_value`, auto-dismiss. If it differs from stored `current_value`, show the live value.

#### Confidence Badge on Enrichment Rows

Currently enrichment rows show `confidence_score: 0` (the bug). After the pipeline fix, they'll have real Claude confidence scores and should display the same green/yellow/gray badge as new-contact rows.

### Batch Operations

New feature — does not exist in the current codebase.

#### Checkbox Selection

- Checkbox column on the left of each list row (44px minimum hit area)
- Select-all checkbox in list header (per-section: enrichment, new contacts, or all)
- Selected rows get subtle highlight background
- Multi-select state managed as `Set<string>` of item IDs

#### Batch Action Bar

Appears at top of list when 1+ items selected. Slides in with 200ms ease-out.

```
┌─────────────────────────────────────────────────────┐
│  3 selected    [Approve All]  [Dismiss All]  [×]    │
└─────────────────────────────────────────────────────┘
```

- **"Approve All"** — enrichment items: applies all field updates in batch. New contacts: creates contacts WITHOUT company picker (those needing company linking go through individual review).
- **"Dismiss All"** — marks all selected as Dismissed.
- **"×"** — clears selection.
- Confirmation dialog before batch approve.

#### Batch Error Handling

Sequential processing. If one fails:
- Skip failed, continue with rest
- Toast: "2 of 3 approved. 1 failed — check [name]"
- Failed item stays in list with original status
- No rollback

#### Platform Implementation

| Element | Electron | Swift |
|---------|----------|-------|
| Batch action bar | Fixed div, `backdrop-filter: blur(20px)` | Toolbar overlay, `.ultraThinMaterial` |
| Checkboxes | HTML checkbox + label, 44px container | Toggle checkbox, `.frame(minWidth: 44, minHeight: 44)` |
| Select all | Checkbox in list header row | Button in section header |

---

## Wave 2: Multi-Message Analysis + Scan Management

### Multi-Message Claude Context

Upgrade from 1 message body to top 3 (already scored by `scoreMessageForSignature`).

#### Modified Extraction Prompt

```
You are extracting contact information from emails. The email bodies below are from the same person, ordered newest to oldest. Extract their most current details.

Email 1 (most recent):
---
{body_1}
---

Email 2:
---
{body_2}
---

Email 3:
---
{body_3}
---

Candidate metadata:
- Email: {email}
- Thread count: {threadCount}
- From/To/CC: {fromCount}/{toCount}/{ccCount}
- Time span: {firstSeen} to {lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent direct correspondent over 6 months with professional signature."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.
```

#### Why 3 Bodies

- Each stripped body is ~20-50 lines. 3 bodies stays under 2K input tokens.
- Scoring algorithm already ranks by quality — diminishing returns after 3.
- Cost: ~$0.002 → ~$0.003 per candidate. Negligible.

#### What This Improves

- Job title changes (Claude picks most recent)
- Phone changes (latest signature)
- Confidence (more evidence)
- Company detection (for new contacts)

#### Implementation

Modify `buildExtractionPrompt()` in `claude-client.ts` and `ClaudeClient.swift` to accept `bodies: string[]`. Scanner passes top 3 scored bodies. Metadata-only prompt unchanged.

### Re-Classify Single Contact

Add "Re-scan" button to the detail pane of any imported contact.

#### Flow

1. User clicks "Re-scan" — button shows spinner (disabled while running)
2. App fetches up to 5 recent messages via Gmail API (`from:{email}`)
3. Strips quoted content, scores, picks top 3
4. Sends to Claude (same extraction prompt)
5. Updates imported contact record with new classification
6. Shows inline diff if changed: "Confidence: 45 → 78, Type: Unknown → Vendor Contact"

#### When Useful

- Contact classified before API key was added (heuristic fallback, capped at 60)
- New emails arrived since last scan
- User wants to verify low-confidence result

#### Implementation

- **Electron:** New IPC handler `emailScan:reclassify(contactId)`. Reuses Gmail client, Claude client, prompt builders, response parser. Writes to local DB + pushes to Airtable.
- **Swift:** New method `reclassify(contact:)` on `EmailScanEngine`. Same reuse.
- Single-contact operation, no full scan needed.

### Scan History Log

Lightweight scan log — "did the scanner run?" and "why did I get 0 results?"

#### New Airtable Table: Scan Log

| Field | Type | Purpose |
|-------|------|---------|
| `scan_date` | Date | When the scan completed |
| `scan_type` | Single Select | `Full` / `Incremental` / `Manual` |
| `messages_processed` | Number | Total messages scanned |
| `new_candidates` | Number | New contact suggestions created |
| `enrichment_diffs` | Number | Enrichment Queue items created |
| `duration_seconds` | Number | How long the scan took |
| `errors` | Long Text | Any errors (empty if clean) |

Register in sync engine as read-only. Note: some fields overlap with existing Email Scan State table (`total_processed`, `last_scan_date`, `scan_status`). Scan State tracks the *current* state (watermark, status). Scan Log tracks *history*. Both coexist.

#### UI

Collapsible section below scan controls. Last 10 scans as compact rows:

```
Today 2:30 PM   Manual   8,500 msgs  →  3 new, 2 updates    12s
Today 2:15 PM   Incr.    4 msgs      →  0 new, 0 updates     1s
Yesterday       Full     8,480 msgs  →  12 new, 5 updates    45s
```

Collapsed by default. Toggle via "Scan History" link near "Last scan: 3 min ago" status.

| Element | Electron | Swift |
|---------|----------|-------|
| Log display | `<table>`, collapsible `<details>` | `DisclosureGroup` with `List` |
| Toggle | "Scan History" text link | Disclosure triangle |

---

## Shipping Plan

### Wave 1: Fix Enrichment + Batch Ops

**Electron first, hard gate before Swift.**

1. **Pipeline reorder** — move enrichment out of `processCandidates()` into a post-classification phase. Collect `knownContacts` array, enrich after `classifyCandidates()`.
2. **Airtable: `last_enrichment_check` field** — create on Contacts table (manual), add to field maps + converters in both apps.
3. **Enrichment cooldown** — filter known contacts by `last_enrichment_check` date before enriching. Update after check.
4. **Enrichment dedup** — query before write, skip if Pending row exists for same contact+field+value.
5. **Phone normalization** — new `normalizePhone()` in both apps, used in enrichment comparison.
6. **Claude-powered enrichment** — known contacts go through `classifyWithClaude()` + `buildExtractionPrompt()`, compare extracted phone/title/email against CRM record, write diffs with real confidence + discovered_by.
7. **UI: section divider** — sort enrichment first, divider between sections.
8. **UI: diff card upgrade** — live current_value check, proper styling.
9. **Batch operations** — checkboxes, select-all, batch action bar, approve/dismiss handlers.
10. **Scan Log table** — Airtable schema + sync registration (so scanner can start writing logs immediately).

### Wave 2: Multi-Message + Scan Management

1. **Multi-message prompt** — `buildExtractionPrompt()` accepts body array, scanner passes top 3.
2. **Re-classify button** — new IPC handler, detail pane button + spinner + inline diff.
3. **Scan history UI** — collapsible log section, last 10 scans.

### Verification

- **Manual QA:** Run full scan. Verify enrichment items appear for contacts with changed phone/title. Approve one update end-to-end. Batch dismiss 3 items. Check scan log.
- **Edge cases:** Contact with no phone (enrichment finds one — new data). Phone matches after normalization (no false diff). Cooldown — scan twice, second scan skips. Dedup — scan twice, no duplicate enrichment rows. Batch approve with one failure (rest complete).
- **Regression:** New-contact classification still works (pipeline reorder didn't break existing flow). Heuristic fallback still works when no API key.

---

## What P2 Does NOT Include

- **MCP server** — replaced by in-app enrichment
- **EmailSource provider abstraction** — YAGNI
- **Agent reasoning loop** — single Claude call is sufficient
- **Company enrichment comparison** — excluded (text-vs-linked-record noise)
- **Dismissal pattern learning** — deferred to P3
- **AI Reasoning card** — existing `ai_reasoning` field already works
- **New Enrichment Queue table creation** — already exists, P2 fixes the writer
