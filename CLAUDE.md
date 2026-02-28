# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM project — Airtable schema management, API integrations, and eventually a full Electron desktop CRM app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Airtable API (backend/data), Anthropic Claude API (AI features)
- **Status**: Phase 0 — Schema audit & improvement
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
| Contacts | tbl9Q8m06ivkTYyvR | 59 | People — contacts, leads, partners, vendors |
| Companies | tblEauAm0ZYuMbHUa | 24 | Organizations linked to contacts |
| Opportunities | tblsalt5lmHlh4s7z | 23 | Sales pipeline & deals |
| Projects | tbll416ZwFACYQSm4 | 18 | Active project tracking |
| Proposals | tblODEy2pLlfrz0lz | 38 | Client proposals with inline tasks |
| Tasks | tblwEt5YsYDP22qrr | 12 | Action items across all entities |
| Interactions | tblTUNClZpfFjhFVm | 9 | Communication log |
| Imported Contacts | tblribgEf5RENNDQW | 50 | Staging area for bulk imports |
| Specialties | tblysTixdxGQQntHO | 3 | Lookup table for specialty tags |
| Portal Access | tblN1jruT8VeucPKa | 37 | Client portal access records |
| Portal Logs | tblj70XPHI7wnUmxO | 12 | Portal activity logging |

## Related Projects

- **ContactEnricher** (`03_Custom Apps/ContactEnricher/`) — Syncs Apple Contacts to ILS CRM Contacts table (58 fields). Changes to Contacts schema must be validated against `electron/airtable/ils-crm-sync.ts`
- **imaginelab-portal** — Reads Portal Access and Portal Logs tables. Changes to those tables must be validated against portal code
- **Personal Contact Cleanup** (appQUqpRbUR6e7cUd) — Separate Airtable base, all contacts staging area

## Lessons Learned

<!-- Format: **[Date]** - Issue description -> Solution -->

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
