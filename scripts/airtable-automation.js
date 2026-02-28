/**
 * Airtable Automation Script — Approve Imported Contact
 *
 * Trigger: When "Onboarding Status" changes to "Approved"
 * Action:  Run this script
 *
 * What it does:
 * 1. Reads the triggering Imported Contact record
 * 2. Fuzzy-matches or creates a Company
 * 3. Resolves Specialties to linked records (creates new if needed)
 * 4. Creates a Contact with all fields mapped
 * 5. Links the Contact back to the Imported Contact
 *
 * Setup in Airtable:
 * 1. Go to Automations tab
 * 2. Create new automation
 * 3. Trigger: "When a record matches conditions"
 *    - Table: Imported Contacts
 *    - Condition: Onboarding Status = "Approved"
 *    - AND: Related CRM Contact is empty
 * 4. Action: "Run a script"
 * 5. Paste this entire script
 * 6. In the input config panel on the left, add:
 *    - recordId (text): Click "+" and select the record ID from the trigger
 */

// ============================================================
// CONFIG — Input variable from automation trigger
// ============================================================
const inputConfig = input.config();
const recordId = inputConfig.recordId;

if (!recordId) {
    throw new Error('No recordId provided. Add recordId to the input config.');
}

// ============================================================
// TABLE & FIELD IDS
// ============================================================
const TABLES = {
    CONTACTS: 'tbl9Q8m06ivkTYyvR',
    IMPORTED_CONTACTS: 'tblribgEf5RENNDQW',
    COMPANIES: 'tblEauAm0ZYuMbHUa',
    SPECIALTIES: 'tblysTixdxGQQntHO',
};

// Imported Contacts fields
const IC = {
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
};

// Contacts fields
const C = {
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
};

// Companies fields
const CO = {
    COMPANY_NAME: 'fldVYiMOLq3LJgbZ3',
    INDUSTRY: 'fldPz4rknFpmEXZAD',
    WEBSITE: 'fldVBnFiEeyDf9oCg',
    ADDRESS: 'fldyd3pnfJ5PCwwQD',
    CITY: 'fldJGkGiCoxduD4sg',
    STATE_REGION: 'fldNekCaGCR56MLcJ',
    COUNTRY: 'fldjvoxUo8iuKITjB',
    CREATED_DATE: 'fldxQpzFGadejLLVp',
    COMPANY_DESCRIPTION: 'fldIDywGKU18pEndd',
    FOUNDING_YEAR: 'fldZaxAXqeImQcuzW',
    NAICS_CODE: 'fldL93N86XiMu5sUn',
    COMPANY_TYPE: 'fldSgiy8i2QUTmZbX',
    COMPANY_SIZE: 'fld0FFqLVasuvG9Uf',
    ANNUAL_REVENUE: 'fldMaVs106qf6Gmqp',
    POSTAL_CODE: 'fldqa7L8FPSeSQ9xG',
};

// Specialties fields
const S = {
    SPECIALTY_NAME: 'fldLVp1uePoKCuJlM',
};

const FUZZY_MATCH_THRESHOLD = 0.8;

// ============================================================
// HELPERS
// ============================================================

// Dice coefficient string similarity (same algorithm as string-similarity npm)
function compareTwoStrings(a, b) {
    a = a.replace(/\s+/g, '');
    b = b.replace(/\s+/g, '');
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigramsA = new Map();
    for (let i = 0; i < a.length - 1; i++) {
        const bigram = a.substring(i, i + 2);
        bigramsA.set(bigram, (bigramsA.get(bigram) || 0) + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const bigram = b.substring(i, i + 2);
        const count = bigramsA.get(bigram) || 0;
        if (count > 0) {
            bigramsA.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (a.length - 1 + b.length - 1);
}

function getField(record, fieldId) {
    return record.getCellValue(fieldId);
}

function getFieldText(record, fieldId) {
    const val = record.getCellValueAsString(fieldId);
    return val || '';
}

// ============================================================
// MAIN SCRIPT
// ============================================================

const icTable = base.getTable(TABLES.IMPORTED_CONTACTS);
const contactsTable = base.getTable(TABLES.CONTACTS);
const companiesTable = base.getTable(TABLES.COMPANIES);
const specialtiesTable = base.getTable(TABLES.SPECIALTIES);

// 1. Fetch the triggering Imported Contact
const icRecord = await icTable.selectRecordAsync(recordId, {
    fields: Object.values(IC),
});

if (!icRecord) {
    throw new Error(`Imported Contact not found: ${recordId}`);
}

// Check if already linked
const existingLink = getField(icRecord, IC.RELATED_CRM_CONTACT);
if (existingLink && existingLink.length > 0) {
    console.log(`SKIP: Already linked to contact ${existingLink[0].id}`);
    output.set('status', 'skipped');
    output.set('reason', 'already linked');
    // Early exit — don't throw, just stop
} else {
    // Parse name
    let firstName = getFieldText(icRecord, IC.FIRST_NAME);
    let lastName = getFieldText(icRecord, IC.LAST_NAME);
    const combinedName = getFieldText(icRecord, IC.NAME);

    if (!firstName && !lastName && combinedName) {
        const parts = combinedName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
    }

    const fullName = `${firstName} ${lastName}`.trim() || combinedName || '(unnamed)';
    const companyName = getFieldText(icRecord, IC.COMPANY);

    console.log(`Processing: ${fullName}`);
    console.log(`Company: ${companyName || '(none)'}`);

    // 2. Resolve Company — fuzzy match or create
    let companyId = null;

    if (companyName) {
        // Fetch all companies for matching
        const companyQuery = await companiesTable.selectRecordsAsync({
            fields: [CO.COMPANY_NAME],
        });

        let bestMatch = null;
        let bestScore = 0;

        for (const co of companyQuery.records) {
            const coName = co.getCellValueAsString(CO.COMPANY_NAME);
            if (!coName) continue;
            const score = compareTwoStrings(companyName.toLowerCase(), coName.toLowerCase());
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { id: co.id, name: coName };
            }
        }

        if (bestScore >= FUZZY_MATCH_THRESHOLD && bestMatch) {
            companyId = bestMatch.id;
            console.log(`Company MATCHED: "${bestMatch.name}" (${(bestScore * 100).toFixed(0)}%)`);
        } else {
            if (bestMatch) {
                console.log(`Company NO MATCH (best: "${bestMatch.name}" at ${(bestScore * 100).toFixed(0)}%)`);
            }

            // Create new company with enrichment data
            const companyFields = {
                [CO.COMPANY_NAME]: companyName,
                [CO.CREATED_DATE]: new Date().toISOString().split('T')[0],
            };

            const coMappings = [
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

            for (const [icField, coField] of coMappings) {
                const val = getFieldText(icRecord, icField);
                if (val) companyFields[coField] = val;
            }

            // Industry (single select)
            const industry = getFieldText(icRecord, IC.COMPANY_INDUSTRY);
            if (industry) companyFields[CO.INDUSTRY] = { name: industry };

            // Founding year (number)
            const foundingYear = getFieldText(icRecord, IC.COMPANY_FOUNDING_YEAR);
            if (foundingYear) {
                const parsed = parseInt(foundingYear);
                if (!isNaN(parsed)) companyFields[CO.FOUNDING_YEAR] = parsed;
            }

            companyId = await companiesTable.createRecordAsync(companyFields);
            console.log(`Company CREATED: "${companyName}" (${companyId})`);
        }
    }

    // 3. Resolve Specialties
    const specialtyField = getField(icRecord, IC.SPECIALITY_MULTISELECT);
    const specialtyNames = specialtyField
        ? (Array.isArray(specialtyField) ? specialtyField.map(s => s.name || s) : [])
        : [];

    let specialtyIds = [];

    if (specialtyNames.length > 0) {
        // Fetch existing specialties
        const specQuery = await specialtiesTable.selectRecordsAsync({
            fields: [S.SPECIALTY_NAME],
        });

        const existingMap = new Map();
        for (const r of specQuery.records) {
            const name = r.getCellValueAsString(S.SPECIALTY_NAME);
            if (name) existingMap.set(name.toLowerCase(), r.id);
        }

        for (const name of specialtyNames) {
            const normalized = name.trim();
            if (!normalized) continue;

            const existingId = existingMap.get(normalized.toLowerCase());
            if (existingId) {
                specialtyIds.push({ id: existingId });
            } else {
                const newId = await specialtiesTable.createRecordAsync({
                    [S.SPECIALTY_NAME]: normalized,
                });
                specialtyIds.push({ id: newId });
                existingMap.set(normalized.toLowerCase(), newId);
                console.log(`Created new specialty: "${normalized}"`);
            }
        }

        // Deduplicate
        const seen = new Set();
        specialtyIds = specialtyIds.filter(s => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });

        console.log(`Specialties: ${specialtyIds.length} linked`);
    }

    // 4. Build Contact record
    const contactFields = {
        [C.CONTACT_NAME]: fullName,
        [C.FIRST_NAME]: firstName,
        [C.LAST_NAME]: lastName,
        [C.IMPORTED_CONTACTS_LINKED]: [{ id: recordId }],
    };

    // Map text fields
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
        const val = getFieldText(icRecord, icField);
        if (val) contactFields[cField] = val;
    }

    // Company text field
    if (companyName) contactFields[C.COMPANY_TEXT] = companyName;

    // Select fields
    const importSource = getFieldText(icRecord, IC.IMPORT_SOURCE);
    if (importSource) contactFields[C.IMPORT_SOURCE] = { name: importSource };

    const importDate = getFieldText(icRecord, IC.IMPORT_DATE);
    if (importDate) contactFields[C.IMPORT_DATE] = importDate;

    // Tags (multi-select)
    const tags = getField(icRecord, IC.TAGS);
    if (tags && tags.length > 0) {
        contactFields[C.TAGS] = tags.map(t => ({ name: t.name || t }));
    }

    // Categorization (single select)
    const categorization = getFieldText(icRecord, IC.CATEGORIZATION);
    if (categorization) contactFields[C.CATEGORIZATION] = { name: categorization };

    // Onboarding status
    contactFields[C.ONBOARDING_STATUS] = { name: 'Approved' };

    // Linked records
    if (companyId) contactFields[C.COMPANIES_LINKED] = [{ id: companyId }];
    if (specialtyIds.length > 0) contactFields[C.SPECIALTIES_LINKED] = specialtyIds;

    // 5. Create the Contact
    const contactId = await contactsTable.createRecordAsync(contactFields);
    console.log(`Contact CREATED: "${fullName}" (${contactId})`);

    // 6. Link back to Imported Contact
    await icTable.updateRecordAsync(recordId, {
        [IC.RELATED_CRM_CONTACT]: [{ id: contactId }],
        [IC.SYNC_TO_CONTACTS]: true,
    });
    console.log(`Linked back + checkbox set`);

    // Set output for downstream automation actions
    output.set('status', 'created');
    output.set('contactId', contactId);
    output.set('contactName', fullName);
    if (companyId) output.set('companyId', companyId);
}
