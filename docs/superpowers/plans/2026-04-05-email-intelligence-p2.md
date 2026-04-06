# Email Intelligence Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken enrichment pipeline so Claude-extracted phone/title data actually flows into enrichment comparisons, add dedup + cooldown + phone normalization, then layer batch operations and multi-message Claude context on top.

**Architecture:** All changes are inside the existing Electron app (scanner.ts, email-utils.ts, claude-client.ts, ImportedContactsPage.tsx) and later ported to Swift. The core fix is reordering the scanner pipeline: collect known contacts during rules processing, classify them with Claude AFTER new-contact classification, then compare extracted fields against CRM records. No new projects, no MCP server.

**Tech Stack:** TypeScript (Electron), React, Tailwind CSS, Anthropic Claude Haiku API, Gmail REST API, sql.js (SQLite)

**Spec:** `docs/superpowers/specs/2026-04-05-email-intelligence-p2-design.md`

**Prerequisite (manual):** Create `last_enrichment_check` Date field on the Contacts table in Airtable UI. Get the field ID. Also confirm Enrichment Queue table `tbliKcirq0FuQloJH` exists with fields as mapped in `field-maps.ts:457-465`.

---

## File Structure

### Modified Files

| File | Changes |
|------|---------|
| `electron/gmail/email-utils.ts` | Add `normalizePhone()` function |
| `electron/gmail/scanner.ts` | Reorder pipeline: collect known contacts → classify → enrich. New `enrichKnownContacts()` function. Remove `writeToEnrichmentQueue()` call from `processCandidates()`. New `writeEnrichmentDiff()` with dedup + confidence + discovered_by. Add `ScanProgress.status: 'enriching'`. |
| `electron/gmail/claude-client.ts` | Modify `buildExtractionPrompt()` to accept `bodies: string[]` (multi-message). |
| `electron/gmail/types.ts` | Add `'enriching'` to `ScanProgress.status` union. Add `KnownContact` interface. |
| `electron/airtable/field-maps.ts` | Add `lastEnrichmentCheck` to `CONTACTS` object. |
| `electron/airtable/converters.ts` | Add `last_enrichment_check` mapping to contacts converter. |
| `src/components/imported-contacts/ImportedContactsPage.tsx` | Section dividers, batch checkboxes, batch action bar, diff card upgrade, live current_value. |
| `electron/ipc/register.ts` | Add `emailScan:reclassify` IPC handler. Add `enrichmentQueue:batchApprove` and `enrichmentQueue:batchDismiss` handlers. |

### No New Files

All changes modify existing files. No new source files are created.

---

## Wave 1: Fix Enrichment Pipeline + Batch Operations

### Task 1: Add `last_enrichment_check` to field maps + converters

**Files:**
- Modify: `electron/airtable/field-maps.ts:26-80` (CONTACTS object)
- Modify: `electron/airtable/converters.ts` (contacts converter section)

- [ ] **Step 1: Add field ID to CONTACTS in field-maps.ts**

After the user provides the Airtable field ID for `last_enrichment_check`, add it to the `CONTACTS` object in `electron/airtable/field-maps.ts`. Add after the last existing field in the object:

```typescript
  lastEnrichmentCheck: 'fldXXXXXXXXXXXXXXX', // date — last enrichment pipeline check
```

Replace `fldXXXXXXXXXXXXXXX` with the actual field ID.

- [ ] **Step 2: Add converter mapping**

In `electron/airtable/converters.ts`, find the contacts converter array (search for `CONTACT_MAPPINGS`) and add:

```typescript
  { local: 'last_enrichment_check', airtable: CONTACTS.lastEnrichmentCheck, type: 'text' },
```

- [ ] **Step 3: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add electron/airtable/field-maps.ts electron/airtable/converters.ts
git commit -m "feat(email-intel): add last_enrichment_check field map + converter for Contacts"
```

---

### Task 2: Add `normalizePhone()` to email-utils.ts

**Files:**
- Modify: `electron/gmail/email-utils.ts` (add function after `normalizeEmail()`)

- [ ] **Step 1: Add normalizePhone function**

Add after the `normalizeEmail()` function (after line 21) in `electron/gmail/email-utils.ts`:

```typescript
// ─── Phone Normalization ───────────────────────────────────

/**
 * Normalize a phone number for comparison.
 * Strips formatting, assumes US (+1) if 10 bare digits.
 * Returns empty string for null/empty input.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  // Keep only digits and leading +
  const hasPlus = phone.trim().startsWith('+')
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  // US assumption: 10 digits without country code → prepend 1
  if (!hasPlus && digits.length === 10) return `+1${digits}`
  // Already has country code or + prefix
  if (hasPlus) return `+${digits}`
  return `+${digits}`
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add electron/gmail/email-utils.ts
git commit -m "feat(email-intel): add normalizePhone() for enrichment comparison"
```

---

### Task 3: Add types for enrichment pipeline

**Files:**
- Modify: `electron/gmail/types.ts`

- [ ] **Step 1: Add KnownContact interface and update ScanProgress**

In `electron/gmail/types.ts`, add the `KnownContact` interface after `EmailCandidate` (after line 69):

```typescript

// ─── Known Contact (for enrichment pipeline) ───────────────
export interface KnownContact {
  candidate: EmailCandidate
  contactId: string
}
```

Also update the `ScanProgress.status` type to include the enrichment phase. Change:

```typescript
  status: 'idle' | 'scanning' | 'classifying' | 'complete' | 'error'
```

to:

```typescript
  status: 'idle' | 'scanning' | 'classifying' | 'enriching' | 'complete' | 'error'
```

- [ ] **Step 2: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add electron/gmail/types.ts
git commit -m "feat(email-intel): add KnownContact type + enriching status for P2 pipeline"
```

---

### Task 4: Reorder scanner pipeline — collect known contacts instead of writing immediately

**Files:**
- Modify: `electron/gmail/scanner.ts:760-817` (`processCandidates` function)

This is the core fix. Change `processCandidates()` to return known contacts alongside survivors instead of calling `writeToEnrichmentQueue()` inline.

- [ ] **Step 1: Update processCandidates return type and logic**

Add the import at the top of scanner.ts (with the existing type imports):

```typescript
import type { KnownContact } from './types'
```

(Add `KnownContact` to the existing import from `'./types'` — it already imports `EmailCandidate`, `EmailHeaders`, etc.)

Replace the entire `processCandidates` function (lines 762-817) with:

```typescript
function processCandidates(
  candidateMap: Map<string, EmailCandidate>,
  rules: Rule[],
  ownEmail: string,
): { survivors: EnrichedCandidate[]; knownContacts: KnownContact[] } {
  const survivors: EnrichedCandidate[] = []
  const knownContacts: KnownContact[] = []
  let rejectedByRules = 0
  let rejectedByImportDedup = 0

  if (isDev) console.log(`[Scanner] Processing ${candidateMap.size} unique email addresses through pipeline`)

  for (const candidate of candidateMap.values()) {
    // Step 1: Rule evaluation
    const ruleResult = evaluateRules(candidate, rules, ownEmail)
    if (ruleResult === 'reject') {
      rejectedByRules++
      continue
    }

    // Step 2: CRM dedup — known contacts collected for post-classification enrichment
    const existingContactId = checkCrmDedup(candidate.normalizedEmail)
    if (existingContactId) {
      knownContacts.push({ candidate, contactId: existingContactId })
      continue
    }

    // Step 3: Check if already in imported_contacts
    const db = getDatabase()
    const existingImport = db.exec(
      `SELECT id FROM imported_contacts WHERE LOWER(email) = ? LIMIT 1`,
      [candidate.normalizedEmail],
    )
    if (existingImport.length > 0 && existingImport[0].values.length > 0) {
      rejectedByImportDedup++
      continue // Already imported
    }

    // Step 4: Classify and cache confidence
    const { confidence } = classifyCandidate(candidate)
    const enriched: EnrichedCandidate = candidate
    enriched._confidence = confidence

    survivors.push(enriched)
  }

  if (isDev) {
    console.log(`[Scanner] Pipeline: ${candidateMap.size} candidates → ${rejectedByRules} rejected by rules, ${knownContacts.length} known (enrichment), ${rejectedByImportDedup} import dedup → ${survivors.length} survivors`)
  }

  // Sort by cached confidence descending
  survivors.sort((a, b) => (b._confidence ?? 0) - (a._confidence ?? 0))

  return { survivors, knownContacts }
}
```

- [ ] **Step 2: Update scanFull() to use new return shape**

In `scanFull()` (around line 591), change:

```typescript
      const survivors = processCandidates(candidateMap, rules, ownEmail)
```

to:

```typescript
      const { survivors, knownContacts } = processCandidates(candidateMap, rules, ownEmail)
```

Then after the `writeCandidateBatch` call (around line 603), add the enrichment phase placeholder (will be implemented in Task 5):

```typescript
      // Enrichment phase — process known contacts after Claude classification
      if (knownContacts.length > 0) {
        const tokens = loadTokens()
        await enrichKnownContacts(client, knownContacts, ownEmail, tokens?.email?.split('@')[0] ?? null, tokens?.email ?? 'unknown')
      }
```

- [ ] **Step 3: Update scanIncremental() to use new return shape**

In `scanIncremental()` (around line 716), change:

```typescript
      const survivors = processCandidates(candidateMap, rules, ownEmail)
```

to:

```typescript
      const { survivors, knownContacts } = processCandidates(candidateMap, rules, ownEmail)
```

Then after the `writeCandidateBatch` call (around line 728), add:

```typescript
      // Enrichment phase — process known contacts after Claude classification
      if (knownContacts.length > 0) {
        const tokens = loadTokens()
        await enrichKnownContacts(client, knownContacts, ownEmail, tokens?.email?.split('@')[0] ?? null, tokens?.email ?? 'unknown')
      }
```

- [ ] **Step 4: Add enrichKnownContacts stub**

Add an empty async function stub after `classifyCandidates()` so the build compiles:

```typescript
// ─── Enrichment Phase (known contacts) ───────────────────────

async function enrichKnownContacts(
  _client: GmailClient,
  _knownContacts: KnownContact[],
  _ownEmail: string,
  _ownDisplayName: string | null,
  _discoveredBy: string,
): Promise<void> {
  // TODO: Task 5 implements this
}
```

- [ ] **Step 5: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/gmail/scanner.ts
git commit -m "refactor(email-intel): reorder pipeline — collect known contacts for post-classification enrichment"
```

---

### Task 5: Implement enrichKnownContacts with Claude classification + diff comparison

**Files:**
- Modify: `electron/gmail/scanner.ts` (replace stub from Task 4)

- [ ] **Step 1: Add import for normalizePhone**

Add `normalizePhone` to the existing import from `'./email-utils'`:

```typescript
import { normalizeEmail, parseDisplayName, extractSignature, stripQuotedContent, scoreMessageForSignature, normalizePhone } from './email-utils'
```

- [ ] **Step 2: Replace the enrichKnownContacts stub**

Replace the entire `enrichKnownContacts` stub function with the full implementation:

```typescript
// ─── Enrichment Phase (known contacts) ───────────────────────

const MAX_ENRICHMENT_CANDIDATES = 100
const ENRICHMENT_COOLDOWN_DAYS = 7

async function enrichKnownContacts(
  client: GmailClient,
  knownContacts: KnownContact[],
  ownEmail: string,
  ownDisplayName: string | null,
  discoveredBy: string,
): Promise<void> {
  const apiKey = getSecureSetting('anthropic_api_key')
  if (!apiKey) {
    if (isDev) console.log('[Scanner] No API key — skipping enrichment phase')
    return
  }

  // Cooldown filter: skip contacts checked recently
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - ENRICHMENT_COOLDOWN_DAYS)
  const cooldownStr = cooldownDate.toISOString().split('T')[0]

  const eligible = knownContacts.filter(({ contactId }) => {
    try {
      const contact = getById('contacts', contactId) as Record<string, unknown> | null
      if (!contact) return false
      const lastCheck = contact.last_enrichment_check as string | null
      if (!lastCheck) return true // never checked
      return lastCheck < cooldownStr
    } catch {
      return false
    }
  })

  // Cap at MAX_ENRICHMENT_CANDIDATES
  const toProcess = eligible.slice(0, MAX_ENRICHMENT_CANDIDATES)

  if (toProcess.length === 0) {
    if (isDev) console.log('[Scanner] No contacts eligible for enrichment (all within cooldown)')
    return
  }

  if (isDev) console.log(`[Scanner] Enrichment phase: ${toProcess.length} contacts (${knownContacts.length} known, ${eligible.length} eligible after cooldown)`)

  updateProgress({ status: 'enriching', processed: 0, total: toProcess.length })

  for (let i = 0; i < toProcess.length; i++) {
    const { candidate, contactId } = toProcess[i]

    try {
      // Fetch message bodies (same pattern as classifyCandidates)
      const meta: CandidateMetadata = {
        email: candidate.email,
        threadCount: candidate.threadCount,
        fromCount: candidate.fromCount,
        toCount: candidate.toCount,
        ccCount: candidate.ccCount,
        firstSeen: candidate.firstSeenDate.toISOString().split('T')[0],
        lastSeen: candidate.lastSeenDate.toISOString().split('T')[0],
      }

      const searchResult = await client.searchMessages(`from:${candidate.email}`, 5)
      const scoredBodies: Array<{ body: string; score: number }> = []

      for (let j = 0; j < searchResult.messages.length; j++) {
        const fullMsg = await client.getMessageFull(searchResult.messages[j].id)
        const rawBody = fullMsg.bodyPlainText ?? ''
        const isHtml = !fullMsg.bodyPlainText
        const stripped = stripQuotedContent(rawBody, isHtml)
        const guardedBody = stripped ? stripOwnSignatureLines(stripped, ownEmail, ownDisplayName) : null
        const score = scoreMessageForSignature(guardedBody, j)
        if (guardedBody && score >= 0) {
          scoredBodies.push({ body: guardedBody, score })
        }
      }

      // Sort by score descending, take top 3
      scoredBodies.sort((a, b) => b.score - a.score)
      const topBodies = scoredBodies.slice(0, 3).map(s => s.body)

      let classification: import('./claude-client').ClaudeClassification | null = null

      if (topBodies.length > 0) {
        const prompt = buildExtractionPrompt(topBodies, meta)
        classification = await classifyWithClaude(prompt, apiKey)
      } else {
        const prompt = buildMetadataOnlyPrompt(meta)
        classification = await classifyWithClaude(prompt, apiKey)
      }

      // Compare extracted fields against CRM record
      if (classification) {
        writeEnrichmentDiffs(contactId, classification, candidate, discoveredBy)
      }

      // Update last_enrichment_check on contact (regardless of whether diffs found)
      try {
        const db = getDatabase()
        db.run(
          `UPDATE contacts SET last_enrichment_check = ? WHERE id = ?`,
          [new Date().toISOString().split('T')[0], contactId],
        )
      } catch { /* non-fatal */ }

    } catch (err) {
      if (err instanceof TokenExpiredError) throw err
      if (isDev) console.log(`[Scanner] Enrichment failed for ${candidate.email}:`, String(err))
    }

    if ((i + 1) % 5 === 0 || i === toProcess.length - 1) {
      updateProgress({ processed: i + 1 })
    }
  }

  saveDatabase()
  if (isDev) console.log(`[Scanner] Enrichment phase complete: ${toProcess.length} contacts checked`)
}
```

- [ ] **Step 3: Add writeEnrichmentDiffs function**

Add after `enrichKnownContacts`:

```typescript
// ─── Enrichment Diff Writer (with dedup + normalization) ─────

function writeEnrichmentDiffs(
  contactId: string,
  classification: import('./claude-client').ClaudeClassification,
  candidate: EmailCandidate,
  discoveredBy: string,
): void {
  let existingContact: Record<string, unknown> | null = null
  try {
    existingContact = getById('contacts', contactId) as Record<string, unknown> | null
  } catch { return }
  if (!existingContact) return

  const db = getDatabase()
  const diffs: Array<{ field: string; current: string; suggested: string }> = []

  // Phone comparison (normalized)
  if (classification.phone) {
    const crmPhone = normalizePhone(existingContact.phone as string | null)
    const claudePhone = normalizePhone(classification.phone)
    if (claudePhone && crmPhone !== claudePhone) {
      diffs.push({ field: 'phone', current: (existingContact.phone as string) || '', suggested: classification.phone })
    }
  }

  // Job title comparison (case-insensitive)
  if (classification.job_title) {
    const crmTitle = ((existingContact.job_title as string) || '').trim().toLowerCase()
    const claudeTitle = classification.job_title.trim().toLowerCase()
    if (claudeTitle && crmTitle !== claudeTitle) {
      diffs.push({ field: 'job_title', current: (existingContact.job_title as string) || '', suggested: classification.job_title })
    }
  }

  for (const diff of diffs) {
    // Dedup: check if a Pending row already exists for same contact + field + value
    const existing = db.exec(
      `SELECT id FROM enrichment_queue WHERE contact_ids LIKE ? AND field_name = ? AND suggested_value = ? AND LOWER(status) = 'pending' LIMIT 1`,
      [`%${contactId}%`, diff.field, diff.suggested],
    )
    if (existing.length > 0 && existing[0].values.length > 0) {
      if (isDev) console.log(`[Scanner] Dedup: skipping enrichment for ${diff.field} on ${contactId}`)
      continue
    }

    const id = `local_enrich_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    upsert('enrichment_queue', id, {
      field_name: diff.field,
      current_value: diff.current,
      suggested_value: diff.suggested,
      source_email_date: candidate.lastSeenDate.toISOString().split('T')[0],
      status: 'Pending',
      confidence_score: classification.confidence,
      contact_ids: JSON.stringify([contactId]),
      _pending_push: 1,
    })

    if (isDev) console.log(`[Scanner] Enrichment diff: ${diff.field} for ${contactId} — "${diff.current}" → "${diff.suggested}" (${classification.confidence}%)`)
  }
}
```

- [ ] **Step 4: Remove old writeToEnrichmentQueue function**

Delete the entire old `writeToEnrichmentQueue` function (lines 329-392 approximately — from `const ENRICHABLE_FIELDS` through the closing `}` of `writeToEnrichmentQueue`). It's no longer called anywhere after Task 4's refactor.

- [ ] **Step 5: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/gmail/scanner.ts
git commit -m "feat(email-intel): Claude-powered enrichment with dedup, cooldown, and phone normalization"
```

---

### Task 6: Multi-message prompt — buildExtractionPrompt accepts body array

**Files:**
- Modify: `electron/gmail/claude-client.ts:36-61`

- [ ] **Step 1: Update buildExtractionPrompt signature and body**

Replace the existing `buildExtractionPrompt` function in `claude-client.ts`:

```typescript
export function buildExtractionPrompt(bodies: string[], meta: CandidateMetadata): string {
  const bodySection = bodies.length === 1
    ? `Email body:\n---\n${bodies[0]}\n---`
    : bodies.map((b, i) => `Email ${i + 1}${i === 0 ? ' (most recent)' : ''}:\n---\n${b}\n---`).join('\n\n')

  return `You are extracting contact information from email${bodies.length > 1 ? 's' : ''}. The email bod${bodies.length > 1 ? 'ies below are from the same person, ordered newest to oldest. Extract their most current details' : 'y below belongs to a single person. Extract their details'}.

${bodySection}

Candidate metadata:
- Email: ${meta.email}
- Thread count: ${meta.threadCount}
- From/To/CC: ${meta.fromCount}/${meta.toCount}/${meta.ccCount}
- Time span: ${meta.firstSeen} to ${meta.lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent direct correspondent over 6 months with professional signature."}

Example with missing fields:
{"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 35, "reasoning": "Appeared in 2 threads as CC, no signature data available."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.`
}
```

- [ ] **Step 2: Update all callsites in scanner.ts**

In `classifyCandidates()` (scanner.ts), find the line:

```typescript
          const prompt = buildExtractionPrompt(bestBody, meta)
```

Replace with:

```typescript
          const prompt = buildExtractionPrompt([bestBody], meta)
```

There is one callsite in `classifyCandidates()` for new contacts. The enrichment callsite in `enrichKnownContacts()` (from Task 5) already passes `topBodies` as an array.

- [ ] **Step 3: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add electron/gmail/claude-client.ts electron/gmail/scanner.ts
git commit -m "feat(email-intel): multi-message prompt — buildExtractionPrompt accepts body array"
```

---

### Task 7: Update classifyCandidates to pass top 3 bodies

**Files:**
- Modify: `electron/gmail/scanner.ts:856-951` (`classifyCandidates` function)

Currently the function picks the single best body. Change to collect top 3.

- [ ] **Step 1: Modify body collection in classifyCandidates**

In `classifyCandidates()`, find the loop that scores bodies (around lines 891-907). Replace the single-best-body logic:

```typescript
      // Top-N: fetch bodies, score, pick best, send to Claude with body
      try {
        const searchResult = await client.searchMessages(`from:${candidate.email}`, 5)
        let bestBody: string | null = null
        let bestScore = -Infinity

        for (let j = 0; j < searchResult.messages.length; j++) {
          const fullMsg = await client.getMessageFull(searchResult.messages[j].id)
          const rawBody = fullMsg.bodyPlainText ?? ''
          const isHtml = !fullMsg.bodyPlainText
          const stripped = stripQuotedContent(rawBody, isHtml)
          const guardedBody = stripped ? stripOwnSignatureLines(stripped, ownEmail, ownDisplayName) : null
          const score = scoreMessageForSignature(guardedBody, j)

          if (score > bestScore) {
            bestScore = score
            bestBody = guardedBody
          }
        }

        if (bestBody && bestScore >= 0) {
          const prompt = buildExtractionPrompt(bestBody, meta)
          classification = await classifyWithClaude(prompt, apiKey!)
        } else {
          // No usable body — metadata only
          const prompt = buildMetadataOnlyPrompt(meta)
          classification = await classifyWithClaude(prompt, apiKey!)
        }
```

with:

```typescript
      // Top-N: fetch bodies, score, pick top 3, send to Claude
      try {
        const searchResult = await client.searchMessages(`from:${candidate.email}`, 5)
        const scoredBodies: Array<{ body: string; score: number }> = []

        for (let j = 0; j < searchResult.messages.length; j++) {
          const fullMsg = await client.getMessageFull(searchResult.messages[j].id)
          const rawBody = fullMsg.bodyPlainText ?? ''
          const isHtml = !fullMsg.bodyPlainText
          const stripped = stripQuotedContent(rawBody, isHtml)
          const guardedBody = stripped ? stripOwnSignatureLines(stripped, ownEmail, ownDisplayName) : null
          const score = scoreMessageForSignature(guardedBody, j)
          if (guardedBody && score >= 0) {
            scoredBodies.push({ body: guardedBody, score })
          }
        }

        // Sort by score descending, take top 3
        scoredBodies.sort((a, b) => b.score - a.score)
        const topBodies = scoredBodies.slice(0, 3).map(s => s.body)

        if (topBodies.length > 0) {
          const prompt = buildExtractionPrompt(topBodies, meta)
          classification = await classifyWithClaude(prompt, apiKey!)
        } else {
          // No usable body — metadata only
          const prompt = buildMetadataOnlyPrompt(meta)
          classification = await classifyWithClaude(prompt, apiKey!)
        }
```

- [ ] **Step 2: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add electron/gmail/scanner.ts
git commit -m "feat(email-intel): pass top 3 message bodies to Claude for new contact classification"
```

---

### Task 8: UI — Section dividers in Imported Contacts list

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`

- [ ] **Step 1: Add section divider component**

Add before the `ImportedContactRow` component (around line 106):

```typescript
function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      padding: '6px 12px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
      userSelect: 'none' as const,
    }}>
      {label} ({count})
    </div>
  )
}
```

- [ ] **Step 2: Sort merged list with enrichment first and inject dividers**

In the existing `mergedContacts` memo (around line 985), change the return line from:

```typescript
    return [...importedWithType, ...pendingEnrichment]
```

to:

```typescript
    return [...pendingEnrichment, ...importedWithType]
```

- [ ] **Step 3: Render section dividers in the list**

In the list rendering section, add dividers between the enrichment and new-contact sections. Find where `filteredContacts.map(...)` renders `ImportedContactRow`. Wrap it to inject dividers:

```typescript
{(() => {
  const enrichmentItems = filteredContacts.filter(c => c._type === 'enrichment')
  const importedItems = filteredContacts.filter(c => c._type === 'imported')
  return (
    <>
      {enrichmentItems.length > 0 && (
        <>
          <SectionDivider label="Updates for existing contacts" count={enrichmentItems.length} />
          {enrichmentItems.map(contact => (
            <ImportedContactRow
              key={contact.id as string}
              contact={contact}
              isSelected={(contact.id as string) === (selected?.id as string)}
              onClick={() => setSelected(contact)}
            />
          ))}
        </>
      )}
      {importedItems.length > 0 && (
        <>
          {enrichmentItems.length > 0 && <SectionDivider label="New contact suggestions" count={importedItems.length} />}
          {importedItems.map(contact => (
            <ImportedContactRow
              key={contact.id as string}
              contact={contact}
              isSelected={(contact.id as string) === (selected?.id as string)}
              onClick={() => setSelected(contact)}
            />
          ))}
        </>
      )}
    </>
  )
})()}
```

- [ ] **Step 4: Verify the app builds and renders**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/imported-contacts/ImportedContactsPage.tsx
git commit -m "feat(email-intel): section dividers in Imported Contacts — enrichment items first"
```

---

### Task 9: UI — Batch operations (checkboxes + action bar)

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `electron/ipc/register.ts`

- [ ] **Step 1: Add batch state to ImportedContactsPage**

In the main `ImportedContactsPage` component, add state after existing state declarations:

```typescript
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    const ids = filteredContacts.map(c => c.id as string)
    setSelectedIds(new Set(ids))
  }, [filteredContacts])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
```

- [ ] **Step 2: Add batch action bar component**

Add before the list rendering section:

```typescript
{selectedIds.size > 0 && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px',
    background: 'var(--bg-elevated)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border-subtle)',
    animation: 'slideDown 200ms ease-out',
  }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginRight: 8 }}>
      {selectedIds.size} selected
    </span>
    <button
      onClick={async () => {
        if (!confirm(`Approve ${selectedIds.size} items? Enrichment updates will be applied immediately.`)) return
        for (const id of selectedIds) {
          const item = filteredContacts.find(c => (c.id as string) === id)
          if (!item) continue
          try {
            if (item._type === 'enrichment') {
              await window.electronAPI.enrichmentQueue.approve(id)
            } else {
              await window.electronAPI.importedContacts.approve(id)
            }
          } catch (err) {
            console.error(`Batch approve failed for ${id}:`, err)
          }
        }
        clearSelection()
        reload()
        reloadEnrichment()
      }}
      style={{
        fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
        background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer',
      }}
    >
      Approve All
    </button>
    <button
      onClick={async () => {
        for (const id of selectedIds) {
          const item = filteredContacts.find(c => (c.id as string) === id)
          if (!item) continue
          try {
            if (item._type === 'enrichment') {
              await window.electronAPI.enrichmentQueue.dismiss(id)
            } else {
              await window.electronAPI.importedContacts.dismiss(id)
            }
          } catch (err) {
            console.error(`Batch dismiss failed for ${id}:`, err)
          }
        }
        clearSelection()
        reload()
        reloadEnrichment()
      }}
      style={{
        fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
        background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer',
      }}
    >
      Dismiss All
    </button>
    <button onClick={clearSelection} style={{
      fontSize: 14, fontWeight: 500, padding: '2px 8px', marginLeft: 'auto',
      background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer',
    }}>
      ×
    </button>
  </div>
)}
```

- [ ] **Step 3: Add checkboxes to ImportedContactRow**

Modify the `ImportedContactRow` component to accept a checkbox prop. Add to its props interface:

```typescript
interface ListRowProps {
  contact: Record<string, unknown>
  isSelected: boolean
  isChecked: boolean
  onClick: () => void
  onToggleCheck: () => void
}
```

Add a checkbox at the start of the row (before the Avatar):

```typescript
      {/* Batch checkbox */}
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => { e.stopPropagation(); onToggleCheck() }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 16, height: 16, margin: '0 4px 0 0', cursor: 'pointer', flexShrink: 0 }}
      />
```

- [ ] **Step 4: Pass checkbox props in the list rendering**

Update the `ImportedContactRow` usage from Task 8 to pass `isChecked` and `onToggleCheck`:

```typescript
<ImportedContactRow
  key={contact.id as string}
  contact={contact}
  isSelected={(contact.id as string) === (selected?.id as string)}
  isChecked={selectedIds.has(contact.id as string)}
  onClick={() => setSelected(contact)}
  onToggleCheck={() => toggleSelect(contact.id as string)}
/>
```

Apply this to both the enrichment and imported item rendering blocks.

- [ ] **Step 5: Add importedContacts:dismiss IPC handler if missing**

Check `electron/ipc/register.ts` for an existing `importedContacts:dismiss` handler. If it doesn't exist, add one that updates the record's `onboarding_status` to `Dismissed`:

```typescript
  ipcMain.handle('importedContacts:dismiss', async (_e, id: string) => {
    try {
      const result = await updateRecord('imported_contacts', id, {
        onboarding_status: 'Dismissed',
      })
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('sync:progress', { phase: 'complete', tablesCompleted: 0, tablesTotal: 0, recordsPulled: 0 })
      }
      return result
    } catch (error) {
      console.error(`[IPC] importedContacts:dismiss(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })
```

- [ ] **Step 6: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/imported-contacts/ImportedContactsPage.tsx electron/ipc/register.ts
git commit -m "feat(email-intel): batch approve/dismiss with checkboxes and action bar"
```

---

### Task 10: UI — Live current_value in enrichment detail pane

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx` (EnrichmentDetail section)

- [ ] **Step 1: Add live value check to enrichment detail**

Find the `EnrichmentDetail` component or the enrichment branch of the detail pane rendering. Add logic to re-read the contact's current field value when the detail pane opens.

In the detail pane's enrichment rendering (around the diff card area), add a `useMemo` that resolves the live current value:

```typescript
  const liveCurrentValue = useMemo(() => {
    if (selected?._type !== 'enrichment') return null
    const contactIds = selected.contact_ids as string | null
    if (!contactIds) return null
    try {
      const ids = JSON.parse(contactIds) as string[]
      if (ids.length === 0) return null
      const contact = crmContacts.find(c => (c.id as string) === ids[0])
      if (!contact) return null
      const fieldName = selected.field_name as string
      return (contact[fieldName] as string) ?? ''
    } catch {
      return null
    }
  }, [selected, crmContacts])
```

Then use `liveCurrentValue` (if non-null) instead of `selected.current_value` in the diff card display. If `liveCurrentValue` equals `selected.suggested_value`, show a "Already applied" message instead of the diff.

- [ ] **Step 2: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/imported-contacts/ImportedContactsPage.tsx
git commit -m "feat(email-intel): live current_value check in enrichment detail pane"
```

---

## Wave 2: Re-Classify + Scan History

### Task 11: Re-classify single contact IPC + UI button

**Files:**
- Modify: `electron/ipc/register.ts`
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `src/types/electron.d.ts`

- [ ] **Step 1: Add reclassify IPC handler**

In `electron/ipc/register.ts`, add after the existing `emailScan` handlers:

```typescript
  ipcMain.handle('emailScan:reclassify', async (_e, contactId: string) => {
    try {
      const { scanNow, ...scanFns } = await import('../gmail/scanner')
      // The reclassify function will be added to scanner.ts
      const { reclassifyContact } = await import('../gmail/scanner')
      return await reclassifyContact(contactId)
    } catch (error) {
      console.error(`[IPC] emailScan:reclassify(${contactId}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })
```

- [ ] **Step 2: Add reclassifyContact to scanner.ts**

Add at the end of scanner.ts (before the helpers section):

```typescript
// ─── Single Contact Reclassify ───────────────────────────────

export async function reclassifyContact(importedContactId: string): Promise<{ success: boolean; error?: string; changes?: Record<string, { old: unknown; new: unknown }> }> {
  const apiKey = getSecureSetting('anthropic_api_key')
  if (!apiKey) return { success: false, error: 'No API key configured' }

  const imported = getById('imported_contacts', importedContactId) as Record<string, unknown> | null
  if (!imported) return { success: false, error: 'Contact not found' }

  const email = imported.email as string
  if (!email) return { success: false, error: 'No email address' }

  try {
    const client = await getValidClient()
    const tokens = loadTokens()
    const ownEmail = tokens?.email ?? ''
    const ownDisplayName = tokens?.email?.split('@')[0] ?? null

    const meta: CandidateMetadata = {
      email,
      threadCount: (imported.email_thread_count as number) || 0,
      fromCount: 0, toCount: 0, ccCount: 0,
      firstSeen: (imported.first_seen_date as string) || new Date().toISOString().split('T')[0],
      lastSeen: (imported.last_seen_date as string) || new Date().toISOString().split('T')[0],
    }

    // Fetch up to 5 messages, score, pick top 3
    const searchResult = await client.searchMessages(`from:${email}`, 5)
    const scoredBodies: Array<{ body: string; score: number }> = []

    for (let j = 0; j < searchResult.messages.length; j++) {
      const fullMsg = await client.getMessageFull(searchResult.messages[j].id)
      const rawBody = fullMsg.bodyPlainText ?? ''
      const isHtml = !fullMsg.bodyPlainText
      const stripped = stripQuotedContent(rawBody, isHtml)
      const guardedBody = stripped ? stripOwnSignatureLines(stripped, ownEmail, ownDisplayName) : null
      const score = scoreMessageForSignature(guardedBody, j)
      if (guardedBody && score >= 0) {
        scoredBodies.push({ body: guardedBody, score })
      }
    }

    scoredBodies.sort((a, b) => b.score - a.score)
    const topBodies = scoredBodies.slice(0, 3).map(s => s.body)

    let classification: import('./claude-client').ClaudeClassification | null = null
    if (topBodies.length > 0) {
      const prompt = buildExtractionPrompt(topBodies, meta)
      classification = await classifyWithClaude(prompt, apiKey)
    } else {
      const prompt = buildMetadataOnlyPrompt(meta)
      classification = await classifyWithClaude(prompt, apiKey)
    }

    if (!classification) return { success: false, error: 'Claude classification returned null' }

    // Track what changed
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    const updates: Record<string, unknown> = { classification_source: 'ai' }

    if (classification.confidence !== imported.confidence_score) {
      changes.confidence_score = { old: imported.confidence_score, new: classification.confidence }
      updates.confidence_score = classification.confidence
    }
    if (classification.relationship_type !== imported.relationship_type) {
      changes.relationship_type = { old: imported.relationship_type, new: classification.relationship_type }
      updates.relationship_type = classification.relationship_type
    }
    if (classification.reasoning) {
      updates.ai_reasoning = classification.reasoning
    }
    if (classification.first_name && classification.first_name !== imported.first_name) {
      changes.first_name = { old: imported.first_name, new: classification.first_name }
      updates.first_name = classification.first_name
    }
    if (classification.last_name && classification.last_name !== imported.last_name) {
      changes.last_name = { old: imported.last_name, new: classification.last_name }
      updates.last_name = classification.last_name
    }
    if (classification.job_title) updates.job_title = classification.job_title
    if (classification.phone) updates.phone = classification.phone
    if (classification.company_name) updates.suggested_company_name = classification.company_name

    // Write to local DB
    upsert('imported_contacts', importedContactId, updates)
    saveDatabase()

    return { success: true, changes }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
```

- [ ] **Step 3: Add Re-scan button to detail pane**

In `ImportedContactsPage.tsx`, in the imported contact detail pane (not enrichment detail), add a "Re-scan" button near the existing action buttons. Add state for the reclassify operation:

```typescript
const [reclassifying, setReclassifying] = useState(false)
const [reclassifyResult, setReclassifyResult] = useState<Record<string, { old: unknown; new: unknown }> | null>(null)
```

Add the button in the detail pane header area (for imported contacts, not enrichment):

```typescript
<button
  disabled={reclassifying}
  onClick={async () => {
    setReclassifying(true)
    setReclassifyResult(null)
    try {
      const result = await window.electronAPI.emailScan.reclassify(selected.id as string)
      if (result.success && result.changes && Object.keys(result.changes).length > 0) {
        setReclassifyResult(result.changes)
        reload()
      }
    } catch (err) {
      console.error('Reclassify failed:', err)
    } finally {
      setReclassifying(false)
    }
  }}
  style={{
    fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
    background: 'transparent', border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)', cursor: reclassifying ? 'wait' : 'pointer',
    opacity: reclassifying ? 0.6 : 1,
  }}
>
  {reclassifying ? 'Scanning...' : 'Re-scan'}
</button>
```

If `reclassifyResult` is non-null, show inline diffs below the button:

```typescript
{reclassifyResult && (
  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
    {Object.entries(reclassifyResult).map(([field, { old: oldVal, new: newVal }]) => (
      <div key={field}>
        {field.replace(/_/g, ' ')}: <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(oldVal ?? 'none')}</span> → <strong>{String(newVal)}</strong>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Add type to electron.d.ts**

Add to the `emailScan` section in `src/types/electron.d.ts`:

```typescript
    reclassify: (contactId: string) => Promise<{ success: boolean; error?: string; changes?: Record<string, { old: unknown; new: unknown }> }>
```

- [ ] **Step 5: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/gmail/scanner.ts electron/ipc/register.ts src/components/imported-contacts/ImportedContactsPage.tsx src/types/electron.d.ts
git commit -m "feat(email-intel): re-classify single contact with inline diff display"
```

---

### Task 12: Manual QA — run scan, verify enrichment, test batch operations

**No files modified — verification only.**

- [ ] **Step 1: Start the dev server**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npm run dev`

- [ ] **Step 2: Run a full scan**

In the app, go to Imported Contacts → click "Scan Now". Watch the progress indicator — it should now show three phases: Scanning → Classifying → Checking existing contacts.

- [ ] **Step 3: Verify enrichment items appear**

After the scan completes, check if any enrichment items appear in the "Updates for existing contacts" section. These will only appear if a known CRM contact has a different phone or job title in their email signature vs what's in the CRM.

- [ ] **Step 4: Test batch operations**

Select multiple items using checkboxes. Verify the batch action bar appears. Dismiss a few items. Verify they disappear from the list.

- [ ] **Step 5: Test re-classify**

Click on an imported contact in the detail pane. Click "Re-scan". Verify it shows a spinner, then inline diffs if anything changed.

- [ ] **Step 6: Run a second scan (cooldown verification)**

Run another scan. Verify the enrichment phase shows fewer contacts (those just checked should be skipped by cooldown).

---

## Post-Implementation Notes

**Swift port:** After Electron verification passes, port the following to Swift:
- `normalizePhone()` → `EmailUtils.swift`
- Pipeline reordering in `EmailScanEngine.swift` (same pattern as scanner.ts)
- `enrichKnownContacts()` → new method on `EmailScanEngine`
- `writeEnrichmentDiffs()` → new method
- Multi-message prompt → `ClaudeClient.swift`
- `reclassifyContact()` → new method
- UI changes: section dividers, batch operations, re-classify button in SwiftUI

**Scan Log table (deferred):** The Scan Log Airtable table creation and UI are lower priority than the core enrichment fix. Can be added in a follow-up commit after the main pipeline is verified working.
