require('dotenv').config({ path: __dirname + '/.env' });
const Airtable = require('airtable');
const { BASE_ID, TABLES, CO, S } = require('./field-ids');
const { compareTwoStrings } = require('string-similarity');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID);

const FUZZY_MATCH_THRESHOLD = 0.8;

async function fetchAllCompanies() {
  const companies = [];
  await base(TABLES.COMPANIES)
    .select({ fields: [CO.COMPANY_NAME], returnFieldsByFieldId: true })
    .eachPage((records, next) => {
      for (const r of records) {
        const name = r.get(CO.COMPANY_NAME);
        if (name) companies.push({ id: r.id, name });
      }
      next();
    });
  return companies;
}

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

async function createCompany(fields) {
  const record = await base(TABLES.COMPANIES).create(fields, { typecast: true });
  return record.id;
}

async function fetchAllSpecialties() {
  const specialties = [];
  await base(TABLES.SPECIALTIES)
    .select({ fields: [S.SPECIALTY_NAME], returnFieldsByFieldId: true })
    .eachPage((records, next) => {
      for (const r of records) {
        const name = r.get(S.SPECIALTY_NAME);
        if (name) specialties.push({ id: r.id, name });
      }
      next();
    });
  return specialties;
}

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
      const record = await base(TABLES.SPECIALTIES).create(
        { [S.SPECIALTY_NAME]: normalized },
        { typecast: true }
      );
      resolved.push(record.id);
      existingMap.set(normalized.toLowerCase(), record.id);
      console.log(`  Created new specialty: "${normalized}"`);
    }
  }

  return [...new Set(resolved)];
}

async function createContact(fields) {
  const record = await base(TABLES.CONTACTS).create(fields, { typecast: true });
  return record.id;
}

async function updateImportedContact(recordId, fields) {
  await base(TABLES.IMPORTED_CONTACTS).update(recordId, fields, { typecast: true });
}

async function fetchImportedContact(recordId) {
  // Use select instead of find so we can pass returnFieldsByFieldId
  const records = await base(TABLES.IMPORTED_CONTACTS)
    .select({
      filterByFormula: `RECORD_ID() = "${recordId}"`,
      returnFieldsByFieldId: true,
    })
    .firstPage();
  if (!records || records.length === 0) {
    throw new Error(`Imported Contact not found: ${recordId}`);
  }
  return records[0];
}

module.exports = {
  base,
  fetchAllCompanies,
  fuzzyMatchCompany,
  createCompany,
  fetchAllSpecialties,
  resolveSpecialties,
  createContact,
  updateImportedContact,
  fetchImportedContact,
  FUZZY_MATCH_THRESHOLD,
};
