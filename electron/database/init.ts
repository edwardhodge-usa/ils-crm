// SQLite database initialization using sql.js
// Adapted from ContactEnricher's database/init.ts

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { createSchema } from './schema'

const isDev = !app.isPackaged

let db: SqlJsDatabase | null = null
let dbPath = ''

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function saveDatabase(): void {
  if (db && dbPath) {
    try {
      const data = db.export()
      const buffer = Buffer.from(data)
      fs.writeFileSync(dbPath, buffer)
    } catch (error) {
      console.error('[DB] Error saving database:', error)
    }
  }
}

export async function initDatabase(): Promise<void> {
  try {
    const userDataPath = app.getPath('userData')
    dbPath = path.join(userDataPath, 'ils-crm.db')

    if (isDev) console.log('[DB] Initializing database at:', dbPath)

    // Load sql.js WASM binary
    let wasmBinary: Buffer | undefined

    if (isDev) {
      const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')
      if (fs.existsSync(wasmPath)) {
        wasmBinary = fs.readFileSync(wasmPath)
      } else {
        console.error('[DB] WASM file not found in development path:', wasmPath)
      }
    } else {
      const wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm')
      if (fs.existsSync(wasmPath)) {
        wasmBinary = fs.readFileSync(wasmPath)
      } else {
        throw new Error(`WASM file not found at ${wasmPath}`)
      }
    }

    const SQL = await initSqlJs({ wasmBinary })

    // Load existing or create new database
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
      if (isDev) console.log('[DB] Loaded existing database')
    } else {
      db = new SQL.Database()
      if (isDev) console.log('[DB] Created new database')
    }

    // Create schema (tables, indexes, defaults)
    createSchema(db)

    saveDatabase()
    startAutoSave()

    if (isDev) console.log('[DB] Database initialized successfully')
  } catch (error) {
    console.error('[DB] FATAL: Database initialization failed:', error)
    throw error
  }
}

export function closeDatabase(): void {
  stopAutoSave()
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// Auto-save periodically to prevent data loss
let saveInterval: ReturnType<typeof setInterval> | null = null

function startAutoSave(): void {
  if (!saveInterval) {
    saveInterval = setInterval(() => {
      if (db) saveDatabase()
    }, 30000) // Every 30 seconds
  }
}

function stopAutoSave(): void {
  if (saveInterval) {
    clearInterval(saveInterval)
    saveInterval = null
  }
}
