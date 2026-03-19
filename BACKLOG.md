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

- [ ] **S1** SwiftData store crash on schema change — must delete store manually when upgrading between versions with model changes
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
- [ ] First GitHub Release with notarized Swift DMG
- [ ] Test Sparkle auto-update end-to-end (publish update, verify app downloads it)
- [ ] Test license check against Airtable licensing table (enter email + PAT in Settings)

## Todo — Swift QA

- [ ] Client Portal labels — verify layout matches Electron
- [ ] Dashboard layout — verify stat cards and pipeline chart
- [ ] Photo crop dismiss — verify sheet dismissal works
- [ ] macOS polish — menu bar, keyboard shortcuts, window configuration
