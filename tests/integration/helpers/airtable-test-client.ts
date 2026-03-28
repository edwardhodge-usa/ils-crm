import {
  batchCreate, batchUpdate, batchDelete, fetchRecord, fetchAllRecords,
  type AirtableRecord,
} from '../../../electron/airtable/client'
import { TABLES } from '../../../electron/airtable/field-maps'

const API_KEY = process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appYXbUdcmSwBoPFU'

if (!API_KEY) {
  throw new Error('AIRTABLE_API_KEY env var is required for integration tests')
}

const opts = { apiKey: API_KEY, baseId: BASE_ID }

const createdRecords: Array<{ tableId: string; recordId: string }> = []

export function getTestTimestamp(): string {
  return String(Date.now())
}

export async function createTestRecord(
  tableId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const created = await batchCreate(tableId, [{ fields }], opts)
  if (created.length === 0) throw new Error('No record created')
  createdRecords.push({ tableId, recordId: created[0].id })
  return created[0]
}

export async function updateTestRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord[]> {
  return batchUpdate(tableId, [{ id: recordId, fields }], opts)
}

export async function deleteTestRecord(
  tableId: string,
  recordId: string
): Promise<void> {
  await batchDelete(tableId, [recordId], opts)
  const idx = createdRecords.findIndex(r => r.recordId === recordId)
  if (idx >= 0) createdRecords.splice(idx, 1)
}

export async function fetchTestRecord(
  tableId: string,
  recordId: string
): Promise<AirtableRecord> {
  return fetchRecord(tableId, recordId, opts)
}

export async function fetchTestRecordSafe(
  tableId: string,
  recordId: string
): Promise<AirtableRecord | null> {
  try {
    return await fetchRecord(tableId, recordId, opts)
  } catch (error) {
    if (String(error).includes('404') || String(error).includes('NOT_FOUND')) {
      return null
    }
    throw error
  }
}

export async function cleanupAllTestRecords(): Promise<void> {
  const byTable = new Map<string, string[]>()
  for (const { tableId, recordId } of createdRecords) {
    const ids = byTable.get(tableId) || []
    ids.push(recordId)
    byTable.set(tableId, ids)
  }

  for (const [tableId, ids] of byTable) {
    try {
      await batchDelete(tableId, ids, opts)
    } catch (error) {
      console.warn(`[Cleanup] Failed to delete ${ids.length} records from ${tableId}:`, error)
    }
  }

  createdRecords.length = 0
}

export { TABLES }
export { fetchAllRecords }
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
