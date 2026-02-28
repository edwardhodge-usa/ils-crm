# ILS CRM — Progress Tracker

## Current Phase: QA & Bug Fixes

### Status: MVP Complete — 18 QA issues found (2026-02-28), fixing in progress

## Phase 0: Airtable Schema Audit & Improvement ✅
- [x] Pull current schema (11 tables, 280+ fields)
- [x] Create project with CLAUDE.md, DECISIONS.md, PROGRESS.md
- [x] Audit schema for issues (missing links, redundant fields, naming inconsistencies)
- [x] Identify Airtable features not yet leveraged
- [x] Create schema improvement plan
- [x] Implement schema improvements (dedup companies, Specialties table, formula fixes)
- [x] Validate ContactEnricher compatibility after changes
- [x] Document final schema

## Phase 1: API Scripts & Automations ✅
- [x] Airtable sync engine (pull + push, 60s auto-poll)
- [x] Field mapping system (field-maps.ts + converters.ts)
- [x] Force Sync button
- [x] Airtable metadata API for select field options

## Phase 2: Electron CRM App — Read-Only ✅
- [x] Project scaffolding (Electron + React + TS + Vite + Tailwind)
- [x] Airtable API service layer with sql.js local cache
- [x] Dashboard with CRM overview
- [x] Contact/Company/Opportunity/Project/Proposal/Task views
- [x] Search and filtering
- [x] Pipeline Kanban board (Opportunities)

## Phase 3: Full CRUD Electron App ✅
- [x] Create/edit forms for all entities
- [x] Pipeline visualization (Kanban drag-and-drop)
- [x] Portal Access + Portal Logs views
- [x] Imported Contacts view with approve/reject
- [x] Specialties management

## Phase 4: QA & Bug Fixes (Current)

### Bugs
- [ ] #1: Sync conflict — app overwrites newer Airtable data on save (no pull-before-push)
- [ ] #5: Pipeline cards can't be clicked to open detail (only drag works)
- [x] #7: Airtable 422 — select options double-quoted on save → Fixed: fetch exact options from metadata API
- [ ] #9: Proposals "no such column: date_sent" — DB schema mismatch
- [ ] #12: Projects Engagement column shows raw JSON arrays
- [ ] #13: Imported Contacts — all names showing "—"
- [ ] #14: Portal Access — Name/Email/Company fields empty (linked field resolution)
- [ ] #17: Dashboard "1 deals" grammar

### UX
- [ ] #4: Pipeline Kanban needs better small-window layout (7 columns overflow)
- [ ] #10: App errors don't always log to Electron console
- [ ] #11: Date picker calendar icon invisible in dark mode
- [ ] #15: Portal Logs blank records + sync frequency
- [ ] #16: Sidebar text too small
- [ ] #18: Dashboard too monotone — needs better color coding and visual hierarchy

### Features
- [ ] #2: Company logos and contact profile photos
- [ ] #3: Font size and appearance settings
- [ ] #6: Tasks grouping and sorting
- [ ] #8: Task detail missing contact/company/assignee fields

## Phase 5: Polish & Release (Planned)
- [ ] Build and package (.app)
- [ ] Copy to /Applications/Custom/
- [ ] Final testing
