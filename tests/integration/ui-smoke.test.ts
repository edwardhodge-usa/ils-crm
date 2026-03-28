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
    const formData: Record<string, unknown> = {
      first_name: `__TEST_${ts}_UISmoke`,
      last_name: 'FormTest',
      email: `__test_uismoke_${ts}@test.invalid`,
      industry: 'Technology',
    }

    const converter = TABLE_CONVERTERS['contacts']
    const airtableFields = converter.toAirtable(formData)

    const record = await createTestRecord(TABLES.contacts, airtableFields)
    expect(record.id).toBeTruthy()

    await delay(500)
    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
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
