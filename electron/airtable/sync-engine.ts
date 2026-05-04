// Sync engine: polls Airtable, pushes local changes, manages PrimaryFieldCache
// "Airtable wins" conflict resolution — remote overwrites local on pull

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { BrowserWindow } from 'electron'
import { fetchAllRecords, fetchRecord, batchCreate, batchUpdate, batchDelete, resetRateLimitState, shouldAbortSync, getStaggerMs } from './client'
import { TABLES, PRIMARY_FIELDS } from './field-maps'
import { TABLE_CONVERTERS } from './converters'
import { getDatabase, saveDatabase } from '../database/init'
import {
  upsert, getAll, deleteRecord, getById,
  getSetting, setSetting, updateSyncStatus, getPendingRecords, markPushed,
} from '../database/queries/entities'

const isDev = !!process.env.VITE_DEV_SERVER_URL
const SYNC_LOCK_PATH = '/tmp/ils-crm-sync.lock'

// ─── Types ───────────────────────────────────────────────────

export interface SyncProgress {
  phase: 'pulling' | 'pushing' | 'complete' | 'error'
  table?: string
  tablesCompleted: number
  tablesTotal: number
  recordsPulled: number
  error?: string
  nextPollMs?: number
}

// ─── Helpers ─────────────────────────────────────────────────

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
    if (isDev) console.log('[Sync] Acquired lock file')
    return true
  } catch {
    return true // If we can't check, proceed anyway
  }
}

function releaseSyncLock(): void {
  try { unlinkSync(SYNC_LOCK_PATH) } catch { /* ignore */ }
}

function getApiConfig(): { apiKey: string; baseId: string } | null {
  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')
  if (!apiKey || !baseId) return null
  return { apiKey, baseId }
}

// ─── PrimaryFieldCache ──────────────────────────────────────
// Maps record IDs → display names for all tables (for linked record resolution)

const primaryFieldCache: Record<string, Map<string, string>> = {}
let isSyncing = false

function getDisplayName(tableId: string, recordId: string): string {
  return primaryFieldCache[tableId]?.get(recordId) ?? recordId
}

function updatePrimaryFieldCache(tableName: string, records: Record<string, unknown>[]): void {
  const tableId = TABLES[tableName as keyof typeof TABLES]
  if (!tableId) return

  const primaryFieldId = PRIMARY_FIELDS[tableId]
  if (!primaryFieldId) return

  if (!primaryFieldCache[tableId]) {
    primaryFieldCache[tableId] = new Map()
  }

  // Build cache from local records using the primary field column name
  const converter = TABLE_CONVERTERS[tableName]
  if (!converter) return

  const primaryMapping = converter.mappings.find(m => m.airtable === primaryFieldId)
  if (!primaryMapping) return

  for (const record of records) {
    const id = record.id as string
    const name = record[primaryMapping.local] as string
    if (id && name) {
      primaryFieldCache[tableId].set(id, name)
    }
  }
}

// ─── Sync Configuration ─────────────────────────────────────

// Table name → Airtable table ID mapping
const TABLE_NAME_TO_ID: Record<string, string> = {
  contacts: TABLES.contacts,
  companies: TABLES.companies,
  opportunities: TABLES.opportunities,
  tasks: TABLES.tasks,
  proposals: TABLES.proposals,
  projects: TABLES.projects,
  interactions: TABLES.interactions,
  imported_contacts: TABLES.importedContacts,
  specialties: TABLES.specialties,
  portal_access: TABLES.portalAccess,
  portal_logs: TABLES.portalLogs,
  client_pages: TABLES.clientPages,
  email_scan_rules: TABLES.emailScanRules,
  email_scan_state: TABLES.emailScanState,
  enrichment_queue: TABLES.enrichmentQueue,
}

// Tables that are read-only (no push)
// Note: interactions is NOT read-only — the app supports full CRUD
// Note: enrichment_queue is NOT read-only — the app supports full CRUD for review/approve workflow
const READ_ONLY_TABLES = new Set(['specialties', 'portal_logs', 'email_scan_rules', 'email_scan_state'])

// Sync order: pull frequently-changing tables first
const SYNC_ORDER = [
  'contacts', 'companies', 'opportunities', 'tasks', 'proposals',
  'projects', 'interactions', 'imported_contacts', 'specialties',
  'portal_access', 'portal_logs', 'client_pages',
  'email_scan_rules', 'email_scan_state', 'enrichment_queue',
]

// ─── Denormalize company names onto contacts ───────────────

function denormalizeCompanyNames(): void {
  const db = getDatabase()

  // Build companyNameById map from companies table
  const companyRows = db.exec('SELECT id, company_name FROM companies')
  const companyNameById = new Map<string, string>()
  if (companyRows.length > 0) {
    for (const row of companyRows[0].values) {
      const id = row[0] as string
      const name = row[1] as string
      if (id && name) companyNameById.set(id, name)
    }
  }

  if (isDev) console.log(`[Sync] denormalizeCompanyNames: ${companyNameById.size} companies in lookup`)

  // Read all contacts that have companies_ids
  const contactRows = db.exec('SELECT id, companies_ids FROM contacts')
  if (contactRows.length === 0) return

  let updated = 0
  const stmt = db.prepare('UPDATE contacts SET company = ? WHERE id = ?')

  try {
    for (const row of contactRows[0].values) {
      const contactId = row[0] as string
      const companiesIdsRaw = row[1] as string | null

      let companyName: string | null = null

      if (companiesIdsRaw) {
        try {
          const ids = JSON.parse(companiesIdsRaw) as string[]
          if (Array.isArray(ids) && ids.length > 0) {
            companyName = companyNameById.get(ids[0]) ?? null
          }
        } catch {
          // Invalid JSON — leave as null
        }
      }

      stmt.run([companyName, contactId])
      updated++
    }
  } finally {
    stmt.free()
  }

  if (isDev) console.log(`[Sync] denormalizeCompanyNames: updated ${updated} contacts`)
}

// ─── Pull (Airtable → Local) ────────────────────────────────

async function pullTable(
  tableName: string,
  apiKey: string,
  baseId: string
): Promise<number> {
  const tableId = TABLE_NAME_TO_ID[tableName]
  if (!tableId) throw new Error(`Unknown table: ${tableName}`)

  const converter = TABLE_CONVERTERS[tableName]
  if (!converter) throw new Error(`No converter for: ${tableName}`)

  updateSyncStatus(tableName, 'syncing')

  const records = await fetchAllRecords(tableId, { apiKey, baseId })
  const db = getDatabase()

  // Track which IDs we see from Airtable
  const seenIds = new Set<string>()

  for (const record of records) {
    const local = converter.fromAirtable(record)
    local._airtable_modified_at = new Date().toISOString()
    seenIds.add(record.id)

    // Only overwrite if not pending push (Airtable wins, but don't lose local edits mid-push)
    const existing = getById(tableName, record.id)
    if (existing && (existing._pending_push as number) === 1) {
      continue // Skip — local edit waiting to be pushed
    }

    upsert(tableName, record.id, local)
  }

  // Remove records that no longer exist in Airtable
  const localRecords = getAll(tableName)
  for (const local of localRecords) {
    if (!seenIds.has(local.id as string) && (local._pending_push as number) !== 1) {
      deleteRecord(tableName, local.id as string)
    }
  }

  updateSyncStatus(tableName, 'idle', records.length)

  // Update primary field cache
  const allLocal = getAll(tableName)
  updatePrimaryFieldCache(tableName, allLocal)

  return records.length
}

// ─── Push (Local → Airtable) ─────────────────────────────────

async function pushTable(
  tableName: string,
  apiKey: string,
  baseId: string
): Promise<number> {
  if (READ_ONLY_TABLES.has(tableName)) return 0

  const tableId = TABLE_NAME_TO_ID[tableName]
  if (!tableId) return 0

  const converter = TABLE_CONVERTERS[tableName]
  if (!converter) return 0

  const pending = getPendingRecords(tableName)
  if (pending.length === 0) return 0

  const toUpdate: Array<{ id: string; fields: Record<string, unknown> }> = []

  for (const record of pending) {
    const fields = converter.toAirtable(record)
    toUpdate.push({ id: record.id as string, fields })
  }

  // Push in batches of 10, marking each batch as pushed immediately after success.
  // If a batch fails, already-marked batches stay correct and remaining stay _pending_push=1.
  const BATCH_SIZE = 10
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE)
    await batchUpdate(tableId, batch, { apiKey, baseId })
    for (const rec of batch) {
      markPushed(tableName, rec.id)
    }
  }

  return toUpdate.length
}

// ─── Full Sync ───────────────────────────────────────────────

export async function fullSync(
  win: BrowserWindow | null,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ success: boolean; error?: string }> {
  if (isSyncing) {
    return { success: false, error: 'Sync already in progress' }
  }
  isSyncing = true
  resetRateLimitState()

  if (!acquireSyncLock()) {
    isSyncing = false
    return { success: false, error: 'Another app is currently syncing. Try again in a moment.' }
  }

  const config = getApiConfig()
  if (!config) {
    releaseSyncLock()
    isSyncing = false
    return { success: false, error: 'No API key or base ID configured' }
  }

  const progress: SyncProgress = {
    phase: 'pulling',
    tablesCompleted: 0,
    tablesTotal: SYNC_ORDER.length,
    recordsPulled: 0,
  }

  const sendProgress = (p: SyncProgress) => {
    onProgress?.(p)
    win?.webContents?.send('sync:progress', p)
  }

  try {
    // Phase 1: Push local changes first (with stagger)
    progress.phase = 'pushing'
    sendProgress(progress)

    for (const tableName of SYNC_ORDER) {
      if (shouldAbortSync()) {
        console.error('[Sync] Aborting push — too many consecutive errors')
        break
      }

      try {
        await pushTable(tableName, config.apiKey, config.baseId)
      } catch (error) {
        console.error(`[Sync] Push error for ${tableName}:`, error)
        updateSyncStatus(tableName, 'push_error', undefined, String(error))
      }

      // Stagger between tables
      await new Promise(resolve => setTimeout(resolve, getStaggerMs(300)))
    }

    // Phase 2: Pull all tables from Airtable (with adaptive stagger)
    progress.phase = 'pulling'
    sendProgress(progress)

    for (const tableName of SYNC_ORDER) {
      if (shouldAbortSync()) {
        console.error('[Sync] Aborting pull — too many consecutive errors')
        break
      }

      progress.table = tableName
      sendProgress(progress)

      try {
        const count = await pullTable(tableName, config.apiKey, config.baseId)
        progress.recordsPulled += count
        progress.tablesCompleted++
        sendProgress(progress)
      } catch (error) {
        console.error(`[Sync] Pull error for ${tableName}:`, error)
        updateSyncStatus(tableName, 'error', undefined, String(error))
      }

      // Adaptive stagger between tables
      await new Promise(resolve => setTimeout(resolve, getStaggerMs(300)))
    }

    // Post-pull: denormalize company names onto contacts
    try {
      denormalizeCompanyNames()
    } catch (dnError) {
      console.error('[Sync] denormalizeCompanyNames failed:', dnError)
    }

    progress.phase = 'complete'
    sendProgress(progress)

    setSetting('last_full_sync', new Date().toISOString())
    saveDatabase()

    return { success: true }
  } catch (error) {
    progress.phase = 'error'
    progress.error = String(error)
    sendProgress(progress)
    return { success: false, error: String(error) }
  } finally {
    releaseSyncLock()
    isSyncing = false
  }
}

// ─── Refresh single record (pull latest from Airtable) ──────

export async function refreshRecord(
  tableName: string,
  id: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const config = getApiConfig()
  if (!config) {
    // Offline — fall back to local cache
    const local = getById(tableName, id)
    return local ? { success: true, data: local } : { success: false, error: 'Not found' }
  }

  const tableId = TABLE_NAME_TO_ID[tableName]
  const converter = TABLE_CONVERTERS[tableName]
  if (!tableId || !converter) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    const record = await fetchRecord(tableId, id, { apiKey: config.apiKey, baseId: config.baseId })
    const local = converter.fromAirtable(record)
    local._airtable_modified_at = new Date().toISOString()
    // Don't overwrite a pending local edit — let the push cycle win
    const existing = getById(tableName, id)
    if (!existing || (existing._pending_push as number) !== 1) {
      upsert(tableName, id, local)
    }
    const fresh = getById(tableName, id)
    return { success: true, data: fresh ?? local }
  } catch (error) {
    console.error(`[Sync] refreshRecord failed ${tableName}/${id}:`, String(error))
    // Fall back to local cache on error
    const local = getById(tableName, id)
    return local ? { success: true, data: local } : { success: false, error: String(error) }
  }
}

// ─── Single record operations ────────────────────────────────

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; data?: string; error?: string }> {
  const config = getApiConfig()
  if (!config) return { success: false, error: 'No API key or base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  const converter = TABLE_CONVERTERS[tableName]
  if (!tableId || !converter) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    const airtableFields = converter.toAirtable(fields)
    const created = await batchCreate(tableId, [{ fields: airtableFields }], { apiKey: config.apiKey, baseId: config.baseId })

    if (created.length > 0) {
      const local = converter.fromAirtable(created[0])
      local._airtable_modified_at = new Date().toISOString()
      upsert(tableName, created[0].id, local)
      return { success: true, data: created[0].id }
    }

    return { success: false, error: 'No record created' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function updateRecord(
  tableName: string,
  id: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const config = getApiConfig()
  if (!config) return { success: false, error: 'No API key or base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  const converter = TABLE_CONVERTERS[tableName]
  if (!tableId || !converter) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    // Optimistic local update — instant UI refresh
    upsert(tableName, id, {
      ...fields,
      _local_modified_at: new Date().toISOString(),
      _pending_push: 1,
    })

    // Push to Airtable in the background
    const airtableFields = converter.toAirtable(fields)
    if (isDev) console.log(`[Sync] updateRecord ${tableName}/${id} → sending fields:`, JSON.stringify(airtableFields, null, 2))
    batchUpdate(tableId, [{ id, fields: airtableFields }], { apiKey: config.apiKey, baseId: config.baseId })
      .then(() => {
        try {
          upsert(tableName, id, {
            _airtable_modified_at: new Date().toISOString(),
            _pending_push: 0,
          })
        } catch (upsertErr) {
          console.error(`[Sync] updateRecord markPushed FAILED ${tableName}/${id}:`, String(upsertErr))
          // Retry the mark once — Airtable write already succeeded
          try {
            upsert(tableName, id, { _pending_push: 0 })
          } catch {
            // Give up — record will be re-pushed on next sync, but won't overwrite Airtable
            // because the Airtable data is already current
          }
        }
      })
      .catch((err) => {
        console.error(`[Sync] updateRecord push FAILED ${tableName}/${id}:`, String(err))
        // Record stays _pending_push=1, next full sync will retry
      })

    return { success: true }
  } catch (error) {
    console.error(`[Sync] updateRecord FAILED ${tableName}/${id}:`, String(error))
    return { success: false, error: String(error) }
  }
}

export async function deleteRemoteRecord(
  tableName: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const config = getApiConfig()
  if (!config) return { success: false, error: 'No API key or base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  if (!tableId) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    if (id.startsWith('local_')) {
      // Local-only record — no remote counterpart to delete
      deleteRecord(tableName, id)
    } else {
      await batchDelete(tableId, [id], { apiKey: config.apiKey, baseId: config.baseId })
      deleteRecord(tableName, id)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ─── Polling (setTimeout chaining — waits for sync to finish) ─

let pollTimeout: ReturnType<typeof setTimeout> | null = null
let getMainWindow: (() => BrowserWindow | null) | null = null
const DEFAULT_POLL_MS = 120000   // 2 minutes (conservative for multi-user)
const MAX_POLL_MS = 600000       // 10 minute ceiling
let currentPollMs = DEFAULT_POLL_MS

export function startPolling(getWindow: () => BrowserWindow | null): void {
  // Always update the getter — handles the case where the main window was recreated
  getMainWindow = getWindow

  if (pollTimeout) return

  const configuredMs = parseInt(getSetting('sync_interval_ms') || String(DEFAULT_POLL_MS), 10)
  currentPollMs = Math.max(configuredMs, DEFAULT_POLL_MS)
  if (isDev) console.log(`[Sync] Starting polling every ${currentPollMs / 1000}s`)

  scheduleNextSync()
}

function scheduleNextSync(): void {
  if (pollTimeout) clearTimeout(pollTimeout)

  pollTimeout = setTimeout(async () => {
    const win = getMainWindow?.() ?? null
    try {
      const result = await fullSync(win)

      if (result.success) {
        // Success — reset to base interval
        const configuredMs = parseInt(getSetting('sync_interval_ms') || String(DEFAULT_POLL_MS), 10)
        currentPollMs = Math.max(configuredMs, DEFAULT_POLL_MS)
      } else {
        // Failure — back off 1.5x
        currentPollMs = Math.min(currentPollMs * 1.5, MAX_POLL_MS)
        if (isDev) console.log(`[Sync] Sync failed, next poll in ${Math.round(currentPollMs / 1000)}s`)
      }
    } catch (error) {
      console.error('[Sync] Poll error:', error)
      // Exception — back off 2x
      currentPollMs = Math.min(currentPollMs * 2, MAX_POLL_MS)
      const errWin = getMainWindow?.()
      if (errWin && !errWin.isDestroyed()) {
        errWin.webContents.send('sync:progress', {
          phase: 'error',
          tablesCompleted: 0,
          tablesTotal: SYNC_ORDER.length,
          recordsPulled: 0,
          error: String(error),
        })
      }
    }

    // Schedule next — only after current finishes + rest period
    if (pollTimeout !== null) {
      scheduleNextSync()
    }
  }, currentPollMs)
}

export function stopPolling(): void {
  if (pollTimeout) {
    clearTimeout(pollTimeout)
    pollTimeout = null
    getMainWindow = null
    if (isDev) console.log('[Sync] Polling stopped')
  }
}
