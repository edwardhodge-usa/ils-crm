# Session State

**Last updated:** 2026-05-05 13:00
**Goal:** ✅ DONE — Migrated macOS distribution from Developer ID + Sparkle to Mac App Store TestFlight (private/internal)
**Plan:** `.claude/PLAN.md` — TestFlight macOS Migration (v1.5.1) — all waves complete

## Current Task
**What:** v1.5.1 build 24 live on TestFlight, both verified end-to-end (license unlock, sync, UI, Preferred Rates).
**Status:** Completed
**Versions:** Electron v3.6.0 / Swift v1.5.1 (build 24, Mac App Store TestFlight)
**Commits pushed:** `25cd211` (migration) + `4850f4c` (icon fix) on origin/main

## Verified ✓
- ✅ App launches under sandbox (no AMFI -413 — App Store profile authorizes keychain-access-groups)
- ✅ Native macOS NavigationSplitView (full sidebar, bento layout, Cmd+1-0)
- ✅ Sync pulls 624 records across 17 tables in ~15s, no `/tmp/` lock contention
- ✅ Kevin McBee Contact 360 → Preferred Rates renders both rates ($150/hr Art Director, $130/hr Show Set Associate) — closes lingering S19 verification from prior session
- ✅ "Check for Updates…" menu absent (Sparkle excluded via `#if canImport(Sparkle)`)
- ✅ App display name "ILS CRM" (was "ILS CRM+")

## Pre-existing bugs surfaced (backlogged, NOT today's regressions)
- **P2:** Portal Access "By Client" subtitle shows raw record IDs instead of company names (`PortalAccessView.swift:854` — `record.contactCompanyLookup` field). Same as Electron bug #14 in PARITY.md.
- **P3:** License lock screen — `saveLicensePAT()` saves PAT but doesn't auto-trigger `performLicenseCheck()` → user must quit + relaunch to unlock. Settings.swift:134.

## Open: Vault git rebase needs resolution (NOT this session)
The Obsidian vault is mid-interactive-rebase from a prior session. My memory commit `36bb3db` landed on the rebase HEAD. Cortex DB has the lessons (3 updated, 175 facts, 1 new pattern synced). When ready, run:
```bash
cd "/Users/EdwardHodge_1/Obsidian/ImagineLab"
git status      # see what conflicts remain
git rebase --continue   # or --abort if the rebase is no longer wanted
```
Files involved: `People/Sofia Traversone.md`, `Projects/Disney Theatrical - Live Events Pitch.md`, `Projects/Longevity - Phase 2 RFP.md`.

## Next Step
Routine work — `/resume` for any project. ILS CRM macOS is shipped via TestFlight; future Swift releases now: bump version → archive → upload via the same xcodebuild flow (see CLAUDE.md "Swift (macOS + iOS) — Mac App Store TestFlight"). Apple processing for repeat uploads is fast (~5-30 min, no additional review needed).

## Decay Warnings
None.
