// electron/gmail/scanner.ts
// Email Intelligence scan orchestrator — ties OAuth, Gmail API, rules, classifier,
// and CRM dedup together into full/incremental/manual scan pipelines.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { BrowserWindow } from 'electron'
import { loadTokens, refreshAccessToken } from './oauth'
import { GmailClient, TokenExpiredError, HistoryExpiredError } from './client'
import { DEFAULT_RULES, evaluateRules, parseAirtableRule } from './rules-engine'
import { classifyCandidate } from './classifier'
import { normalizeEmail, parseDisplayName, extractSignature } from './email-utils'
import type {
  EmailCandidate,
  DiscoveryMethod,
  Rule,
  ScanProgress,
  ScanCheckpoint,
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

// Extended candidate with optional signature data (set during enrichment)
interface EnrichedCandidate extends EmailCandidate {
  _extractedTitle?: string
  _extractedPhone?: string
  _extractedCompany?: string
  _confidence?: number
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
    if (ruleRecords.length === 0) return DEFAULT_RULES

    const parsed: Rule[] = []
    for (const record of ruleRecords) {
      const rule = parseAirtableRule(record)
      if (rule) parsed.push(rule)
    }

    return parsed.length > 0 ? parsed : DEFAULT_RULES
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

// Fields eligible for enrichment queue updates
const ENRICHABLE_FIELDS: Array<{ candidateKey: keyof EmailCandidate; dbColumn: string }> = [
  { candidateKey: 'firstName', dbColumn: 'first_name' },
  { candidateKey: 'lastName', dbColumn: 'last_name' },
]

function writeToEnrichmentQueue(
  contactId: string,
  candidate: EmailCandidate,
): void {
  // Read the existing contact from SQLite for field comparison
  let existingContact: Record<string, unknown> | null = null
  try {
    existingContact = getById('contacts', contactId) as Record<string, unknown> | null
  } catch { /* ignore — will skip enrichment if we can't read */ }

  if (!existingContact) return

  // Check standard fields
  for (const { candidateKey, dbColumn } of ENRICHABLE_FIELDS) {
    const candidateValue = candidate[candidateKey]
    if (candidateValue == null || candidateValue === '') continue

    const existingValue = existingContact[dbColumn] as string | null
    if (existingValue && existingValue === String(candidateValue)) continue // Same value — skip

    const id = `local_enrich_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    upsert('enrichment_queue', id, {
      field_name: dbColumn,
      current_value: existingValue || '',
      suggested_value: String(candidateValue),
      source_email_date: candidate.lastSeenDate.toISOString().split('T')[0],
      status: 'Pending',
      confidence_score: 0,
      contact_ids: JSON.stringify([contactId]),
      _pending_push: 1,
    })
  }

  // Check enriched fields (phone, job_title) from signature extraction if present
  const enrichedCandidate = candidate as EnrichedCandidate
  const extraFields: Array<{ value: string | undefined; dbColumn: string }> = [
    { value: enrichedCandidate._extractedPhone, dbColumn: 'phone' },
    { value: enrichedCandidate._extractedTitle, dbColumn: 'job_title' },
  ]

  for (const { value, dbColumn } of extraFields) {
    if (!value) continue

    const existingValue = existingContact[dbColumn] as string | null
    if (existingValue && existingValue === value) continue

    const id = `local_enrich_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    upsert('enrichment_queue', id, {
      field_name: dbColumn,
      current_value: existingValue || '',
      suggested_value: value,
      source_email_date: candidate.lastSeenDate.toISOString().split('T')[0],
      status: 'Pending',
      confidence_score: 0,
      contact_ids: JSON.stringify([contactId]),
      _pending_push: 1,
    })
  }
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
    const { relationshipType, confidence } = classifyCandidate(candidate)
    const id = `local_scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const fields: Record<string, unknown> = {
      imported_contact_name: candidate.displayName || candidate.email,
      first_name: candidate.firstName || '',
      last_name: candidate.lastName || '',
      email: candidate.email,
      onboarding_status: 'Ready',
      import_source: 'Email Scan',
      source: 'Email Scan',
      import_date: new Date().toISOString().split('T')[0],
      relationship_type: relationshipType,
      confidence_score: confidence,
      email_thread_count: candidate.threadCount,
      first_seen_date: candidate.firstSeenDate.toISOString().split('T')[0],
      last_seen_date: candidate.lastSeenDate.toISOString().split('T')[0],
      discovered_via: candidate.discoveredVia,
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

      while (hasMore) {
        const page = await client.listMessages(pageToken, MESSAGES_PER_PAGE)
        const messageStubs = page.messages
        const total = page.resultSizeEstimate || processedCount + messageStubs.length

        updateProgress({ total })

        // Fetch headers for each message
        for (const stub of messageStubs) {
          try {
            const headers = await client.getMessageHeaders(stub.id)

            // Check for List-Unsubscribe header (rule: reject bulk mail)
            const hasUnsubscribe = !!headers.rawHeaders['List-Unsubscribe']

            // Aggregate From
            if (headers.from.email && !hasUnsubscribe) {
              aggregateCandidate(candidateMap, headers.from.email, headers.from.name, headers.date, 'From', stub.threadId)
            }

            // Aggregate To
            for (const to of headers.to) {
              if (to.email && !hasUnsubscribe) {
                aggregateCandidate(candidateMap, to.email, to.name, headers.date, 'To', stub.threadId)
              }
            }

            // Aggregate CC
            for (const cc of headers.cc) {
              if (cc.email && !hasUnsubscribe) {
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
      const survivors = processCandidates(candidateMap, rules, ownEmail)

      updateProgress({ candidatesFound: survivors.length })

      // Signature extraction for top candidates
      if (survivors.length > 0) {
        await enrichWithSignatures(client, survivors)
      }

      // Batch write to SQLite + Airtable
      if (survivors.length > 0 && config) {
        await writeCandidateBatch(survivors, config.apiKey, config.baseId)
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
          const hasUnsubscribe = !!headers.rawHeaders['List-Unsubscribe']

          if (headers.from.email && !hasUnsubscribe) {
            aggregateCandidate(candidateMap, headers.from.email, headers.from.name, headers.date, 'From', '')
          }

          for (const to of headers.to) {
            if (to.email && !hasUnsubscribe) {
              aggregateCandidate(candidateMap, to.email, to.name, headers.date, 'To', '')
            }
          }

          for (const cc of headers.cc) {
            if (cc.email && !hasUnsubscribe) {
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
      const survivors = processCandidates(candidateMap, rules, ownEmail)

      updateProgress({ candidatesFound: survivors.length })

      // Signature extraction
      if (survivors.length > 0) {
        await enrichWithSignatures(client, survivors)
      }

      // Batch write
      if (survivors.length > 0 && config) {
        await writeCandidateBatch(survivors, config.apiKey, config.baseId)
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
): EnrichedCandidate[] {
  const survivors: EnrichedCandidate[] = []

  for (const candidate of candidateMap.values()) {
    // Step 1: Rule evaluation
    const ruleResult = evaluateRules(candidate, rules, ownEmail)
    if (ruleResult === 'reject') continue

    // Step 2: CRM dedup — known contacts go to enrichment queue
    const existingContactId = checkCrmDedup(candidate.normalizedEmail)
    if (existingContactId) {
      writeToEnrichmentQueue(existingContactId, candidate)
      continue
    }

    // Step 3: Check if already in imported_contacts
    const db = getDatabase()
    const existingImport = db.exec(
      `SELECT id FROM imported_contacts WHERE LOWER(email) = ? LIMIT 1`,
      [candidate.normalizedEmail],
    )
    if (existingImport.length > 0 && existingImport[0].values.length > 0) {
      continue // Already imported
    }

    // Step 4: Classify and cache confidence
    const { confidence } = classifyCandidate(candidate)
    const enriched: EnrichedCandidate = candidate
    enriched._confidence = confidence

    survivors.push(enriched)
  }

  // Sort by cached confidence descending
  survivors.sort((a, b) => (b._confidence ?? 0) - (a._confidence ?? 0))

  return survivors
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
