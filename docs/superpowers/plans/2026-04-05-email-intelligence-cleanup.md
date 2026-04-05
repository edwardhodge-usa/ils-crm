# Email Intelligence Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace heuristic email classification with Claude API, add marketing filters, fix quoted content contamination, and add company picker to the approve flow.

**Architecture:** Electron-first implementation with hard gate before Swift port. New functions slot into existing scanner pipeline (`scanner.ts`). Claude API calls happen after the existing rules+dedup pipeline, replacing the heuristic classifier for candidates when an API key is configured. Test fixtures shared between both apps.

**Tech Stack:** TypeScript (Electron), Swift/SwiftUI, Anthropic Claude Haiku API, Gmail REST API, Vitest

**Spec:** `docs/superpowers/specs/2026-04-05-email-intelligence-cleanup-design.md`

**Prerequisite (manual):** Create `classification_source` singleSelect field on Imported Contacts table in Airtable UI with options: `AI`, `Heuristic`. Get the field ID and update `IMPORTED_CONTACTS` in `electron/airtable/field-maps.ts` (Task 1).

---

## Wave 1: Test Fixtures + Quoted Content Stripping (Electron)

### Task 1: Add `classification_source` to field maps and converters

**Files:**
- Modify: `electron/airtable/field-maps.ts:300-311`
- Modify: `electron/airtable/converters.ts` (imported_contacts converter section)

- [ ] **Step 1: Add field ID to field-maps.ts**

After the user creates the field in Airtable and provides the field ID, add to the `IMPORTED_CONTACTS` object in `electron/airtable/field-maps.ts`, after `suggestedCompany`:

```typescript
  classificationSource: 'fldXXXXXXXXXXXXXXX', // singleSelect: AI, Heuristic
```

Replace `fldXXXXXXXXXXXXXXX` with the actual field ID from Airtable.

- [ ] **Step 2: Add converter mapping**

In `electron/airtable/converters.ts`, find the imported_contacts converter array and add:

```typescript
  { local: 'classification_source', airtable: IMPORTED_CONTACTS.classificationSource, type: 'singleSelect' },
```

- [ ] **Step 3: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add electron/airtable/field-maps.ts electron/airtable/converters.ts
git commit -m "feat(email-intel): add classification_source field map + converter"
```

---

### Task 2: Create shared test fixtures for quoted content stripping

**Files:**
- Create: `tests/shared/fixtures/gmail-thread-quoted.txt`
- Create: `tests/shared/fixtures/outlook-thread.txt`
- Create: `tests/shared/fixtures/bare-thanks-reply.txt`
- Create: `tests/shared/fixtures/standalone-message.txt`
- Create: `tests/shared/fixtures/forwarded-message.txt`
- Create: `tests/shared/fixtures/mobile-footer.txt`
- Create: `tests/shared/fixtures/html-blockquote.html`

- [ ] **Step 1: Create fixtures directory**

```bash
mkdir -p tests/shared/fixtures
```

- [ ] **Step 2: Create Gmail `>` quoted thread fixture**

File: `tests/shared/fixtures/gmail-thread-quoted.txt`
```
Hi Sarah,

Thanks for sending the proposal. I've reviewed it with the team and we're aligned on the scope.

Let's set up a call next week to discuss timeline.

Best,
John Smith
VP of Operations | Acme Corp
+1-555-867-5309
john.smith@acme.com

> On Apr 3, 2026, Sarah Chen <sarah@imaginelabstudios.com> wrote:
>
> Hi John,
>
> Attached is the proposal for the Q3 experience design project.
>
> Sarah Chen
> Creative Director | ImagineLab Studios
> +1-555-123-4567
```

- [ ] **Step 3: Create Outlook `From:/Sent:` thread fixture**

File: `tests/shared/fixtures/outlook-thread.txt`
```
Got it, thanks. I'll circle back after the board meeting.

James Rivera
Director of Business Development
Newco Labs | www.newcolabs.com
(555) 234-5678

From: Edward Hodge <edward@imaginelabstudios.com>
Sent: Wednesday, April 2, 2026 3:15 PM
To: James Rivera <james@newcolabs.com>
Subject: RE: Partnership Discussion

James,

Great speaking with you yesterday. Here's the follow-up deck.

Edward Hodge
ImagineLab Studios
```

- [ ] **Step 4: Create bare "Thanks!" reply fixture**

File: `tests/shared/fixtures/bare-thanks-reply.txt`
```
Thanks!

Sent from my iPhone

> On Apr 3, 2026, at 2:30 PM, Edward Hodge <edward@imaginelabstudios.com> wrote:
>
> Here's the file you requested.
```

- [ ] **Step 5: Create standalone message fixture (no quoting)**

File: `tests/shared/fixtures/standalone-message.txt`
```
Hi Edward,

I wanted to reach out about a potential collaboration between our teams. We're planning a new visitor experience for our downtown location and I think your studio would be a great fit.

Would you be available for a 30-minute call this Thursday or Friday?

Best regards,
Maria Lopez
Senior Producer | Great Wolf Resorts
maria.lopez@greatwolf.com
(555) 345-6789
```

- [ ] **Step 6: Create forwarded message fixture**

File: `tests/shared/fixtures/forwarded-message.txt`
```
FYI — see below.

---------- Forwarded message ----------
From: newsletter@industryconf.com
Date: Mon, Mar 31, 2026
Subject: Early Bird Registration Open!
To: attendees@industryconf.com

Register now for IndustryConf 2026...
```

- [ ] **Step 7: Create mobile footer fixture**

File: `tests/shared/fixtures/mobile-footer.txt`
```
Sounds good, let's plan for Thursday at 2pm.

Sent from my iPad
```

- [ ] **Step 8: Create HTML blockquote fixture**

File: `tests/shared/fixtures/html-blockquote.html`
```html
<div>
<p>Hi Edward,</p>
<p>The budget looks fine. Let's proceed with Phase 1.</p>
<p>--<br>Tom Baker<br>CFO | Riverside Entertainment<br>(555) 456-7890</p>
</div>
<div class="gmail_quote">
<div>On Apr 2, 2026, Edward Hodge &lt;edward@imaginelabstudios.com&gt; wrote:</div>
<blockquote>
<p>Tom, here's the updated budget breakdown.</p>
<p>--<br>Edward Hodge<br>ImagineLab Studios</p>
</blockquote>
</div>
```

- [ ] **Step 9: Commit**

```bash
git add tests/shared/fixtures/
git commit -m "test: add shared email fixtures for quoted content stripping"
```

---

### Task 3: Implement `stripQuotedContent()` in Electron

**Files:**
- Modify: `electron/gmail/email-utils.ts`
- Modify: `tests/gmail/email-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/gmail/email-utils.test.ts`:

```typescript
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { stripQuotedContent } from '../../electron/gmail/email-utils'

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../shared/fixtures', name), 'utf-8')
}

describe('stripQuotedContent', () => {
  it('strips > quoted Gmail thread', () => {
    const result = stripQuotedContent(loadFixture('gmail-thread-quoted.txt'))
    expect(result).toContain('VP of Operations | Acme Corp')
    expect(result).not.toContain('ImagineLab Studios')
    expect(result).not.toContain('sarah@imaginelabstudios.com')
  })

  it('strips Outlook From:/Sent: thread', () => {
    const result = stripQuotedContent(loadFixture('outlook-thread.txt'))
    expect(result).toContain('Director of Business Development')
    expect(result).not.toContain('edward@imaginelabstudios.com')
  })

  it('returns null for bare thanks reply (< 3 lines)', () => {
    const result = stripQuotedContent(loadFixture('bare-thanks-reply.txt'))
    expect(result).toBeNull()
  })

  it('returns full body for standalone message', () => {
    const result = stripQuotedContent(loadFixture('standalone-message.txt'))
    expect(result).toContain('Senior Producer | Great Wolf Resorts')
    expect(result).toContain('maria.lopez@greatwolf.com')
  })

  it('strips forwarded message content', () => {
    const result = stripQuotedContent(loadFixture('forwarded-message.txt'))
    expect(result).not.toContain('newsletter@industryconf.com')
    // Only "FYI — see below." remains, which is < 3 lines
    expect(result).toBeNull()
  })

  it('strips mobile footer and quoted content below', () => {
    const result = stripQuotedContent(loadFixture('mobile-footer.txt'))
    // "Sounds good..." is 1 line after stripping footer — < 3 lines
    expect(result).toBeNull()
  })

  it('strips HTML blockquote content', () => {
    const result = stripQuotedContent(loadFixture('html-blockquote.html'), true)
    expect(result).toContain('CFO | Riverside Entertainment')
    expect(result).not.toContain('ImagineLab Studios')
  })

  it('caps output at 50 lines', () => {
    const longBody = Array(100).fill('Line of text').join('\n')
    const result = stripQuotedContent(longBody)
    expect(result).not.toBeNull()
    expect(result!.split('\n').length).toBeLessThanOrEqual(50)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx vitest run tests/gmail/email-utils.test.ts`
Expected: FAIL — `stripQuotedContent` is not exported

- [ ] **Step 3: Implement `stripQuotedContent()`**

Add to `electron/gmail/email-utils.ts`:

```typescript
// ─── Quoted Content Stripping ──────────────────────────────

// Reply marker patterns — order matters, checked sequentially
const REPLY_MARKERS = [
  /^-----Original Message-----/,
  /^-{10,}\s*Forwarded message\s*-{10,}/,
  /^_{5,}/,
  /^From:\s+.+/,  // Outlook — validated with Sent: lookahead in stripQuotedContent
  /^On .+wrote:\s*$/i,
  /^.+<[^>]+>\s*wrote:\s*$/i,
  /^Sent from my iP(hone|ad)/,
  /^Get Outlook for/,
]

function stripHtmlQuotes(html: string): string {
  // Remove blockquote elements and gmail_quote/yahoo_quoted divs
  let result = html
  result = result.replace(/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  result = result.replace(/<div[^>]*class="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
  result = result.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
  // Strip remaining tags
  result = result.replace(/<[^>]+>/g, ' ')
  // Clean up whitespace
  result = result.replace(/&nbsp;/g, ' ')
  result = result.replace(/&lt;/g, '<')
  result = result.replace(/&gt;/g, '>')
  result = result.replace(/&amp;/g, '&')
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n')
  return result.trim()
}

/**
 * Strips quoted thread content from an email body, returning only the
 * sender's own message + signature. Returns null if the remaining content
 * is too short to contain a useful signature (< 3 non-empty lines).
 *
 * @param body - Raw email body text (plain text or HTML)
 * @param isHtml - If true, strip HTML quotes before processing
 */
export function stripQuotedContent(body: string, isHtml = false): string | null {
  let text = body

  if (isHtml) {
    text = stripHtmlQuotes(text)
  }

  const lines = text.split('\n')
  let cutIndex = lines.length // Default: keep everything

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check for 2+ consecutive > quoted lines
    if (line.startsWith('> ')) {
      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('> ')) {
        cutIndex = i
        break
      }
      continue
    }

    // Check Outlook From: + Sent: pattern
    if (/^From:\s+.+/.test(line)) {
      // Look ahead up to 3 lines for "Sent:"
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        if (/^Sent:\s+/.test(lines[j].trim())) {
          cutIndex = i
          break
        }
      }
      if (cutIndex !== lines.length) break
      continue
    }

    // Check all other reply markers
    for (const pattern of REPLY_MARKERS) {
      if (pattern.test(line)) {
        // Skip the From: pattern — handled above with lookahead
        if (pattern.source.startsWith('^From:')) continue
        cutIndex = i
        break
      }
    }
    if (cutIndex !== lines.length) break
  }

  // Take lines up to the cut point
  let result = lines.slice(0, cutIndex)

  // Cap at 50 lines
  if (result.length > 50) {
    result = result.slice(0, 50)
  }

  // Check minimum content — need at least 3 non-empty lines
  const nonEmpty = result.filter(l => l.trim().length > 0)
  if (nonEmpty.length < 3) return null

  return result.join('\n').trim()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx vitest run tests/gmail/email-utils.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gmail/email-utils.ts tests/gmail/email-utils.test.ts
git commit -m "feat(email-intel): implement stripQuotedContent with test fixtures"
```

---

## Wave 2: Marketing Filtering + Message Selection (Electron)

### Task 4: Add marketing header checks to Gmail client + scanner

**Files:**
- Modify: `electron/gmail/client.ts:126-132`
- Modify: `electron/gmail/scanner.ts` (message fetch loops in `scanFull` and `scanIncremental`)
- Modify: `electron/gmail/types.ts`

- [ ] **Step 1: Update `getMessageHeaders` to fetch marketing headers**

In `electron/gmail/client.ts`, update the `getMessageHeaders` method's metadata headers list at line ~128:

```typescript
  async getMessageHeaders(messageId: string): Promise<EmailHeaders> {
    const data = await this.request<GmailMessageResource>(
      `/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date&metadataHeaders=Subject&metadataHeaders=List-Unsubscribe&metadataHeaders=Precedence&metadataHeaders=List-Id&metadataHeaders=X-Mailer`,
    )

    return parseMessageHeaders(data)
  }
```

The existing `rawHeaders` field in `EmailHeaders` (populated by `parseMessageHeaders`) already captures all fetched headers as a `Record<string, string>`, so no type changes needed.

- [ ] **Step 2: Add `isMarketingMessage()` helper to scanner**

In `electron/gmail/scanner.ts`, add after the existing `releaseSyncLock` function:

```typescript
// ─── Marketing Detection ──────────────────────────────────

const ESP_NAMES = ['mailchimp', 'hubspot', 'constant contact', 'brevo', 'klaviyo', 'sendgrid', 'mailgun']

function isMarketingMessage(headers: EmailHeaders): boolean {
  const raw = headers.rawHeaders

  // Check Precedence header
  const precedence = (raw['Precedence'] ?? '').toLowerCase()
  if (precedence === 'bulk' || precedence === 'list') return true

  // Check List-Id header
  if (raw['List-Id']) return true

  // Check List-Unsubscribe (already existed but was only used for candidate-level filtering)
  if (raw['List-Unsubscribe']) return true

  // Check X-Mailer for known ESPs
  const mailer = (raw['X-Mailer'] ?? '').toLowerCase()
  if (mailer && ESP_NAMES.some(esp => mailer.includes(esp))) return true

  return false
}
```

- [ ] **Step 3: Add marketing check to `scanFull` message loop**

In `electron/gmail/scanner.ts`, inside the `scanFull` message processing loop (after `const headers = await client.getMessageHeaders(stub.id)`), add the marketing check before the existing `hasUnsubscribe` check. Replace the `hasUnsubscribe` block:

```typescript
            const headers = await client.getMessageHeaders(stub.id)

            // Skip marketing messages — don't aggregate any contacts from them
            if (isMarketingMessage(headers)) {
              processedCount++
              if (processedCount % 50 === 0) {
                updateProgress({ processed: processedCount, candidatesFound: candidateMap.size })
              }
              continue
            }

            // Aggregate From
            if (headers.from.email) {
              aggregateCandidate(candidateMap, headers.from.email, headers.from.name, headers.date, 'From', stub.threadId)
            }

            // Aggregate To
            for (const to of headers.to) {
              if (to.email) {
                aggregateCandidate(candidateMap, to.email, to.name, headers.date, 'To', stub.threadId)
              }
            }

            // Aggregate CC
            for (const cc of headers.cc) {
              if (cc.email) {
                aggregateCandidate(candidateMap, cc.email, cc.name, headers.date, 'CC', stub.threadId)
              }
            }
```

- [ ] **Step 4: Add same marketing check to `scanIncremental` message loop**

Apply the identical `isMarketingMessage` check in the `scanIncremental` function's message loop, replacing the `hasUnsubscribe` check with the same pattern as Step 3.

- [ ] **Step 5: Verify build compiles**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/gmail/client.ts electron/gmail/scanner.ts
git commit -m "feat(email-intel): add marketing email header filtering"
```

---

### Task 5: Implement `scoreMessageForSignature()`

**Files:**
- Modify: `electron/gmail/email-utils.ts`
- Modify: `tests/gmail/email-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/gmail/email-utils.test.ts`:

```typescript
import { scoreMessageForSignature } from '../../electron/gmail/email-utils'

describe('scoreMessageForSignature', () => {
  it('scores a rich signature body high', () => {
    const body = loadFixture('standalone-message.txt')
    const score = scoreMessageForSignature(body, 0) // index 0 = most recent
    expect(score).toBeGreaterThan(5) // has phone, title, 10+ lines, recency
  })

  it('scores mobile-only footer negative', () => {
    const score = scoreMessageForSignature('Sounds good.\n\nSent from my iPad', 0)
    expect(score).toBeLessThan(0)
  })

  it('scores bare reply negative', () => {
    const score = scoreMessageForSignature('Thanks!', 0)
    expect(score).toBeLessThan(0)
  })

  it('gives recency bonus to first message', () => {
    const body = loadFixture('standalone-message.txt')
    const score0 = scoreMessageForSignature(body, 0)
    const score2 = scoreMessageForSignature(body, 2)
    expect(score0).toBeGreaterThan(score2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/gmail/email-utils.test.ts`
Expected: FAIL — `scoreMessageForSignature` is not exported

- [ ] **Step 3: Implement `scoreMessageForSignature()`**

Add to `electron/gmail/email-utils.ts`:

```typescript
// ─── Message Selection Scoring ─────────────────────────────

/**
 * Scores a stripped message body for signature richness.
 * Higher score = better candidate for Claude extraction.
 * @param strippedBody - Message body after stripQuotedContent (may be null for bare replies)
 * @param recencyIndex - 0 = most recent message, 1 = second most recent, etc.
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
  const trimmed = strippedBody.trim()
  if (/^Sent from my iP(hone|ad)/m.test(trimmed) && nonEmpty.length <= 2) score -= 5

  return score
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/gmail/email-utils.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gmail/email-utils.ts tests/gmail/email-utils.test.ts
git commit -m "feat(email-intel): implement scoreMessageForSignature"
```

---

## Wave 3: Claude API Integration (Electron)

### Task 6: Implement secure API key storage

**Files:**
- Modify: `electron/gmail/oauth.ts` (reuse the encrypt/decrypt pattern)
- Create: `electron/gmail/secure-settings.ts`
- Modify: `electron/ipc/register.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Create `secure-settings.ts`**

File: `electron/gmail/secure-settings.ts`

```typescript
// electron/gmail/secure-settings.ts
// Encrypted settings storage using Electron safeStorage.
// Pattern mirrors oauth.ts token encryption.

import { safeStorage } from 'electron'
import { getSetting, setSetting } from '../database/queries/entities'
import { saveDatabase } from '../database/init'

const PREFIX = 'secure_'

export function setSecureSetting(key: string, value: string): void {
  const storageKey = `${PREFIX}${key}`
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    setSetting(storageKey, encrypted.toString('base64'))
  } else {
    console.warn(`[SecureSettings] OS keychain unavailable — storing ${key} with base64 only`)
    setSetting(storageKey, Buffer.from(value).toString('base64'))
  }
  saveDatabase()
}

export function getSecureSetting(key: string): string | null {
  const storageKey = `${PREFIX}${key}`
  const stored = getSetting(storageKey)
  if (!stored) return null

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(stored, 'base64')
      return safeStorage.decryptString(buffer)
    }
    return Buffer.from(stored, 'base64').toString('utf-8')
  } catch {
    console.error(`[SecureSettings] Failed to decrypt ${key}`)
    return null
  }
}
```

- [ ] **Step 2: Register IPC handlers for secure settings**

In `electron/ipc/register.ts`, add near the existing settings handlers:

```typescript
  // Secure settings (encrypted)
  ipcMain.handle('settings:getSecure', async (_e, key: string) => {
    const { getSecureSetting } = await import('../gmail/secure-settings')
    return { success: true, data: getSecureSetting(key) }
  })

  ipcMain.handle('settings:setSecure', async (_e, key: string, value: string) => {
    const { setSecureSetting } = await import('../gmail/secure-settings')
    setSecureSetting(key, value)
    return { success: true }
  })
```

- [ ] **Step 3: Expose in preload**

In `electron/preload.ts`, add to the `settings` section of `contextBridge.exposeInMainWorld`:

```typescript
    getSecure: (key: string) => ipcRenderer.invoke('settings:getSecure', key),
    setSecure: (key: string, value: string) => ipcRenderer.invoke('settings:setSecure', key, value),
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add electron/gmail/secure-settings.ts electron/ipc/register.ts electron/preload.ts
git commit -m "feat(email-intel): add encrypted secure settings storage"
```

---

### Task 7: Implement `classifyWithClaude()` and `parseClaudeResponse()`

**Files:**
- Create: `electron/gmail/claude-client.ts`
- Create: `tests/gmail/claude-client.test.ts`

- [ ] **Step 1: Write the failing tests**

File: `tests/gmail/claude-client.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseClaudeResponse, buildExtractionPrompt, buildMetadataOnlyPrompt } from '../../electron/gmail/claude-client'

describe('parseClaudeResponse', () => {
  it('parses clean JSON response', () => {
    const raw = '{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent correspondent."}'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.first_name).toBe('Sarah')
    expect(result!.confidence).toBe(78)
    expect(result!.relationship_type).toBe('Client')
  })

  it('strips ```json fences', () => {
    const raw = '```json\n{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Test."}\n```'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.relationship_type).toBe('Prospect')
  })

  it('strips ``` fences without json tag', () => {
    const raw = '```\n{"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Other", "confidence": 20, "reasoning": "Low signal."}\n```'
    const result = parseClaudeResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.first_name).toBe('James')
  })

  it('rejects invalid confidence (> 100)', () => {
    const raw = '{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Other", "confidence": 150, "reasoning": "Test."}'
    const result = parseClaudeResponse(raw)
    expect(result).toBeNull()
  })

  it('rejects invalid relationship_type', () => {
    const raw = '{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "BestFriend", "confidence": 50, "reasoning": "Test."}'
    const result = parseClaudeResponse(raw)
    expect(result).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(parseClaudeResponse('not json at all')).toBeNull()
    expect(parseClaudeResponse('')).toBeNull()
  })
})

describe('buildExtractionPrompt', () => {
  it('includes email body and metadata', () => {
    const prompt = buildExtractionPrompt('Hello\nSignature here', {
      email: 'test@acme.com', threadCount: 5, fromCount: 3,
      toCount: 2, ccCount: 0, firstSeen: '2025-06-01', lastSeen: '2026-04-01',
    })
    expect(prompt).toContain('Signature here')
    expect(prompt).toContain('test@acme.com')
    expect(prompt).toContain('Thread count: 5')
  })
})

describe('buildMetadataOnlyPrompt', () => {
  it('includes metadata but no body', () => {
    const prompt = buildMetadataOnlyPrompt({
      email: 'test@acme.com', threadCount: 5, fromCount: 3,
      toCount: 2, ccCount: 0, firstSeen: '2025-06-01', lastSeen: '2026-04-01',
    })
    expect(prompt).toContain('test@acme.com')
    expect(prompt).toContain('No email body is available')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/gmail/claude-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `claude-client.ts`**

File: `electron/gmail/claude-client.ts`

```typescript
// electron/gmail/claude-client.ts
// Claude Haiku API client for email contact classification + extraction.
// Prompt defined in: docs/superpowers/specs/2026-04-05-email-intelligence-cleanup-design.md

import { getSecureSetting } from './secure-settings'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

const VALID_RELATIONSHIP_TYPES = new Set([
  'Client', 'Prospect', 'Partner', 'Consultant', 'Vendor Contact',
  'Talent', 'Employee', 'Investor', 'Advisor', 'Industry Peer', 'Other',
])

export interface ClaudeClassification {
  first_name: string | null
  last_name: string | null
  job_title: string | null
  company_name: string | null
  phone: string | null
  relationship_type: string
  confidence: number
  reasoning: string
}

export interface CandidateMetadata {
  email: string
  threadCount: number
  fromCount: number
  toCount: number
  ccCount: number
  firstSeen: string
  lastSeen: string
}

// ─── Prompt Builders ──────────────────────────────────────────

export function buildExtractionPrompt(strippedBody: string, meta: CandidateMetadata): string {
  return `You are extracting contact information from an email. The email body below belongs to a single person. Extract their details.

Email body:
---
${strippedBody}
---

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

export function buildMetadataOnlyPrompt(meta: CandidateMetadata): string {
  return `You are classifying an email contact for a CRM. No email body is available — classify based on email patterns only.

Candidate metadata:
- Email: ${meta.email}
- Thread count: ${meta.threadCount}
- From/To/CC: ${meta.fromCount}/${meta.toCount}/${meta.ccCount}
- Time span: ${meta.firstSeen} to ${meta.lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Direct correspondent in 5 threads over 3 months, likely business contact."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.`
}

// ─── Response Parsing ─────────────────────────────────────────

export function parseClaudeResponse(raw: string): ClaudeClassification | null {
  try {
    let text = raw.trim()

    // Strip ```json or ``` fences
    const lines = text.split('\n')
    if (lines[0].trim().startsWith('```')) {
      lines.shift()
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    text = lines.join('\n').trim()

    if (!text) return null

    const parsed = JSON.parse(text)

    // Validate confidence
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
      return null
    }

    // Validate relationship_type
    if (!VALID_RELATIONSHIP_TYPES.has(parsed.relationship_type)) {
      return null
    }

    // Validate reasoning exists
    if (typeof parsed.reasoning !== 'string' || !parsed.reasoning) {
      return null
    }

    return {
      first_name: parsed.first_name ?? null,
      last_name: parsed.last_name ?? null,
      job_title: parsed.job_title ?? null,
      company_name: parsed.company_name ?? null,
      phone: parsed.phone ?? null,
      relationship_type: parsed.relationship_type,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    }
  } catch {
    return null
  }
}

// ─── API Call ─────────────────────────────────────────────────

export async function classifyWithClaude(prompt: string): Promise<ClaudeClassification | null> {
  const apiKey = getSecureSetting('anthropic_api_key')
  if (!apiKey) return null

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Claude] API error ${response.status}: ${errText}`)
      return null
    }

    const data = await response.json() as { content: Array<{ text: string }> }
    const text = data.content?.[0]?.text
    if (!text) return null

    return parseClaudeResponse(text)
  } catch (err) {
    console.error('[Claude] Request failed:', String(err))
    return null
  }
}

// ─── API Key Validation ───────────────────────────────────────

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    return response.status === 200
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/gmail/claude-client.test.ts`
Expected: All tests PASS (only testing prompt builders + response parser, not the API call)

- [ ] **Step 5: Commit**

```bash
git add electron/gmail/claude-client.ts tests/gmail/claude-client.test.ts
git commit -m "feat(email-intel): implement Claude client with prompt builders + response parser"
```

---

### Task 8: Wire Claude classification into scanner pipeline

**Files:**
- Modify: `electron/gmail/scanner.ts`
- Modify: `electron/gmail/types.ts`

This is the core integration — replaces `enrichWithSignatures` with Claude-powered classification.

- [ ] **Step 1: Add `classifying` status to `ScanProgress`**

In `electron/gmail/types.ts`, update the `ScanProgress` interface:

```typescript
export interface ScanProgress {
  status: 'idle' | 'scanning' | 'classifying' | 'complete' | 'error'
  processed: number
  total: number
  candidatesFound: number
  error?: string
}
```

- [ ] **Step 2: Add imports and constants to scanner.ts**

At the top of `electron/gmail/scanner.ts`, add:

```typescript
import { stripQuotedContent, scoreMessageForSignature } from './email-utils'
import { classifyWithClaude, buildExtractionPrompt, buildMetadataOnlyPrompt } from './claude-client'
import type { ClaudeClassification, CandidateMetadata } from './claude-client'
import { getSecureSetting } from './secure-settings'
```

Add constant after existing `BATCH_SIZE`:

```typescript
const MAX_BODY_FETCH_CANDIDATES = 200
```

- [ ] **Step 3: Add own-email guard function**

Add to `scanner.ts` after `isMarketingMessage`:

```typescript
// ─── Own-Email Guard ──────────────────────────────────────

function stripOwnSignatureLines(body: string, userEmail: string, userDisplayName: string | null): string {
  const userDomain = userEmail.split('@')[1]?.toLowerCase()
  if (!userDomain) return body

  const nameLower = userDisplayName?.toLowerCase()?.trim() || null

  return body.split('\n').filter(line => {
    const lineLower = line.toLowerCase()
    // Strip lines containing an email @userDomain
    if (new RegExp(`\\b[a-z0-9._%+-]+@${userDomain.replace('.', '\\.')}\\b`).test(lineLower)) {
      return false
    }
    // Strip lines containing the exact full display name
    if (nameLower && nameLower.length > 3) {
      // Word-boundary match to avoid partial matches
      const namePattern = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (namePattern.test(lineLower)) return false
    }
    return true
  }).join('\n')
}
```

- [ ] **Step 4: Replace `enrichWithSignatures` with `classifyCandidates`**

Replace the existing `enrichWithSignatures` function in `scanner.ts` with:

```typescript
// ─── Claude Classification ────────────────────────────────────

async function classifyCandidates(
  client: GmailClient,
  candidates: EnrichedCandidate[],
  ownEmail: string,
  ownDisplayName: string | null,
): Promise<void> {
  const hasApiKey = !!getSecureSetting('anthropic_api_key')

  // Sort by heuristic confidence (descending) for top-N body fetch cutoff
  candidates.sort((a, b) => (b._confidence ?? 0) - (a._confidence ?? 0))

  const bodyFetchCount = Math.min(candidates.length, MAX_BODY_FETCH_CANDIDATES)

  updateProgress({ status: 'classifying', processed: 0, total: candidates.length })

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]

    const meta: CandidateMetadata = {
      email: candidate.email,
      threadCount: candidate.threadCount,
      fromCount: candidate.fromCount,
      toCount: candidate.toCount,
      ccCount: candidate.ccCount,
      firstSeen: candidate.firstSeenDate.toISOString().split('T')[0],
      lastSeen: candidate.lastSeenDate.toISOString().split('T')[0],
    }

    let classification: ClaudeClassification | null = null

    if (hasApiKey && i < bodyFetchCount) {
      // Top-N: fetch bodies, score, pick best, send to Claude with body
      try {
        const searchResult = await client.searchMessages(`from:${candidate.email}`, 5)
        let bestBody: string | null = null
        let bestScore = -Infinity

        for (let j = 0; j < searchResult.messages.length; j++) {
          const fullMsg = await client.getMessageFull(searchResult.messages[j].id)
          const isHtml = !fullMsg.bodyPlainText
          const rawBody = fullMsg.bodyPlainText ?? '' // TODO: HTML body extraction if needed
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
          classification = await classifyWithClaude(prompt)
        } else {
          // No usable body — metadata only
          const prompt = buildMetadataOnlyPrompt(meta)
          classification = await classifyWithClaude(prompt)
        }
      } catch (err) {
        if (err instanceof TokenExpiredError) throw err
        if (isDev) console.log(`[Scanner] Body fetch failed for ${candidate.email}:`, String(err))
      }
    } else if (hasApiKey) {
      // Beyond top-N: metadata-only Claude classification
      const prompt = buildMetadataOnlyPrompt(meta)
      classification = await classifyWithClaude(prompt)
    }

    // Apply Claude results or fall back to heuristic
    if (classification) {
      if (classification.first_name) candidate.firstName = classification.first_name
      if (classification.last_name) candidate.lastName = classification.last_name
      candidate._extractedTitle = classification.job_title ?? undefined
      candidate._extractedCompany = classification.company_name ?? undefined
      candidate._extractedPhone = classification.phone ?? undefined
      candidate._confidence = classification.confidence
      candidate._classificationSource = 'ai'
      candidate._relationshipType = classification.relationship_type
      candidate._aiReasoning = classification.reasoning
    } else {
      // Heuristic fallback (existing behavior)
      const { relationshipType, confidence } = classifyCandidate(candidate)
      candidate._confidence = confidence
      candidate._classificationSource = 'heuristic'
      candidate._relationshipType = relationshipType
    }

    if ((i + 1) % 10 === 0 || i === candidates.length - 1) {
      updateProgress({ processed: i + 1 })
    }
  }
}
```

- [ ] **Step 5: Update `EnrichedCandidate` interface**

In `scanner.ts`, update the `EnrichedCandidate` interface:

```typescript
interface EnrichedCandidate extends EmailCandidate {
  _extractedTitle?: string
  _extractedPhone?: string
  _extractedCompany?: string
  _confidence?: number
  _classificationSource?: 'ai' | 'heuristic'
  _relationshipType?: string
  _aiReasoning?: string
}
```

- [ ] **Step 6: Update `writeCandidateBatch` to use new fields**

In `scanner.ts`, update the fields object inside `writeCandidateBatch` where it builds the record:

```typescript
    const fields: Record<string, unknown> = {
      imported_contact_name: candidate.displayName || candidate.email,
      first_name: candidate.firstName || '',
      last_name: candidate.lastName || '',
      email: candidate.email,
      onboarding_status: 'Review',
      import_source: 'Integration',
      source: 'Email Scan',
      import_date: new Date().toISOString().split('T')[0],
      relationship_type: candidate._relationshipType || 'Unknown',
      confidence_score: candidate._confidence ?? 0,
      email_thread_count: candidate.threadCount,
      first_seen_date: candidate.firstSeenDate.toISOString().split('T')[0],
      last_seen_date: candidate.lastSeenDate.toISOString().split('T')[0],
      discovered_via: candidate.discoveredVia,
      classification_source: candidate._classificationSource || 'heuristic',
      ai_reasoning: candidate._aiReasoning || null,
    }
```

- [ ] **Step 7: Update `scanFull` and `scanIncremental` to call `classifyCandidates`**

In `scanFull`, replace the existing signature extraction + write block:

```typescript
      // --- Pipeline: rules → dedup → classify → write ---
      const survivors = processCandidates(candidateMap, rules, ownEmail)

      updateProgress({ candidatesFound: survivors.length })

      // Claude classification + signature extraction (replaces enrichWithSignatures)
      const tokens = loadTokens()
      if (survivors.length > 0) {
        await classifyCandidates(client, survivors, ownEmail, tokens?.displayName ?? null)
      }

      // Batch write to SQLite + Airtable
      if (survivors.length > 0 && config) {
        await writeCandidateBatch(survivors, config.apiKey, config.baseId)
      }
```

Apply the same pattern in `scanIncremental`.

- [ ] **Step 8: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add electron/gmail/scanner.ts electron/gmail/types.ts
git commit -m "feat(email-intel): wire Claude classification into scanner pipeline"
```

---

## Wave 4: UI Changes (Electron)

### Task 9: Add Anthropic API key to Settings UI

**Files:**
- Modify: `src/components/settings/SettingsPage.tsx`

- [ ] **Step 1: Add API key state and validation**

In `SettingsPage.tsx`, add state variables alongside existing ones:

```typescript
const [anthropicKey, setAnthropicKey] = useState('')
const [anthropicKeyValid, setAnthropicKeyValid] = useState<boolean | null>(null)
const [anthropicKeyValidating, setAnthropicKeyValidating] = useState(false)
```

Add loader in the existing `useEffect` that loads settings:

```typescript
  // Load Anthropic API key
  const anthropicRes = await window.electronAPI.settings.getSecure('anthropic_api_key')
  if (anthropicRes?.data) setAnthropicKey('••••••••') // Don't show actual key
```

- [ ] **Step 2: Add save + validate handler**

```typescript
  async function handleAnthropicKeySave() {
    if (!anthropicKey || anthropicKey === '••••••••') return
    setAnthropicKeyValidating(true)
    try {
      const validRes = await window.electronAPI.gmail.validateAnthropicKey(anthropicKey)
      if (validRes.success && validRes.data) {
        await window.electronAPI.settings.setSecure('anthropic_api_key', anthropicKey)
        setAnthropicKeyValid(true)
        setAnthropicKey('••••••••')
      } else {
        setAnthropicKeyValid(false)
      }
    } catch {
      setAnthropicKeyValid(false)
    } finally {
      setAnthropicKeyValidating(false)
    }
  }
```

- [ ] **Step 3: Add UI row in Settings, after Gmail section**

Add a new section in the settings JSX:

```tsx
{/* AI Classification */}
<PrefRow label="AI Classification">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="password"
        className={inputClass}
        placeholder="Anthropic API Key"
        value={anthropicKey}
        onChange={e => { setAnthropicKey(e.target.value); setAnthropicKeyValid(null) }}
        style={{ flex: 1 }}
      />
      <button
        onClick={handleAnthropicKeySave}
        disabled={!anthropicKey || anthropicKey === '••••••••' || anthropicKeyValidating}
        className="cursor-default disabled:opacity-40"
        style={{
          padding: '5px 12px', fontSize: 12, fontWeight: 600,
          background: 'var(--color-accent)', color: 'var(--text-on-accent)',
          borderRadius: 6, border: 'none', fontFamily: 'inherit',
        }}
      >
        {anthropicKeyValidating ? 'Validating...' : 'Save'}
      </button>
    </div>
    {anthropicKeyValid === true && (
      <span style={{ fontSize: 11, color: 'var(--color-green)' }}>Key validated successfully</span>
    )}
    {anthropicKeyValid === false && (
      <span style={{ fontSize: 11, color: 'var(--color-red)' }}>Invalid API key</span>
    )}
    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
      Enables AI-powered contact classification. Uses Claude Haiku (~$0.002/contact).
    </span>
  </div>
</PrefRow>
```

- [ ] **Step 4: Register `validateAnthropicKey` IPC handler**

In `electron/ipc/register.ts`:

```typescript
  ipcMain.handle('gmail:validateAnthropicKey', async (_e, key: string) => {
    const { validateApiKey } = await import('../gmail/claude-client')
    const valid = await validateApiKey(key)
    return { success: true, data: valid }
  })
```

And in `electron/preload.ts`, in the gmail section:

```typescript
    validateAnthropicKey: (key: string) => ipcRenderer.invoke('gmail:validateAnthropicKey', key),
```

- [ ] **Step 5: Verify build compiles and Settings page renders**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsPage.tsx electron/ipc/register.ts electron/preload.ts
git commit -m "feat(email-intel): add Anthropic API key to Settings UI with validation"
```

---

### Task 10: Add company picker to Imported Contacts approve flow

**Files:**
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `electron/ipc/register.ts:168-243`

- [ ] **Step 1: Add company fuzzy matching function**

In `ImportedContactsPage.tsx`, add after the existing helpers:

```typescript
interface CompanyMatch {
  id: string
  name: string
  type: string | null
  matchType: 'exact' | 'starts-with' | 'contains'
}

function findCompanyMatches(extracted: string, companies: Record<string, unknown>[]): CompanyMatch[] {
  if (!extracted || extracted.trim().length === 0) return []
  const query = extracted.toLowerCase().trim()
  const matches: CompanyMatch[] = []

  for (const company of companies) {
    const name = (company.company_name as string | null)?.trim()
    if (!name) continue
    const nameLower = name.toLowerCase()
    const id = company.id as string

    const companyType = (company.company_type as string | null) ?? null

    if (nameLower === query) {
      matches.push({ id, name, type: companyType, matchType: 'exact' })
    } else if (nameLower.startsWith(query)) {
      matches.push({ id, name, type: companyType, matchType: 'starts-with' })
    } else {
      const shorter = Math.min(query.length, nameLower.length)
      // Contains match: only if match covers >50% of shorter string
      if (nameLower.includes(query) && query.length > shorter * 0.5) {
        matches.push({ id, name, type: companyType, matchType: 'contains' })
      }
    }
  }

  // Sort: exact first, then starts-with, then contains
  const priority: Record<string, number> = { exact: 0, 'starts-with': 1, contains: 2 }
  matches.sort((a, b) => priority[a.matchType] - priority[b.matchType])
  return matches
}
```

- [ ] **Step 2: Add `CompanyPicker` component**

Add before the `ImportedContactDetail` component:

```typescript
function CompanyPicker({
  suggestedName,
  companies,
  onSelect,
  onCreateNew,
  onClear,
}: {
  suggestedName: string | null
  companies: Record<string, unknown>[]
  onSelect: (id: string, name: string) => void
  onCreateNew: (name: string) => void
  onClear: () => void
}) {
  const isDark = useDarkMode()
  const [search, setSearch] = useState(suggestedName ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyMatch | null>(null)

  // Auto-match on mount
  useEffect(() => {
    if (suggestedName) {
      const matches = findCompanyMatches(suggestedName, companies)
      if (matches.length > 0 && matches[0].matchType === 'exact') {
        setSelectedCompany(matches[0])
        onSelect(matches[0].id, matches[0].name)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    return findCompanyMatches(search, companies).slice(0, 8)
  }, [search, companies])

  if (selectedCompany) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: isDark ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.05)',
        border: '1px solid rgba(0,122,255,0.20)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {selectedCompany.name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px',
          borderRadius: 9999, background: 'rgba(0,122,255,0.18)', color: '#0055B3',
        }}>
          Linked
        </span>
        <button
          onClick={() => { setSelectedCompany(null); onClear(); setSearch(''); setIsOpen(true) }}
          className="cursor-default"
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'inherit', padding: 0 }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search or create company..."
        className="w-full text-[13px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--separator-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
      />
      {isOpen && search.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          marginTop: 4, borderRadius: 8, overflow: 'hidden',
          background: 'var(--bg-window)', border: '1px solid var(--separator)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map(match => (
            <div
              key={match.id}
              onClick={() => {
                setSelectedCompany(match)
                onSelect(match.id, match.name)
                setIsOpen(false)
              }}
              className="cursor-default"
              style={{
                padding: '8px 12px', fontSize: 13,
                borderBottom: '1px solid var(--separator)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>{match.name}</span>
              {match.type && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{match.type}</span>
              )}
            </div>
          ))}
          {/* Create new option */}
          <div
            onClick={() => { onCreateNew(search.trim()); setIsOpen(false) }}
            className="cursor-default"
            style={{
              padding: '8px 12px', fontSize: 13,
              color: 'var(--color-accent)', fontWeight: 500,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            Create "{search.trim()}" as new company
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Integrate CompanyPicker into ImportedContactDetail**

In the `ImportedContactDetail` component, add state for company selection:

```typescript
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [createCompanyName, setCreateCompanyName] = useState<string | null>(null)
```

Load companies list:

```typescript
  const { data: companies } = useEntityList(() => window.electronAPI.companies.getAll(), { syncReload: false })
```

Replace the existing "Company pairing card" section (the `{suggestedCompany && (` block) with:

```tsx
        {/* Company Picker */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>Company</SectionLabel>
          <CompanyPicker
            suggestedName={suggestedCompany}
            companies={companies}
            onSelect={(id, _name) => { setCompanyId(id); setCreateCompanyName(null) }}
            onCreateNew={(name) => { setCreateCompanyName(name); setCompanyId(null) }}
            onClear={() => { setCompanyId(null); setCreateCompanyName(null) }}
          />
        </div>
```

- [ ] **Step 4: Update the onAddToCrm callback to pass company data**

Update the "Add to CRM" button's onClick:

```tsx
              onClick={() => onAddToCrm({ ...editFields, company_id: companyId, create_company_name: createCompanyName })}
```

- [ ] **Step 5: Update approve IPC handler to accept company_id and create_company_name**

In `electron/ipc/register.ts`, update the `importedContacts:approve` handler. Replace the existing company determination logic (lines ~176-200) with:

```typescript
      // 2. Determine company ID from edited fields or auto-detection
      let companyId: string | null = (editedFields?.company_id as string | null) ?? null

      if (!companyId) {
        // Check if the imported record already has a linked company
        const suggestedCompanyIds = imported.suggested_company_ids as string | null
        try {
          if (suggestedCompanyIds) {
            const arr = JSON.parse(suggestedCompanyIds)
            if (Array.isArray(arr) && arr.length > 0) {
              companyId = arr[0]
            }
          }
        } catch { /* ignore */ }
      }

      // Create new company if requested
      const createCompanyName = editedFields?.create_company_name as string | null
      if (!companyId && createCompanyName) {
        const relationshipType = (editedFields?.relationship_type ?? imported.relationship_type) as string | null
        const typeMap: Record<string, string> = { 'Client': 'Client', 'Vendor Contact': 'Vendor', 'Partner': 'Partner' }
        const companyType = (relationshipType && typeMap[relationshipType]) || null

        const companyResult = await createRecord('companies', {
          company_name: createCompanyName,
          ...(companyType ? { company_type: companyType } : {}),
        })
        if (companyResult.success && companyResult.id) {
          companyId = companyResult.id
        }
      }
```

- [ ] **Step 6: Add AI classification indicator**

At the top of `ImportedContactsPage` main component, add after the scan controls bar:

```tsx
        {/* AI Classification indicator */}
        <div style={{
          padding: '4px 12px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
          fontSize: 10, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: hasApiKey ? 'var(--color-green)' : 'var(--text-secondary)',
          }} />
          {hasApiKey ? 'AI classification active' : 'AI classification off — add API key in Settings'}
        </div>
```

Add state for `hasApiKey`:

```typescript
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    window.electronAPI.settings.getSecure('anthropic_api_key').then(res => {
      setHasApiKey(!!res?.data)
    }).catch(() => {})
  }, [])
```

- [ ] **Step 7: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/imported-contacts/ImportedContactsPage.tsx electron/ipc/register.ts
git commit -m "feat(email-intel): add company picker + AI classification indicator"
```

---

## Wave 5: Manual Verification + Swift Port

### Task 11: Manual Electron verification

**Files:** None — this is a testing gate.

- [ ] **Step 1: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run the dev app**

Run: `npm run dev`

- [ ] **Step 3: Verify Settings**

1. Go to Settings
2. Enter an Anthropic API key → click Save
3. Verify green "Key validated successfully" appears
4. Verify the key persists after closing/reopening Settings

- [ ] **Step 4: Verify scan with Claude**

1. Go to Imported Contacts
2. Verify "AI classification active" indicator shows
3. Click "Scan Email"
4. Verify scan progress shows "Classifying N contacts..." phase
5. Verify imported contacts have non-"Unknown" relationship types
6. Verify confidence scores are in the 0-100 range
7. Verify AI Reasoning card shows actual reasoning text

- [ ] **Step 5: Verify company picker**

1. Select an imported contact with a suggested company
2. Verify the company picker shows matched CRM companies
3. Test: select an existing company → approve → verify Contact has company linked
4. Test: create a new company → approve → verify Company record created + Contact linked

- [ ] **Step 6: Verify marketing filtering**

Check dev console logs for `[Scanner] Pipeline:` — verify rejected-by-rules count is higher than before (marketing headers now caught).

- [ ] **Step 7: Document any issues and commit fixes**

---

### Task 12: Swift port — overview

**HARD GATE: Do not start until Task 11 passes.**

The Swift port mirrors all Electron changes into the parallel Swift app. This task is a checklist — each item maps to an Electron task above.

**Files to modify:**
- `swift-app/ILS CRM/Services/EmailUtils.swift` — add `stripQuotedContent()`, `scoreMessageForSignature()`
- `swift-app/ILS CRM/Services/EmailScanEngine.swift` — add marketing checks, Claude classification pipeline, own-email guard
- `swift-app/ILS CRM/Services/GmailAPIClient.swift` — fetch additional marketing headers
- `swift-app/ILS CRM/Models/ImportedContact.swift` — add `classificationSource` property
- `swift-app/ILS CRM/Models/Converters/ImportedContact+Airtable.swift` — add field mapping
- `swift-app/ILS CRM/Views/ImportedContacts/ImportedContactsView.swift` — add company picker, AI indicator
- `swift-app/ILS CRM/Views/Settings/GmailSettingsSection.swift` — add API key field

**New files:**
- `swift-app/ILS CRM/Services/ClaudeClient.swift` — prompt builders, response parser, API call
- `swift-app/ILS CRM/Services/SecureSettings.swift` — Keychain wrapper (or extend existing `KeychainService`)

The implementation follows the same task order (stripping → marketing → Claude → UI), using the same test fixtures in `tests/shared/fixtures/` and the same prompt text from the spec.

- [ ] **Step 1: Port `stripQuotedContent()` to Swift**
- [ ] **Step 2: Port `scoreMessageForSignature()` to Swift**
- [ ] **Step 3: Add marketing header fetching to `GmailAPIClient.swift`**
- [ ] **Step 4: Add `isMarketingMessage()` to `EmailScanEngine.swift`**
- [ ] **Step 5: Implement `ClaudeClient.swift` (prompts + parser + API)**
- [ ] **Step 6: Wire Claude classification into `EmailScanEngine.swift`**
- [ ] **Step 7: Add `classificationSource` to model + converter**
- [ ] **Step 8: Add company picker to `ImportedContactsView.swift`**
- [ ] **Step 9: Add API key field to Settings**
- [ ] **Step 10: Build and verify Swift app**
- [ ] **Step 11: Commit all Swift changes**

---

## Summary

| Wave | Tasks | Focus |
|------|-------|-------|
| 1 | 1-3 | Field maps, test fixtures, quoted content stripping |
| 2 | 4-5 | Marketing filtering, message scoring |
| 3 | 6-8 | Claude API client, secure storage, scanner integration |
| 4 | 9-10 | Settings UI, company picker, AI indicator |
| 5 | 11-12 | Manual verification gate, Swift port |

**Electron tasks:** 10 (Tasks 1-10)
**Swift tasks:** 1 meta-task with 11 sub-steps (Task 12)
**Total commits:** ~12-15
