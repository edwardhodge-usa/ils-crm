# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM project — Airtable schema management, API integrations, and eventually a full Electron desktop CRM app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Airtable API (backend/data), Anthropic Claude API (AI features)
- **Status**: MVP complete — All 7 phases built, /grill review fixes applied, ready for testing
- **Repo**: edwardhodge-usa/ils-crm
- **Airtable Base**: ILS CRM (appYXbUdcmSwBoPFU)

## Project Scope

This project is the **single source of truth** for all ILS CRM Airtable work:

1. **Airtable Schema** — Design, improve, and maintain the ILS CRM base (11 tables, 280+ fields)
2. **ContactEnricher Coordination** — The ContactEnricher app syncs contacts to this CRM; schema changes here must stay compatible
3. **CRM Desktop App** — Eventually build a full Electron app for managing the CRM (contacts, companies, opportunities, projects, proposals)
4. **Automations & Scripts** — Airtable automations, data migration scripts, API utilities

## Airtable Base Structure

Base ID: `appYXbUdcmSwBoPFU`

| Table | ID | Fields | Purpose |
|-------|-----|--------|---------|
| Contacts | tbl9Q8m06ivkTYyvR | 55 | People — 59 records, all linked to Companies |
| Companies | tblEauAm0ZYuMbHUa | 24 | Organizations — 70 records (deduped from 60) |
| Opportunities | tblsalt5lmHlh4s7z | 23 | Sales pipeline — 53 records, views: Active Pipeline, Future Roadmap, Kanban |
| Projects | tbll416ZwFACYQSm4 | 18 | Active project tracking |
| Proposals | tblODEy2pLlfrz0lz | 13 | Client proposals — inline task fields removed, uses linked Tasks |
| Tasks | tblwEt5YsYDP22qrr | 13 | Action items — has Overdue formula field |
| Interactions | tblTUNClZpfFjhFVm | 9 | Communication log — ready to use, 0 records |
| Imported Contacts | tblribgEf5RENNDQW | 48 | Staging area — all 46 records processed/approved |
| Specialties | tblysTixdxGQQntHO | 3 | Lookup table — 70 canonical entries, linked from Contacts |
| Portal Access | tblN1jruT8VeucPKa | 36 | Client portal access records |
| Portal Logs | tblj70XPHI7wnUmxO | 12 | Portal activity logging |

## Schema Changes Log (2026-02-27)

**Fields removed:** AI Categorization Suggestion (Contacts + Imported Contacts), Speciality multi-select (Contacts + Imported Contacts), 25 inline Task fields from Proposals
**Fields added:** Days Since Last Contact (Contacts), Weighted Value + Days in Stage (Opportunities), Overdue (Tasks)
**Formula fixed:** Probability Value — uses FIND() to match '01 High', '02 Medium' prefixed values (confirmed working)
**Table renamed:** Opportunites → Opportunities (typo fix)
**Fields removed (Portal Access):** Contact Speciality lookup (invalid, source field deleted)
**Views added:** Active Pipeline, Future Roadmap, Kanban (Opportunities)
**Schema decision:** Categorization is primary classification field; Client Type to be deprecated
**Key relationship:** Contacts → Companies (linked via "Companies" field fldYXDUc9YKKsGTBt), Contacts → Specialties (linked via "Specialties" field fldPgiO2nKgcujeXz)

## Related Projects

- **ContactEnricher** (`03_Custom Apps/ContactEnricher/`) — Syncs Apple Contacts to ILS CRM Contacts table. `ils-crm-sync.ts` fully uses linked records for Specialties (commit `2a8ce6a`). Dead `F.speciality` field ref removed, fallback list updated with Broadway Producer + Feasibility.
- **imaginelab-portal** — Reads Portal Access and Portal Logs tables. Changes to those tables must be validated against portal code
- **Personal Contact Cleanup** (appQUqpRbUR6e7cUd) — Separate Airtable base, all contacts staging area

## Lessons Learned

<!-- Format: **[Date]** - Issue description -> Solution -->

**2026-02-27** - Airtable API cannot create formula fields → Provide exact formulas for manual creation in Airtable UI
**2026-02-27** - Airtable API cannot create views or interfaces → Document specs for manual creation
**2026-02-27** - Airtable API cannot delete fields → Update field description to flag for deletion, user deletes manually
**2026-02-27** - Airtable MCP list_records can return huge JSON that exceeds token limits → Use a subagent to read/analyze the saved file in chunks
**2026-02-27** - AI text fields (aiText type) show `emptyDependency` when ANY referenced field is empty on a record → Don't use AI fields that depend on optional fields; use manual select fields instead
**2026-02-27** - Probability Value formula was broken: checked for 'High' but actual value was '01 High' → Use FIND() instead of exact match when Airtable select options have prefixes
**2026-02-27** - When merging duplicate company records, check for linked records on BOTH duplicates before deleting → Only 1 of 12 duplicates needed re-pointing, but missing it would break an opportunity link
**2026-02-27** - Speciality multi-select had 82 options with duplicates/casing issues → Migrated to Specialties lookup table (linked records). Multi-select fields allow duplicates; lookup tables don't
**2026-02-27** - ContactEnricher was already 95% migrated to linked records — only needed dead field ref cleanup, not a rewrite → Always read the code before assuming a migration is needed
**2026-02-27** - SQL injection via dynamic column names in sql.js queries (`${key} = ?`) → Always whitelist table names (Set) and validate column names (regex `/^[a-z_][a-z0-9_]*$/`) before interpolating into SQL
**2026-02-27** - Polling sync with no mutex causes race conditions when sync takes longer than poll interval → Add `isSyncing` guard flag with `finally` cleanup; also guard "Force Sync" button
**2026-02-27** - IPC handlers registered before `initDatabase()` causes crash if renderer sends early messages → Register IPC handlers AFTER `await initDatabase()` inside `app.whenReady()`
**2026-02-27** - `JSON.parse()` without try-catch on linked/multiSelect fields kills entire push operation on corrupted data → Use `safeParseArray()` helper that returns `[]` on parse failure
**2026-02-27** - `saveDatabase()` after every sql.js write = 380+ disk writes during fullSync → Remove per-write saves; rely on 30s auto-save + explicit save at end of sync. Keep saves only for rare user actions (settings)
**2026-02-27** - Pull sync deletes locally-created records that haven't been pushed yet → Check `_pending_push` flag before deleting records not found in Airtable
**2026-02-27** - Hardcoded Airtable base ID fallback (`|| 'appYXbUdcmSwBoPFU'`) means forks silently hit wrong base → Never hardcode base IDs; require explicit configuration and return error if missing
**2026-02-27** - `unknown` type in `Record<string, unknown>` isn't assignable to `ReactNode` for conditional rendering → Use `{Boolean(obj.prop) && <jsx>}` instead of `{obj.prop && <jsx>}`
**2026-02-27** - Tech debt: utility functions copy-pasted across query files (`resultToObjects` 3x, `linkedIds`/`multiSelect` identical) → Extract shared utils into dedicated module (`database/utils.ts`); merge identical functions
**2026-02-27** - Tech debt: 9 list pages and 6 form pages had identical load/save boilerplate → Extract `useEntityList` and `useEntityForm` hooks to eliminate repeated useState/useEffect/error patterns
**2026-02-27** - Tech debt: preload.ts had 6 identical CRUD bridge blocks differing only by channel prefix → Use `makeCrudBridge(entity)` factory function; spread for special cases (importedContacts)
**2026-02-27** - Tech debt: route config duplicated in Sidebar, TopBar, and Layout → Consolidate into `src/config/routes.ts` with `NAV_ITEMS`, `ROUTE_TITLES`, `NEW_ROUTES`
**2026-02-27** - Tech debt: dead code accumulated during rapid MVP build (7 unused functions, unused EmptyState component, unused SELECT_OPTIONS, pending_changes table) → Run /techdebt scan after MVP completion to identify and remove

## Key Commands

```bash
# Development
npm run dev          # Start Electron app in dev mode
npm run build        # Build for production
npm run package      # Package with electron-builder

# Airtable
# All Airtable operations go through the MCP tools or API scripts in /scripts
```

## References

- Shared patterns: `@../_master/` (Electron, Tailwind, Vercel)
- Global preferences: `~/CLAUDE.md`

## Update Protocol

When Claude makes a mistake: **"Update CLAUDE.md so you don't make that mistake again."**
