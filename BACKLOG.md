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

## Bugs — Discovered in Testing & Grill (2026-03-27)

- [x] ~~**S3** Dead Portal Access `company` field (fldYZ1Su7WnNPxf17)~~ — Airtable rejects as UNKNOWN_FIELD_NAME. Removed from field-maps, converters, Swift model, and views (fixed 2026-03-27)
- [x] ~~**S4** Swift `fetchRecord` returns field names instead of IDs~~ — missing `returnFieldsByFieldId=true` query param. Fixed in AirtableService.swift (fixed 2026-03-27)

### CRITICAL — /grill findings (2026-03-27)
- [x] ~~**S5** `P0` 4 Electron unit test failures~~ — rewritten tests to use `toHaveStyle` for inline styles, added `role="group"` aria-label to categorization field (fixed 2026-03-28)
- [x] ~~**E1** `P0` Sync engine partial batch push~~ — pushTable now marks pushed per-batch (≤10), not all-or-nothing (fixed 2026-03-28)
- [x] ~~**E2** `P0` Unhandled upsert in .then()~~ — upsert wrapped in try/catch with single retry (fixed 2026-03-28)
- [x] ~~**S6** `P0` TOCTOU race in Swift sync lock~~ — replaced with POSIX `open(O_CREAT|O_EXCL)` atomic lock creation (fixed 2026-03-28)
- [x] ~~**S7** `P0` Test cleanup leak~~ — replaced `defer { Task {} }` with do/catch + awaited cleanup in 3 test functions (fixed 2026-03-28)

### WARNING — /grill findings (2026-03-27)
- [x] ~~**S8** `P1` Delete-then-insert sync invalidates @Bindable~~ — pullTable now uses in-place field update via `updateFields(of:from:context:)` on all 12 converters (fixed 2026-03-28)
- [x] ~~**S9** `P1` project.yml CODE_SIGN_STYLE: Automatic + Developer ID~~ — changed to Manual + full identity string (fixed 2026-03-28)
- [x] ~~**S10** `P1` Unvalidated pageAddress URL injection~~ — percent-encoded + scheme/host validation added (fixed 2026-03-28)
- [x] ~~**S11** `P1` No 429 retry in Swift AirtableService~~ — added `performWithRetry` with exponential backoff on all 6 API methods (fixed 2026-03-28)
- [x] ~~**E3** `P1` auth:save-user zero input validation~~ — validates object shape, PAT prefix, base ID prefix (fixed 2026-03-28)
- [x] ~~**E4** `P1` batchDelete URL doesn't encodeURIComponent~~ — added `encodeURIComponent` on record IDs (fixed 2026-03-28)
- [x] ~~**S12** `P1` GrantAccessSheet double-submit~~ — added `isGranting` state guard (fixed 2026-03-28)
- [x] ~~**E5** `P2` ui-smoke.test.ts only tests `toAirtable`~~ — added fromAirtable round-trip assertions for all 3 tables (fixed 2026-03-28)
- [x] ~~**E6** `P2` field-maps.ts `eventTags` section comment~~ — moved to `// Multi Select` section (fixed 2026-03-28)
- [x] ~~**S13** `P2` PortalAccessView duplicate search condition~~ — replaced duplicate with `contactJobTitleLookup` (fixed 2026-03-28)
- [x] ~~**S14** `P2` SWIFT_STRICT_CONCURRENCY: minimal~~ — upgraded to `targeted`, build clean with zero warnings (fixed 2026-03-28)
- [x] ~~**S15** `P2` AirtableCRUDTests field not in model~~ — replaced `flddcfM0XRw309R9P` (Page Title) with `fldkAjPIMUMlHNT2A` (Page Address, in model) (fixed 2026-03-28)

## Todo — Data Architecture

- [ ] **3NF Migration** — deprecate text Company field (`fldTwuGnEhbQfZhP3`) on Contacts. Replace with linked Companies field (`fldYXDUc9YKKsGTBt`). 66/69 contacts have both, 2 need Company records created. See vault `apps/ils-crm.md` for full migration steps
- [ ] No Opportunity → Rate Card link — when a deal is won, the quoted rates aren't captured. Need per-deal rate snapshot
- [ ] No Proposal → Rate Card link — Proposals table doesn't link to which Rate Card roles were included
- [ ] Contract milestones unstructured — Opportunities "Contract Milestones" is freeform text, needs structured data for milestone-based invoicing
- [ ] Revenue share not in Airtable — Laura's 50% net profit share is only in the vault, not queryable
- [ ] "Standard Hourly" in Rate Card is actually the discount rate (10% external discount baked in) — rename or add "Full Rate" field. **Must be done manually in Airtable UI** (API can't rename fields)
- [ ] No retainer vs standard rate selection logic — need "Is Retainer Client" flag on Companies or inference from Engagement Type
- [x] ~~"Writer Senior" vs "Senior Writer" duplicate in Rate Card~~ — deactivated "Writer Senior" (rec2PSnVf6xizBKmz), kept "Senior Writer" as canonical. 0 Person Rates references. (fixed 2026-03-28)

## Todo — Manual Cleanup

- [x] ~~Delete placeholder Tasks record (`recDA1o3TBZjdmcJE`)~~ — record no longer exists (verified 2026-03-28)

## Todo — Swift QA

- [x] ~~Client Portal labels~~ — verified: 3 view modes, page labels, section toggles, health checks all implemented (2026-03-20)
- [x] ~~Dashboard layout~~ — verified: greeting, 4 stat cards, tasks/follow-ups two-column, pipeline bar chart (2026-03-20)
- [x] ~~Photo crop dismiss~~ — verified: uses @Binding var isPresented pattern (not unreliable @Environment dismiss) (2026-03-20)
- [x] ~~macOS polish~~ — Go menu (Cmd+1-0 nav), Cmd+N new record, SidebarCommands, unified toolbar (2026-03-20)
