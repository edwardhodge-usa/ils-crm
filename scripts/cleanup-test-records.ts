// scripts/cleanup-test-records.ts
// Usage: AIRTABLE_API_KEY=patXXX npx tsx scripts/cleanup-test-records.ts
//
// Searches all 3 tested tables for records with __TEST_ in their name field
// and deletes them. Safety net for when tests crash before teardown runs.

import { fetchAllRecords, batchDelete } from '../electron/airtable/client'
import { TABLES } from '../electron/airtable/field-maps'

const API_KEY = process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appYXbUdcmSwBoPFU'

if (!API_KEY) {
  console.error('AIRTABLE_API_KEY env var is required')
  process.exit(1)
}

const opts = { apiKey: API_KEY, baseId: BASE_ID }

// Note: filterByFormula uses field DISPLAY NAMES (not field IDs),
// even when returnFieldsByFieldId=true is set on the request.
// Portal Access first — it has a linked record dependency on Contacts,
// so deleting portal records before contacts avoids orphaned links.
const TABLES_TO_CLEAN = [
  { tableId: TABLES.portalAccess, nameField: 'Name', label: 'Portal Access' },
  { tableId: TABLES.contacts, nameField: 'First Name', label: 'Contacts' },
  { tableId: TABLES.companies, nameField: 'Company Name', label: 'Companies' },
]

async function main() {
  let totalDeleted = 0

  for (const { tableId, nameField, label } of TABLES_TO_CLEAN) {
    const formula = `FIND("__TEST_", {${nameField}})`
    const records = await fetchAllRecords(tableId, { ...opts, filterFormula: formula })

    if (records.length === 0) {
      console.log(`${label}: no __TEST_ records found`)
      continue
    }

    const ids = records.map(r => r.id)
    console.log(`${label}: deleting ${ids.length} __TEST_ records...`)
    await batchDelete(tableId, ids, opts)
    totalDeleted += ids.length
  }

  console.log(`\nDone. Deleted ${totalDeleted} test records total.`)
}

main().catch(error => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
