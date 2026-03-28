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
