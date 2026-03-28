# ILS CRM — Backlog

> **To add items:** Just say `bug: description`, `feature: description`, or `todo: description`
> Claude appends to this file automatically. Items marked done stay for reference.

---

## Bugs — Electron

- [x] ~~**#4** Kanban small-window layout~~ — columns now flex 140-220px with responsive reflow (fixed 2026-03-20)
- [x] ~~**#5** Kanban click vs drag~~ — delay-based drag activation (200ms) lets clicks pass through (fixed 2026-03-20)
- [x] ~~**#12** Engagement column shows raw JSON~~ — confirmed already working via EditableFormRow multiSelect handler (verified 2026-03-20)
- [x] ~~**#13** Imported Contacts — all names show "—"~~ (fixed 2026-03-19)
- [x] ~~**#14** Portal Access — Name/Email/Company fields empty~~ (fixed 2026-03-19)
- [x] ~~**#15** Portal Logs — blank records displayed~~ — filters out records with all-null display fields (fixed 2026-03-20)

## Bugs — Swift

- [x] ~~**S1** SwiftData store crash on schema change~~ — auto-deletes stale store and retries; data re-syncs from Airtable (fixed 2026-03-20)
- [ ] **S2** SwiftData @Query runtime crash (macOS 26.4 beta) — app crashes after extended use when SwiftData asserts inside Form/ScrollView @Query evaluation. Apple OS bug, no code fix possible. Waiting for macOS 26.4 final release

## Feature Requests

- [x] ~~**#6** Task sorting~~ — sort dropdown in TasksView with 5 options (Due Date, A-Z, Z-A, Priority, Created), persists via @AppStorage (completed 2026-03-20)
- [x] ~~**#8** Task detail view with linked contact/company display~~ — already implemented (verified 2026-03-20)
- [x] ~~**#16** Task create form — Assigned To picker + collaborator write-back~~ — picker populated from existing assignees, collaborator JSON stored for Airtable push (completed 2026-03-20)
- [ ] **#17** Task detail view — redesign as bento box layout (matching Contact 360 pattern)

## Todo — Infrastructure

- [x] ~~Apple Developer signing + notarization pipeline~~ (completed 2026-03-19)
- [x] ~~Sparkle auto-update integration~~ (completed 2026-03-19)
- [x] ~~License check ported to Swift~~ (completed 2026-03-19)
- [x] ~~First GitHub Release with notarized Swift DMG~~ (v1.0.7 + v1.1.0, completed 2026-03-19)
- [x] ~~Test Sparkle auto-update end-to-end~~ (fixed: repo made public so appcast.xml + DMG assets are reachable, completed 2026-03-20)
- [x] ~~Test license check against Airtable licensing table~~ (verified both Electron + Swift with rotated PAT, completed 2026-03-20)
- [x] ~~Airtable CRUD integration tests~~ — 24 Electron + 5 Swift tests covering all writable fields, linked records, cross-entity relationships, converter pipeline, and UI smoke (completed 2026-03-27)
- [x] ~~Standalone `__TEST_` record cleanup script~~ — `scripts/cleanup-test-records.ts` (completed 2026-03-27)

## Bugs — Discovered in Testing (2026-03-27)

- [x] ~~**S3** Dead Portal Access `company` field (fldYZ1Su7WnNPxf17)~~ — Airtable rejects as UNKNOWN_FIELD_NAME. Removed from field-maps, converters, Swift model, and views. Company now comes via Contact→Company linked record chain (fixed 2026-03-27)
- [x] ~~**S4** Swift `fetchRecord` returns field names instead of IDs~~ — missing `returnFieldsByFieldId=true` query param, inconsistent with `fetchAllRecords`. Fixed in AirtableService.swift (fixed 2026-03-27)
- [ ] **S5** 4 pre-existing Electron unit test failures — ContactRow, NewContactSheet, DealCard, Badge tests fail (not caused by integration test work, existed before)

## Todo — Data Architecture

- [ ] **3NF Migration** — deprecate text Company field (`fldTwuGnEhbQfZhP3`) on Contacts. Replace with linked Companies field (`fldYXDUc9YKKsGTBt`). 66/69 contacts have both, 2 need Company records created. See vault `apps/ils-crm.md` for full migration steps
- [ ] No Opportunity → Rate Card link — when a deal is won, the quoted rates aren't captured. Need per-deal rate snapshot
- [ ] No Proposal → Rate Card link — Proposals table doesn't link to which Rate Card roles were included
- [ ] Contract milestones unstructured — Opportunities "Contract Milestones" is freeform text, needs structured data for milestone-based invoicing
- [ ] Revenue share not in Airtable — Laura's 50% net profit share is only in the vault, not queryable
- [ ] "Standard Hourly" in Rate Card is actually the discount rate (10% external discount baked in) — rename or add "Full Rate" field
- [ ] No retainer vs standard rate selection logic — need "Is Retainer Client" flag on Companies or inference from Engagement Type
- [ ] "Writer Senior" vs "Senior Writer" duplicate in Rate Card — same rate, one should be deactivated

## Todo — Manual Cleanup

- [ ] Delete placeholder Tasks record (`recDA1o3TBZjdmcJE`)

## Todo — Swift QA

- [x] ~~Client Portal labels~~ — verified: 3 view modes, page labels, section toggles, health checks all implemented (2026-03-20)
- [x] ~~Dashboard layout~~ — verified: greeting, 4 stat cards, tasks/follow-ups two-column, pipeline bar chart (2026-03-20)
- [x] ~~Photo crop dismiss~~ — verified: uses @Binding var isPresented pattern (not unreliable @Environment dismiss) (2026-03-20)
- [x] ~~macOS polish~~ — Go menu (Cmd+1-0 nav), Cmd+N new record, SidebarCommands, unified toolbar (2026-03-20)
