// Sync engine: polls Airtable, pushes local changes, manages PrimaryFieldCache
// "Airtable wins" conflict resolution — remote overwrites local on pull

import { BrowserWindow } from 'electron'
import { fetchAllRecords, batchCreate, batchUpdate, batchDelete } from './client'
import { TABLES, PRIMARY_FIELDS } from './field-maps'
import { TABLE_CONVERTERS } from './converters'
import { getDatabase, saveDatabase } from '../database/init'
import {
  upsert, getAll, deleteRecord, getById,
  getSetting, setSetting, updateSyncStatus, getPendingRecords, markPushed,
} from '../database/queries/entities'

// ─── Types ───────────────────────────────────────────────────

export interface SyncProgress {
  phase: 'pulling' | 'pushing' | 'complete' | 'error'
  table?: string
  tablesCompleted: number
  tablesTotal: number
  recordsPulled: number
  error?: string
}

// ─── PrimaryFieldCache ──────────────────────────────────────
// Maps record IDs → display names for all tables (for linked record resolution)

const primaryFieldCache: Record<string, Map<string, string>> = {}
let isSyncing = false

export function getDisplayName(tableId: string, recordId: string): string {
  return primaryFieldCache[tableId]?.get(recordId) ?? recordId
}

export function getDisplayNames(tableId: string, recordIds: string[]): string[] {
  return recordIds.map(id => getDisplayName(tableId, id))
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
}

// Tables that are read-only (no push)
const READ_ONLY_TABLES = new Set(['interactions', 'specialties', 'portal_logs'])

// Sync order: pull frequently-changing tables first
const SYNC_ORDER = [
  'contacts', 'companies', 'opportunities', 'tasks', 'proposals',
  'projects', 'interactions', 'imported_contacts', 'specialties',
  'portal_access', 'portal_logs',
]

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

  if (toUpdate.length > 0) {
    await batchUpdate(tableId, toUpdate, { apiKey, baseId })
    for (const record of pending) {
      markPushed(tableName, record.id as string)
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

  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')

  if (!apiKey) {
    isSyncing = false
    return { success: false, error: 'No API key configured' }
  }
  if (!baseId) {
    isSyncing = false
    return { success: false, error: 'No base ID configured' }
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
    // Phase 1: Push local changes first
    progress.phase = 'pushing'
    sendProgress(progress)

    for (const tableName of SYNC_ORDER) {
      try {
        await pushTable(tableName, apiKey, baseId)
      } catch (error) {
        console.error(`[Sync] Push error for ${tableName}:`, error)
      }
    }

    // Phase 2: Pull all tables from Airtable
    progress.phase = 'pulling'
    sendProgress(progress)

    for (const tableName of SYNC_ORDER) {
      progress.table = tableName
      sendProgress(progress)

      try {
        const count = await pullTable(tableName, apiKey, baseId)
        progress.recordsPulled += count
        progress.tablesCompleted++
        sendProgress(progress)
      } catch (error) {
        console.error(`[Sync] Pull error for ${tableName}:`, error)
        updateSyncStatus(tableName, 'error', undefined, String(error))
      }

      // Stagger requests to avoid rate limiting (200ms between tables)
      await new Promise(resolve => setTimeout(resolve, 200))
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
    isSyncing = false
  }
}

// ─── Single record operations ────────────────────────────────

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; data?: string; error?: string }> {
  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')

  if (!apiKey) return { success: false, error: 'No API key configured' }
  if (!baseId) return { success: false, error: 'No base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  const converter = TABLE_CONVERTERS[tableName]
  if (!tableId || !converter) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    const airtableFields = converter.toAirtable(fields)
    const created = await batchCreate(tableId, [{ fields: airtableFields }], { apiKey, baseId })

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
  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')

  if (!apiKey) return { success: false, error: 'No API key configured' }
  if (!baseId) return { success: false, error: 'No base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  const converter = TABLE_CONVERTERS[tableName]
  if (!tableId || !converter) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    const airtableFields = converter.toAirtable(fields)
    await batchUpdate(tableId, [{ id, fields: airtableFields }], { apiKey, baseId })

    // Update local cache
    upsert(tableName, id, {
      ...fields,
      _airtable_modified_at: new Date().toISOString(),
      _pending_push: 0,
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function deleteRemoteRecord(
  tableName: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = getSetting('airtable_api_key')
  const baseId = getSetting('airtable_base_id')

  if (!apiKey) return { success: false, error: 'No API key configured' }
  if (!baseId) return { success: false, error: 'No base ID configured' }

  const tableId = TABLE_NAME_TO_ID[tableName]
  if (!tableId) return { success: false, error: `Unknown table: ${tableName}` }

  try {
    await batchDelete(tableId, [id], { apiKey, baseId })
    deleteRecord(tableName, id)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ─── Polling ─────────────────────────────────────────────────

let pollInterval: ReturnType<typeof setInterval> | null = null

export function startPolling(win: BrowserWindow | null): void {
  if (pollInterval) return

  const intervalMs = parseInt(getSetting('sync_interval_ms') || '60000', 10)
  console.log(`[Sync] Starting polling every ${intervalMs / 1000}s`)

  pollInterval = setInterval(async () => {
    try {
      await fullSync(win)
    } catch (error) {
      console.error('[Sync] Poll error:', error)
    }
  }, intervalMs)
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
    console.log('[Sync] Polling stopped')
  }
}
