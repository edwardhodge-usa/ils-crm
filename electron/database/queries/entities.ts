// Generic CRUD queries for all entity tables
// Uses sql.js in-memory database — results returned as objects

import { getDatabase, saveDatabase } from '../init'

interface QueryResult {
  columns: string[]
  values: unknown[][]
}

// Convert sql.js result rows to objects
function resultToObjects(result: QueryResult[]): Record<string, unknown>[] {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

// ─── Generic CRUD ────────────────────────────────────────────

export function getAll(table: string): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(`SELECT * FROM ${table} ORDER BY rowid DESC`)
  return resultToObjects(result)
}

export function getById(table: string, id: string): Record<string, unknown> | null {
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
  const db = getDatabase()
  const existing = getById(table, id)

  if (existing) {
    // Update
    const keys = Object.keys(fields)
    if (keys.length === 0) return
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => fields[k])
    db.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, id])
  } else {
    // Insert
    const allFields = { id, ...fields }
    const keys = Object.keys(allFields)
    const placeholders = keys.map(() => '?').join(', ')
    const values = keys.map(k => allFields[k])
    db.run(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    )
  }

  saveDatabase()
}

export function deleteRecord(table: string, id: string): void {
  const db = getDatabase()
  db.run(`DELETE FROM ${table} WHERE id = ?`, [id])
  saveDatabase()
}

export function getCount(table: string): number {
  const db = getDatabase()
  const result = db.exec(`SELECT COUNT(*) as count FROM ${table}`)
  if (result.length === 0) return 0
  return result[0].values[0][0] as number
}

// ─── Pending changes ─────────────────────────────────────────

export function getPendingRecords(table: string): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(
    `SELECT * FROM ${table} WHERE _pending_push = 1`
  )
  return resultToObjects(result)
}

export function markPushed(table: string, id: string): void {
  const db = getDatabase()
  db.run(
    `UPDATE ${table} SET _pending_push = 0 WHERE id = ?`,
    [id]
  )
  saveDatabase()
}

export function markPendingPush(table: string, id: string): void {
  const db = getDatabase()
  db.run(
    `UPDATE ${table} SET _pending_push = 1, _local_modified_at = datetime('now') WHERE id = ?`,
    [id]
  )
  saveDatabase()
}

// ─── Pending changes queue ───────────────────────────────────

export function addPendingChange(
  tableName: string,
  recordId: string | null,
  action: 'create' | 'update' | 'delete',
  fields?: Record<string, unknown>
): void {
  const db = getDatabase()
  db.run(
    `INSERT INTO pending_changes (table_name, record_id, action, fields) VALUES (?, ?, ?, ?)`,
    [tableName, recordId, action, fields ? JSON.stringify(fields) : null]
  )
  saveDatabase()
}

export function getUnsynced(): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(
    `SELECT * FROM pending_changes WHERE synced_at IS NULL ORDER BY created_at ASC`
  )
  return resultToObjects(result)
}

export function markSynced(changeId: number): void {
  const db = getDatabase()
  db.run(
    `UPDATE pending_changes SET synced_at = datetime('now') WHERE id = ?`,
    [changeId]
  )
  saveDatabase()
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

export function getSyncStatus(tableName: string): Record<string, unknown> | null {
  const db = getDatabase()
  const result = db.exec(
    `SELECT * FROM sync_status WHERE table_name = ?`,
    [tableName]
  )
  const rows = resultToObjects(result)
  return rows[0] || null
}

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
  saveDatabase()
}

export function getAllSyncStatuses(): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(`SELECT * FROM sync_status ORDER BY table_name`)
  return resultToObjects(result)
}
