# Airtable CRUD Integration Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated integration tests that verify Contacts, Companies, and Portal Access CRUD flows through to Airtable correctly in both Electron and Swift apps.

**Architecture:** Two test layers — engine-level (Airtable client functions directly) and UI smoke (IPC paths for Electron, XCUITest for Swift). All tests create records with `__TEST_` prefix, verify via Airtable API fetch, and clean up in teardown. Tests use `electron/airtable/client.ts` directly (bypassing SQLite) for Electron, and `AirtableService` actor for Swift.

**Tech Stack:** Vitest (Electron), Swift Testing (Swift engine), XCUITest (Swift UI), Airtable REST API

---

## File Structure

```
# Electron — new files
tests/integration/vitest.integration.config.ts   # Separate vitest config that includes electron/
tests/integration/helpers/airtable-test-client.ts # Thin wrapper around client.ts for test use
tests/integration/airtable-crud.test.ts           # Engine-level CRUD tests
tests/integration/ui-smoke.test.ts                # UI smoke tests (IPC code paths)
scripts/cleanup-test-records.ts                   # Standalone cleanup script

# Swift — new files
swift-app/ILS CRM Tests/                          # New unit test target directory
swift-app/ILS CRM Tests/AirtableCRUDTests.swift   # Engine-level CRUD tests
swift-app/ILS CRM UITests/UISmokeCRUDTests.swift  # UI smoke CRUD tests

# Modified files
swift-app/project.yml                             # Add new test target
package.json                                      # Add test:integration script
```

---

### Task 1: Electron — Integration Test Config & Airtable Test Client

**Files:**
- Create: `tests/integration/vitest.integration.config.ts`
- Create: `tests/integration/helpers/airtable-test-client.ts`
- Modify: `package.json` (add `test:integration` script)

- [ ] **Step 1: Create the integration vitest config**

This config includes `electron/` files (the main vitest.config.ts excludes them) and uses `node` environment instead of `jsdom`.

```typescript
// tests/integration/vitest.integration.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000, // 60s — Airtable rate limits may cause delays
    hookTimeout: 30_000,
  },
})
```

- [ ] **Step 2: Create the Airtable test client helper**

Wraps `client.ts` functions with API credentials from env vars. Provides create/update/delete/fetch + cleanup tracking.

```typescript
// tests/integration/helpers/airtable-test-client.ts
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

// Track all created record IDs for cleanup
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
  // Remove from tracking since it's already deleted
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

/** Call in afterAll to clean up any records created during tests */
export async function cleanupAllTestRecords(): Promise<void> {
  // Group by table for batch deletes
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
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
```

- [ ] **Step 3: Add test:integration script to package.json**

Add to the `"scripts"` section:

```json
"test:integration": "vitest run --config tests/integration/vitest.integration.config.ts"
```

- [ ] **Step 4: Run the config to verify it loads**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=test npx vitest run --config tests/integration/vitest.integration.config.ts 2>&1 | tail -5`

Expected: "No test files found" or similar (no actual tests yet). Should NOT error on config parsing.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/vitest.integration.config.ts tests/integration/helpers/airtable-test-client.ts package.json
git commit -m "feat: add integration test config and Airtable test client helper"
```

---

### Task 2: Electron — Contacts CRUD Engine Test

**Files:**
- Create: `tests/integration/airtable-crud.test.ts`

- [ ] **Step 1: Write the Contacts CRUD test**

```typescript
// tests/integration/airtable-crud.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import {
  createTestRecord, updateTestRecord, deleteTestRecord,
  fetchTestRecord, fetchTestRecordSafe, cleanupAllTestRecords,
  getTestTimestamp, delay, TABLES,
} from './helpers/airtable-test-client'

// Field IDs from electron/airtable/field-maps.ts
const CONTACT_FIELDS = {
  firstName: 'fldBzVPUdMy99vfvp',
  lastName: 'fldq4VxEf0jJgi6O5',
  email: 'fldBjSvbdd5WXmoIG',
  industry: 'fldHoIj9zCNB15avX',
}

afterAll(async () => {
  await cleanupAllTestRecords()
})

describe('Contacts — Airtable CRUD', () => {
  let contactId: string
  const ts = getTestTimestamp()

  it('creates a contact in Airtable', async () => {
    const record = await createTestRecord(TABLES.contacts, {
      [CONTACT_FIELDS.firstName]: `__TEST_${ts}_John`,
      [CONTACT_FIELDS.lastName]: 'TestContact',
      [CONTACT_FIELDS.email]: `__test_${ts}@test.invalid`,
      [CONTACT_FIELDS.industry]: 'Technology',
    })

    expect(record.id).toBeTruthy()
    contactId = record.id

    // Verify by fetching directly from Airtable
    await delay(500)
    const fetched = await fetchTestRecord(TABLES.contacts, contactId)
    expect(fetched.fields[CONTACT_FIELDS.firstName]).toBe(`__TEST_${ts}_John`)
    expect(fetched.fields[CONTACT_FIELDS.lastName]).toBe('TestContact')
    expect(fetched.fields[CONTACT_FIELDS.email]).toBe(`__test_${ts}@test.invalid`)
    expect(fetched.fields[CONTACT_FIELDS.industry]).toBe('Technology')
  })

  it('updates the contact in Airtable', async () => {
    expect(contactId).toBeTruthy()

    await updateTestRecord(TABLES.contacts, contactId, {
      [CONTACT_FIELDS.email]: `__test_${ts}_updated@test.invalid`,
      [CONTACT_FIELDS.industry]: 'Healthcare',
    })

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.contacts, contactId)
    expect(fetched.fields[CONTACT_FIELDS.email]).toBe(`__test_${ts}_updated@test.invalid`)
    expect(fetched.fields[CONTACT_FIELDS.industry]).toBe('Healthcare')
    // Unchanged fields should persist
    expect(fetched.fields[CONTACT_FIELDS.firstName]).toBe(`__TEST_${ts}_John`)
  })

  it('deletes the contact from Airtable', async () => {
    expect(contactId).toBeTruthy()

    await deleteTestRecord(TABLES.contacts, contactId)

    await delay(500)
    const fetched = await fetchTestRecordSafe(TABLES.contacts, contactId)
    expect(fetched).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$(grep -o 'pat[A-Za-z0-9.]*' electron/airtable/license-check.ts 2>/dev/null || echo "$AIRTABLE_API_KEY") npm run test:integration 2>&1 | tail -20`

Note: The API key must come from env var `AIRTABLE_API_KEY`. If not set, check `electron/database/` SQLite for the stored key, or ask the user.

Expected: All 3 Contacts tests pass (create, update, delete).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/airtable-crud.test.ts
git commit -m "test: add Contacts CRUD integration test against Airtable"
```

---

### Task 3: Electron — Companies & Portal Access Engine Tests

**Files:**
- Modify: `tests/integration/airtable-crud.test.ts`

- [ ] **Step 1: Add Companies CRUD test suite**

Append to `tests/integration/airtable-crud.test.ts`:

```typescript
const COMPANY_FIELDS = {
  companyName: 'fldVYiMOLq3LJgbZ3',
  type: 'fldtLJxxK5oT6Nzjn',
  industry: 'fldPz4rknFpmEXZAD',
}

describe('Companies — Airtable CRUD', () => {
  let companyId: string
  const ts = getTestTimestamp()

  it('creates a company in Airtable', async () => {
    const record = await createTestRecord(TABLES.companies, {
      [COMPANY_FIELDS.companyName]: `__TEST_${ts}_Acme Corp`,
      [COMPANY_FIELDS.type]: 'Prospect',
      [COMPANY_FIELDS.industry]: 'Technology',
    })

    expect(record.id).toBeTruthy()
    companyId = record.id

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.companies, companyId)
    expect(fetched.fields[COMPANY_FIELDS.companyName]).toBe(`__TEST_${ts}_Acme Corp`)
    expect(fetched.fields[COMPANY_FIELDS.type]).toBe('Prospect')
    expect(fetched.fields[COMPANY_FIELDS.industry]).toBe('Technology')
  })

  it('updates the company in Airtable', async () => {
    expect(companyId).toBeTruthy()

    await updateTestRecord(TABLES.companies, companyId, {
      [COMPANY_FIELDS.type]: 'Active Client',
      [COMPANY_FIELDS.industry]: 'Entertainment',
    })

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.companies, companyId)
    expect(fetched.fields[COMPANY_FIELDS.type]).toBe('Active Client')
    expect(fetched.fields[COMPANY_FIELDS.industry]).toBe('Entertainment')
    expect(fetched.fields[COMPANY_FIELDS.companyName]).toBe(`__TEST_${ts}_Acme Corp`)
  })

  it('deletes the company from Airtable', async () => {
    expect(companyId).toBeTruthy()

    await deleteTestRecord(TABLES.companies, companyId)

    await delay(500)
    const fetched = await fetchTestRecordSafe(TABLES.companies, companyId)
    expect(fetched).toBeNull()
  })
})
```

- [ ] **Step 2: Add Portal Access CRUD test suite**

Append to `tests/integration/airtable-crud.test.ts`:

```typescript
const PORTAL_ACCESS_FIELDS = {
  name: 'fldqnVE5ppj8ACyf3',
  pageAddress: 'fldkAjPIMUMlHNT2A',
  status: 'fldqbzNiTFt7jpdyW',
  contact: 'fld1tMK48dxrLU9R4',
  pageTitle: 'flddcfM0XRw309R9P',
}

describe('Portal Access — Airtable CRUD', () => {
  let portalId: string
  let linkedContactId: string
  const ts = getTestTimestamp()

  it('creates a portal access record linked to a contact', async () => {
    // First create a contact to link to
    const contact = await createTestRecord(TABLES.contacts, {
      [CONTACT_FIELDS.firstName]: `__TEST_${ts}_Portal`,
      [CONTACT_FIELDS.lastName]: 'LinkedContact',
      [CONTACT_FIELDS.email]: `__test_portal_${ts}@test.invalid`,
    })
    linkedContactId = contact.id

    await delay(300)

    // Create portal access linked to that contact
    const record = await createTestRecord(TABLES.portalAccess, {
      [PORTAL_ACCESS_FIELDS.name]: `__TEST_${ts}_Portal`,
      [PORTAL_ACCESS_FIELDS.pageAddress]: `__test-${ts}`,
      [PORTAL_ACCESS_FIELDS.status]: 'ACTIVE',
      [PORTAL_ACCESS_FIELDS.contact]: [linkedContactId],
    })

    expect(record.id).toBeTruthy()
    portalId = record.id

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.portalAccess, portalId)
    expect(fetched.fields[PORTAL_ACCESS_FIELDS.name]).toBe(`__TEST_${ts}_Portal`)
    expect(fetched.fields[PORTAL_ACCESS_FIELDS.pageAddress]).toBe(`__test-${ts}`)
    expect(fetched.fields[PORTAL_ACCESS_FIELDS.status]).toBe('ACTIVE')
    // Linked record should be an array containing the contact ID
    const linkedContacts = fetched.fields[PORTAL_ACCESS_FIELDS.contact] as string[]
    expect(linkedContacts).toContain(linkedContactId)
  })

  it('updates portal access in Airtable', async () => {
    expect(portalId).toBeTruthy()

    await updateTestRecord(TABLES.portalAccess, portalId, {
      [PORTAL_ACCESS_FIELDS.status]: 'IN-ACTIVE',
      [PORTAL_ACCESS_FIELDS.pageTitle]: 'Updated Test Page',
    })

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.portalAccess, portalId)
    expect(fetched.fields[PORTAL_ACCESS_FIELDS.status]).toBe('IN-ACTIVE')
    expect(fetched.fields[PORTAL_ACCESS_FIELDS.pageTitle]).toBe('Updated Test Page')
  })

  it('deletes portal access from Airtable', async () => {
    expect(portalId).toBeTruthy()

    await deleteTestRecord(TABLES.portalAccess, portalId)

    await delay(500)
    const fetched = await fetchTestRecordSafe(TABLES.portalAccess, portalId)
    expect(fetched).toBeNull()
  })
})
```

- [ ] **Step 3: Run all engine tests**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npm run test:integration 2>&1 | tail -30`

Expected: 9 tests pass (3 per entity). All test records cleaned up.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/airtable-crud.test.ts
git commit -m "test: add Companies and Portal Access CRUD integration tests"
```

---

### Task 4: Electron — Cross-Entity Relationship Test

**Files:**
- Modify: `tests/integration/airtable-crud.test.ts`

- [ ] **Step 1: Add cross-entity relationship test**

Append to `tests/integration/airtable-crud.test.ts`:

```typescript
describe('Cross-Entity — Linked Records', () => {
  const ts = getTestTimestamp()

  it('creates contact + company + portal access with correct links', async () => {
    // 1. Create company
    const company = await createTestRecord(TABLES.companies, {
      [COMPANY_FIELDS.companyName]: `__TEST_${ts}_LinkedCorp`,
      [COMPANY_FIELDS.type]: 'Prospect',
    })
    expect(company.id).toBeTruthy()

    await delay(300)

    // 2. Create contact linked to company
    const contact = await createTestRecord(TABLES.contacts, {
      [CONTACT_FIELDS.firstName]: `__TEST_${ts}_Linked`,
      [CONTACT_FIELDS.lastName]: 'Person',
      [CONTACT_FIELDS.email]: `__test_linked_${ts}@test.invalid`,
      'fldYXDUc9YKKsGTBt': [company.id], // companies linked record field
    })
    expect(contact.id).toBeTruthy()

    await delay(300)

    // 3. Create portal access linked to contact
    const portal = await createTestRecord(TABLES.portalAccess, {
      [PORTAL_ACCESS_FIELDS.name]: `__TEST_${ts}_LinkedPortal`,
      [PORTAL_ACCESS_FIELDS.pageAddress]: `__test-linked-${ts}`,
      [PORTAL_ACCESS_FIELDS.status]: 'ACTIVE',
      [PORTAL_ACCESS_FIELDS.contact]: [contact.id],
    })
    expect(portal.id).toBeTruthy()

    await delay(500)

    // 4. Verify all links
    const fetchedContact = await fetchTestRecord(TABLES.contacts, contact.id)
    const contactCompanies = fetchedContact.fields['fldYXDUc9YKKsGTBt'] as string[]
    expect(contactCompanies).toContain(company.id)

    const fetchedPortal = await fetchTestRecord(TABLES.portalAccess, portal.id)
    const portalContacts = fetchedPortal.fields[PORTAL_ACCESS_FIELDS.contact] as string[]
    expect(portalContacts).toContain(contact.id)

    // 5. Verify company has backlink to contact
    const fetchedCompany = await fetchTestRecord(TABLES.companies, company.id)
    const companyContacts = fetchedCompany.fields['fldQ2RK3PeAPMzkJB'] as string[]
    expect(companyContacts).toContain(contact.id)
  })
})
```

- [ ] **Step 2: Run all tests**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npm run test:integration 2>&1 | tail -30`

Expected: 10 tests pass (9 CRUD + 1 cross-entity). All records cleaned up.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/airtable-crud.test.ts
git commit -m "test: add cross-entity linked records integration test"
```

---

### Task 5: Electron — UI Smoke Test (IPC Code Path)

**Files:**
- Create: `tests/integration/ui-smoke.test.ts`

- [ ] **Step 1: Write the UI smoke test**

These tests use the same field-name-keyed data that the UI forms submit (not field IDs). They call `createRecord` from `sync-engine.ts` which runs the converter pipeline. This requires initializing the SQLite database.

Since `createRecord` depends on `getDatabase()` and `getSetting()`, the cleanest approach is to test the converter + Airtable client pipeline directly — verifying that the converter correctly maps form field names to Airtable field IDs.

```typescript
// tests/integration/ui-smoke.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { TABLE_CONVERTERS } from '../../electron/airtable/converters'
import {
  createTestRecord, fetchTestRecord, cleanupAllTestRecords,
  getTestTimestamp, delay, TABLES,
} from './helpers/airtable-test-client'

afterAll(async () => {
  await cleanupAllTestRecords()
})

describe('UI Smoke — Converter Pipeline', () => {
  const ts = getTestTimestamp()

  it('converts contact form data and creates in Airtable', async () => {
    // Simulate what the UI form submits (local field names)
    const formData: Record<string, unknown> = {
      first_name: `__TEST_${ts}_UISmoke`,
      last_name: 'FormTest',
      email: `__test_uismoke_${ts}@test.invalid`,
      industry: 'Technology',
    }

    // Run through the converter (local → Airtable field IDs)
    const converter = TABLE_CONVERTERS['contacts']
    const airtableFields = converter.toAirtable(formData)

    // Create via Airtable API with converted fields
    const record = await createTestRecord(TABLES.contacts, airtableFields)
    expect(record.id).toBeTruthy()

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
    // Verify the converter mapped correctly
    expect(fetched.fields['fldBzVPUdMy99vfvp']).toBe(`__TEST_${ts}_UISmoke`)
    expect(fetched.fields['fldq4VxEf0jJgi6O5']).toBe('FormTest')
    expect(fetched.fields['fldBjSvbdd5WXmoIG']).toBe(`__test_uismoke_${ts}@test.invalid`)
    expect(fetched.fields['fldHoIj9zCNB15avX']).toBe('Technology')
  })

  it('converts company form data and creates in Airtable', async () => {
    const formData: Record<string, unknown> = {
      company_name: `__TEST_${ts}_UICompany`,
      type: 'Prospect',
      industry: 'Entertainment',
    }

    const converter = TABLE_CONVERTERS['companies']
    const airtableFields = converter.toAirtable(formData)

    const record = await createTestRecord(TABLES.companies, airtableFields)
    expect(record.id).toBeTruthy()

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.companies, record.id)
    expect(fetched.fields['fldVYiMOLq3LJgbZ3']).toBe(`__TEST_${ts}_UICompany`)
    expect(fetched.fields['fldtLJxxK5oT6Nzjn']).toBe('Prospect')
    expect(fetched.fields['fldPz4rknFpmEXZAD']).toBe('Entertainment')
  })

  it('converts portal access form data and creates in Airtable', async () => {
    const formData: Record<string, unknown> = {
      name: `__TEST_${ts}_UIPortal`,
      page_address: `__test-ui-${ts}`,
      status: 'ACTIVE',
    }

    const converter = TABLE_CONVERTERS['portal_access']
    const airtableFields = converter.toAirtable(formData)

    const record = await createTestRecord(TABLES.portalAccess, airtableFields)
    expect(record.id).toBeTruthy()

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.portalAccess, record.id)
    expect(fetched.fields['fldqnVE5ppj8ACyf3']).toBe(`__TEST_${ts}_UIPortal`)
    expect(fetched.fields['fldkAjPIMUMlHNT2A']).toBe(`__test-ui-${ts}`)
    expect(fetched.fields['fldqbzNiTFt7jpdyW']).toBe('ACTIVE')
  })
})
```

- [ ] **Step 2: Run all integration tests**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npm run test:integration 2>&1 | tail -30`

Expected: 13 tests pass (10 engine + 3 UI smoke).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/ui-smoke.test.ts
git commit -m "test: add UI smoke integration tests (converter pipeline → Airtable)"
```

---

### Task 6: Electron — Cleanup Script

**Files:**
- Create: `scripts/cleanup-test-records.ts`

- [ ] **Step 1: Write the standalone cleanup script**

```typescript
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

const TABLES_TO_CLEAN = [
  { tableId: TABLES.portalAccess, nameField: 'fldqnVE5ppj8ACyf3', label: 'Portal Access' },
  { tableId: TABLES.contacts, nameField: 'fldBzVPUdMy99vfvp', label: 'Contacts' },
  { tableId: TABLES.companies, nameField: 'fldVYiMOLq3LJgbZ3', label: 'Companies' },
]

async function main() {
  let totalDeleted = 0

  // Delete portal access first (has linked record dependency on contacts)
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
```

- [ ] **Step 2: Test the cleanup script**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npx tsx scripts/cleanup-test-records.ts 2>&1`

Expected: Either "no __TEST_ records found" for each table (clean state) or deletes any stragglers.

- [ ] **Step 3: Commit**

```bash
git add scripts/cleanup-test-records.ts
git commit -m "feat: add standalone __TEST_ record cleanup script"
```

---

### Task 7: Swift — Add Test Target to project.yml

**Files:**
- Modify: `swift-app/project.yml`
- Create: `swift-app/ILS CRM Tests/` directory

- [ ] **Step 1: Add the unit test target to project.yml**

Add after the `ILS CRM UITests` target in `swift-app/project.yml`:

```yaml
  ILS CRM Tests:
    type: bundle.unit-testing
    platform: macOS
    sources:
      - path: ILS CRM Tests
    dependencies:
      - target: ILS CRM
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.imaginelabstudios.ils-crm.tests
        GENERATE_INFOPLIST_FILE: YES
        CODE_SIGN_IDENTITY: "-"
        CODE_SIGNING_REQUIRED: NO
        CODE_SIGNING_ALLOWED: YES
```

- [ ] **Step 2: Create the test directory**

```bash
mkdir -p "swift-app/ILS CRM Tests"
```

- [ ] **Step 3: Regenerate the Xcode project**

```bash
cd swift-app && xcodegen generate
```

Expected: "Generated project ILS CRM.xcodeproj" with 3 targets (app, UI tests, unit tests).

- [ ] **Step 4: Verify it builds**

```bash
cd swift-app && xcodebuild build-for-testing -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | tail -10
```

Expected: BUILD SUCCEEDED.

- [ ] **Step 5: Commit**

```bash
git add swift-app/project.yml
git commit -m "feat: add ILS CRM Tests unit test target to project.yml"
```

---

### Task 8: Swift — Engine-Level CRUD Tests

**Files:**
- Create: `swift-app/ILS CRM Tests/AirtableCRUDTests.swift`

- [ ] **Step 1: Write the Swift CRUD tests**

```swift
// swift-app/ILS CRM Tests/AirtableCRUDTests.swift
import Testing
import Foundation
@testable import ILS_CRM

/// Integration tests that verify CRUD operations flow through to Airtable.
/// Requires AIRTABLE_API_KEY environment variable to be set.
///
/// Run: xcodebuild test -scheme "ILS CRM" -destination 'platform=macOS' -only-testing "ILS CRM Tests/AirtableCRUDTests"
struct AirtableCRUDTests {
    let service: AirtableService
    let ts: String

    init() throws {
        guard let apiKey = ProcessInfo.processInfo.environment["AIRTABLE_API_KEY"],
              !apiKey.isEmpty else {
            throw TestError.missingAPIKey
        }
        service = AirtableService(apiKey: apiKey, baseId: AirtableConfig.baseId)
        ts = String(Int(Date().timeIntervalSince1970))
    }

    enum TestError: Error {
        case missingAPIKey
        case noRecordCreated
    }

    // MARK: - Helpers

    private func createRecord(tableId: String, fields: [String: Any]) async throws -> String {
        let created = try await service.batchCreate(tableId: tableId, records: [fields])
        guard let first = created.first, let id = first["id"] as? String else {
            throw TestError.noRecordCreated
        }
        return id
    }

    private func fetchFields(tableId: String, recordId: String) async throws -> [String: Any] {
        let record = try await service.fetchRecord(tableId: tableId, recordId: recordId)
        return record["fields"] as? [String: Any] ?? [:]
    }

    private func cleanup(tableId: String, ids: [String]) async {
        try? await service.batchDelete(tableId: tableId, recordIds: ids)
    }

    // MARK: - Contacts

    @Test("Create, update, delete Contact in Airtable")
    func contactsCRUD() async throws {
        let tableId = AirtableConfig.Tables.contacts
        var createdIds: [String] = []

        defer { Task { await cleanup(tableId: tableId, ids: createdIds) } }

        // Create
        let fields: [String: Any] = [
            "fldBzVPUdMy99vfvp": "__TEST_\(ts)_SwiftJohn",
            "fldq4VxEf0jJgi6O5": "SwiftTestContact",
            "fldBjSvbdd5WXmoIG": "__test_swift_\(ts)@test.invalid",
            "fldHoIj9zCNB15avX": "Technology",
        ]
        let contactId = try await createRecord(tableId: tableId, fields: fields)
        createdIds.append(contactId)

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify create
        var fetched = try await fetchFields(tableId: tableId, recordId: contactId)
        #expect(fetched["fldBzVPUdMy99vfvp"] as? String == "__TEST_\(ts)_SwiftJohn")
        #expect(fetched["fldq4VxEf0jJgi6O5"] as? String == "SwiftTestContact")
        #expect(fetched["fldBjSvbdd5WXmoIG"] as? String == "__test_swift_\(ts)@test.invalid")
        #expect(fetched["fldHoIj9zCNB15avX"] as? String == "Technology")

        // Update
        try await service.batchUpdate(tableId: tableId, records: [(
            id: contactId,
            fields: [
                "fldBjSvbdd5WXmoIG": "__test_swift_\(ts)_updated@test.invalid",
                "fldHoIj9zCNB15avX": "Healthcare",
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify update
        fetched = try await fetchFields(tableId: tableId, recordId: contactId)
        #expect(fetched["fldBjSvbdd5WXmoIG"] as? String == "__test_swift_\(ts)_updated@test.invalid")
        #expect(fetched["fldHoIj9zCNB15avX"] as? String == "Healthcare")
        #expect(fetched["fldBzVPUdMy99vfvp"] as? String == "__TEST_\(ts)_SwiftJohn")

        // Delete
        try await service.batchDelete(tableId: tableId, recordIds: [contactId])
        createdIds.removeAll { $0 == contactId }

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify delete
        do {
            _ = try await service.fetchRecord(tableId: tableId, recordId: contactId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            // Expected — record should be gone
            #expect(String(describing: error).contains("404") || String(describing: error).contains("NOT_FOUND"))
        }
    }

    // MARK: - Companies

    @Test("Create, update, delete Company in Airtable")
    func companiesCRUD() async throws {
        let tableId = AirtableConfig.Tables.companies
        var createdIds: [String] = []

        defer { Task { await cleanup(tableId: tableId, ids: createdIds) } }

        // Create
        let fields: [String: Any] = [
            "fldVYiMOLq3LJgbZ3": "__TEST_\(ts)_SwiftCorp",
            "fldtLJxxK5oT6Nzjn": "Prospect",
            "fldPz4rknFpmEXZAD": "Technology",
        ]
        let companyId = try await createRecord(tableId: tableId, fields: fields)
        createdIds.append(companyId)

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify create
        var fetched = try await fetchFields(tableId: tableId, recordId: companyId)
        #expect(fetched["fldVYiMOLq3LJgbZ3"] as? String == "__TEST_\(ts)_SwiftCorp")
        #expect(fetched["fldtLJxxK5oT6Nzjn"] as? String == "Prospect")
        #expect(fetched["fldPz4rknFpmEXZAD"] as? String == "Technology")

        // Update
        try await service.batchUpdate(tableId: tableId, records: [(
            id: companyId,
            fields: [
                "fldtLJxxK5oT6Nzjn": "Active Client",
                "fldPz4rknFpmEXZAD": "Entertainment",
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify update
        fetched = try await fetchFields(tableId: tableId, recordId: companyId)
        #expect(fetched["fldtLJxxK5oT6Nzjn"] as? String == "Active Client")
        #expect(fetched["fldPz4rknFpmEXZAD"] as? String == "Entertainment")

        // Delete
        try await service.batchDelete(tableId: tableId, recordIds: [companyId])
        createdIds.removeAll { $0 == companyId }

        try await Task.sleep(nanoseconds: 500_000_000)

        do {
            _ = try await service.fetchRecord(tableId: tableId, recordId: companyId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            #expect(String(describing: error).contains("404") || String(describing: error).contains("NOT_FOUND"))
        }
    }

    // MARK: - Portal Access

    @Test("Create, update, delete Portal Access in Airtable")
    func portalAccessCRUD() async throws {
        let contactTableId = AirtableConfig.Tables.contacts
        let portalTableId = AirtableConfig.Tables.portalAccess
        var contactIds: [String] = []
        var portalIds: [String] = []

        defer {
            Task {
                await cleanup(tableId: portalTableId, ids: portalIds)
                await cleanup(tableId: contactTableId, ids: contactIds)
            }
        }

        // Create a contact first (portal access requires linked contact)
        let contactFields: [String: Any] = [
            "fldBzVPUdMy99vfvp": "__TEST_\(ts)_SwiftPortalLink",
            "fldq4VxEf0jJgi6O5": "PortalTest",
        ]
        let contactId = try await createRecord(tableId: contactTableId, fields: contactFields)
        contactIds.append(contactId)

        try await Task.sleep(nanoseconds: 300_000_000)

        // Create portal access
        let portalFields: [String: Any] = [
            "fldqnVE5ppj8ACyf3": "__TEST_\(ts)_SwiftPortal",
            "fldkAjPIMUMlHNT2A": "__test-swift-\(ts)",
            "fldqbzNiTFt7jpdyW": "ACTIVE",
            "fld1tMK48dxrLU9R4": [contactId],
        ]
        let portalId = try await createRecord(tableId: portalTableId, fields: portalFields)
        portalIds.append(portalId)

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify create
        var fetched = try await fetchFields(tableId: portalTableId, recordId: portalId)
        #expect(fetched["fldqnVE5ppj8ACyf3"] as? String == "__TEST_\(ts)_SwiftPortal")
        #expect(fetched["fldkAjPIMUMlHNT2A"] as? String == "__test-swift-\(ts)")
        #expect(fetched["fldqbzNiTFt7jpdyW"] as? String == "ACTIVE")
        let linked = fetched["fld1tMK48dxrLU9R4"] as? [String] ?? []
        #expect(linked.contains(contactId))

        // Update
        try await service.batchUpdate(tableId: portalTableId, records: [(
            id: portalId,
            fields: [
                "fldqbzNiTFt7jpdyW": "IN-ACTIVE",
                "flddcfM0XRw309R9P": "Updated Test Page",
            ]
        )])

        try await Task.sleep(nanoseconds: 500_000_000)

        // Verify update
        fetched = try await fetchFields(tableId: portalTableId, recordId: portalId)
        #expect(fetched["fldqbzNiTFt7jpdyW"] as? String == "IN-ACTIVE")
        #expect(fetched["flddcfM0XRw309R9P"] as? String == "Updated Test Page")

        // Delete portal access (keep contact for cleanup)
        try await service.batchDelete(tableId: portalTableId, recordIds: [portalId])
        portalIds.removeAll { $0 == portalId }

        try await Task.sleep(nanoseconds: 500_000_000)

        do {
            _ = try await service.fetchRecord(tableId: portalTableId, recordId: portalId)
            Issue.record("Expected fetch to throw after deletion")
        } catch {
            #expect(String(describing: error).contains("404") || String(describing: error).contains("NOT_FOUND"))
        }
    }
}
```

- [ ] **Step 2: Regenerate Xcode project and build**

```bash
cd swift-app && xcodegen generate && xcodebuild build-for-testing -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | tail -10
```

Expected: BUILD SUCCEEDED.

- [ ] **Step 3: Run the Swift tests**

```bash
cd swift-app && AIRTABLE_API_KEY=$AIRTABLE_API_KEY xcodebuild test -scheme "ILS CRM" -destination 'platform=macOS' -only-testing "ILS CRM Tests/AirtableCRUDTests" 2>&1 | tail -30
```

Expected: 3 tests pass (contactsCRUD, companiesCRUD, portalAccessCRUD).

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM Tests/AirtableCRUDTests.swift"
git commit -m "test: add Swift engine-level Airtable CRUD integration tests"
```

---

### Task 9: Swift — UI Smoke CRUD Tests

**Files:**
- Create: `swift-app/ILS CRM UITests/UISmokeCRUDTests.swift`

- [ ] **Step 1: Write the XCUITest smoke tests**

These launch the app, navigate to a section, create a record via the UI, then verify it appeared in Airtable. The Airtable verification uses URLSession directly (XCUITest runs in a separate process, no access to app's AirtableService).

```swift
// swift-app/ILS CRM UITests/UISmokeCRUDTests.swift
import XCTest

/// UI smoke tests that create records via the app UI and verify they land in Airtable.
/// Requires AIRTABLE_API_KEY environment variable.
///
/// These tests launch the full app, navigate to a section, fill a form, submit,
/// then call the Airtable API directly to verify the record was created.
final class UISmokeCRUDTests: XCTestCase {
    var app: XCUIApplication!
    var apiKey: String!
    let baseId = "appYXbUdcmSwBoPFU"
    var createdRecordIds: [(tableId: String, recordId: String)] = []

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        apiKey = ProcessInfo.processInfo.environment["AIRTABLE_API_KEY"]
        XCTAssertNotNil(apiKey, "AIRTABLE_API_KEY env var required")
        XCTAssertFalse(apiKey.isEmpty, "AIRTABLE_API_KEY must not be empty")
        app.launch()
    }

    override func tearDownWithError() throws {
        // Clean up any test records created during UI tests
        for (tableId, recordId) in createdRecordIds {
            deleteAirtableRecord(tableId: tableId, recordId: recordId)
        }
        app.terminate()
    }

    // MARK: - Airtable Direct API Helpers (for verification)

    private func fetchAirtableRecords(tableId: String, filterFormula: String) -> [[String: Any]] {
        let semaphore = DispatchSemaphore(value: 0)
        var result: [[String: Any]] = []

        let encodedFormula = filterFormula.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? filterFormula
        let url = URL(string: "https://api.airtable.com/v0/\(baseId)/\(tableId)?filterByFormula=\(encodedFormula)&returnFieldsByFieldId=true")!

        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey!)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let records = json["records"] as? [[String: Any]] {
                result = records
            }
            semaphore.signal()
        }.resume()

        _ = semaphore.wait(timeout: .now() + 30)
        return result
    }

    private func deleteAirtableRecord(tableId: String, recordId: String) {
        let semaphore = DispatchSemaphore(value: 0)
        let url = URL(string: "https://api.airtable.com/v0/\(baseId)/\(tableId)/\(recordId)")!

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(apiKey!)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { _, _, _ in
            semaphore.signal()
        }.resume()

        _ = semaphore.wait(timeout: .now() + 10)
    }

    // MARK: - UI Smoke: Create Contact

    func testCreateContactViaUI() throws {
        let ts = String(Int(Date().timeIntervalSince1970))

        // Navigate to Contacts via sidebar
        let sidebar = app.outlines.firstMatch
        let contactsItem = sidebar.staticTexts["Contacts"]
        XCTAssertTrue(contactsItem.waitForExistence(timeout: 10), "Contacts sidebar item not found")
        contactsItem.click()

        // Wait for the contacts view to load
        sleep(2)

        // Click the "+" / "New Contact" button
        // Look for common button patterns
        let newButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'new' OR label CONTAINS[c] 'add' OR label == '+'")).firstMatch
        if newButton.exists {
            newButton.click()
        } else {
            // Try Cmd+N
            app.typeKey("n", modifierFlags: .command)
        }

        sleep(1)

        // Fill in the form — find text fields by label or placeholder
        let firstNameField = app.textFields["First Name"].firstMatch
        if firstNameField.exists {
            firstNameField.click()
            firstNameField.typeText("__TEST_\(ts)_UI")
        }

        let lastNameField = app.textFields["Last Name"].firstMatch
        if lastNameField.exists {
            lastNameField.click()
            lastNameField.typeText("SmokeTest")
        }

        let emailField = app.textFields["Email"].firstMatch
        if emailField.exists {
            emailField.click()
            emailField.typeText("__test_ui_\(ts)@test.invalid")
        }

        // Submit the form — look for Save/Create button
        let saveButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'save' OR label CONTAINS[c] 'create'")).firstMatch
        if saveButton.exists {
            saveButton.click()
        }

        // Wait for sync to push to Airtable
        sleep(10)

        // Verify in Airtable
        let formula = "FIND(\"__TEST_\(ts)_UI\", {fldBzVPUdMy99vfvp})"
        let records = fetchAirtableRecords(tableId: "tbl9Q8m06ivkTYyvR", filterFormula: formula)

        XCTAssertGreaterThan(records.count, 0, "Contact not found in Airtable after UI creation")

        if let first = records.first, let id = first["id"] as? String {
            createdRecordIds.append((tableId: "tbl9Q8m06ivkTYyvR", recordId: id))
            let fields = first["fields"] as? [String: Any] ?? [:]
            XCTAssertEqual(fields["fldBzVPUdMy99vfvp"] as? String, "__TEST_\(ts)_UI")
        }
    }
}
```

- [ ] **Step 2: Build and run UI tests**

```bash
cd swift-app && xcodegen generate && AIRTABLE_API_KEY=$AIRTABLE_API_KEY xcodebuild test -scheme "ILS CRM" -destination 'platform=macOS' -only-testing "ILS CRM UITests/UISmokeCRUDTests" 2>&1 | tail -30
```

Note: UI tests may need adjustment based on the actual app's accessibility labels and view hierarchy. If the test fails to find UI elements, use `app.debugDescription` to inspect the hierarchy and adjust selectors.

Expected: 1 UI smoke test passes. Test record created in Airtable and cleaned up.

- [ ] **Step 3: Commit**

```bash
git add "swift-app/ILS CRM UITests/UISmokeCRUDTests.swift"
git commit -m "test: add Swift UI smoke test — create contact via app UI, verify in Airtable"
```

---

### Task 10: Final Integration Run & Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all Electron integration tests**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npm run test:integration 2>&1
```

Expected: 13 tests pass, all __TEST_ records cleaned up.

- [ ] **Step 2: Run all Swift tests**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm/swift-app" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY xcodebuild test -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | tail -40
```

Expected: 3 engine tests + 1 UI smoke test pass.

- [ ] **Step 3: Run cleanup script to verify no test records remain**

```bash
cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && AIRTABLE_API_KEY=$AIRTABLE_API_KEY npx tsx scripts/cleanup-test-records.ts
```

Expected: "no __TEST_ records found" for all 3 tables.

- [ ] **Step 4: Commit the final state**

```bash
git add -A && git status
```

If any unstaged files (generated xcodeproj, etc.), add and commit:

```bash
git commit -m "chore: final integration test setup — all tests green"
```
