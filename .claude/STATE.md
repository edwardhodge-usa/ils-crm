# Session State

**Last updated:** 2026-04-14 16:10
**Goal:** TestFlight setup + iOS bug fixes
**Plan:** None

## Current Task
**What:** TestFlight distribution — first iOS build uploaded and iterating on device bugs
**Status:** Build 21 uploaded. Keychain, sync lock, keyboard, encryption compliance all fixed.

**Key files:**
- swift-app/project.yml — version 1.4.0 build 21, platform-conditional entitlements, ITSAppUsesNonExemptEncryption
- swift-app/ILS CRM/Services/KeychainService.swift — iOS uses default keychain (no shared group)
- swift-app/ILS CRM/Services/SyncEngine.swift — sync lock skipped on iOS
- swift-app/ILS CRM/ILS CRM iOS.entitlements — iOS-only (no keychain-access-groups)
- swift-app/ILS CRM/Assets.xcassets/AppIcon.appiconset/ — 13 iOS icon sizes
- swift-app/ExportOptions.plist — app-store-connect automatic signing

## Context (for next session)
- XcodeGen overwrites Info.plist AND strips Sparkle platformFilters on every regenerate — must re-patch pbxproj after each `xcodegen generate`
- Archive uses empty CODE_SIGN_IDENTITY, export handles distribution signing automatically
- Display name still "ILS CRM+" — decide on iOS branding
- Contact create form not yet tested on device
- 3 P3 backlog items from iOS parity audit (FormState, sort toggle, Company Newest sort)

## Next Step
Test build 21 on device — verify API key saves, sync starts, data loads. Then test Contact create form. If stable, this is the v1.4.0 release candidate.

## Verification Goals
- [x] TestFlight build uploaded and processing
- [x] Keychain save works on device (build 19 fix)
- [ ] Sync completes successfully on device (build 20 fix — awaiting test)
- [ ] Contact create form tested on device
- [ ] All tabs load with real data on device
