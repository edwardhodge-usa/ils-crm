// All Airtable field IDs for the ILS CRM base (appYXbUdcmSwBoPFU)
// Source: docs/schema-summary.md — 11 tables, 256+ fields

// ─── Table IDs ───────────────────────────────────────────────

export const TABLES = {
  contacts: 'tbl9Q8m06ivkTYyvR',
  opportunities: 'tblsalt5lmHlh4s7z',
  tasks: 'tblwEt5YsYDP22qrr',
  proposals: 'tblODEy2pLlfrz0lz',
  projects: 'tbll416ZwFACYQSm4',
  interactions: 'tblTUNClZpfFjhFVm',
  importedContacts: 'tblribgEf5RENNDQW',
  companies: 'tblEauAm0ZYuMbHUa',
  specialties: 'tblysTixdxGQQntHO',
  portalAccess: 'tblN1jruT8VeucPKa',
  portalLogs: 'tblj70XPHI7wnUmxO',
} as const

// ─── Contacts (57 fields) ────────────────────────────────────

export const CONTACTS = {
  // Single Line Text
  contactName: 'fldMkz6x5i8YaofZj', // primary
  firstName: 'fldBzVPUdMy99vfvp',
  lastName: 'fldq4VxEf0jJgi6O5',
  jobTitle: 'fldvecarEW7fx90Ci',
  company: 'fldTwuGnEhbQfZhP3',
  importedContactName: 'fldnukky57mRgMpxv',
  addressLine: 'fldxn8YVJ1pWGkaF8',
  city: 'fldAoanFJ1Fmrzkx5',
  state: 'fld1qq6PMLW6Ytbig',
  country: 'fldnTdpTO4njtc4gZ',
  postalCode: 'fldGgFJJ7XeLAR17a',

  // Multi-Line Text
  notes: 'fldfbmMsacAKerGek',
  reviewNotes: 'fldB5b9qTiIUkdiLk',
  reasonForRejection: 'fldDwXhduziJxKyCx',
  rateInfo: 'fldFX8WvENPPkN6g1',
  leadNote: 'fldWtoMSWdFla3dII',
  eventTags: 'fld1D4u2KbIk0aUPR',

  // Email
  email: 'fldBjSvbdd5WXmoIG',

  // Phone
  phone: 'fldwF5NBjGVndCXNV',
  mobilePhone: 'fldwULn4qSjwzSOTj',
  workPhone: 'fldueNgIMN0Ui5MWw',

  // URL
  linkedInUrl: 'fldWrrBfD7aLxsXT4',
  website: 'fldnWic86lLjcF9MR',

  // Number
  leadScore: 'fldxNhfwoMf7UWVoT',

  // Date
  lastContactDate: 'fldoILwnnEloVrzLk',
  importDate: 'fldoeYmeSZDrd7Y25',
  reviewCompletionDate: 'fld6gBrJu9XCGAIll',

  // Single Select
  qualificationStatus: 'fld5Ed1Gg51xRBIrm',
  leadSource: 'fldxxbhPmFaJ7xZeK',
  clientType: 'fldF8X4HZbybc1Yy6',
  industry: 'fldHoIj9zCNB15avX',
  importSource: 'fldZG5LYBnFcEwhyw',
  onboardingStatus: 'fldbCsU8sEBNRm1kX',
  categorization: 'fldofD9DQHfugTxsC',
  qualityRating: 'fldz86orj3p0ynZGB',
  reliabilityRating: 'fldgIuvazBCfLa7Wu',
  partnerStatus: 'fldIEgv4HtZTr57AX',
  partnerType: 'fldvehyP9Y3Ra2wUM',

  // Multiple Select
  tags: 'fldO7kfLDA9jZswPB',

  // Checkbox
  syncToContacts: 'fldxbLMAKgqeawWkw',

  // Linked Records
  specialties: 'fldPgiO2nKgcujeXz',
  proposals: 'fldPxLDh74yCpYwuF',
  salesOpportunities: 'fldYhB3vDq28worr9',
  importedContacts: 'fldj08SdhFcsYpRva',
  interactions: 'fldgWTSW7dKdCZPFl',
  tasks: 'fldsWpetRKu2E4e9U',
  projects: 'fldtExCKnttD4XsMe',
  companies: 'fldYXDUc9YKKsGTBt',
  projectsAsPartnerVendor: 'fldOOrElk4KRkSxcG',
  portalAccess: 'fld0W66oRTQwvb9Nq',

  // Rollup
  lastInteractionDate: 'fldptkl81ex4SvQYN',

  // Collaborator
  importedBy: 'fldO7a9QFfKQ7tbkg',
  assignedAdmin: 'fld5dsmbFIwgU5UHk',

  // Created By
  createdBy: 'fld18NNjUH4xe7kSS',

  // Attachments
  contactPhoto: 'fldl1WOfz7vHNSOUd',
  companyLogo: 'flduN4Ne23EIGSBS0',
  portfolioSamples: 'fldbhgP4g3zAoHnSR',
} as const

// ─── Opportunities (23 fields) ───────────────────────────────

export const OPPORTUNITIES = {
  // Single Line Text
  opportunityName: 'fldsvZbiY3YFK2Ocp', // primary
  referredBy: 'fldZ3V2AL5IFj6W1G',

  // Multi-Line Text
  notesAbout: 'fldLZDfABWEJ9fCyZ',
  contractMilestones: 'fldLjPejA0TcYj8R8',
  lossNotes: 'fldVOzXUQ5lMYzcVp',

  // Currency
  dealValue: 'fld1y3pUaljvn2nF5',

  // Date
  expectedCloseDate: 'fldpSYPc9Mf1hRhdU',

  // Date/Time
  nextMeetingDate: 'fld7ZbwNVRSKCOly8',

  // Single Select
  salesStage: 'fldMV4ZUWb0h1pyPN',
  probability: 'fld4oRQmcZ3VaQeUP',
  qualsType: 'fldhJn8M3xeQYdPHG',
  leadSource: 'fldDr4GsoxjnNmpo1',
  winLossReason: 'fldEkMImrxZQMnuCJ',

  // Multiple Select
  engagementType: 'fldYvZ8T1Iy7r91z5',

  // Checkbox
  qualificationsSent: 'flda4mTsRoIiFqVZL',

  // Linked Records
  company: 'fldYyFlO4LavZM5gI',
  associatedContact: 'fldit4f09UfFrzSUB',
  tasks: 'fldBGsrhhPk7egFL1',
  interactions: 'fldyL4Obl1EfVvpVU',
  project: 'fldrOFbZgxZ6izAla',
  proposals: 'fldQNa9p8jAEnrZB2',

  // Formula (read-only)
  probabilityValue: 'flda4MrS0FecCa4TO',

  // Attachments
  attachments: 'fldVld8A8bfeyPnJG',
} as const

// ─── Tasks (12 fields) ───────────────────────────────────────

export const TASKS = {
  task: 'fldfYqgokx0nP9jrq', // primary
  notes: 'fldwi4Fm7aOdyh7R3',
  dueDate: 'fldrV9zjZGNlm2znw',
  completedDate: 'fldOE0MEitlXCeC5e',
  status: 'fld5j051j1H7rPmbw',
  type: 'fldXcqtkVSh60H20b',
  priority: 'fldREFoOWpRN4Ejfg',
  salesOpportunities: 'fldhzkBEvT2UlcW7g',
  contacts: 'fldyzxf3dGGCT02t0',
  projects: 'fldtxrwOzmkpjVtdj',
  proposal: 'fldB9nEqdI6EZMfPo',
  assignedTo: 'fldtfWkEqvv5YHODj',
} as const

// ─── Proposals (13 fields) ───────────────────────────────────

export const PROPOSALS = {
  proposalName: 'fld5Y8fCuS1jhkWF2', // primary
  version: 'fldQ8g5iqtMPHxb8S',
  clientFeedback: 'fldhUnP1A7gxJNaxe',
  performanceMetrics: 'fldZeAOE1WpLOY3aH',
  notes: 'fldryZ3MW513WcmrK',
  status: 'fldBzyWMITVJdZyRl',
  templateUsed: 'fldAOt35mhF1ne0UK',
  approvalStatus: 'fldwWCRdvqYVTXZ12',
  client: 'fldoz0V3WTPup4zv8',
  company: 'fldxxsjKV66IhPKzL',
  relatedOpportunity: 'fldPs5pFveiqZbpnn',
  tasks: 'fldQARjLcMpanbY6m',
  createdBy: 'fld9TDETWFG7tFusb',
} as const

// ─── Projects (18 fields) ────────────────────────────────────

export const PROJECTS = {
  projectName: 'fldkrhZTZ6pFweiBx', // primary
  location: 'fldFwzNbpWAL9tV8R',
  description: 'fldr8mgLCY9ISv4Bd',
  keyMilestones: 'fld19Ezi7Md5PPWxQ',
  lessonsLearned: 'fldKxqY5ZYIrCIOgU',
  contractValue: 'fld4J4KCazP7C1IMC',
  startDate: 'fldTOw6VgwsvJXW7O',
  targetCompletion: 'fldID5gpDgtmQDVUd',
  actualCompletion: 'fldKc3rU95N8sCDdg',
  status: 'fld4Pv2FM3skC3chQ',
  engagementType: 'fld5nII1Fq8N1LVEO',
  salesOpportunities: 'fldUKkazQiEmhIH4E',
  client: 'fldMMHrrBsAHvyQ0e',
  tasks: 'fldizOqFE6ParTzho',
  primaryContact: 'fld5uAeJxjSB3WCqs',
  contacts: 'fldTphE0ecQivlxxD',
  projectLead: 'fldDKZQgxaaAej7mU',
  projectFiles: 'fld2qAFRKhP3v5js2',
} as const

// ─── Interactions (9 fields) ─────────────────────────────────

export const INTERACTIONS = {
  subject: 'fldMog5p49xWLD5Zb', // primary
  summary: 'fldqqHNLs8mXW2RRA',
  nextSteps: 'fldyh8QUnhF3hUsBV',
  date: 'fldOTeAY7Y0JDnaMF',
  type: 'fldsdGx3u8RPS8GrH',
  direction: 'fld9d6pw2GM3Syhag',
  contacts: 'fldNz08up6Zcn3HjK',
  salesOpportunities: 'fldgRf0WkgdcMLseJ',
  loggedBy: 'fldn0mHhKfd88K6z8',
} as const

// ─── Imported Contacts (48 fields) ───────────────────────────

export const IMPORTED_CONTACTS = {
  // Single Line Text
  importedContactName: 'fldKc8P6eYXjMpAJ6', // primary
  company: 'fld31Zl7X7DBZdL9K',
  firstName: 'fld7c1acCh17aOi0p',
  lastName: 'fldICvkgNbRG9dpqm',
  jobTitle: 'fldTHA6J24XaECMsz',
  email: 'fld9ejqJy5wjBqvrx',
  eventTags: 'fldwI75ClzRJ7lli0',
  addressLine: 'fld1Zpkm1Kms9XvRv',
  city: 'fldfS2EeVb5l3ic5h',
  state: 'fldIoe4TldH0WJUZj',
  country: 'fldljgJjsqMkpMbkc',
  companyFoundingYear: 'fldCgacbjwFoRlHIp',
  companyNaicsCode: 'fldehmtkMRlb4M5Zi',
  companyType: 'fldiB3195PfAK7Wfg',
  companySize: 'fldsJURWi2VvrvN2v',
  companyIndustry: 'fldiFajpEd7M14YBF',
  companyAnnualRevenue: 'fldLJr6gTu9zTeo0r',
  companyStreetAddress: 'fldwAf4k6bsI922O4',
  companyStreetAddress2: 'fldXhL0dxuxXxDnti',
  companyCity: 'fld4tMsuM8QhnhuZm',
  companyState: 'fldv9qnkGC3pnZQnv',
  companyCountry: 'fld4YLilZ2HdhmCse',
  companyPostalCode: 'fldamMPu4kkZGugZn',
  postalCode: 'fldIsJaEWbMOb2juI',

  // Multi-Line Text
  companyDescription: 'fldc5Aj4hRRZ4tIgE',
  note: 'fldMsJukGZt02TYVu',
  reasonForRejection: 'fld1A8rCPjuXYSGp1',
  reviewNotes: 'fldKYaclj13Bmut7D',

  // Phone
  phone: 'fldZfFoFsOrIW2wQZ',
  mobilePhone: 'fldm8LaalVz7l38PS',
  otherPhone: 'fld9wvepdWiVG4i70',
  workPhone: 'fld8MuOecNSVON5rD',
  officePhone: 'fldUkm871jdjXQloI',
  fax: 'fldBl4gTpGGFVEJOB',

  // URL
  linkedInUrl: 'fldzikDES0UdCd4FQ',
  website: 'fld57XgOQ9sFJOfof',
  contactPhotoUrl: 'fldNdNyWMAGEOfOyH',
  businessCardImageUrl: 'flduCN8BdOUkZeTTJ',

  // Date
  importDate: 'fldNa8uThfClQFB79',

  // Single Select
  categorization: 'fldrYKTLd2HnL7GSe',
  onboardingStatus: 'fldncdRP37p6BB9UX',
  importSource: 'fld1fDiNE3vhoyi3P',

  // Multiple Select
  tags: 'fldn2bUb5Khf7iumL',

  // Checkbox
  syncToContacts: 'fldjm5mEIT25nlWjT',

  // Linked Records
  specialties: 'fldlkF1wlCbxBQ3KJ',
  relatedCrmContact: 'fldDq3cetx5nrVqGo',

  // Collaborator
  importedBy: 'fldWK7U0Qj1dk8Ume',
  assignedAdmin: 'flds9MpvnwGkYX9Gi',
} as const

// ─── Companies (24 fields) ───────────────────────────────────

export const COMPANIES = {
  companyName: 'fldVYiMOLq3LJgbZ3', // primary
  address: 'fldyd3pnfJ5PCwwQD',
  city: 'fldJGkGiCoxduD4sg',
  stateRegion: 'fldNekCaGCR56MLcJ',
  country: 'fldjvoxUo8iuKITjB',
  referredBy: 'fldLLGU72wwf7LxEf',
  naicsCode: 'fldL93N86XiMu5sUn',
  companyType: 'fldSgiy8i2QUTmZbX',
  companySize: 'fld0FFqLVasuvG9Uf',
  annualRevenue: 'fldMaVs106qf6Gmqp',
  postalCode: 'fldqa7L8FPSeSQ9xG',
  notes: 'flddUZDFk4l9f377V',
  companyDescription: 'fldIDywGKU18pEndd',
  website: 'fldVBnFiEeyDf9oCg',
  foundingYear: 'fldZaxAXqeImQcuzW',
  createdDate: 'fldxQpzFGadejLLVp',
  type: 'fldtLJxxK5oT6Nzjn',
  industry: 'fldPz4rknFpmEXZAD',
  leadSource: 'fldSPGKJKbHclLzoD',
  salesOpportunities: 'fldbvXQ26UDd3SHAB',
  projects: 'fldtgQEptCxvaaAzk',
  contacts: 'fldQ2RK3PeAPMzkJB',
  proposals: 'fld8pQnDzVmyonJ45',
  attachments: 'fldhCu5ooToK84g4G',
} as const

// ─── Specialties (3 fields) ─────────────────────────────────

export const SPECIALTIES = {
  specialty: 'fldLVp1uePoKCuJlM', // primary
  importedContacts: 'fldPQWyanCOcXVxmL',
  contacts: 'fldVtUb9RqF03Ubq7',
} as const

// ─── Portal Access (37 fields) ──────────────────────────────

export const PORTAL_ACCESS = {
  // Direct fields (writable)
  name: 'fldqnVE5ppj8ACyf3', // primary
  email: 'fldU70JpJQ1GpbRNQ',
  pageAddress: 'fldkAjPIMUMlHNT2A',
  decisionMaker: 'fldn0nMxnqpHkLykk',
  company: 'fldYZ1Su7WnNPxf17',
  address: 'fldvaQB8wzgaLLn2Y',
  primaryContact: 'fldqESjieqvuj1k4P',
  positionTitle: 'fld2UX68BMEk768Ao',
  industry: 'fld8JNk7r3mQvco7V',
  notes: 'fldiOyYVt4QN8Yon4',
  phoneNumber: 'fldHVA9pJd2j2bJNi',
  website: 'fldJhqz0wngVDNxwt',
  projectBudget: 'fldQisibz3rZaC4mi',
  dateAdded: 'fld8m3xt2QOi2EF3b',
  expectedProjectStartDate: 'flduKP6vlsDlxZuGW',
  followUpDate: 'fldvhmfQXneMvWXD1',
  status: 'fldqbzNiTFt7jpdyW',
  leadSource: 'fldnIkdS9MSewsUqy',
  stage: 'fldYrwOrTeimfHC5c',
  servicesInterestedIn: 'fldcBIAHs2jpNkQbD',
  contact: 'fld1tMK48dxrLU9R4',

  // Formula (read-only)
  framerPageUrl: 'fldzVcWNLBnNQjwQ6',

  // Lookup fields (read-only)
  contactName: 'fldwGCWvBs8GCz5ka',
  contactCompany: 'fldbeA6Zdgcf6k4Si',
  contactEmail: 'fldtZJw7XdUeVGNcA',
  contactPhone: 'fldH8ZDUC4l0vKXpV',
  contactJobTitle: 'fldQbVqtuSO4KXgg9',
  contactIndustry: 'fldqTLSogKYG6wIwI',
  contactTags: 'fldM8HUiHkQy7tOFx',
  contactWebsite: 'fldX1QmphBEEZX7hr',
  contactAddressLine: 'fld55H7Qh189M9nTc',
  contactCity: 'fldocH6IhXiWnS1O9',
  contactState: 'fld95YpyLfDuEtgHQ',
  contactCountry: 'fldb9Nsoynf3zrZGr',

  // Collaborator
  assignee: 'fldQ0KnWXkFlInBu1',

  // Attachments
  attachments: 'fldCvoIAUEUg0DraC',
} as const

// ─── Portal Logs (12 fields) ─────────────────────────────────

export const PORTAL_LOGS = {
  id: 'fldZ9kEv2VoSs6Zhm', // primary (auto-number)
  clientEmail: 'fldbRGSVQ234FhLl5',
  clientName: 'fld09uABu5pMflwqw',
  company: 'fldHKPjjjj5qJ4jKj',
  ipAddress: 'fldD4kj0jIVeJ7Xjn',
  city: 'fldvJWb179RimoEVP',
  region: 'fldW4wHM9wNIap0Vf',
  country: 'fld2gGOgdCs4OZORY',
  userAgent: 'fldKPYPCJ8a77TiSZ',
  claritySession: 'fldlawC5fpW6SC7YJ',
  pageUrl: 'fldA8GMWwQMthnnta',
  timestamp: 'fldtntKgWXKanYEWZ',
} as const

// ─── Primary field IDs (for display name resolution) ─────────

export const PRIMARY_FIELDS: Record<string, string> = {
  [TABLES.contacts]: CONTACTS.contactName,
  [TABLES.opportunities]: OPPORTUNITIES.opportunityName,
  [TABLES.tasks]: TASKS.task,
  [TABLES.proposals]: PROPOSALS.proposalName,
  [TABLES.projects]: PROJECTS.projectName,
  [TABLES.interactions]: INTERACTIONS.subject,
  [TABLES.importedContacts]: IMPORTED_CONTACTS.importedContactName,
  [TABLES.companies]: COMPANIES.companyName,
  [TABLES.specialties]: SPECIALTIES.specialty,
  [TABLES.portalAccess]: PORTAL_ACCESS.name,
  [TABLES.portalLogs]: PORTAL_LOGS.id,
}
