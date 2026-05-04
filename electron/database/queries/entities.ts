// Generic CRUD queries for all entity tables
// Uses sql.js in-memory database — results returned as objects

import { getDatabase, saveDatabase } from '../init'
import { resultToObjects } from '../utils'

// ─── SQL Injection Prevention ────────────────────────────────

const VALID_TABLES = new Set([
  'contacts', 'companies', 'opportunities', 'tasks', 'proposals',
  'projects', 'interactions', 'imported_contacts', 'specialties',
  'portal_access', 'portal_logs', 'client_pages',
  'email_scan_rules', 'email_scan_state', 'enrichment_queue',
  'rate_card', 'person_rates',
  'settings', 'sync_status',
])

const VALID_COLUMN = /^[a-z_][a-z0-9_]*$/

function validateTable(table: string): void {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`)
  }
}

// ─── Generic CRUD ────────────────────────────────────────────

export function getAll(table: string): Record<string, unknown>[] {
  validateTable(table)
  const db = getDatabase()
  const result = db.exec(`SELECT * FROM ${table} ORDER BY rowid DESC`)
  return resultToObjects(result)
}

export function getById(table: string, id: string): Record<string, unknown> | null {
  validateTable(table)
  const db = getDatabase()
  const result = db.exec(`SELECT * FROM ${table} WHERE id = ?`, [id])
  const rows = resultToObjects(result)
  return rows[0] || null
}

export function upsert(
  table: string,
  id: string,
  fields: Record<string, unknown>
): void {
  validateTable(table)
  const db = getDatabase()
  const allFields = { id, ...fields }
  const keys = Object.keys(allFields)
  if (keys.length === 0) return

  for (const key of keys) {
    if (!VALID_COLUMN.test(key)) {
      throw new Error(`Invalid column name: ${key}`)
    }
  }

  const placeholders = keys.map(() => '?').join(', ')
  const updateClause = keys.filter(k => k !== 'id').map(k => `${k} = excluded.${k}`).join(', ')
  const values = keys.map(k => allFields[k])

  // Single-query upsert — eliminates the SELECT round-trip during sync
  db.run(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updateClause}`,
    values
  )
}

export function deleteRecord(table: string, id: string): void {
  validateTable(table)
  const db = getDatabase()
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id])
}

// ─── Pending changes ─────────────────────────────────────────

export function getPendingRecords(table: string): Record<string, unknown>[] {
  validateTable(table)
  const db = getDatabase()
  const result = db.exec(
    `SELECT * FROM ${table} WHERE _pending_push = 1`
  )
  return resultToObjects(result)
}

export function markPushed(table: string, id: string): void {
  validateTable(table)
  const db = getDatabase()
  db.run(
    `UPDATE ${table} SET _pending_push = 0 WHERE id = ?`,
    [id]
  )
}

// ─── Settings ────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const result = db.exec(`SELECT value FROM settings WHERE key = ?`, [key])
  if (result.length === 0 || result[0].values.length === 0) return null
  return result[0].values[0][0] as string
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.run(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, value]
  )
  saveDatabase()
}

// ─── Sync status ─────────────────────────────────────────────

export function updateSyncStatus(
  tableName: string,
  status: string,
  recordCount?: number,
  error?: string
): void {
  const db = getDatabase()
  db.run(
    `UPDATE sync_status SET status = ?, last_sync_at = datetime('now'), record_count = COALESCE(?, record_count), error = ? WHERE table_name = ?`,
    [status, recordCount ?? null, error ?? null, tableName]
  )
}

export function getAllSyncStatuses(): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(`SELECT * FROM sync_status ORDER BY table_name`)
  return resultToObjects(result)
}
