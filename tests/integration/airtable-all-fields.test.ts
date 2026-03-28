import { describe, it, expect, afterAll } from 'vitest'
import {
  createTestRecord, updateTestRecord, deleteTestRecord,
  fetchTestRecord, fetchTestRecordSafe, cleanupAllTestRecords,
  getTestTimestamp, delay, TABLES,
} from './helpers/airtable-test-client'

afterAll(async () => {
  await cleanupAllTestRecords()
})

describe('Contacts — All Fields', () => {
  const ts = getTestTimestamp()

  it('creates a contact with all text fields', async () => {
    // Create with ALL text fields populated
    const record = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_AllFields`,  // firstName
      'fldq4VxEf0jJgi6O5': 'FullTest',                 // lastName
      'fldvecarEW7fx90Ci': 'Test Engineer',             // jobTitle
      'fldxn8YVJ1pWGkaF8': '123 Test Street',          // addressLine
      'fldAoanFJ1Fmrzkx5': 'Test City',                // city
      'fld1qq6PMLW6Ytbig': 'CA',                       // state
      'fldnTdpTO4njtc4gZ': 'US',                       // country
      'fldGgFJJ7XeLAR17a': '90210',                    // postalCode
      'fldfbmMsacAKerGek': 'Test notes content',       // notes
      'fldB5b9qTiIUkdiLk': 'Review notes test',        // reviewNotes
      'fldFX8WvENPPkN6g1': '$100/hr',                  // rateInfo
      'fldWtoMSWdFla3dII': 'Lead note test',           // leadNote
      'fldBjSvbdd5WXmoIG': `__test_allfields_${ts}@test.invalid`, // email
      'fldwULn4qSjwzSOTj': '+1-555-0100',              // mobilePhone
      'fldueNgIMN0Ui5MWw': '+1-555-0200',              // officePhone
      'fldWrrBfD7aLxsXT4': 'https://linkedin.com/in/test', // linkedInUrl
      'fldnWic86lLjcF9MR': 'https://test.example.com', // website
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
    expect(fetched.fields['fldBzVPUdMy99vfvp']).toBe(`__TEST_${ts}_AllFields`)
    expect(fetched.fields['fldq4VxEf0jJgi6O5']).toBe('FullTest')
    expect(fetched.fields['fldvecarEW7fx90Ci']).toBe('Test Engineer')
    expect(fetched.fields['fldxn8YVJ1pWGkaF8']).toBe('123 Test Street')
    expect(fetched.fields['fldAoanFJ1Fmrzkx5']).toBe('Test City')
    expect(fetched.fields['fld1qq6PMLW6Ytbig']).toBe('CA')
    expect(fetched.fields['fldnTdpTO4njtc4gZ']).toBe('US')
    expect(fetched.fields['fldGgFJJ7XeLAR17a']).toBe('90210')
    expect(fetched.fields['fldfbmMsacAKerGek']).toBe('Test notes content')
    expect(fetched.fields['fldB5b9qTiIUkdiLk']).toBe('Review notes test')
    expect(fetched.fields['fldFX8WvENPPkN6g1']).toBe('$100/hr')
    expect(fetched.fields['fldWtoMSWdFla3dII']).toBe('Lead note test')
    expect(fetched.fields['fldBjSvbdd5WXmoIG']).toBe(`__test_allfields_${ts}@test.invalid`)
    expect(fetched.fields['fldwULn4qSjwzSOTj']).toBe('+1-555-0100')
    expect(fetched.fields['fldueNgIMN0Ui5MWw']).toBe('+1-555-0200')
    expect(fetched.fields['fldWrrBfD7aLxsXT4']).toBe('https://linkedin.com/in/test')
    expect(fetched.fields['fldnWic86lLjcF9MR']).toBe('https://test.example.com')
  })

  it('creates a contact with number, date, and checkbox fields', async () => {
    const record = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_NumDate`,
      'fldq4VxEf0jJgi6O5': 'NumDateTest',
      'fldxNhfwoMf7UWVoT': 85,                        // leadScore
      'fldoILwnnEloVrzLk': '2026-03-15',               // lastContactDate
      'fldoeYmeSZDrd7Y25': '2026-01-01',               // importDate
      'fld6gBrJu9XCGAIll': '2026-03-20',               // reviewCompletionDate
      'fldxbLMAKgqeawWkw': true,                       // syncToContacts
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
    expect(fetched.fields['fldxNhfwoMf7UWVoT']).toBe(85)
    expect(fetched.fields['fldoILwnnEloVrzLk']).toBe('2026-03-15')
    expect(fetched.fields['fldoeYmeSZDrd7Y25']).toBe('2026-01-01')
    expect(fetched.fields['fld6gBrJu9XCGAIll']).toBe('2026-03-20')
    expect(fetched.fields['fldxbLMAKgqeawWkw']).toBe(true)
  })

  it('creates a contact with all singleSelect fields', async () => {
    const record = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_Selects`,
      'fldq4VxEf0jJgi6O5': 'SelectTest',
      'fld5Ed1Gg51xRBIrm': 'Qualified',                // qualificationStatus
      'fldxxbhPmFaJ7xZeK': 'Referral',                 // leadSource
      'fldHoIj9zCNB15avX': 'Technology',               // industry
      'fldZG5LYBnFcEwhyw': 'Manual Entry',             // importSource
      'fldbCsU8sEBNRm1kX': 'Approved',                 // onboardingStatus
      'fldz86orj3p0ynZGB': '⭐⭐⭐⭐⭐ Excellent',        // qualityRating
      'fldgIuvazBCfLa7Wu': '⭐⭐⭐⭐ Good',              // reliabilityRating
      'fldIEgv4HtZTr57AX': 'Active',                   // partnerStatus
      'fldvehyP9Y3Ra2wUM': 'Architect',                // partnerType
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
    expect(fetched.fields['fld5Ed1Gg51xRBIrm']).toBe('Qualified')
    expect(fetched.fields['fldxxbhPmFaJ7xZeK']).toBe('Referral')
    expect(fetched.fields['fldHoIj9zCNB15avX']).toBe('Technology')
    expect(fetched.fields['fldZG5LYBnFcEwhyw']).toBe('Manual Entry')
    expect(fetched.fields['fldbCsU8sEBNRm1kX']).toBe('Approved')
    expect(fetched.fields['fldz86orj3p0ynZGB']).toBe('⭐⭐⭐⭐⭐ Excellent')
    expect(fetched.fields['fldgIuvazBCfLa7Wu']).toBe('⭐⭐⭐⭐ Good')
    expect(fetched.fields['fldIEgv4HtZTr57AX']).toBe('Active')
    expect(fetched.fields['fldvehyP9Y3Ra2wUM']).toBe('Architect')
  })

  it('creates a contact with multiSelect fields', async () => {
    const record = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_Multi`,
      'fldq4VxEf0jJgi6O5': 'MultiTest',
      'fldofD9DQHfugTxsC': ['Consultant', 'Advisor', 'VIP'], // categorization
      'fld1D4u2KbIk0aUPR': ['SATE 2025', 'IAAPA 2025'],     // eventTags
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.contacts, record.id)
    const categorization = fetched.fields['fldofD9DQHfugTxsC'] as string[]
    expect(categorization).toContain('Consultant')
    expect(categorization).toContain('Advisor')
    expect(categorization).toContain('VIP')

    const eventTags = fetched.fields['fld1D4u2KbIk0aUPR'] as string[]
    expect(eventTags).toContain('SATE 2025')
    expect(eventTags).toContain('IAAPA 2025')
  })

  it('creates a contact linked to a company and verifies bidirectional link', async () => {
    // Create a company first
    const company = await createTestRecord(TABLES.companies, {
      'fldVYiMOLq3LJgbZ3': `__TEST_${ts}_LinkCo`,
    })

    await delay(300)

    // Create contact linked to company
    const contact = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_Linked`,
      'fldq4VxEf0jJgi6O5': 'LinkTest',
      'fldYXDUc9YKKsGTBt': [company.id], // companies linked
    })

    await delay(500)

    // Verify contact → company link
    const fetchedContact = await fetchTestRecord(TABLES.contacts, contact.id)
    const contactCompanies = fetchedContact.fields['fldYXDUc9YKKsGTBt'] as string[]
    expect(contactCompanies).toContain(company.id)

    // Verify company → contact backlink
    const fetchedCompany = await fetchTestRecord(TABLES.companies, company.id)
    const companyContacts = fetchedCompany.fields['fldQ2RK3PeAPMzkJB'] as string[]
    expect(companyContacts).toContain(contact.id)
  })
})

// PLACEHOLDER: Companies and Portal Access sections will be added by other agents
