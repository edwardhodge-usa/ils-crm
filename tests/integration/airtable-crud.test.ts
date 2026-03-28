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
