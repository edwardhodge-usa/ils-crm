// electron/gmail/scanner.ts
// Email Intelligence scan orchestrator — ties OAuth, Gmail API, rules, classifier,
// and CRM dedup together into full/incremental/manual scan pipelines.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { BrowserWindow } from 'electron'
import { loadTokens, refreshAccessToken } from './oauth'
import { GmailClient, TokenExpiredError, HistoryExpiredError } from './client'
import { DEFAULT_RULES, evaluateRules, parseAirtableRule } from './rules-engine'
import { classifyCandidate } from './classifier'
import { normalizeEmail, parseDisplayName, extractSignature, stripQuotedContent, scoreMessageForSignature, normalizePhone } from './email-utils'
import { classifyWithClaude, buildExtractionPrompt, buildMetadataOnlyPrompt } from './claude-client'
import type { CandidateMetadata } from './claude-client'
import { getSecureSetting } from './secure-settings'
import type {
  EmailCandidate,
  EmailHeaders,
  DiscoveryMethod,
  Rule,
  ScanProgress,
  ScanCheckpoint,
  KnownContact,
} from './types'
import { getAll, getById, upsert, getSetting, setSetting } from '../database/queries/entities'
import { getDatabase, saveDatabase } from '../database/init'
import { batchCreate } from '../airtable/client'
import { TABLE_CONVERTERS } from '../airtable/converters'
import { TABLES } from '../airtable/field-maps'

const isDev = !!process.env.VITE_DEV_SERVER_URL
const SYNC_LOCK_PATH = '/tmp/ils-crm-sync.lock'
const MESSAGES_PER_PAGE = 500
const SIGNATURE_FETCH_LIMIT = 50 // max candidates to fetch full body for
const BATCH_SIZE = 10
const MAX_BODY_FETCH_CANDIDATES = 200

// Extended candidate with optional signature data (set during enrichment)
interface EnrichedCandidate extends EmailCandidate {
  _extractedTitle?: string
  _extractedPhone?: string
  _extractedCompany?: string
  _confidence?: number
  _classificationSource?: 'ai' | 'heuristic'
  _relationshipType?: string
  _aiReasoning?: string
}

// ─── Module State ──────────────────────────────────────────────

let scanProgress: ScanProgress = {
  status: 'idle',
  processed: 0,
  total: 0,
  candidatesFound: 0,
}

let pollInterval: ReturnType<typeof setInterval> | null = null
let getMainWindow: (() => BrowserWindow | null) | null = null
let isScanning = false

// ─── Progress ──────────────────────────────────────────────────

export function getScanProgress(): ScanProgress {
  return { ...scanProgress }
}

function updateProgress(update: Partial<ScanProgress>): void {
  Object.assign(scanProgress, update)
  const win = getMainWindow?.()
  if (win && !win.isDestroyed()) {
    win.webContents.send('emailScan:progress', { ...scanProgress })
  }
}

// ─── Sync Lock (batch-scoped) ──────────────────────────────────

function acquireSyncLock(): boolean {
  try {
    if (existsSync(SYNC_LOCK_PATH)) {
      const content = readFileSync(SYNC_LOCK_PATH, 'utf-8').trim()
      const lockTime = new Date(content).getTime()
      if (!isNaN(lockTime) && Date.now() - lockTime < 120_000) {
        return false // Another app is syncing
      }
      unlinkSync(SYNC_LOCK_PATH) // Stale lock
    }
    writeFileSync(SYNC_LOCK_PATH, new Date().toISOString(), 'utf-8')
    return true
  } catch {
    return true // If we can't check, proceed anyway
  }
}

function releaseSyncLock(): void {
  try { unlinkSync(SYNC_LOCK_PATH) } catch { /* ignore */ }
}

// ─── Marketing Detection ──────────────────────────────────────

const ESP_NAMES = ['mailchimp', 'hubspot', 'constant contact', 'brevo', 'klaviyo', 'sendgrid', 'mailgun']

function isMarketingMessage(headers: EmailHeaders): boolean {
  const raw = headers.rawHeaders

  const precedence = (raw['Precedence'] ?? '').toLowerCase()
  if (precedence === 'bulk' || precedence === 'list') return true

  if (raw['List-Id']) return true

  if (raw['List-Unsubscribe']) return true

  const mailer = (raw['X-Mailer'] ?? '').toLowerCase()
  if (mailer && ESP_NAMES.some(esp => mailer.includes(esp))) return true

  return false
}

// ─── Own-Email Guard ──────────────────────────────────────

function stripOwnSignatureLines(body: string, userEmail: string, userDisplayName: string | null): string {
  const userDomain = userEmail.split('@')[1]?.toLowerCase()
  if (!userDomain) return body

  const nameLower = userDisplayName?.toLowerCase()?.trim() || null
  const domainPattern = new RegExp(`\\b[a-z0-9._%+-]+@${userDomain.replace(/\./g, '\\.')}\\b`)

  return body.split('\n').filter(line => {
    const lineLower = line.toLowerCase()
    // Strip lines containing an email @userDomain
    if (domainPattern.test(lineLower)) return false
    // Strip lines containing the exact full display name (word-boundary match)
    if (nameLower && nameLower.length > 3) {
      const namePattern = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (namePattern.test(lineLower)) return false
    }
    return true
  }).join('\n')
}

// ─── Token Management ──────────────────────────────────────────

async function getValidClient(): Promise<GmailClient> {
  let tokens = loadTokens()
  if (!tokens) throw new Error('Gmail not connected — connect Gmail first')

  // If token expires within 5 minutes, refresh proactively
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshAccessToken()
  }

  return new GmailClient(tokens.accessToken)
}

async function withTokenRefresh<T>(fn: (client: GmailClient) => Promise<T>): Promise<T> {
  let client = await getValidClient()
  try {
    return await fn(client)
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      const tokens = await refreshAccessToken()
      client = new GmailClient(tokens.accessToken)
      return fn(client)
    }
    throw err
  }
}

// ─── Rules Loading ─────────────────────────────────────────────

function loadRules(): Rule[] {
  try {
    const ruleRecords = getAll('email_scan_rules')
    if (ruleRecords.length === 0) {
      if (isDev) console.log('[Scanner] No rules in DB, using DEFAULT_RULES')
      return DEFAULT_RULES
    }

    const parsed: Rule[] = []
    for (const record of ruleRecords) {
      const rule = parseAirtableRule(record)
      if (rule) parsed.push(rule)
    }

    const result = parsed.length > 0 ? parsed : DEFAULT_RULES
    if (isDev) {
      const source = parsed.length > 0 ? 'Airtable' : 'DEFAULT_RULES (parse failed)'
      console.log(`[Scanner] Using ${source} rules (${result.length} rules)`)
    }
    return result
  } catch {
    if (isDev) console.log('[Scanner] Failed to load rules from DB, using defaults')
    return DEFAULT_RULES
  }
}

// ─── Scan State ────────────────────────────────────────────────

function loadScanState(): { historyId: string | null; lastScanDate: string | null } {
  try {
    const rows = getAll('email_scan_state')
    if (rows.length === 0) return { historyId: null, lastScanDate: null }

    // Use the first (most recent) row
    const state = rows[0]
    return {
      historyId: (state.gmail_history_id as string) || null,
      lastScanDate: (state.last_scan_date as string) || null,
    }
  } catch {
    return { historyId: null, lastScanDate: null }
  }
}

function saveScanState(historyId: string, totalProcessed: number): void {
  const tokens = loadTokens()
  const email = tokens?.email || 'unknown'
  const stateId = getSetting('email_scan_state_id')

  const fields: Record<string, unknown> = {
    user_email: email,
    gmail_history_id: historyId,
    last_scan_date: new Date().toISOString(),
    scan_status: 'idle',
    total_processed: totalProcessed,
  }

  if (stateId) {
    upsert('email_scan_state', stateId, fields)
  } else {
    const id = `local_scan_${Date.now()}`
    upsert('email_scan_state', id, fields)
    setSetting('email_scan_state_id', id)
  }
  saveDatabase()
}

// ─── Checkpoint (for interrupted full scans) ───────────────────

function saveCheckpoint(checkpoint: ScanCheckpoint): void {
  setSetting('email_scan_checkpoint', JSON.stringify(checkpoint))
}

function loadCheckpoint(): ScanCheckpoint | null {
  const raw = getSetting('email_scan_checkpoint')
  if (!raw) return null
  try {
    return JSON.parse(raw) as ScanCheckpoint
  } catch {
    return null
  }
}

function clearCheckpoint(): void {
  setSetting('email_scan_checkpoint', '')
}

// ─── Candidate Aggregation ─────────────────────────────────────

function aggregateCandidate(
  map: Map<string, EmailCandidate>,
  email: string,
  displayName: string | null,
  date: Date,
  method: DiscoveryMethod,
  threadId: string,
): void {
  const normalized = normalizeEmail(email)
  const existing = map.get(normalized)

  if (existing) {
    // Update counts
    if (method === 'From') existing.fromCount++
    else if (method === 'To') existing.toCount++
    else existing.ccCount++

    existing.threadCount++
    if (date < existing.firstSeenDate) existing.firstSeenDate = date
    if (date > existing.lastSeenDate) existing.lastSeenDate = date

    // Upgrade display name if we didn't have one
    if (!existing.displayName && displayName) {
      existing.displayName = displayName
      const { first, last } = parseDisplayName(displayName)
      existing.firstName = first
      existing.lastName = last
    }

    // Upgrade discovery method priority: From > To > CC
    const priority: Record<DiscoveryMethod, number> = { 'From': 3, 'To': 2, 'CC': 1, 'Reply Chain': 0 }
    if (priority[method] > priority[existing.discoveredVia]) {
      existing.discoveredVia = method
    }
  } else {
    const { first, last } = displayName ? parseDisplayName(displayName) : { first: null, last: null }
    map.set(normalized, {
      email,
      normalizedEmail: normalized,
      displayName,
      firstName: first,
      lastName: last,
      threadCount: 1,
      firstSeenDate: date,
      lastSeenDate: date,
      discoveredVia: method,
      fromCount: method === 'From' ? 1 : 0,
      toCount: method === 'To' ? 1 : 0,
      ccCount: method === 'CC' ? 1 : 0,
    })
  }
}

// ─── CRM Dedup ─────────────────────────────────────────────────

function checkCrmDedup(normalizedEmail: string): string | null {
  try {
    const db = getDatabase()
    const result = db.exec(
      `SELECT id FROM contacts WHERE LOWER(email) = ? LIMIT 1`,
      [normalizedEmail],
    )
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as string
    }
    return null
  } catch {
    return null
  }
}

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
      const meta: CandidateMetadata = {
        email: candidate.email,
        threadCount: candidate.threadCount,
        fromCount: candidate.fromCount,
        toCount: candidate.toCount,
        ccCount: candidate.ccCount,
        firstSeen: candidate.firstSeenDate.toISOString().split('T')[0],
        lastSeen: candidate.lastSeenDate.toISOString().split('T')[0],
      }

      // Fetch message bodies, score, pick best
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

      let classification: import('./claude-client').ClaudeClassification | null = null

      if (bestBody && bestScore >= 0) {
        const prompt = buildExtractionPrompt(bestBody, meta)
        classification = await classifyWithClaude(prompt, apiKey)
      } else {
        const prompt = buildMetadataOnlyPrompt(meta)
        classification = await classifyWithClaude(prompt, apiKey)
      }

      if (classification) {
        writeEnrichmentDiffs(contactId, classification, candidate, discoveredBy)
      }

      // Update last_enrichment_check on contact
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

// ─── Batch Write to SQLite + Airtable ──────────────────────────

async function writeCandidateBatch(
  candidates: EnrichedCandidate[],
  apiKey: string,
  baseId: string,
): Promise<void> {
  const converter = TABLE_CONVERTERS['imported_contacts']
  if (!converter) throw new Error('No converter for imported_contacts')

  const tableId = TABLES.importedContacts

  // Write to local SQLite first
  const localRecords: Array<{ id: string; fields: Record<string, unknown> }> = []

  for (const candidate of candidates) {
    const id = `local_scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

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

    // Apply signature-extracted fields if present
    if (candidate._extractedTitle) fields.job_title = candidate._extractedTitle
    if (candidate._extractedPhone) fields.phone = candidate._extractedPhone
    if (candidate._extractedCompany) fields.suggested_company_name = candidate._extractedCompany

    upsert('imported_contacts', id, fields)
    localRecords.push({ id, fields })
  }

  saveDatabase()

  // Push to Airtable in batches of 10 with sync lock
  for (let i = 0; i < localRecords.length; i += BATCH_SIZE) {
    const batch = localRecords.slice(i, i + BATCH_SIZE)

    // Acquire lock only for this batch
    let lockAcquired = false
    let retries = 0
    while (!lockAcquired && retries < 5) {
      lockAcquired = acquireSyncLock()
      if (!lockAcquired) {
        retries++
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    if (!lockAcquired) {
      if (isDev) console.log('[Scanner] Could not acquire sync lock for batch write, skipping Airtable push')
      continue
    }

    try {
      const airtableRecords = batch.map(rec => ({
        fields: converter.toAirtable(rec.fields),
      }))

      const created = await batchCreate(tableId, airtableRecords, { apiKey, baseId })

      // Update local IDs with Airtable IDs
      for (let j = 0; j < created.length; j++) {
        const localId = batch[j].id
        const airtableId = created[j].id

        // Delete old local-only record, insert with real ID
        const db = getDatabase()
        const existing = getById('imported_contacts', localId)
        if (existing) {
          db.run(`DELETE FROM imported_contacts WHERE id = ?`, [localId])
          const local = converter.fromAirtable(created[j])
          local._airtable_modified_at = new Date().toISOString()
          upsert('imported_contacts', airtableId, local)
        }
      }

      saveDatabase()
    } catch (err) {
      console.error('[Scanner] Airtable batch write failed:', String(err))
      // Local records survive — they'll be pushed on next sync
    } finally {
      releaseSyncLock()
    }
  }
}

// ─── Full Scan ─────────────────────────────────────────────────

export async function scanFull(): Promise<void> {
  if (isScanning) {
    if (isDev) console.log('[Scanner] Scan already in progress, skipping')
    return
  }

  isScanning = true
  updateProgress({ status: 'scanning', processed: 0, total: 0, candidatesFound: 0, error: undefined })

  try {
    const rules = loadRules()
    const tokens = loadTokens()
    if (!tokens) throw new Error('Gmail not connected')

    const ownEmail = tokens.email
    const config = getApiConfig()

    const candidateMap = new Map<string, EmailCandidate>()

    // Check for checkpoint (resume interrupted scan)
    let checkpoint = loadCheckpoint()
    let pageToken = checkpoint?.pageToken ?? undefined
    let processedCount = checkpoint?.processedCount ?? 0

    await withTokenRefresh(async (client) => {
      let hasMore = true

      // Only scan emails from May 2025 onward (excludes archived/imported legacy mail)
      const SCAN_AFTER_DATE = 'after:2025/05/01'

      while (hasMore) {
        const page = await client.listMessages(pageToken, MESSAGES_PER_PAGE, SCAN_AFTER_DATE)
        const messageStubs = page.messages
        const total = page.resultSizeEstimate || processedCount + messageStubs.length

        updateProgress({ total })

        // Fetch headers for each message
        for (const stub of messageStubs) {
          try {
            const headers = await client.getMessageHeaders(stub.id)

            // Skip marketing messages entirely
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

            processedCount++
            if (processedCount % 50 === 0) {
              updateProgress({ processed: processedCount, candidatesFound: candidateMap.size })
            }
          } catch (err) {
            if (err instanceof TokenExpiredError) throw err
            if (isDev) console.log(`[Scanner] Skipping message ${stub.id}:`, String(err))
          }
        }

        // Save checkpoint after each page
        pageToken = page.nextPageToken
        if (pageToken) {
          saveCheckpoint({ historyId: null, pageToken, processedCount })
        }

        hasMore = !!pageToken
      }

      // Get current historyId for future incremental scans
      const profile = await client.getProfile()

      // --- Pipeline: rules → dedup → classify → signatures → write ---
      const { survivors, knownContacts } = processCandidates(candidateMap, rules, ownEmail)

      updateProgress({ candidatesFound: survivors.length })

      // Claude classification + signature extraction (replaces enrichWithSignatures)
      if (survivors.length > 0) {
        const tokens = loadTokens()
        await classifyCandidates(client, survivors, ownEmail, tokens?.email?.split('@')[0] ?? null)
      }

      // Batch write to SQLite + Airtable
      if (survivors.length > 0 && config) {
        await writeCandidateBatch(survivors, config.apiKey, config.baseId)
      }

      // Enrichment phase — process known contacts after Claude classification
      if (knownContacts.length > 0) {
        const tkns = loadTokens()
        await enrichKnownContacts(client, knownContacts, ownEmail, tkns?.email?.split('@')[0] ?? null, tkns?.email ?? 'unknown')
      }

      // Save scan state
      saveScanState(profile.historyId, processedCount)
      clearCheckpoint()

      updateProgress({ status: 'complete', processed: processedCount, candidatesFound: survivors.length })
      if (isDev) console.log(`[Scanner] Full scan complete: ${processedCount} messages → ${survivors.length} candidates`)
    })
  } catch (err) {
    console.error('[Scanner] Full scan failed:', String(err))
    updateProgress({ status: 'error', error: String(err) })
  } finally {
    isScanning = false
  }
}

// ─── Incremental Scan ──────────────────────────────────────────

export async function scanIncremental(): Promise<void> {
  if (isScanning) {
    if (isDev) console.log('[Scanner] Scan already in progress, skipping')
    return
  }

  const state = loadScanState()

  // No previous scan → fall back to full
  if (!state.historyId) {
    if (isDev) console.log('[Scanner] No historyId found, falling back to full scan')
    return scanFull()
  }

  isScanning = true
  updateProgress({ status: 'scanning', processed: 0, total: 0, candidatesFound: 0, error: undefined })

  try {
    const rules = loadRules()
    const tokens = loadTokens()
    if (!tokens) throw new Error('Gmail not connected')

    const ownEmail = tokens.email
    const config = getApiConfig()
    const candidateMap = new Map<string, EmailCandidate>()

    await withTokenRefresh(async (client) => {
      let historyResult: { messageIds: string[]; latestHistoryId: string }

      try {
        historyResult = await client.listHistory(state.historyId!)
      } catch (err) {
        if (err instanceof HistoryExpiredError) {
          if (isDev) console.log('[Scanner] History expired, falling back to full scan')
          isScanning = false
          return scanFull()
        }
        throw err
      }

      const { messageIds, latestHistoryId } = historyResult

      if (messageIds.length === 0) {
        saveScanState(latestHistoryId, 0)
        updateProgress({ status: 'complete', processed: 0, candidatesFound: 0 })
        if (isDev) console.log('[Scanner] Incremental scan: no new messages')
        return
      }

      updateProgress({ total: messageIds.length })

      // Fetch headers for new messages
      let processedCount = 0
      for (const msgId of messageIds) {
        try {
          const headers = await client.getMessageHeaders(msgId)

          // Skip marketing messages entirely
          if (isMarketingMessage(headers)) {
            processedCount++
            if (processedCount % 20 === 0) {
              updateProgress({ processed: processedCount, candidatesFound: candidateMap.size })
            }
            continue
          }

          if (headers.from.email) {
            aggregateCandidate(candidateMap, headers.from.email, headers.from.name, headers.date, 'From', '')
          }

          for (const to of headers.to) {
            if (to.email) {
              aggregateCandidate(candidateMap, to.email, to.name, headers.date, 'To', '')
            }
          }

          for (const cc of headers.cc) {
            if (cc.email) {
              aggregateCandidate(candidateMap, cc.email, cc.name, headers.date, 'CC', '')
            }
          }

          processedCount++
          if (processedCount % 20 === 0) {
            updateProgress({ processed: processedCount, candidatesFound: candidateMap.size })
          }
        } catch (err) {
          if (err instanceof TokenExpiredError) throw err
          if (isDev) console.log(`[Scanner] Skipping message ${msgId}:`, String(err))
        }
      }

      // Pipeline
      const { survivors, knownContacts } = processCandidates(candidateMap, rules, ownEmail)

      updateProgress({ candidatesFound: survivors.length })

      // Claude classification + signature extraction (replaces enrichWithSignatures)
      if (survivors.length > 0) {
        const tokens = loadTokens()
        await classifyCandidates(client, survivors, ownEmail, tokens?.email?.split('@')[0] ?? null)
      }

      // Batch write
      if (survivors.length > 0 && config) {
        await writeCandidateBatch(survivors, config.apiKey, config.baseId)
      }

      // Enrichment phase — process known contacts after Claude classification
      if (knownContacts.length > 0) {
        const tkns = loadTokens()
        await enrichKnownContacts(client, knownContacts, ownEmail, tkns?.email?.split('@')[0] ?? null, tkns?.email ?? 'unknown')
      }

      saveScanState(latestHistoryId, processedCount)
      updateProgress({ status: 'complete', processed: processedCount, candidatesFound: survivors.length })
      if (isDev) console.log(`[Scanner] Incremental scan complete: ${processedCount} messages → ${survivors.length} candidates`)
    })
  } catch (err) {
    console.error('[Scanner] Incremental scan failed:', String(err))
    updateProgress({ status: 'error', error: String(err) })
  } finally {
    isScanning = false
  }
}

// ─── Manual Scan (same as incremental, resets poll timer) ──────

export async function scanNow(): Promise<void> {
  // Reset poll timer if active
  if (pollInterval) {
    const currentIntervalMs = parseInt(getSetting('email_scan_interval_ms') || '0', 10)
    if (currentIntervalMs > 0) {
      stopPolling()
      await scanIncremental()
      startPolling(getMainWindow!, currentIntervalMs)
      return
    }
  }

  return scanIncremental()
}

// ─── Candidate Processing Pipeline ─────────────────────────────

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

    // Step 2: CRM dedup — collect known contacts for post-classification enrichment
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

// ─── Signature Enrichment ──────────────────────────────────────

async function enrichWithSignatures(
  client: GmailClient,
  candidates: EnrichedCandidate[],
): Promise<void> {
  // Only fetch signatures for top N candidates (by confidence)
  const toFetch = candidates.slice(0, SIGNATURE_FETCH_LIMIT)

  for (const candidate of toFetch) {
    try {
      // Search for a message from this person to extract signature
      const searchResult = await client.searchMessages(`from:${candidate.email}`, 1)
      if (searchResult.messages.length === 0) continue

      const fullMsg = await client.getMessageFull(searchResult.messages[0].id)
      const sig = extractSignature(fullMsg.bodyPlainText)

      // Enrich the candidate with signature data (used during writeCandidateBatch)
      if (sig.title) candidate._extractedTitle = sig.title
      if (sig.phone) candidate._extractedPhone = sig.phone
      if (sig.company) candidate._extractedCompany = sig.company

      // Also try to improve name from display name if we don't have one
      if (!candidate.displayName && fullMsg.from.name) {
        candidate.displayName = fullMsg.from.name
        const { first, last } = parseDisplayName(fullMsg.from.name)
        candidate.firstName = first
        candidate.lastName = last
      }
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err
      if (isDev) console.log(`[Scanner] Signature extraction failed for ${candidate.email}:`, String(err))
    }
  }
}

// ─── Claude Classification ────────────────────────────────────

async function classifyCandidates(
  client: GmailClient,
  candidates: EnrichedCandidate[],
  ownEmail: string,
  ownDisplayName: string | null,
): Promise<void> {
  const apiKey = getSecureSetting('anthropic_api_key')
  const hasApiKey = !!apiKey

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

    let classification: import('./claude-client').ClaudeClassification | null = null

    if (hasApiKey && i < bodyFetchCount) {
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
      } catch (err) {
        if (err instanceof TokenExpiredError) throw err
        if (isDev) console.log(`[Scanner] Body fetch failed for ${candidate.email}:`, String(err))
      }
    } else if (hasApiKey && apiKey) {
      // Beyond top-N: metadata-only Claude classification
      const prompt = buildMetadataOnlyPrompt(meta)
      classification = await classifyWithClaude(prompt, apiKey)
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

// ─── Polling ───────────────────────────────────────────────────

export function startPolling(
  getWindow: () => BrowserWindow | null,
  intervalMs?: number,
): void {
  getMainWindow = getWindow

  const effectiveMs = intervalMs ?? parseInt(getSetting('email_scan_interval_ms') || '0', 10)
  if (effectiveMs <= 0) {
    if (isDev) console.log('[Scanner] Polling disabled (interval = 0)')
    return
  }

  // Clear existing
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }

  if (isDev) console.log(`[Scanner] Starting poll every ${effectiveMs / 1000}s`)

  pollInterval = setInterval(() => {
    scanIncremental().catch(err => {
      console.error('[Scanner] Poll scan error:', String(err))
    })
  }, effectiveMs)
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    if (isDev) console.log('[Scanner] Polling stopped')
  }
}

export function setPollingInterval(intervalMs: number): void {
  const validIntervals = [0, 60000, 300000, 900000]
  if (!validIntervals.includes(intervalMs)) {
    console.warn(`[Scanner] Invalid interval ${intervalMs}, must be one of: ${validIntervals.join(', ')}`)
    return
  }

  setSetting('email_scan_interval_ms', String(intervalMs))

  if (intervalMs === 0) {
    stopPolling()
    return
  }

  if (getMainWindow) {
    stopPolling()
    startPolling(getMainWindow, intervalMs)
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function getApiConfig(): { apiKey: string; baseId: string } | null {
  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')
  if (!apiKey || !baseId) return null
  return { apiKey, baseId }
}
