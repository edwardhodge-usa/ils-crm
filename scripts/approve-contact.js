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
 *   node approve-contact.js <importedContactRecordId>
 *   node approve-contact.js --all    Process all approved, unlinked
 *   node approve-contact.js --dry    Dry run: show what would happen
 */

require('dotenv').config({ path: __dirname + '/.env' });
const {
  base,
  fetchAllCompanies,
  fuzzyMatchCompany,
  createCompany,
  resolveSpecialties,
  createContact,
  updateImportedContact,
  fetchImportedContact,
} = require('./airtable-helpers');
const { TABLES, IC, C, CO } = require('./field-ids');

const DRY_RUN = process.argv.includes('--dry');

async function processImportedContact(recordId, companies) {
  console.log(`\nProcessing: ${recordId}`);

  const ic = await fetchImportedContact(recordId);
  const firstName = ic.get(IC.FIRST_NAME) || '';
  const lastName = ic.get(IC.LAST_NAME) || '';
  const fullName = `${firstName} ${lastName}`.trim() || '(unnamed)';
  const companyName = ic.get(IC.COMPANY) || '';

  console.log(`  Name: ${fullName}`);
  console.log(`  Company: ${companyName || '(none)'}`);

  // Check if already linked
  const existingLink = ic.get(IC.RELATED_CRM_CONTACT);
  if (existingLink && existingLink.length > 0) {
    console.log(`  SKIP: Already linked to ${existingLink[0]}`);
    return { skipped: true, reason: 'already linked' };
  }

  // Resolve Company
  let companyId = null;
  if (companyName) {
    const match = fuzzyMatchCompany(companyName, companies);

    if (match.match) {
      companyId = match.companyId;
      console.log(`  Company MATCHED: "${match.companyName}" (${(match.score * 100).toFixed(0)}%)`);
    } else {
      if (match.bestCandidate) {
        console.log(`  Company NO MATCH (best: "${match.bestCandidate}" at ${(match.bestScore * 100).toFixed(0)}%)`);
      }

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create company: "${companyName}"`);
      } else {
        const companyFields = { [CO.COMPANY_NAME]: companyName };
        const today = new Date().toISOString().split('T')[0];
        companyFields[CO.CREATED_DATE] = today;

        // Map enrichment fields from imported contact
        const mappings = [
          [IC.COMPANY_DESCRIPTION, CO.COMPANY_DESCRIPTION],
          [IC.COMPANY_TYPE, CO.COMPANY_TYPE],
          [IC.COMPANY_SIZE, CO.COMPANY_SIZE],
          [IC.COMPANY_ANNUAL_REVENUE, CO.ANNUAL_REVENUE],
          [IC.WEBSITE, CO.WEBSITE],
          [IC.COMPANY_STREET, CO.ADDRESS],
          [IC.COMPANY_CITY, CO.CITY],
          [IC.COMPANY_STATE, CO.STATE_REGION],
          [IC.COMPANY_COUNTRY, CO.COUNTRY],
          [IC.COMPANY_POSTAL_CODE, CO.POSTAL_CODE],
          [IC.COMPANY_NAICS_CODE, CO.NAICS_CODE],
        ];

        for (const [icField, coField] of mappings) {
          const val = ic.get(icField);
          if (val) companyFields[coField] = val;
        }

        // Industry needs typecast (single select)
        const industry = ic.get(IC.COMPANY_INDUSTRY);
        if (industry) companyFields[CO.INDUSTRY] = industry;

        // Founding year is a number
        const foundingYear = ic.get(IC.COMPANY_FOUNDING_YEAR);
        if (foundingYear) {
          const parsed = parseInt(foundingYear);
          if (!isNaN(parsed)) companyFields[CO.FOUNDING_YEAR] = parsed;
        }

        companyId = await createCompany(companyFields);
        console.log(`  Company CREATED: "${companyName}" (${companyId})`);
        // Add to the cached list so subsequent contacts can match
        companies.push({ id: companyId, name: companyName });
      }
    }
  }

  // Resolve Specialties
  const specialtyNames = ic.get(IC.SPECIALITY_MULTISELECT) || [];
  let specialtyIds = [];
  if (specialtyNames.length > 0) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would resolve ${specialtyNames.length} specialties: ${specialtyNames.join(', ')}`);
    } else {
      specialtyIds = await resolveSpecialties(specialtyNames);
      console.log(`  Specialties: ${specialtyIds.length} linked`);
    }
  }

  // Build Contact record
  const contactFields = {
    [C.CONTACT_NAME]: fullName,
    [C.FIRST_NAME]: firstName,
    [C.LAST_NAME]: lastName,
    [C.IMPORTED_CONTACTS_LINKED]: [recordId],
  };

  // Map simple text/url/phone fields
  const fieldMappings = [
    [IC.JOB_TITLE, C.JOB_TITLE],
    [IC.EMAIL, C.EMAIL],
    [IC.PHONE, C.PHONE],
    [IC.MOBILE_PHONE, C.MOBILE_PHONE],
    [IC.WORK_PHONE, C.WORK_PHONE],
    [IC.LINKEDIN_URL, C.LINKEDIN_URL],
    [IC.WEBSITE, C.WEBSITE],
    [IC.ADDRESS_LINE, C.ADDRESS_LINE],
    [IC.CITY, C.CITY],
    [IC.STATE, C.STATE],
    [IC.COUNTRY, C.COUNTRY],
    [IC.POSTAL_CODE, C.POSTAL_CODE],
    [IC.NOTES, C.NOTES],
    [IC.EVENT_TAGS, C.EVENT_TAGS],
  ];

  for (const [icField, cField] of fieldMappings) {
    const val = ic.get(icField);
    if (val) contactFields[cField] = val;
  }

  // Company text (backward compat while text field still exists)
  if (companyName) contactFields[C.COMPANY_TEXT] = companyName;

  // Select/multi-select fields (need typecast)
  const importSource = ic.get(IC.IMPORT_SOURCE);
  if (importSource) contactFields[C.IMPORT_SOURCE] = importSource;

  const importDate = ic.get(IC.IMPORT_DATE);
  if (importDate) contactFields[C.IMPORT_DATE] = importDate;

  const tags = ic.get(IC.TAGS);
  if (tags && tags.length > 0) contactFields[C.TAGS] = tags;

  const categorization = ic.get(IC.CATEGORIZATION);
  if (categorization) contactFields[C.CATEGORIZATION] = categorization;

  contactFields[C.ONBOARDING_STATUS] = 'Approved';

  // Linked records
  if (companyId) contactFields[C.COMPANIES_LINKED] = [companyId];
  if (specialtyIds.length > 0) contactFields[C.SPECIALTIES_LINKED] = specialtyIds;

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create contact: "${fullName}"`);
    if (companyId) console.log(`  [DRY RUN] Would link to company: ${companyId}`);
    if (specialtyIds.length > 0) console.log(`  [DRY RUN] Would link ${specialtyIds.length} specialties`);
    return { dryRun: true };
  }

  const contactId = await createContact(contactFields);
  console.log(`  Contact CREATED: "${fullName}" (${contactId})`);

  // Link back to Imported Contact
  await updateImportedContact(recordId, {
    [IC.RELATED_CRM_CONTACT]: [contactId],
    [IC.SYNC_TO_CONTACTS]: true,
  });
  console.log(`  Linked back + checkbox set`);

  return { success: true, contactId, companyId };
}

async function processAllApproved() {
  console.log('Fetching approved, unlinked imported contacts...');
  const records = [];
  await base(TABLES.IMPORTED_CONTACTS)
    .select({
      filterByFormula: 'AND({Onboarding Status} = "Approved", {Related CRM Contact} = BLANK())',
      fields: [IC.FIRST_NAME, IC.LAST_NAME, IC.ONBOARDING_STATUS],
    })
    .eachPage((page, next) => {
      records.push(...page);
      next();
    });

  console.log(`Found ${records.length} to process.`);
  if (records.length === 0) return [];

  // Fetch companies once for all contacts
  const companies = await fetchAllCompanies();
  console.log(`Loaded ${companies.length} existing companies for matching.`);

  const results = [];
  for (const record of records) {
    const result = await processImportedContact(record.id, companies);
    results.push({ id: record.id, ...result });
    // Rate limit: stay under 5 req/sec
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--dry');
  const target = args[0];

  if (DRY_RUN) console.log('=== DRY RUN MODE ===\n');

  if (!target) {
    console.log('Usage:');
    console.log('  node approve-contact.js <recordId>   Process one contact');
    console.log('  node approve-contact.js --all        Process all approved');
    console.log('  Add --dry for dry run mode');
    process.exit(1);
  }

  if (target === '--all') {
    const results = await processAllApproved();
    const succeeded = results.filter(r => r.success).length;
    const skipped = results.filter(r => r.skipped).length;
    const dryRun = results.filter(r => r.dryRun).length;
    console.log(`\nDone. ${succeeded} created, ${skipped} skipped, ${dryRun} dry run.`);
  } else {
    const companies = await fetchAllCompanies();
    await processImportedContact(target, companies);
    console.log('\nDone.');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.statusCode) console.error('Status:', err.statusCode);
  process.exit(1);
});
