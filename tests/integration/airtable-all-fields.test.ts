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

describe('Companies — All Fields', () => {
  const ts = getTestTimestamp()

  it('creates a company with all text fields + number + date', async () => {
    const record = await createTestRecord(TABLES.companies, {
      'fldVYiMOLq3LJgbZ3': `__TEST_${ts}_AllFields`,   // companyName
      'fldyd3pnfJ5PCwwQD': '100 Innovation Blvd',       // address
      'fldJGkGiCoxduD4sg': 'Austin',                    // city
      'fldNekCaGCR56MLcJ': 'TX',                        // stateRegion
      'fldjvoxUo8iuKITjB': 'US',                        // country
      'fldLLGU72wwf7LxEf': 'Jane Doe',                  // referredBy
      'fldL93N86XiMu5sUn': '541512',                    // naicsCode
      'fldMaVs106qf6Gmqp': '$5M',                       // annualRevenue
      'fldqa7L8FPSeSQ9xG': '78701',                     // postalCode
      'flddUZDFk4l9f377V': 'Test company notes',        // notes
      'fldIDywGKU18pEndd': 'A test company description', // companyDescription
      'fldVBnFiEeyDf9oCg': 'https://test-co.example.com', // website
      'fldVt6tIj1DrT85cd': 'https://linkedin.com/company/test-co', // linkedInUrl
      'fldZaxAXqeImQcuzW': 2020,                        // foundingYear (number)
      'fldxQpzFGadejLLVp': '2026-01-15',                // createdDate (date)
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.companies, record.id)
    expect(fetched.fields['fldVYiMOLq3LJgbZ3']).toBe(`__TEST_${ts}_AllFields`)
    expect(fetched.fields['fldyd3pnfJ5PCwwQD']).toBe('100 Innovation Blvd')
    expect(fetched.fields['fldJGkGiCoxduD4sg']).toBe('Austin')
    expect(fetched.fields['fldNekCaGCR56MLcJ']).toBe('TX')
    expect(fetched.fields['fldjvoxUo8iuKITjB']).toBe('US')
    expect(fetched.fields['fldLLGU72wwf7LxEf']).toBe('Jane Doe')
    expect(fetched.fields['fldL93N86XiMu5sUn']).toBe('541512')
    expect(fetched.fields['fldMaVs106qf6Gmqp']).toBe('$5M')
    expect(fetched.fields['fldqa7L8FPSeSQ9xG']).toBe('78701')
    expect(fetched.fields['flddUZDFk4l9f377V']).toBe('Test company notes')
    expect(fetched.fields['fldIDywGKU18pEndd']).toBe('A test company description')
    expect(fetched.fields['fldVBnFiEeyDf9oCg']).toBe('https://test-co.example.com')
    expect(fetched.fields['fldVt6tIj1DrT85cd']).toBe('https://linkedin.com/company/test-co')
    expect(fetched.fields['fldZaxAXqeImQcuzW']).toBe(2020)
    expect(fetched.fields['fldxQpzFGadejLLVp']).toBe('2026-01-15')
  })

  it('creates a company with all singleSelect fields', async () => {
    const record = await createTestRecord(TABLES.companies, {
      'fldVYiMOLq3LJgbZ3': `__TEST_${ts}_Selects`,     // companyName
      'fldtLJxxK5oT6Nzjn': 'Active Client',             // type
      'fldPz4rknFpmEXZAD': 'Technology',                 // industry
      'fldSPGKJKbHclLzoD': 'Referral',                   // leadSource
      'fldSgiy8i2QUTmZbX': 'Agency',                     // companyType (discover valid options)
      'fld0FFqLVasuvG9Uf': '11-50',                      // companySize (discover valid options)
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.companies, record.id)
    expect(fetched.fields['fldtLJxxK5oT6Nzjn']).toBe('Active Client')
    expect(fetched.fields['fldPz4rknFpmEXZAD']).toBe('Technology')
    expect(fetched.fields['fldSPGKJKbHclLzoD']).toBe('Referral')
    expect(fetched.fields['fldSgiy8i2QUTmZbX']).toBeTruthy()
    expect(fetched.fields['fld0FFqLVasuvG9Uf']).toBeTruthy()
  })

  it('links a contact to a company and verifies bidirectional link', async () => {
    // Create company
    const company = await createTestRecord(TABLES.companies, {
      'fldVYiMOLq3LJgbZ3': `__TEST_${ts}_LinkCo`,
    })

    await delay(300)

    // Create contact linked to company
    const contact = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_CoLink`,
      'fldq4VxEf0jJgi6O5': 'CompanyLinkTest',
      'fldYXDUc9YKKsGTBt': [company.id], // contacts.companies linked
    })

    await delay(500)

    // Verify company → contact backlink
    const fetchedCompany = await fetchTestRecord(TABLES.companies, company.id)
    const companyContacts = fetchedCompany.fields['fldQ2RK3PeAPMzkJB'] as string[]
    expect(companyContacts).toContain(contact.id)

    // Verify contact → company link
    const fetchedContact = await fetchTestRecord(TABLES.contacts, contact.id)
    const contactCompanies = fetchedContact.fields['fldYXDUc9YKKsGTBt'] as string[]
    expect(contactCompanies).toContain(company.id)
  })
})

describe('Portal Access — All Fields', () => {
  const ts = getTestTimestamp()

  it('creates a portal access record with all text fields + number + dates', async () => {
    const record = await createTestRecord(TABLES.portalAccess, {
      'fldqnVE5ppj8ACyf3': `__TEST_${ts}_AllFields`,         // name
      'fldU70JpJQ1GpbRNQ': `__test_portal_${ts}@test.invalid`, // email
      'fldkAjPIMUMlHNT2A': `test-page-${ts}`,                 // pageAddress
      'fldn0nMxnqpHkLykk': 'John Smith',                      // decisionMaker
      'fldvaQB8wzgaLLn2Y': '200 Portal Drive',                // address
      'fldqESjieqvuj1k4P': 'Jane Portal',                     // primaryContact
      'fld2UX68BMEk768Ao': 'VP Marketing',                    // positionTitle
      'fld8JNk7r3mQvco7V': 'Entertainment',                   // industry
      'fldiOyYVt4QN8Yon4': 'Portal test notes',               // notes
      'fldHVA9pJd2j2bJNi': '+1-555-0300',                     // phoneNumber
      'fldJhqz0wngVDNxwt': 'https://portal-test.example.com', // website
      'fldQisibz3rZaC4mi': 250000,                            // projectBudget (number)
      'fld8m3xt2QOi2EF3b': '2026-03-01',                      // dateAdded
      'flduKP6vlsDlxZuGW': '2026-06-15',                      // expectedProjectStartDate
      'fldvhmfQXneMvWXD1': '2026-04-01',                      // followUpDate
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.portalAccess, record.id)
    expect(fetched.fields['fldqnVE5ppj8ACyf3']).toBe(`__TEST_${ts}_AllFields`)
    expect(fetched.fields['fldU70JpJQ1GpbRNQ']).toBe(`__test_portal_${ts}@test.invalid`)
    expect(fetched.fields['fldkAjPIMUMlHNT2A']).toBe(`test-page-${ts}`)
    expect(fetched.fields['fldn0nMxnqpHkLykk']).toBe('John Smith')
    expect(fetched.fields['fldvaQB8wzgaLLn2Y']).toBe('200 Portal Drive')
    expect(fetched.fields['fldqESjieqvuj1k4P']).toBe('Jane Portal')
    expect(fetched.fields['fld2UX68BMEk768Ao']).toBe('VP Marketing')
    expect(fetched.fields['fld8JNk7r3mQvco7V']).toBe('Entertainment')
    expect(fetched.fields['fldiOyYVt4QN8Yon4']).toBe('Portal test notes')
    expect(fetched.fields['fldHVA9pJd2j2bJNi']).toBe('+1-555-0300')
    expect(fetched.fields['fldJhqz0wngVDNxwt']).toBe('https://portal-test.example.com')
    expect(fetched.fields['fldQisibz3rZaC4mi']).toBe(250000)
    expect(fetched.fields['fld8m3xt2QOi2EF3b']).toBe('2026-03-01')
    expect(fetched.fields['flduKP6vlsDlxZuGW']).toBe('2026-06-15')
    expect(fetched.fields['fldvhmfQXneMvWXD1']).toBe('2026-04-01')
  })

  it('creates a portal access record with all singleSelect + multiSelect fields', async () => {
    const record = await createTestRecord(TABLES.portalAccess, {
      'fldqnVE5ppj8ACyf3': `__TEST_${ts}_Selects`,           // name
      'fldqbzNiTFt7jpdyW': 'ACTIVE',                          // status
      'fldnIkdS9MSewsUqy': 'Referral',                        // leadSource
      'fldYrwOrTeimfHC5c': 'Lead',                             // stage
      'fldcBIAHs2jpNkQbD': ['Web Design', 'Branding', 'SEO'], // servicesInterestedIn
    })

    expect(record.id).toBeTruthy()
    await delay(500)

    const fetched = await fetchTestRecord(TABLES.portalAccess, record.id)
    expect(fetched.fields['fldqbzNiTFt7jpdyW']).toBe('ACTIVE')
    expect(fetched.fields['fldnIkdS9MSewsUqy']).toBe('Referral')
    expect(fetched.fields['fldYrwOrTeimfHC5c']).toBe('Lead')

    const services = fetched.fields['fldcBIAHs2jpNkQbD'] as string[]
    expect(services).toContain('Web Design')
    expect(services).toContain('Branding')
    expect(services).toContain('SEO')
  })

  it('links a contact and verifies lookup fields populated', async () => {
    // Create a contact with known data for lookup verification
    const contact = await createTestRecord(TABLES.contacts, {
      'fldBzVPUdMy99vfvp': `__TEST_${ts}_PortalLookup`,
      'fldq4VxEf0jJgi6O5': 'LookupTest',
      'fldBjSvbdd5WXmoIG': `__test_lookup_${ts}@test.invalid`,
      'fldvecarEW7fx90Ci': 'Test Director',
      'fldwULn4qSjwzSOTj': '+1-555-0400',
    })

    await delay(300)

    // Create portal access linked to this contact
    const portal = await createTestRecord(TABLES.portalAccess, {
      'fldqnVE5ppj8ACyf3': `__TEST_${ts}_Lookups`,
      'fld1tMK48dxrLU9R4': [contact.id], // contact linked record
    })

    await delay(1000) // allow lookup fields to populate

    const fetched = await fetchTestRecord(TABLES.portalAccess, portal.id)

    // Verify the linked contact field
    const linkedContacts = fetched.fields['fld1tMK48dxrLU9R4'] as string[]
    expect(linkedContacts).toContain(contact.id)

    // Verify lookup fields populated from the linked contact
    // contactName lookup (fldwGCWvBs8GCz5ka) — should contain the contact's full name
    const contactNameLookup = fetched.fields['fldwGCWvBs8GCz5ka']
    expect(contactNameLookup).toBeTruthy()

    // contactEmail lookup (fldtZJw7XdUeVGNcA)
    const contactEmailLookup = fetched.fields['fldtZJw7XdUeVGNcA'] as string[] | undefined
    if (contactEmailLookup) {
      expect(contactEmailLookup).toContain(`__test_lookup_${ts}@test.invalid`)
    }

    // contactPhone lookup (fldH8ZDUC4l0vKXpV)
    const contactPhoneLookup = fetched.fields['fldH8ZDUC4l0vKXpV'] as string[] | undefined
    if (contactPhoneLookup) {
      expect(contactPhoneLookup).toContain('+1-555-0400')
    }

    // contactJobTitle lookup (fldQbVqtuSO4KXgg9)
    const contactJobTitleLookup = fetched.fields['fldQbVqtuSO4KXgg9'] as string[] | undefined
    if (contactJobTitleLookup) {
      expect(contactJobTitleLookup).toContain('Test Director')
    }
  })
})
