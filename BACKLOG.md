# ILS CRM — Backlog

> **To add items:** Just say `bug: description`, `feature: description`, or `todo: description`
> Claude appends to this file automatically. Items marked done stay for reference.

---

## Bugs — Electron

- [ ] **#4** Kanban small-window layout — 7 columns overflow on narrow screens
- [ ] **#5** Kanban click vs drag — clicks only drag, can't navigate to deal detail
- [ ] **#12** Engagement column shows raw JSON instead of formatted values
- [ ] **#13** Imported Contacts — all names show "—"
- [ ] **#14** Portal Access — Name/Email/Company fields empty (linked field resolution)
- [ ] **#15** Portal Logs — blank records displayed

## Bugs — Swift

- [x] ~~**S1** SwiftData store crash on schema change~~ — auto-deletes stale store and retries; data re-syncs from Airtable (fixed 2026-03-20)
- [ ] **S2** SwiftData @Query runtime crash (macOS 26.4 beta) — app crashes after extended use when SwiftData asserts inside Form/ScrollView @Query evaluation. Apple OS bug, no code fix possible. Waiting for macOS 26.4 final release

## Feature Requests

- [ ] **#6** Task grouping and sorting (group by project, assignee, type)
- [ ] **#8** Task detail view with linked contact/company display
- [ ] **#16** Task create form — add "Assigned To" field, defaults to currently selected assignee in task list sidebar
- [ ] **#17** Task detail view — redesign as bento box layout (matching Contact 360 pattern)

## Todo — Infrastructure

- [x] ~~Apple Developer signing + notarization pipeline~~ (completed 2026-03-19)
- [x] ~~Sparkle auto-update integration~~ (completed 2026-03-19)
- [x] ~~License check ported to Swift~~ (completed 2026-03-19)
- [x] ~~First GitHub Release with notarized Swift DMG~~ (v1.0.7 + v1.1.0, completed 2026-03-19)
- [x] ~~Test Sparkle auto-update end-to-end~~ (fixed: repo made public so appcast.xml + DMG assets are reachable, completed 2026-03-20)
- [x] ~~Test license check against Airtable licensing table~~ (verified both Electron + Swift with rotated PAT, completed 2026-03-20)

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
