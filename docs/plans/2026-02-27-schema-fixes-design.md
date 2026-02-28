# ILS CRM Schema Fixes — Design Document
**Date**: 2026-02-27
**Status**: Approved

## Problem Statement

Three interconnected issues in the ILS CRM Airtable base:

1. **Specialties system is broken** — Multi-select "Speciality" field has 82 options with duplicates. Specialties lookup table exists but is completely empty/unused.
2. **Imported Contacts → Contacts pipeline is stalled** — 41 of 43 imported contacts stuck in "Review". Existing automation is buggy (inconsistent linking).
3. **No Company auto-creation** — When a contact is approved, their company isn't created in or linked to the Companies table.

## Design

### Fix 1: Specialties Migration to Lookup Table

**Decision**: Kill the multi-select fields. Use ONLY the Specialties lookup table.

**Steps**:
1. Deduplicate 82 options → ~68 canonical names
   - Merge: "ProjectDevelopment" → "Project Development"
   - Merge: "broadway producer" / "Broadway Producer" → "Broadway Producer"
   - Merge: "InteriorDesign" → "Interior Design"
   - Merge: "RideSystems" → "Ride Systems"
   - Merge: "FamilyEntertainment" → "Family Entertainment"
   - Fix casing: "photographer" → "Photographer", "feasibility" → "Feasibility"
   - Remove true duplicates (Architect x2, Cruiseline x2, Broadway Producer x3)
2. Populate Specialties table — one row per unique specialty
3. Link records — read each Contact/Imported Contact's multi-select values, find matching Specialties rows, create linked records
4. Remove multi-select "Speciality" fields from Contacts and Imported Contacts
5. Update ContactEnricher's `ils-crm-sync.ts` to use linked records

**Adding new specialties**: Add a row to Specialties table. Link it to contacts. No duplicates possible.

### Fix 2: Imported Contacts → Contacts Approval Flow

**Trigger**: Onboarding Status changes to "Approved"

**Implementation**: Airtable Automation + Webhook Script (hybrid)

**Flow**:
1. Airtable Automation triggers on status change → calls webhook
2. Webhook script (in `ils-crm/scripts/`):
   - Fuzzy match company name against Companies table (>80% = match)
   - If match → use existing Company record
   - If no match → create new Company record
   - Look up Specialties, create any new ones
   - Create Contact record with all fields mapped + Company linked + Specialties linked
   - Set "Related CRM Contact" on Imported Contact
   - Set "Sync to Contacts" checkbox = true

### Fix 3: Company Auto-Creation with Fuzzy Match

**Part of Fix 2** — when the webhook script processes an approved imported contact:
1. Extract company name from imported contact
2. Fetch all Companies from Companies table
3. Fuzzy match (Levenshtein distance or similar, >80% threshold)
4. If match found → link to existing Company
5. If no match → create new Company with: name, industry (if available), address fields
6. Link the new Contact to the Company via the "Companies" linked field

## ContactEnricher Impact

- `ils-crm-sync.ts` must be updated to write Specialties as linked records instead of multi-select
- The `ILS_CRM_OPTIONS.speciality` constant becomes a lookup to the Specialties table instead of a hardcoded list
- `getIlsCrmOptions()` function updated to fetch from Specialties table
- No changes needed to the Cleanup base sync

## Migration Plan

1. Run deduplication script (one-time)
2. Populate Specialties table
3. Migrate existing contact specialty data to linked records
4. Verify all links are correct
5. Update ContactEnricher code
6. Remove multi-select fields
7. Set up Airtable automation + webhook script
8. Test full flow: import → review → approve → contact + company created
