# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM — Airtable schema management, API integrations, Electron desktop app + Swift app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Swift/SwiftUI (swift-app/), Airtable API (backend)
- **Status**: v3.6.0 / Swift v1.3.0 — On main
- **Repo**: edwardhodge-usa/ils-crm | **Base ID**: appYXbUdcmSwBoPFU

## Project Scope
Single source of truth for all ILS CRM Airtable work: schema management (11 tables, 280+ fields), ContactEnricher coordination, CRM desktop app (Electron + Swift), automations/scripts.

## Airtable Tables

| Table | ID | Purpose |
|-------|-----|---------|
| Contacts | tbl9Q8m06ivkTYyvR | People — linked to Companies + Specialties |
| Companies | tblEauAm0ZYuMbHUa | Organizations |
| Opportunities | tblsalt5lmHlh4s7z | Sales pipeline (Active Pipeline, Future Roadmap, Kanban views) |
| Projects | tbll416ZwFACYQSm4 | Active project tracking |
| Proposals | tblODEy2pLlfrz0lz | Client proposals — uses linked Tasks |
| Tasks | tblwEt5YsYDP22qrr | Action items — has Overdue formula |
| Interactions | tblTUNClZpfFjhFVm | Communication log |
| Imported Contacts | tblribgEf5RENNDQW | Staging area |
| Specialties | tblysTixdxGQQntHO | Lookup table — linked from Contacts |
| Portal Access | tblN1jruT8VeucPKa | Client portal access records |
| Portal Logs | tblj70XPHI7wnUmxO | Portal activity logging |

Key relationships: Contacts → Companies (fldYXDUc9YKKsGTBt), Contacts → Specialties (fldPgiO2nKgcujeXz)

## Related Projects
- **ContactEnricher** — syncs Apple Contacts to CRM Contacts table via linked records
- **imaginelab-portal** — reads Portal Access + Portal Logs tables; validate schema changes against portal code

## Lessons Learned

### UI Redesign Process
- When executing a UI redesign from an HTML mockup: (1) READ the mockup HTML file and feed its content to every subagent, (2) use the mockup as source of truth for layout, sections, and field groupings — not the data model, (3) verify the result visually against the mockup before shipping. Subagents that don't see the mockup will invent their own layouts.
- Detail views should show inline (list | detail split pane) not as sheet popups — matches macOS HIG for master-detail. Use HStack with Divider, not `.sheet(item:)`
- **2026-03-20** — Build success ≠ visual correctness. After /do subagents complete UI tasks: build, RUN the app, SCREENSHOT each modified view, COMPARE against mockup, SHOW user. Never declare "ready to ship" based only on compilation. The /do skill Step 3 and Rule 4 now enforce this.

### Airtable API Rules
- API cannot create formula fields, views, or delete fields — document for manual creation in UI
- Airtable is single source of truth. Every app field MUST map to an Airtable field — no local-only data. New field checklist: (1) check Airtable, (2) create if needed, (3) add to field-maps.ts + converters.ts
- **Exception: `contacts.company`** is a denormalized column — auto-populated from `companies_ids` after sync pull (see `denormalizeCompanyNames()` in sync-engine.ts). Do NOT add it to CONTACT_MAPPINGS or write to it directly. It exists so `secondaryField: 'company'` works in linked record pickers and search.
- Adding a new table requires updating VALID_TABLES whitelist in `electron/database/queries/entities.ts` (SQL injection prevention). Full checklist: field-maps → converters → schema → preload → register.ts → sync-engine → entities.ts
- Always fetch field schema from Airtable metadata API for exact select option names (including emoji prefixes) — never hardcode options from memory
- Airtable REST API returns field **names** by default; Swift app uses field **IDs** so `fetchAllRecords` must include `returnFieldsByFieldId=true`
- Collaborator fields return `{id, email, name}` objects — use `'collaborator'` converter type. Shared utility: `src/utils/collaborator.ts`
- Airtable content upload API returns 404 → use tmpfiles.org as relay: upload image → get public URL → PATCH record with URL attachment
- AirtableFieldsBuilder: send NSNull for empty strings (singleSelect rejects ""), send YYYY-MM-DD for date-only fields (rejects ISO 8601 with time)
- When promoting a table from read-only to full CRUD, remove it from `READ_ONLY_TABLES` in sync-engine.ts

### Electron / Sync Engine
- SQL injection prevention: whitelist table names (Set), validate column names (regex) before interpolating into SQL
- `shell:openExternal` must validate URL scheme — allowlist `https://`, `http://`, `mailto:`, `tel:` only
- SQLite date comparison: use `date(due_date) = date('now')` to strip time from ISO strings
- `JSON.parse()` linked record arrays before `.includes()` — string `.includes(recordId)` causes false positives
- `window.prompt/confirm/alert` silently returns null in Electron — use inline inputs or IPC dialogs
- Electron `console.log` throws EPIPE when launched from Dock → `process.stdout?.on('error', () => {})` early in main.ts
- Stage colors centralized in `src/config/stages.ts` — never add local stage color maps in components
- LinkedIn scraping: use `persist:linkedin` session partition for persistent cookies, detect post-login redirect to `/feed/`

### XcodeBuildMCP
- Use XcodeBuildMCP to build and verify the Swift app after completing a task or modifying models/services.
- On build failure, read XcodeBuildMCP error logs and iterate fixes before asking the user.
- macOS app — verify with /app-logs and /app-describe first; screenshots via /app-check when needed. Not iOS Simulator.
- For verbose multi-target builds, prefer the apple-platform-build-tools subagent to preserve context.

### Swift-Specific
- XcodeGen conditional SPM deps use `platformFilter: macos` (not `platforms: [macOS]` — silently ignored, dep won't link)
- `INFOPLIST_KEY_` build settings only generate Apple-defined keys — custom keys (Sparkle `SUFeedURL`, etc.) must go in XcodeGen `info.path` + `info.properties` to create a real Info.plist
- App struct `@State` + background `Task` captures stale struct copy — use `@Observable` class for lifecycle state management
- `.accent` is not a valid `ShapeStyle` on macOS 14 — use `Color.accentColor`
- Swift converters use field IDs; Electron uses field names — keep in sync when schema changes
- Before debugging Swift sync 422 errors: fetch live schema via `mcp__airtable__describe_table`, compare against Swift converter's `F` enum
- `@Environment(\.dismiss)` unreliable in macOS sheets → pass `@Binding var isPresented` directly
- Use `Button` with `.buttonStyle(.plain)` instead of `onTapGesture` in ScrollView (unreliable)
- Use `.system(size:)` fonts, not semantic SwiftUI fonts (.title2, .headline) — unpredictable sizes
- Swift `String(format:)` doesn't support `,` flag for digit grouping → use `NumberFormatter`
- XCUITest: build-for-testing first, clear xattrs, then test-without-building. SwiftUI launches with 0 windows — open via File menu

### Email Intelligence Pipeline
- Enrichment comparison MUST run after Claude classification — phone/title fields only exist after Claude extraction. Pipeline ordering: rules → collect known contacts → classify new contacts → write new contacts → enrich known contacts.
- Company excluded from enrichment comparison — text-vs-linked-record matching produces constant false diffs (same 3NF problem)
- Phone normalization for comparison: strip non-digits except leading +, 10 bare digits → prepend +1
- Enrichment dedup: query enrichment_queue for existing Pending row with same contact+field+value before writing
- SwiftData `#Predicate` with generic `T: PersistentModel` won't resolve at compile time — use fetch-all + `.filter {}` for generic push functions (SyncEngine). Use `#Predicate<ConcreteType>` for non-generic point fetches (e.g. lookup by ID)
- `useEntityList` refreshes on `sync-complete` events. IPC approve/dismiss/reject handlers must NOT send fake `sync:progress` events — they trigger a `sync-complete` cascade that remounts UI and resets form state. Let the component's explicit `reload()` handle it. `deleteRemoteRecord` must handle `local_` prefix IDs (skip Airtable, SQLite only)
- Airtable singleSelect: always fetch live schema for valid options before writing. 'Ready' doesn't exist on Onboarding Status (valid: Approved, Rejected, Needs Info, Duplicate, Review)
- Gmail API returns ALL messages in mailbox including imported/forwarded mail from other accounts. Use `after:YYYY/MM/DD` query param to scope scans
- `ISO8601DateFormatter` with `.withInternetDateTime` requires full datetime — Airtable date-only fields send bare `YYYY-MM-DD`. Use `DateFormatter(dateFormat: "yyyy-MM-dd")` as fallback
- `Dictionary(uniqueKeysWithValues:)` crashes on duplicate keys — always use `Dictionary(..., uniquingKeysWith: { _, last in last })` for SwiftData fetch results
- `settings:set` IPC must be restricted to a `WRITABLE_SETTINGS` allowlist — renderer can bypass license grace period by writing `license_last_verified`
- **Swift archive stale DerivedData** — `rm -rf build/` before archiving only cleans local output. DerivedData caches stale Release intermediates. ALWAYS nuke project DerivedData + resolve packages before release archives: `rm -rf ~/Library/Developer/Xcode/DerivedData/PROJECT*/ && xcodebuild -resolvePackageDependencies`
- Dashboard SQL: `categorization` is stored as JSON array — use `NOT LIKE '%Archived%'` instead of `NOT IN ('Archived')` for filtering
- Airtable formula escaping: use `''` (two single quotes), not `\'` — Airtable uses SQL-style string escaping
- `useRef(fn)` only sets the initial value — add `ref.current = fn` on every render to prevent stale closures
- `pollWindow` must be resolved dynamically via getter function — Electron windows are destroyed on close and recreated, stale refs silently drop IPC
- React Rules of Hooks: `useMemo`/`useCallback` MUST NOT appear after early returns — move all hooks above conditionals. Contact360Page crashed because 2 `useMemo` hooks were below `if (!contact) return`
- PARITY.md drifts: always verify claimed "Stub/TODO" status by reading actual file line counts before planning work. Dashboard (560 lines) and Contacts (1600 lines) were fully implemented but marked as stubs
- **2026-04-01** — Gmail OAuth: Electron uses local HTTP server redirect on localhost:48321; Swift uses ASWebAuthenticationSession — implementations share nothing except client ID
- **2026-04-01** — Gmail history.list historyId expires after ~7 days — must fallback to full re-scan on 404
- **2026-04-01** — Airtable API cannot create Collaborator fields — must add manually in UI
- **2026-04-01** — Email scanner sync lock: acquire/release per batch write (10 records), never hold for full scan duration — prevents blocking CRM sync engine
- **2026-04-05** — Electron sql.js saves in-memory DB to disk on exit, overwriting external changes. To modify the DB: kill app first (wait 5s), modify on disk, then restart. Never modify while app is running.
- **2026-04-05** — Enrichment queue items must show the linked CRM contact name + email, not just the field name — users need identity context to evaluate suggestions
- **2026-04-07** — Gmail OAuth: Swift app needs iOS-type OAuth client (not Desktop) for ASWebAuthenticationSession. iOS clients don't require client_secret. Callback scheme = reversed client ID.
- **2026-04-07** — AirtableService `postRequest`/`patchRequest` must include `returnFieldsByFieldId=true` — without it, create/update responses use field names, but converters expect field IDs
- **2026-04-07** — SyncEngine push: when replacing local_ records with Airtable IDs, use `toAirtableFields()` to capture local data (strip NSNull), not the Airtable response — response may use wrong field key format
- **2026-04-07** — Never set SwiftData Transformable array columns to SQL NULL directly — use the encoded empty-array bplist. NULL causes `transformDecodeValue` crash on @Query access
- **2026-04-07** — SyncEngine must replace local_ IDs in linked fields (companiesIds, relatedCrmContactIds) after push assigns real Airtable IDs — otherwise dangling references
- **2026-04-09** — XcodeGen `platformFilter: macos` on SPM deps silently ignored for multi-destination targets — must manually patch pbxproj with `platformFilters = (macos, )` on Sparkle entries after each `xcodegen generate`
- **2026-04-09** — iOS Simulator Keychain requires code signing — build without `CODE_SIGNING_ALLOWED=NO` or get errSecMissingEntitlement (-34018)
- **2026-04-09** — iOS 26 Liquid Glass tab bar floats over content — List handles safe area automatically; ScrollView needs manual bottom padding
- **2026-04-09** — Universal target: ALL Swift files compile for both macOS and iOS — wrap platform-specific code in `#if os()`, use PlatformHelpers for cross-platform APIs
- **2026-04-10** — macOS-first apps extended to iOS MUST add `UILaunchScreen` (empty dict) to Info.plist — without it, iOS renders in legacy compatibility mode with black bars (non-edge-to-edge window). Also add `UISupportedInterfaceOrientations`.
- **2026-04-10** — iOS layout debugging: check Info.plist keys FIRST, then project config, then SwiftUI code. SwiftUI `.ignoresSafeArea()` and UIKit appearance hacks cannot fix missing plist keys.
- **2026-04-10** — LinkedRecordPicker: use `#if os(macOS)` for `.frame(width:height:)` and inline TextField search; iOS uses `.presentationDetents([.medium, .large])` and `.searchable()`
- **2026-04-13** — iOS 26 beta: Picker menu presentation fails inside `.sheet()` — use `.pickerStyle(.navigationLink)` as workaround
- **2026-04-13** — iOS 26 beta: `.searchable()` hides toolbar buttons in sheets — use inline search TextField instead
- **2026-04-13** — iOS 26 beta: global `.tint()` on TabView overrides swipe action destructive role color — use `UITabBar.appearance().tintColor` instead
- **2026-04-13** — Form sheets: bundle all `@State` fields in a single struct to prevent SwiftUI resetting individual values during parent re-renders from `@Query` updates
- **2026-04-13** — Company converter never sets `airtableModifiedAt` — "Newest" sort uses `createdDate` as fallback
- **2026-04-14** — XcodeGen overwrites Info.plist on every `xcodegen generate` — iOS-specific keys (UILaunchScreen, UISupportedInterfaceOrientations, CFBundleIconName) MUST go in project.yml `info.properties`, not directly in Info.plist
- **2026-04-14** — TestFlight archive: use `CODE_SIGN_IDENTITY=` (empty) for archive step, then `xcodebuild -exportArchive` with `method=app-store-connect` + `signingStyle=automatic` handles distribution signing. No Apple Distribution cert needed beforehand — auto-created on first export
- **2026-04-14** — `Apple Development` iOS signing requires registered physical devices in developer portal — fails with "Your team has no devices" if none registered. App Store distribution signing has no device requirement
- **2026-04-14** — iOS App Store icon requirements: must have Assets.xcassets with AppIcon.appiconset (13 sizes), CFBundleIconName=AppIcon in Info.plist, all 4 orientations in UISupportedInterfaceOrientations (+ ~ipad variant)
- **2026-04-14** — Release config `CODE_SIGN_IDENTITY: "Developer ID Application"` conflicts with `CODE_SIGN_STYLE=Automatic` — override with empty `CODE_SIGN_IDENTITY=` on xcodebuild command line for TestFlight builds
- **2026-05-04** — Contacts `categorization` field must be filtered before Airtable push — `"Email Intelligence"` is an ImportedContacts-only classification, not a valid Contacts multiselect option. Filter to `["Client","Prospect","Partner","Consultant","Talent"]` in `Contact+Airtable.swift toAirtableFields()`
- **2026-05-04** — SQLite schema migrations need two entries for every new column: (1) the `CREATE TABLE` block for fresh installs, and (2) an `ALTER TABLE ADD COLUMN` entry in `fieldAuditMigrations` for existing DBs — missing either one causes column-not-found errors on different install paths

### UI / HIG
- `cursor-pointer` is a HIG violation on macOS — use `cursor-default` on all interactive elements
- Use `text-[var(--text-on-accent)]` for text on colored backgrounds — never raw `text-white`
- `--text-label` (42% opacity dark mode) too faint for readable content — minimum is `--text-secondary` (55%)
- ILS CRM readability: body 14-15px, supporting 12-13px, uppercase headers 11-12px (not strict HIG 13px minimums)
- `Color.secondary.opacity(0.12)` invisible in dark mode for pill controls — use `Color(nsColor: .controlBackgroundColor)` + `.strokeBorder(Color.primary.opacity(0.1))` for visible unselected state
- macOS scrollbars: overlay-style (native), transparent scrollbar thumb background
- HIG sidebar active state: solid `--color-accent` bg + `--text-on-accent` text

### Release / Deploy
- **Swift notarization:** archive → re-sign Sparkle binaries with `--options runtime --timestamp` → DMG → `notarytool submit` → `stapler staple` → `sign_update` for Sparkle Ed25519
- **Sparkle binaries need manual re-signing:** xcodebuild archive doesn't sign nested Sparkle XPC services with Developer ID + hardened runtime. Must codesign each: Downloader.xpc, Installer.xpc, Autoupdate, Updater.app, then framework, then app
- **Team ID:** 8RHA62T6FQ (ImagineLab Studios). Notarization profile: "ILS-Notarize" in Keychain
- Auto-updater (Electron): `publish.private: true` required in package.json. Set GH_TOKEN + requestHeaders. Token in gitignored `electron/updater-token.ts`
- GitHub renames spaces to dots in filenames → rename `ILS CRM` → `ILS-CRM` in assets + `latest-mac.yml`
- Gatekeeper: notarized builds don't need `xattr` workaround. Legacy unsigned builds: `xattr -c -r` + right-click → Open
- Framer health check: HTTP HEAD to `imaginelabstudios.com/ils-clients/{slug}`, 200ms stagger. No CMS REST API
- Portal page_address must be URL slug (lowercase, hyphens) — slugify on edit, cascade on rename, validate on load
- HTML `<input type="url">` forces protocol prefix validation → use `type="text"`, normalizeUrl() on save (skip `@` values)

## Deployment Process

1. Bump version in `package.json`
2. `rm -rf dist dist-electron node_modules/.vite && npm run package` (builds to `/tmp/ils-crm-release/`)
3. Rename: `for f in ILS\ CRM-*; do mv "$f" "${f//ILS CRM/ILS-CRM}"; done`
4. Fix yml: `sed -i '' 's/ILS CRM/ILS-CRM/g' latest-mac.yml`
5. `gh release create v<version>` with renamed assets + latest-mac.yml
6. Copy DMGs to deployment folder, archive old versions

## Memory

Vault memory for this project: `~/Library/Mobile Documents/com~apple~CloudDocs/80_Obsidian Vault/ImagineLab Studios/Claude Memory/apps/ils-crm.md`

When writing to vault memory: APPEND with date prefix, never rewrite. Cross-project patterns go to `_shared/`.

## Parallel Build Architecture

See `docs/PARALLEL-BUILD.md` for the Electron <> Swift translation guide, sync rules, and decision protocol.
