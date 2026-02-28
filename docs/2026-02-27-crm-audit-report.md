# ILS CRM Airtable Audit Report
**Date**: 2026-02-27

## Record Counts

| Table | Records | Status |
|---|---|---|
| Contacts | 20 | Active |
| Companies | 60 | ~24 duplicates |
| Opportunities | 54 | 44% are "Future Roadmap" |
| Projects | 2 | Barely used (1 test) |
| Proposals | 16 | 8+ are test data |
| Tasks | 43 | Active |
| Interactions | 0 | **Completely empty** |
| Imported Contacts | 46 | 44 stuck in Review |
| Specialties | 2 | **Empty/unused** |
| Portal Access | 10 | Working |
| Portal Logs | 8 | Working |

## Critical Issues

### 1. Contacts ↔ Companies: BROKEN
- 19 of 20 contacts have company as plain text, NOT linked to Companies table
- Only 1 contact uses the linked Companies field
- Cannot navigate from Company → its Contacts

### 2. Opportunities ↔ Contacts: WEAK
- 50 of 54 opportunities have NO associated contact
- Cannot answer "what deals is this person involved in?"

### 3. Duplicate Companies (~24 records)
Disney Cruise Line x2, Live Nation x2, BCG x2, Universal Creative x2, MSC Cruises x2, SoFi Stadium x2, Hard Rock x2, Virgin Voyages x2, McKinsey x2, AtkinsRealis x2, DXB Entertainments x2

### 4. Test Data Contamination
- 8+ test proposals to delete
- 1 blank opportunity, 1 blank task
- "Edward Hodge" appears twice in Contacts (test entries)

### 5. Interactions Table: Zero Records
CRM has no relationship history logged.

### 6. Imported Contacts Pipeline Stalled
- 44 of 46 stuck in "Review"
- All imported on same date (2026-01-20), no review since
- Some duplicates with existing Contacts (not linked)

### 7. AI Categorization Fields Broken
Every record shows `emptyDependency` error on both Contacts and Imported Contacts.

### 8. Proposals Inline Tasks Anti-Pattern
25 inline task fields (Task 1-5 x 5 fields) should use linked Tasks table instead.

### 9. Speciality Duplicates
"Broadway Producer" x6 on one record, "ProjectDevelopment" vs "Project Development", mixed casing.

## Schema Issues

1. **Company stored 3 ways** — text field, linked field, Companies table
2. **Speciality stored 2 ways** — multi-select + empty lookup table
3. **Portal Access has duplicate contact info** — lookups AND standalone text fields
4. **Phone numbers fragmented** — 3 fields on Contacts, 6 on Imported Contacts
5. **No "Closed Won" stage** on Opportunities
6. **No Pipeline separation** — Future Roadmap mixed with active deals
7. **Missing formulas** — Days Since Last Contact, Weighted Value, Days in Stage

## Prioritized Fixes

### P1: Critical (This Week)
1. Merge ~24 duplicate Companies
2. Link all 20 Contacts to their Company records
3. Delete blank/test records (1 opp, 1 task, 8+ test proposals)
4. Fix or delete broken AI Categorization fields
5. Move "Future Client" opportunities to separate view

### P2: High (This Month)
6. Link Contacts to Opportunities (50 missing)
7. Process 44 imported contacts stuck in Review
8. Delete 25 inline Task fields from Proposals
9. Clean up Speciality options (dedup, fix casing)
10. Start logging Interactions
11. Set up Kanban view on Opportunities

### P3: Medium (Next Month)
12. Add "Closed Won" stage + automation to create Project
13. Add Expected Close Date to Opportunities
14. Build Sales Dashboard Interface
15. Task overdue automation
16. Add Days Since Last Contact formula
17. Add Weighted Value formula to Opportunities

## Key Insight

The CRM is used primarily as a **pipeline tracker** (Opportunities + Tasks). The relational features (Company → Contacts → Opportunities → Projects) are NOT being utilized. This means the core CRM value — seeing the full picture of a relationship — is missing.
