# Imported Contact Approval Webhook — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When an Imported Contact's Onboarding Status changes to "Approved" in Airtable, automatically create a Contact record with linked Company (fuzzy matched or auto-created) and linked Specialties.

**Architecture:** Node.js script using Airtable API. Can be run locally via CLI (`node scripts/approve-contact.js <recordId>`) or triggered via Airtable automation webhook. Fuzzy matching uses string-similarity library (Dice coefficient). No external hosting needed — Airtable automation calls a scripting extension that runs the logic inline.

**Tech Stack:** Node.js, Airtable API (REST), string-similarity (npm package)

---

### Task 1: Project Setup

**Files:**
- Create: `scripts/approve-contact.js`
- Create: `scripts/package.json`

**Step 1: Initialize scripts directory**

```bash
cd scripts
npm init -y
npm install airtable string-similarity dotenv
```

**Step 2: Create .env template**

Create `scripts/.env.example`:
```
AIRTABLE_API_KEY=pat_your_key_here
AIRTABLE_BASE_ID=appYXbUdcmSwBoPFU
```

**Step 3: Add scripts/.env to .gitignore**

Append `scripts/.env` to the project `.gitignore`.

**Step 4: Commit**

```bash
git add scripts/package.json scripts/.env.example .gitignore
git commit -m "feat: Initialize approval webhook script project"
```

---

### Task 2: Field Mapping Constants

**Files:**
- Create: `scripts/field-ids.js`

**Step 1: Create the field ID mapping file**

All Airtable field IDs for the 3 tables involved:

```javascript
// Airtable table and field IDs for ILS CRM base
module.exports = {
  BASE_ID: 'appYXbUdcmSwBoPFU',

  TABLES: {
    CONTACTS: 'tbl9Q8m06ivkTYyvR',
    IMPORTED_CONTACTS: 'tblribgEf5RENNDQW',
    COMPANIES: 'tblEauAm0ZYuMbHUa',
    SPECIALTIES: 'tblysTixdxGQQntHO',
  },

  // Imported Contacts field IDs
  IC: {
    NAME: 'fldKc8P6eYXjMpAJ6',
    FIRST_NAME: 'fld7c1acCh17aOi0p',
    LAST_NAME: 'fldICvkgNbRG9dpqm',
    COMPANY: 'fld31Zl7X7DBZdL9K',
    JOB_TITLE: 'fldTHA6J24XaECMsz',
    EMAIL: 'fld9ejqJy5wjBqvrx',
    PHONE: 'fldZfFoFsOrIW2wQZ',
    MOBILE_PHONE: 'fldm8LaalVz7l38PS',
    WORK_PHONE: 'fld8MuOecNSVON5rD',
    LINKEDIN_URL: 'fldzikDES0UdCd4FQ',
    WEBSITE: 'fld57XgOQ9sFJOfof',
    TAGS: 'fldn2bUb5Khf7iumL',
    CATEGORIZATION: 'fldrYKTLd2HnL7GSe',
    SPECIALITY_MULTISELECT: 'fldTVm68nxYInyaUh',
    SPECIALTIES_LINKED: 'fldlkF1wlCbxBQ3KJ',
    ONBOARDING_STATUS: 'fldncdRP37p6BB9UX',
    SYNC_TO_CONTACTS: 'fldjm5mEIT25nlWjT',
    RELATED_CRM_CONTACT: 'fldDq3cetx5nrVqGo',
    ADDRESS_LINE: 'fld1Zpkm1Kms9XvRv',
    CITY: 'fldfS2EeVb5l3ic5h',
    STATE: 'fldIoe4TldH0WJUZj',
    COUNTRY: 'fldljgJjsqMkpMbkc',
    POSTAL_CODE: 'fldIsJaEWbMOb2juI',
    NOTES: 'fldMsJukGZt02TYVu',
    EVENT_TAGS: 'fldwI75ClzRJ7lli0',
    IMPORT_SOURCE: 'fld1fDiNE3vhoyi3P',
    IMPORT_DATE: 'fldNa8uThfClQFB79',
    // Company enrichment fields from imported contact
    COMPANY_DESCRIPTION: 'fldc5Aj4hRRZ4tIgE',
    COMPANY_INDUSTRY: 'fldiFajpEd7M14YBF',
    COMPANY_TYPE: 'fldiB3195PfAK7Wfg',
    COMPANY_SIZE: 'fldsJURWi2VvrvN2v',
    COMPANY_ANNUAL_REVENUE: 'fldLJr6gTu9zTeo0r',
    COMPANY_STREET: 'fldwAf4k6bsI922O4',
    COMPANY_CITY: 'fld4tMsuM8QhnhuZm',
    COMPANY_STATE: 'fldv9qnkGC3pnZQnv',
    COMPANY_COUNTRY: 'fld4YLilZ2HdhmCse',
    COMPANY_POSTAL_CODE: 'fldamMPu4kkZGugZn',
    COMPANY_FOUNDING_YEAR: 'fldCgacbjwFoRlHIp',
    COMPANY_NAICS_CODE: 'fldehmtkMRlb4M5Zi',
  },

  // Contacts field IDs
  C: {
    CONTACT_NAME: 'fldMkz6x5i8YaofZj',
    FIRST_NAME: 'fldBzVPUdMy99vfvp',
    LAST_NAME: 'fldq4VxEf0jJgi6O5',
    JOB_TITLE: 'fldvecarEW7fx90Ci',
    COMPANY_TEXT: 'fldTwuGnEhbQfZhP3',
    EMAIL: 'fldBjSvbdd5WXmoIG',
    PHONE: 'fldwF5NBjGVndCXNV',
    MOBILE_PHONE: 'fldwULn4qSjwzSOTj',
    WORK_PHONE: 'fldueNgIMN0Ui5MWw',
    SPECIALTIES_LINKED: 'fldPgiO2nKgcujeXz',
    COMPANIES_LINKED: 'fldYXDUc9YKKsGTBt',
    IMPORTED_CONTACTS_LINKED: 'fldj08SdhFcsYpRva',
    LINKEDIN_URL: 'fldWrrBfD7aLxsXT4',
    WEBSITE: 'fldnWic86lLjcF9MR',
    TAGS: 'fldO7kfLDA9jZswPB',
    CATEGORIZATION: 'fldofD9DQHfugTxsC',
    IMPORT_SOURCE: 'fldZG5LYBnFcEwhyw',
    IMPORT_DATE: 'fldoeYmeSZDrd7Y25',
    ONBOARDING_STATUS: 'fldbCsU8sEBNRm1kX',
    ADDRESS_LINE: 'fldxn8YVJ1pWGkaF8',
    CITY: 'fldAoanFJ1Fmrzkx5',
    STATE: 'fld1qq6PMLW6Ytbig',
    COUNTRY: 'fldnTdpTO4njtc4gZ',
    POSTAL_CODE: 'fldGgFJJ7XeLAR17a',
    NOTES: 'fldfbmMsacAKerGek',
    EVENT_TAGS: 'fld1D4u2KbIk0aUPR',
    LEAD_NOTE: 'fldWtoMSWdFla3dII',
  },

  // Companies field IDs
  CO: {
    COMPANY_NAME: 'fldVYiMOLq3LJgbZ3',
    TYPE: 'fldtLJxxK5oT6Nzjn',
    INDUSTRY: 'fldPz4rknFpmEXZAD',
    WEBSITE: 'fldVBnFiEeyDf9oCg',
    ADDRESS: 'fldyd3pnfJ5PCwwQD',
    CITY: 'fldJGkGiCoxduD4sg',
    STATE_REGION: 'fldNekCaGCR56MLcJ',
    COUNTRY: 'fldjvoxUo8iuKITjB',
    NOTES: 'flddUZDFk4l9f377V',
    CREATED_DATE: 'fldxQpzFGadejLLVp',
    CONTACTS_LINKED: 'fldQ2RK3PeAPMzkJB',
    COMPANY_DESCRIPTION: 'fldIDywGKU18pEndd',
    FOUNDING_YEAR: 'fldZaxAXqeImQcuzW',
    NAICS_CODE: 'fldL93N86XiMu5sUn',
    COMPANY_TYPE: 'fldSgiy8i2QUTmZbX',
    COMPANY_SIZE: 'fld0FFqLVasuvG9Uf',
    ANNUAL_REVENUE: 'fldMaVs106qf6Gmqp',
    POSTAL_CODE: 'fldqa7L8FPSeSQ9xG',
  },

  // Specialties field IDs
  S: {
    SPECIALTY_NAME: 'fldLVp1uePoKCuJlM',
    IMPORTED_CONTACTS: 'fldPQWyanCOcXVxmL',
    CONTACTS: 'fldVtUb9RqF03Ubq7',
  },
};
```

**Step 2: Commit**

```bash
git add scripts/field-ids.js
git commit -m "feat: Add Airtable field ID mapping constants"
```

---

### Task 3: Airtable Helper Module

**Files:**
- Create: `scripts/airtable-helpers.js`

**Step 1: Create helper functions for Airtable API calls**

```javascript
require('dotenv').config({ path: __dirname + '/.env' });
const Airtable = require('airtable');
const { BASE_ID, TABLES, CO, S } = require('./field-ids');
const { compareTwoStrings } = require('string-similarity');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID);

const FUZZY_MATCH_THRESHOLD = 0.8;

// Fetch all companies, return array of { id, name }
async function fetchAllCompanies() {
  const companies = [];
  await base(TABLES.COMPANIES)
    .select({ fields: [CO.COMPANY_NAME] })
    .eachPage((records, next) => {
      for (const r of records) {
        const name = r.get(CO.COMPANY_NAME);
        if (name) companies.push({ id: r.id, name });
      }
      next();
    });
  return companies;
}

// Fuzzy match a company name against all existing companies
// Returns { match: true, companyId, companyName, score } or { match: false }
function fuzzyMatchCompany(name, companies) {
  if (!name || !name.trim()) return { match: false };

  let bestMatch = null;
  let bestScore = 0;

  for (const co of companies) {
    const score = compareTwoStrings(name.toLowerCase(), co.name.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestMatch = co;
    }
  }

  if (bestScore >= FUZZY_MATCH_THRESHOLD && bestMatch) {
    return { match: true, companyId: bestMatch.id, companyName: bestMatch.name, score: bestScore };
  }
  return { match: false, bestCandidate: bestMatch?.name, bestScore };
}

// Create a new company record, return record ID
async function createCompany(fields) {
  const record = await base(TABLES.COMPANIES).create(fields, { typecast: true });
  return record.id;
}

// Fetch all specialties, return array of { id, name }
async function fetchAllSpecialties() {
  const specialties = [];
  await base(TABLES.SPECIALTIES)
    .select({ fields: [S.SPECIALTY_NAME] })
    .eachPage((records, next) => {
      for (const r of records) {
        const name = r.get(S.SPECIALTY_NAME);
        if (name) specialties.push({ id: r.id, name });
      }
      next();
    });
  return specialties;
}

// Resolve specialty names to record IDs. Creates new ones if needed.
async function resolveSpecialties(specialtyNames) {
  if (!specialtyNames || specialtyNames.length === 0) return [];

  const existing = await fetchAllSpecialties();
  const existingMap = new Map(existing.map(s => [s.name.toLowerCase(), s.id]));
  const resolved = [];

  for (const name of specialtyNames) {
    const normalized = name.trim();
    if (!normalized) continue;

    const existingId = existingMap.get(normalized.toLowerCase());
    if (existingId) {
      resolved.push(existingId);
    } else {
      // Create new specialty
      const record = await base(TABLES.SPECIALTIES).create(
        { [S.SPECIALTY_NAME]: normalized },
        { typecast: true }
      );
      resolved.push(record.id);
      existingMap.set(normalized.toLowerCase(), record.id);
      console.log(`  Created new specialty: "${normalized}"`);
    }
  }

  return [...new Set(resolved)]; // deduplicate
}

// Create a contact record, return record ID
async function createContact(fields) {
  const record = await base(TABLES.CONTACTS).create(fields, { typecast: true });
  return record.id;
}

// Update an imported contact record
async function updateImportedContact(recordId, fields) {
  await base(TABLES.IMPORTED_CONTACTS).update(recordId, fields, { typecast: true });
}

// Fetch a single imported contact by record ID
async function fetchImportedContact(recordId) {
  return base(TABLES.IMPORTED_CONTACTS).find(recordId);
}

module.exports = {
  fetchAllCompanies,
  fuzzyMatchCompany,
  createCompany,
  fetchAllSpecialties,
  resolveSpecialties,
  createContact,
  updateImportedContact,
  fetchImportedContact,
};
```

**Step 2: Commit**

```bash
git add scripts/airtable-helpers.js
git commit -m "feat: Add Airtable helper module with fuzzy company matching"
```

---

### Task 4: Main Approval Script

**Files:**
- Create: `scripts/approve-contact.js`

**Step 1: Create the main approval script**

```javascript
#!/usr/bin/env node
/**
 * approve-contact.js
 *
 * Processes an approved Imported Contact:
 * 1. Fuzzy match or create Company
 * 2. Resolve Specialties to linked records
 * 3. Create Contact with all fields mapped
 * 4. Link back to Imported Contact
 *
 * Usage:
 *   node scripts/approve-contact.js <importedContactRecordId>
 *   node scripts/approve-contact.js --all  (process all approved, unlinked)
 */

require('dotenv').config({ path: __dirname + '/.env' });
const {
  fetchAllCompanies,
  fuzzyMatchCompany,
  createCompany,
  resolveSpecialties,
  createContact,
  updateImportedContact,
  fetchImportedContact,
} = require('./airtable-helpers');
const { TABLES, IC, C, CO, S } = require('./field-ids');
const Airtable = require('airtable');

const BASE_ID = 'appYXbUdcmSwBoPFU';
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID);

async function processImportedContact(recordId) {
  console.log(`\nProcessing imported contact: ${recordId}`);

  // 1. Fetch the imported contact
  const ic = await fetchImportedContact(recordId);
  const firstName = ic.get(IC.FIRST_NAME) || '';
  const lastName = ic.get(IC.LAST_NAME) || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const companyName = ic.get(IC.COMPANY) || '';

  console.log(`  Contact: ${fullName}`);
  console.log(`  Company: ${companyName || '(none)'}`);

  // Check if already linked
  const existingLink = ic.get(IC.RELATED_CRM_CONTACT);
  if (existingLink && existingLink.length > 0) {
    console.log(`  SKIP: Already linked to Contact ${existingLink[0]}`);
    return { skipped: true, reason: 'already linked' };
  }

  // 2. Resolve Company
  let companyId = null;
  if (companyName) {
    const companies = await fetchAllCompanies();
    const match = fuzzyMatchCompany(companyName, companies);

    if (match.match) {
      companyId = match.companyId;
      console.log(`  Company matched: "${match.companyName}" (score: ${match.score.toFixed(2)})`);
    } else {
      // Create new company with enrichment data from imported contact
      const companyFields = {
        [CO.COMPANY_NAME]: companyName,
        [CO.CREATED_DATE]: new Date().toISOString().split('T')[0],
      };

      // Map company enrichment fields if available
      const description = ic.get(IC.COMPANY_DESCRIPTION);
      if (description) companyFields[CO.COMPANY_DESCRIPTION] = description;

      const companyIndustry = ic.get(IC.COMPANY_INDUSTRY);
      if (companyIndustry) companyFields[CO.INDUSTRY] = companyIndustry;

      const companyType = ic.get(IC.COMPANY_TYPE);
      if (companyType) companyFields[CO.COMPANY_TYPE] = companyType;

      const companySize = ic.get(IC.COMPANY_SIZE);
      if (companySize) companyFields[CO.COMPANY_SIZE] = companySize;

      const annualRevenue = ic.get(IC.COMPANY_ANNUAL_REVENUE);
      if (annualRevenue) companyFields[CO.ANNUAL_REVENUE] = annualRevenue;

      const website = ic.get(IC.WEBSITE);
      if (website) companyFields[CO.WEBSITE] = website;

      const street = ic.get(IC.COMPANY_STREET);
      if (street) companyFields[CO.ADDRESS] = street;

      const city = ic.get(IC.COMPANY_CITY);
      if (city) companyFields[CO.CITY] = city;

      const state = ic.get(IC.COMPANY_STATE);
      if (state) companyFields[CO.STATE_REGION] = state;

      const country = ic.get(IC.COMPANY_COUNTRY);
      if (country) companyFields[CO.COUNTRY] = country;

      const postalCode = ic.get(IC.COMPANY_POSTAL_CODE);
      if (postalCode) companyFields[CO.POSTAL_CODE] = postalCode;

      const foundingYear = ic.get(IC.COMPANY_FOUNDING_YEAR);
      if (foundingYear) companyFields[CO.FOUNDING_YEAR] = parseInt(foundingYear) || undefined;

      const naicsCode = ic.get(IC.COMPANY_NAICS_CODE);
      if (naicsCode) companyFields[CO.NAICS_CODE] = naicsCode;

      companyId = await createCompany(companyFields);
      console.log(`  Company created: "${companyName}" (${companyId})`);
    }
  }

  // 3. Resolve Specialties
  const specialtyNames = ic.get(IC.SPECIALITY_MULTISELECT) || [];
  const specialtyIds = await resolveSpecialties(specialtyNames);
  if (specialtyIds.length > 0) {
    console.log(`  Specialties resolved: ${specialtyIds.length} linked`);
  }

  // 4. Create Contact record
  const contactFields = {
    [C.FIRST_NAME]: firstName,
    [C.LAST_NAME]: lastName,
    [C.CONTACT_NAME]: fullName,
    [C.JOB_TITLE]: ic.get(IC.JOB_TITLE) || '',
    [C.COMPANY_TEXT]: companyName, // Keep text for backward compat
    [C.EMAIL]: ic.get(IC.EMAIL) || '',
    [C.PHONE]: ic.get(IC.PHONE) || '',
    [C.MOBILE_PHONE]: ic.get(IC.MOBILE_PHONE) || '',
    [C.WORK_PHONE]: ic.get(IC.WORK_PHONE) || '',
    [C.LINKEDIN_URL]: ic.get(IC.LINKEDIN_URL) || '',
    [C.WEBSITE]: ic.get(IC.WEBSITE) || '',
    [C.ADDRESS_LINE]: ic.get(IC.ADDRESS_LINE) || '',
    [C.CITY]: ic.get(IC.CITY) || '',
    [C.STATE]: ic.get(IC.STATE) || '',
    [C.COUNTRY]: ic.get(IC.COUNTRY) || '',
    [C.POSTAL_CODE]: ic.get(IC.POSTAL_CODE) || '',
    [C.NOTES]: ic.get(IC.NOTES) || '',
    [C.EVENT_TAGS]: ic.get(IC.EVENT_TAGS) || '',
    [C.IMPORT_SOURCE]: ic.get(IC.IMPORT_SOURCE) || 'Imported Contact',
    [C.IMPORT_DATE]: ic.get(IC.IMPORT_DATE) || new Date().toISOString().split('T')[0],
    [C.ONBOARDING_STATUS]: 'Approved',
    // Linked records
    [C.IMPORTED_CONTACTS_LINKED]: [recordId],
  };

  // Add tags if present
  const tags = ic.get(IC.TAGS);
  if (tags && tags.length > 0) contactFields[C.TAGS] = tags;

  // Add categorization if present
  const categorization = ic.get(IC.CATEGORIZATION);
  if (categorization) contactFields[C.CATEGORIZATION] = categorization;

  // Link company
  if (companyId) contactFields[C.COMPANIES_LINKED] = [companyId];

  // Link specialties
  if (specialtyIds.length > 0) contactFields[C.SPECIALTIES_LINKED] = specialtyIds;

  // Remove empty string fields (Airtable doesn't like empty strings for some field types)
  for (const [key, value] of Object.entries(contactFields)) {
    if (value === '' || value === undefined) delete contactFields[key];
  }

  const contactId = await createContact(contactFields);
  console.log(`  Contact created: "${fullName}" (${contactId})`);

  // 5. Link back to Imported Contact
  await updateImportedContact(recordId, {
    [IC.RELATED_CRM_CONTACT]: [contactId],
    [IC.SYNC_TO_CONTACTS]: true,
  });
  console.log(`  Imported Contact linked back and checkbox set`);

  return { success: true, contactId, companyId };
}

// Process all approved but unlinked imported contacts
async function processAllApproved() {
  const records = [];
  await base(TABLES.IMPORTED_CONTACTS)
    .select({
      filterByFormula: `AND({${IC.ONBOARDING_STATUS}} = "Approved", {${IC.RELATED_CRM_CONTACT}} = BLANK())`,
      fields: [IC.FIRST_NAME, IC.LAST_NAME, IC.ONBOARDING_STATUS],
    })
    .eachPage((page, next) => {
      records.push(...page);
      next();
    });

  console.log(`Found ${records.length} approved contacts to process.`);

  const results = [];
  for (const record of records) {
    const result = await processImportedContact(record.id);
    results.push({ id: record.id, ...result });
    // Rate limit: 5 requests/sec max
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return results;
}

// CLI entry point
async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.log('Usage:');
    console.log('  node approve-contact.js <recordId>   Process one imported contact');
    console.log('  node approve-contact.js --all         Process all approved, unlinked');
    process.exit(1);
  }

  if (arg === '--all') {
    const results = await processAllApproved();
    const succeeded = results.filter(r => r.success).length;
    const skipped = results.filter(r => r.skipped).length;
    console.log(`\nDone. ${succeeded} created, ${skipped} skipped.`);
  } else {
    await processImportedContact(arg);
    console.log('\nDone.');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/approve-contact.js
git commit -m "feat: Add imported contact approval script with fuzzy company matching"
```

---

### Task 5: Test with Dry Run

**Step 1: Create .env file with real API key**

```bash
cp scripts/.env.example scripts/.env
# Edit scripts/.env and add real Airtable API key
```

**Step 2: Test with one of the approved but unlinked contacts**

The audit found Guillaume Degre Timmons is approved but has no Related CRM Contact link.

```bash
cd scripts
node approve-contact.js --all
```

Expected output:
```
Found N approved contacts to process.

Processing imported contact: rec...
  Contact: Guillaume Degre Timmons
  Company: Lamajeure
  Company matched/created: "Lamajeure" (rec...)
  Specialties resolved: N linked
  Contact created: "Guillaume Degre Timmons" (rec...)
  Imported Contact linked back and checkbox set

Done. N created, 0 skipped.
```

**Step 3: Verify in Airtable**

- Check Contacts table for the new record
- Check Companies table for Lamajeure (matched or created)
- Check Imported Contact record has Related CRM Contact and Sync checkbox set

**Step 4: Commit after successful test**

```bash
git add -A
git commit -m "test: Verify approval script works end-to-end"
```

---

### Task 6: Airtable Automation Setup

**Step 1: Document the Airtable automation configuration**

Create `docs/airtable-automation-setup.md` with step-by-step instructions for setting up the automation in Airtable's UI:

1. Go to ILS CRM base → Automations
2. Create new automation: "Approve Imported Contact"
3. Trigger: When record matches conditions
   - Table: Imported Contacts
   - Condition: Onboarding Status = "Approved" AND Related CRM Contact is empty
4. Action: Run script
   - Paste the Airtable Scripting Extension version of the approval logic
   - (Airtable scripts run inline, no webhook hosting needed)

**Step 2: Create the Airtable scripting extension version**

Create `scripts/airtable-automation-script.js` — a self-contained version that runs inside Airtable's scripting extension (no npm packages, uses Airtable's built-in API).

**Step 3: Commit**

```bash
git add docs/airtable-automation-setup.md scripts/airtable-automation-script.js
git commit -m "docs: Add Airtable automation setup guide and inline script"
```
