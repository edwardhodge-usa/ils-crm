# Email Intelligence Cleanup — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Scope:** ILS CRM — Electron + Swift
**Depends on:** Email Intelligence Phase 1 (complete)

## Problem

The Email Intelligence scanner produces noisy, inaccurate results:

1. **Marketing emails slip through** — newsletters from real domains pass the rules engine
2. **Wrong company extraction** — signature parser grabs arbitrary lines as company names
3. **Company/title mixing** — naive line-position heuristics confuse the two
4. **Own-signature contamination** — quoted thread replies cause ImagineLab's signature to be attributed to the contact
5. **No company pairing** — the approve flow has no way to link to an existing CRM company

## Approach

Replace heuristic classification and signature extraction with Claude API (Haiku). Harden marketing filtering with additional header checks. Add company picker to the approve flow. All changes land in both Electron and Swift.

---

## Section 1: Claude API Extraction + Classification

**Replaces:** `classifier.ts` / `EmailClassifier.swift` (heuristic 0-60 scorer) and `extractSignature()` in `email-utils.ts` / `EmailUtils.swift`.

For each candidate that survives the rules engine + dedup pipeline, send the email body to **Claude Haiku** with a structured extraction prompt.

### Prompt (canonical — both apps must match)

**With signature body:**
```
You are extracting contact information from an email. The email body below belongs to a single person. Extract their details.

Email body:
---
{stripped_body}
---

Candidate metadata:
- Email: {email}
- Thread count: {threadCount}
- From/To/CC: {fromCount}/{toCount}/{ccCount}
- Time span: {firstSeen} to {lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent direct correspondent over 6 months with professional signature."}

Example with missing fields:
{"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 35, "reasoning": "Appeared in 2 threads as CC, no signature data available."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.
```

**Metadata-only (no usable signature):**
```
You are classifying an email contact for a CRM. No email body is available — classify based on email patterns only.

Candidate metadata:
- Email: {email}
- Thread count: {threadCount}
- From/To/CC: {fromCount}/{toCount}/{ccCount}
- Time span: {firstSeen} to {lastSeen}

Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

Example response:
{"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Direct correspondent in 5 threads over 3 months, likely business contact."}

relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
reasoning is one sentence explaining your classification.
```

### Key details

- **Model:** Claude Haiku (`claude-haiku-4-5-20251001`)
- **Input:** Only the candidate's own message text — quoted thread content stripped first (Section 1a)
- **Own-email guard:** Before sending to Claude, strip lines that contain an email address `@{user_domain}` or contain the user's full display name (case-insensitive, exact full-name match only — not partial word matches). Do not strip lines that merely mention the domain in prose. Domain and display name are read dynamically from the authenticated Gmail profile, not hardcoded.
- **Cost:** ~$0.002/candidate. Full scan of 825 contacts ≈ $1.65. Incremental scans much less.
- **Confidence range:** 0-100 (upgraded from heuristic 0-60 cap)
- **Relationship type:** Actually classified by Claude instead of always returning "Unknown"

### Two prompt paths

- **Has usable signature:** Send stripped body + candidate metadata (thread count, From/To/CC ratios, time span) → extraction + classification + confidence + reasoning
- **No usable signature:** Send metadata only → classification + confidence + reasoning (no title/company/phone)

Every candidate gets a real relationship type. Only candidates with good signatures get extracted fields.

### Fallback

If the API call fails (network, rate limit, missing key), fall back to existing heuristic classifier. Tag the record with `classification_source: 'heuristic'` vs `'ai'` so the user can tell.

### Response parsing

Claude API JSON responses may arrive wrapped in ```json fences even when instructed "no markdown." Both apps must strip fences before `JSON.parse()` / `JSONDecoder`. Implement as `parseClaudeResponse()` in each app:

```
1. Trim whitespace
2. If starts with ```json or ```, strip first line
3. If ends with ```, strip last line
4. JSON.parse() / JSONDecoder the remainder
5. Validate: confidence is number 0-100, relationship_type is one of the allowed values
6. On any parse failure: return null (triggers heuristic fallback for this candidate)
```

---

## Section 1a: Quoted Content Stripping Algorithm

Isolate the candidate's own most-recent reply from thread noise. Applied before scoring or sending to Claude.

### Algorithm (applied in order)

1. **Prefer plain text** over HTML. If only HTML available:
   - Check for `<blockquote>`, `class="gmail_quote"`, `class="yahoo_quoted"` — remove those DOM nodes entirely
   - Then strip remaining tags
   - **Electron:** Use DOMParser or cheerio for structural removal
   - **Swift:** Regex removal of `<blockquote>...</blockquote>` blocks + divs with gmail_quote class, then simple tag-strip regex. No need for NSAttributedString — overkill for this.
2. **Cut at reply markers.** Scan line-by-line from top. Truncate at the first line matching:
   - 2+ consecutive lines starting with `> ` (plain text quoting — single `>` line ignored to avoid false positives on "> $50k")
   - `On {date}, {name} wrote:` (Gmail — same or next line for `wrote:`)
   - `{name} <{email}> wrote:` (no date prefix variant)
   - `From: ` at start of line followed by `Sent: ` within next 3 lines (Outlook)
   - `-----Original Message-----`
   - `---------- Forwarded message ----------`
   - `_{5,}` (Outlook underscore dividers, 5+ underscores)
   - Mobile footers: `Sent from my iPhone` / `Sent from my iPad` / `Get Outlook for` (these are footer markers in the candidate's own message — truncate here to remove both the footer and any quoted content below)
3. **What remains** is the candidate's own message + their signature.

### Guards

- If truncation leaves fewer than 3 lines → skip extraction for this message (bare "Thanks!" reply)
- If no reply marker found → use full body (standalone message)
- Cap at first 50 lines after stripping — signatures live in the first screenful, not line 180
- Multi-part MIME: prefer `text/plain`, fall back to `text/html` → structural strip → tag strip

### Test cases (committed to `tests/shared/fixtures/`)

- Gmail thread with `>` quoting
- Outlook thread with `From:/Sent:` block
- Thread where candidate's reply is just "Thanks" + signature
- Standalone message (no quoting)
- Forwarded message
- Mobile "Sent from iPhone" footer only
- HTML-only email with `<blockquote>`

---

## Section 1b: Message Selection Strategy

Currently picks one arbitrary message. Replace with score-and-pick.

### Algorithm per candidate

1. **Fetch up to 5 recent messages** via `from:${candidate.email}` (Gmail `messages.list` with `q` param), newest first. **Note:** these queries appear in the user's Gmail search history — this is a known side effect of the Gmail API, not avoidable without switching to a different lookup method.
2. **Strip quoted content** from each (Section 1a algorithm)
3. **Score each stripped body:**
   - 10+ lines remaining → +2
   - Contains phone number pattern → +3
   - Contains title keyword (VP, Director, Manager, etc.) → +2
   - Contains URL or domain name → +1
   - Recency bonus: most recent → +2, second most recent → +1, rest → +0
   - "Sent from my iPhone/iPad" is the only content → -5
   - Fewer than 3 lines → -10
4. **Send only the highest-scoring body to Claude.** One API call per candidate.
5. **If all messages score below 0:** skip signature extraction, but still send metadata to Claude for classification (the "no usable signature" prompt path).

### Throttling: top-200 body fetches

Full body fetches are expensive: 5 messages × N survivors × 5 Gmail quota units each. For 825 survivors that's 4,125 API calls → ~3-5 minutes in Gmail rate limits alone, plus Claude API calls on top.

**Solution:** Sort survivors by heuristic confidence score (descending) before message selection — this factors in thread count, From/To/CC ratio, and time span, so it ranks candidate quality better than thread count alone. Only fetch bodies for the **top 200 candidates** by heuristic confidence. The remaining candidates go through the metadata-only Claude prompt path — they get relationship classification and confidence but no signature extraction. This caps the body-fetch phase at ~1,000 Gmail calls (~1 minute) and keeps Claude calls manageable.

The 200 threshold can be adjusted via a constant (`MAX_BODY_FETCH_CANDIDATES`). Users with smaller mailboxes will naturally have fewer survivors and won't hit the cap.

### Progress indication

The extraction phase runs AFTER the scan phase. Show separate progress: "Classifying 200 contacts..." with a progress bar (N/200). This is distinct from the existing "Scanning X messages..." progress during the fetch phase.

### Rationale

- 5 messages per candidate balances coverage vs Gmail API cost
- Top-200 cap prevents the body-fetch phase from dominating scan time
- Recency bonus ensures a decent recent signature beats a rich old one (handles job changes)
- Single best body to Claude keeps API cost at one call per candidate
- Early bail on all-negative saves API cost on contacts with no signatures

---

## Section 2: Marketing Email Filtering

Filter marketing noise before candidates enter the pipeline (saves Claude API cost).

### New header checks in message fetch loop

Added alongside existing `List-Unsubscribe` check, before aggregation:

- `Precedence: bulk` or `Precedence: list` → skip message
- `List-Id` header present → skip message
- `X-Mailer` containing known ESP names: Mailchimp, HubSpot, Constant Contact, Brevo, Klaviyo, SendGrid, Mailgun → skip message

### Dependency

`client.ts` / `GmailAPIClient.swift` must be updated to fetch these additional headers (`Precedence`, `List-Id`, `X-Mailer`) alongside the existing From/To/CC/Date/List-Unsubscribe.

### "Skip message" semantics

Skip the message for **aggregation purposes** — don't count it toward any candidate's threadCount. But don't prevent a candidate from entering the map if they also appear in non-marketing messages. A real contact CC'd on a newsletter alongside a mailing list still gets discovered through their other emails.

---

## Section 3: API Key Management

### Electron

- New field in Settings UI: "Anthropic API Key" — secure input, same visual pattern as Airtable API key
- Stored via `safeStorage.encryptString()` → base64 encode → store as string (NOT via plaintext `setSetting`)
- Implement `getSecureSetting(key)` / `setSecureSetting(key, value)` pair that handles encrypt/decrypt + base64 round-trip
- Read in `scanner.ts` via `getSecureSetting('anthropic_api_key')`

### Swift

- New field in Settings UI — new `AISettingsSection` or extend `GmailSettingsSection`
- Stored in macOS Keychain via existing `KeychainService` (same pattern as Airtable API key)
- Read in `EmailScanEngine.swift` via `KeychainService.get("anthropic_api_key")`

### Validation

On save, validate by sending a 1-token completion to Haiku (`max_tokens: 1, messages: [{role: "user", content: "hi"}]`). HTTP 200 = valid key (green checkmark), HTTP 401 = invalid (red "Invalid key"). Cost: ~$0. Immediate feedback — don't let users discover a bad key during a scan a week later.

### Graceful degradation

- Key is optional. If not set, Claude extraction is skipped, heuristic classifier runs instead.
- Show indicator on Imported Contacts page: "AI classification: active" vs "AI classification: off — add API key in Settings"
- `classification_source` field on each record: `'ai'` or `'heuristic'`

---

## Section 4: Company Picker in Approve Flow

### Three states in the detail panel

1. **Suggested match found** — Claude extracted "Acme Corp", fuzzy search found "Acme Corporation" in CRM. Show: `Acme Corporation` with linked badge, "x" to clear and search manually.
2. **Suggested but no match** — extracted "Newco Labs", nothing similar in CRM. Show: `Newco Labs — New company` with option to search existing instead.
3. **No suggestion** — no company extracted. Show: empty search field with placeholder "Search or create company..."

### Picker UX

- Type-ahead search against CRM companies table
- Results show company name + type (Client/Vendor/etc.) for disambiguation
- Bottom option: "Create [typed text] as new company" — always visible when search text doesn't exact-match an existing company
- Selecting existing sets `company_id` on the approve payload
- Selecting "Create new" sets `create_company_name` on the approve payload

### Fuzzy matching for auto-suggestion

When the user opens the detail panel (not during scan), match Claude's extracted company name against existing CRM companies. On-open computation ensures it always uses current CRM data.

Match priority:
1. **Exact match** (case-insensitive) → auto-link, show state 1
2. **Starts-with match** (case-insensitive: CRM company name starts with extracted name) → suggest as top result, show state 1 but don't auto-confirm
3. **Contains match** — only if the match covers >50% of the shorter string's length (prevents "Acme" matching "Academy of Motion Picture Arts"). If multiple companies match, show all as suggestions.
4. **No match** → show state 2

No external fuzzy library. CRM has ~50-100 companies — this cascade is sufficient.

### Approve handler data flow

```
User clicks "Add to CRM"
  → If company_id set:
      Create Contact with companies_ids = [company_id]
  → If create_company_name set:
      Create Company record first (defaults: name = create_company_name,
        type = mapped from relationship_type: Client→Client, Vendor Contact→Vendor,
        Partner→Partner, all others→null)
      → get new ID → create Contact with companies_ids = [new_id]
  → If neither:
      Create Contact with no company link
```

### Platform implementation

| | Electron | Swift |
|---|----------|-------|
| Picker | New `CompanyPicker` component in detail panel, reuses search/dropdown pattern from contact create | Reuse `LinkedRecordPicker` with `entityType: .companies` |
| Approve handler | `importedContacts:approve` IPC gains `company_id` and `create_company_name` params | `ImportedContactsView` approve action gains same params |
| Company creation | Existing `batchCreate` for companies table | Existing `modelContext.insert` + push |

---

## Section 5: Parity Strategy

### Shared logic (must be identical behavior in both apps)

| Component | Electron | Swift |
|-----------|----------|-------|
| Quoted content stripping | `email-utils.ts` → `stripQuotedContent()` | `EmailUtils.swift` → `stripQuotedContent()` |
| Message selection scoring | `scanner.ts` → `scoreMessageForSignature()` | `EmailScanEngine.swift` → `scoreMessageForSignature()` |
| Marketing header checks | `scanner.ts` → extend message fetch loop | `EmailScanEngine.swift` → extend message fetch loop |
| Claude API call + prompt | `scanner.ts` → `classifyWithClaude()` | `EmailScanEngine.swift` → `classifyWithClaude()` |
| JSON response parsing + fence strip | `scanner.ts` → `parseClaudeResponse()` | `EmailScanEngine.swift` → `parseClaudeResponse()` |
| Heuristic fallback | `classifier.ts` (unchanged, becomes fallback) | `EmailClassifier.swift` (unchanged, becomes fallback) |

### Prompt management

The canonical Claude prompt is defined in this spec (Section 1). Both source files reference this spec in a comment. Test fixtures include the expected prompt text — tests catch drift.

### UI changes (platform-native)

| Change | Electron | Swift |
|--------|----------|-------|
| Company picker in approve flow | New `CompanyPicker` component | Reuse `LinkedRecordPicker` |
| API key in Settings | New secure input row | New row in Settings / `AISettingsSection` |
| Classification source indicator | Badge on Imported Contacts header | Badge on `ImportedContactsView` toolbar |
| "AI off" notice | Inline banner when key missing | Inline banner when key missing |

### Implementation order

1. **Electron first** — faster iteration, hot reload, easier to debug API calls
2. **Hard gate:** Electron must pass all test fixtures + manual verification with a real scan before starting Swift
3. **Swift second** — port working logic, same test cases
4. **Shared test corpus** — `tests/shared/fixtures/` at the repo root (accessible to both Electron and Swift test targets). Each fixture: raw email body, expected stripped output, expected Claude prompt, expected parsed response. Swift tests reference these via relative path from `swift-app/`.

### What stays separate

- OAuth flow (completely different per platform)
- Secure storage (safeStorage vs Keychain)
- Gmail API client (HTTP libraries differ)

---

## Prerequisites (manual, before implementation)

- **Airtable:** Create `classification_source` field on Imported Contacts table — singleSelect with options: `AI`, `Heuristic`. Airtable API cannot create fields; must be done in the Airtable UI.

## Implementation notes

- Existing `classifier.ts` / `EmailClassifier.swift` are not deleted — they become the fallback path when no API key is configured or when the API call fails
- The `classification_source` field (`'ai'` or `'heuristic'`) is a new column on imported_contacts — add to field maps, converters, and sync. Field must exist in Airtable first (see Prerequisites).
- Marketing header fields (`Precedence`, `List-Id`, `X-Mailer`) need to be fetched by the Gmail API client in both apps — update `getMessageHeaders()` / `fetchMessageHeaders()`
- All `confidence_score` values from Claude are 0-100. Existing heuristic scores were 0-60. UI color thresholds stay as-is (green ≥80, yellow ≥50, gray <50). This means heuristic-classified contacts (capped at 60) can never reach green — **this is intentional**: lower visual trust for heuristic results signals to the user that AI classification would produce better results.
- Reply marker regexes should be flexible, not format-specific. For "On {date}, {name} wrote:": use `/^On .+wrote:\s*$/i` — we're detecting the marker, not parsing the date.
