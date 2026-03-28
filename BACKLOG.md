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
- [ ] **S5** `P0` 4 Electron unit test failures — ContactRow, DealCard, Badge use inline styles but tests assert CSS class names. NewContactSheet test can't find fields (Sheet portal issue). Fix: add class names to components or rewrite tests with `toHaveStyle`
- [ ] **E1** `P0` Sync engine partial batch push (sync-engine.ts:204) — `markPushed` is all-or-nothing after `batchUpdate`. Partial batch failure re-pushes already-written records. Fix: mark pushed per-batch inside the loop
- [ ] **E2** `P0` Unhandled upsert in .then() (sync-engine.ts:404) — if SQLite throws after successful Airtable write, record stuck `_pending_push=1` forever, next sync overwrites Airtable with stale local. Fix: wrap upsert in try/catch
- [ ] **S6** `P0` TOCTOU race in Swift sync lock (SyncEngine.swift:79-98) — `fileExists` + `write` is not atomic. Also silent write failure returns `true`. Fix: use `open(O_CREAT|O_EXCL)` and check write result
- [ ] **S7** `P0` Test cleanup leak — `defer { Task { await cleanup() } }` in AirtableCRUDTests creates unstructured Task that may not complete before test runner exits. Leaks `__TEST_` records into production Airtable

### WARNING — /grill findings (2026-03-27)
- [ ] **S8** `P1` Delete-then-insert sync invalidates @Bindable references (SyncEngine.swift:325) — detail view crash if sync fires while open. Fix: update fields in-place instead of delete+insert
- [ ] **S9** `P1` project.yml CODE_SIGN_STYLE: Automatic + Developer ID — contradicts documented lesson (2026-03-21), will break notarized builds. Fix: use Manual + full identity string
- [ ] **S10** `P1` Unvalidated pageAddress URL injection (PortalAccessView.swift:668) — open redirect via crafted Airtable data. Fix: percent-encode or validate host
- [ ] **S11** `P1` No 429 retry in Swift AirtableService — single rate limit hit aborts entire sync. Fix: add exponential backoff
- [ ] **E3** `P1` auth:save-user IPC writes user identity with zero input validation (register.ts:374). Fix: validate shape + PAT prefix
- [ ] **E4** `P1` batchDelete URL doesn't encodeURIComponent record IDs (client.ts:265)
- [ ] **S12** `P1` GrantAccessSheet double-submit creates duplicate portal records — no concurrency guard
- [ ] **E5** `P2` ui-smoke.test.ts only tests `toAirtable`, never `fromAirtable` — half the converter pipeline untested
- [ ] **E6** `P2` field-maps.ts `eventTags` commented as "Multi-Line Text" but converter treats as multiSelect — doc mismatch
- [ ] **S13** `P2` PortalAccessView.swift:40 — `contactCompanyLookup` searched twice (duplicate condition), missing a search field
- [ ] **S14** `P2` SWIFT_STRICT_CONCURRENCY: minimal — hides actor isolation violations
- [ ] **S15** `P2` AirtableCRUDTests field `flddcfM0XRw309R9P` (Page Title) not in Swift model — test verifies nothing the app uses

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
