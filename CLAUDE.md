# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM — Airtable schema management, API integrations, Electron desktop app + Swift app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Swift/SwiftUI (swift-app/), Airtable API (backend)
- **Status**: v3.4.8 / Swift v1.1.1 — On main
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
- SwiftData `#Predicate` crashes on macOS 26.4 beta (25E5233c) — use fetch-all + in-memory `.filter {}` as workaround. TODO: revert when fixed
- `useEntityList` only refreshes on `sync-complete` events — dispatch `sync:progress` with `phase: 'complete'` from IPC handlers after any CRUD mutation. `deleteRemoteRecord` must handle `local_` prefix IDs (skip Airtable, SQLite only)
- `ISO8601DateFormatter` with `.withInternetDateTime` requires full datetime — Airtable date-only fields send bare `YYYY-MM-DD`. Use `DateFormatter(dateFormat: "yyyy-MM-dd")` as fallback
- `Dictionary(uniqueKeysWithValues:)` crashes on duplicate keys — always use `Dictionary(..., uniquingKeysWith: { _, last in last })` for SwiftData fetch results
- `settings:set` IPC must be restricted to a `WRITABLE_SETTINGS` allowlist — renderer can bypass license grace period by writing `license_last_verified`
- Dashboard SQL: `categorization` is stored as JSON array — use `NOT LIKE '%Archived%'` instead of `NOT IN ('Archived')` for filtering
- Airtable formula escaping: use `''` (two single quotes), not `\'` — Airtable uses SQL-style string escaping
- `useRef(fn)` only sets the initial value — add `ref.current = fn` on every render to prevent stale closures
- `pollWindow` must be resolved dynamically via getter function — Electron windows are destroyed on close and recreated, stale refs silently drop IPC

### UI / HIG
- `cursor-pointer` is a HIG violation on macOS — use `cursor-default` on all interactive elements
- Use `text-[var(--text-on-accent)]` for text on colored backgrounds — never raw `text-white`
- `--text-label` (42% opacity dark mode) too faint for readable content — minimum is `--text-secondary` (55%)
- ILS CRM readability: body 14-15px, supporting 12-13px, uppercase headers 11-12px (not strict HIG 13px minimums)
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
