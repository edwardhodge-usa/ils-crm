# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM project — Airtable schema management, API integrations, and eventually a full Electron desktop CRM app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Airtable API (backend/data), Anthropic Claude API (AI features)
- **Status**: v3.4.2 — Framer health monitor, centralized pipeline stages, cross-app sync lock. On main.
- **Repo**: edwardhodge-usa/ils-crm
- **Airtable Base**: ILS CRM (appYXbUdcmSwBoPFU)

## Project Scope

This project is the **single source of truth** for all ILS CRM Airtable work:

1. **Airtable Schema** — Design, improve, and maintain the ILS CRM base (11 tables, 280+ fields)
2. **ContactEnricher Coordination** — The ContactEnricher app syncs contacts to this CRM; schema changes here must stay compatible
3. **CRM Desktop App** — Eventually build a full Electron app for managing the CRM (contacts, companies, opportunities, projects, proposals)
4. **Automations & Scripts** — Airtable automations, data migration scripts, API utilities

## Airtable Base Structure

Base ID: `appYXbUdcmSwBoPFU`

| Table | ID | Fields | Purpose |
|-------|-----|--------|---------|
| Contacts | tbl9Q8m06ivkTYyvR | 55 | People — 59 records, all linked to Companies |
| Companies | tblEauAm0ZYuMbHUa | 24 | Organizations — 70 records (deduped from 60) |
| Opportunities | tblsalt5lmHlh4s7z | 23 | Sales pipeline — 53 records, views: Active Pipeline, Future Roadmap, Kanban |
| Projects | tbll416ZwFACYQSm4 | 18 | Active project tracking |
| Proposals | tblODEy2pLlfrz0lz | 13 | Client proposals — inline task fields removed, uses linked Tasks |
| Tasks | tblwEt5YsYDP22qrr | 13 | Action items — has Overdue formula field |
| Interactions | tblTUNClZpfFjhFVm | 9 | Communication log — ready to use, 0 records |
| Imported Contacts | tblribgEf5RENNDQW | 48 | Staging area — all 46 records processed/approved |
| Specialties | tblysTixdxGQQntHO | 3 | Lookup table — 70 canonical entries, linked from Contacts |
| Portal Access | tblN1jruT8VeucPKa | 36 | Client portal access records |
| Portal Logs | tblj70XPHI7wnUmxO | 12 | Portal activity logging |

## Schema Changes Log
*Schema changes are tracked in Airtable directly. See base appYXbUdcmSwBoPFU for current field definitions. Below captures major structural changes only.*

### 2026-02-27

**Fields removed:** AI Categorization Suggestion (Contacts + Imported Contacts), Speciality multi-select (Contacts + Imported Contacts), 25 inline Task fields from Proposals
**Fields added:** Days Since Last Contact (Contacts), Weighted Value + Days in Stage (Opportunities), Overdue (Tasks)
**Formula fixed:** Probability Value — uses FIND() to match '01 High', '02 Medium' prefixed values (confirmed working)
**Table renamed:** Opportunites → Opportunities (typo fix)
**Fields removed (Portal Access):** Contact Speciality lookup (invalid, source field deleted)
**Views added:** Active Pipeline, Future Roadmap, Kanban (Opportunities)
**Schema decision:** Categorization is primary classification field; Client Type to be deprecated
**Key relationship:** Contacts → Companies (linked via "Companies" field fldYXDUc9YKKsGTBt), Contacts → Specialties (linked via "Specialties" field fldPgiO2nKgcujeXz)

## Related Projects

- **ContactEnricher** (`03_Custom Apps/ContactEnricher/`) — Syncs Apple Contacts to ILS CRM Contacts table. `ils-crm-sync.ts` fully uses linked records for Specialties (commit `2a8ce6a`). Dead `F.speciality` field ref removed, fallback list updated with Broadway Producer + Feasibility.
- **imaginelab-portal** — Reads Portal Access and Portal Logs tables. Changes to those tables must be validated against portal code
- **Personal Contact Cleanup** (appQUqpRbUR6e7cUd) — Separate Airtable base, all contacts staging area

## Lessons Learned

<!-- Format: **[Date]** - Issue description -> Solution -->

**2026-02-27** - Airtable API cannot create formula fields → Provide exact formulas for manual creation in Airtable UI
**2026-02-27** - Airtable API cannot create views or interfaces → Document specs for manual creation
**2026-02-27** - Airtable API cannot delete fields → Update field description to flag for deletion, user deletes manually
**2026-02-27** - Airtable MCP list_records can return huge JSON that exceeds token limits → Use a subagent to read/analyze the saved file in chunks
**2026-02-27** - AI text fields (aiText type) show `emptyDependency` when ANY referenced field is empty on a record → Don't use AI fields that depend on optional fields; use manual select fields instead
**2026-02-27** - Probability Value formula was broken: checked for 'High' but actual value was '01 High' → Use FIND() instead of exact match when Airtable select options have prefixes
**2026-02-27** - When merging duplicate company records, check for linked records on BOTH duplicates before deleting → Only 1 of 12 duplicates needed re-pointing, but missing it would break an opportunity link
**2026-02-27** - Speciality multi-select had 82 options with duplicates/casing issues → Migrated to Specialties lookup table (linked records). Multi-select fields allow duplicates; lookup tables don't
**2026-02-27** - ContactEnricher was already 95% migrated to linked records — only needed dead field ref cleanup, not a rewrite → Always read the code before assuming a migration is needed
**2026-02-27** - SQL injection via dynamic column names in sql.js queries (`${key} = ?`) → Always whitelist table names (Set) and validate column names (regex `/^[a-z_][a-z0-9_]*$/`) before interpolating into SQL
**2026-02-27** - Polling sync with no mutex causes race conditions when sync takes longer than poll interval → Add `isSyncing` guard flag with `finally` cleanup; also guard "Force Sync" button
**2026-02-27** - IPC handlers registered before `initDatabase()` causes crash if renderer sends early messages → Register IPC handlers AFTER `await initDatabase()` inside `app.whenReady()`
**2026-02-27** - `JSON.parse()` without try-catch on linked/multiSelect fields kills entire push operation on corrupted data → Use `safeParseArray()` helper that returns `[]` on parse failure
**2026-02-27** - `saveDatabase()` after every sql.js write = 380+ disk writes during fullSync → Remove per-write saves; rely on 30s auto-save + explicit save at end of sync. Keep saves only for rare user actions (settings)
**2026-02-27** - Pull sync deletes locally-created records that haven't been pushed yet → Check `_pending_push` flag before deleting records not found in Airtable
**2026-02-27** - Hardcoded Airtable base ID fallback (`|| 'appYXbUdcmSwBoPFU'`) means forks silently hit wrong base → Never hardcode base IDs; require explicit configuration and return error if missing
**2026-02-27** - `unknown` type in `Record<string, unknown>` isn't assignable to `ReactNode` for conditional rendering → Use `{Boolean(obj.prop) && <jsx>}` instead of `{obj.prop && <jsx>}`
**2026-02-27** - Tech debt: utility functions copy-pasted across query files (`resultToObjects` 3x, `linkedIds`/`multiSelect` identical) → Extract shared utils into dedicated module (`database/utils.ts`); merge identical functions
**2026-02-27** - Tech debt: 9 list pages and 6 form pages had identical load/save boilerplate → Extract `useEntityList` and `useEntityForm` hooks to eliminate repeated useState/useEffect/error patterns
**2026-02-27** - Tech debt: preload.ts had 6 identical CRUD bridge blocks differing only by channel prefix → Use `makeCrudBridge(entity)` factory function; spread for special cases (importedContacts)
**2026-02-27** - Tech debt: route config duplicated in Sidebar, TopBar, and Layout → Consolidate into `src/config/routes.ts` with `NAV_ITEMS`, `ROUTE_TITLES`, `NEW_ROUTES`
**2026-02-27** - Tech debt: dead code accumulated during rapid MVP build (7 unused functions, unused EmptyState component, unused SELECT_OPTIONS, pending_changes table) → Run /techdebt scan after MVP completion to identify and remove
**2026-02-28** - QA: Multi-select fields stored as JSON in sql.js render as raw `["value1","value2"]` in list views → Parse JSON and join with commas before display; fix globally not per-entity
**2026-02-28** - QA: Linked record lookup fields (Portal Access name/email/company, Imported Contacts names) show "—" → Sync engine doesn't resolve linked record lookups; need to either store resolved values or do client-side joins
**2026-02-28** - QA: Airtable 422 INVALID_MULTIPLE_CHOICE_OPTIONS on save → Root cause was form dropdown options didn't match exact Airtable option names (e.g. `High` vs `🔴 High`). Always fetch field schema from Airtable metadata API to get exact option names including emoji prefixes. Applied to Tasks priority, Contacts ratings, and fixed Engagement Type field type (singleSelect→multiSelect) in Opportunities and Projects
**2026-02-28** - Tech debt: 5 unused type exports (SyncReport, PendingChange, ColumnDef) and 2 unused utility functions (parseLinkedIds, parseMultiSelect) in types/index.ts → Remove dead exports; keep FieldType (used indirectly by FieldDef) and Specialty (consistent with entity pattern)
**2026-02-28** - Tech debt: 30+ console.log calls in electron/ run in production, spamming user console → Gate all console.log behind `isDev` check; keep console.error ungated for real errors
**2026-02-28** - QA: `dragEvent is not defined` fires repeatedly in console from @dnd-kit Kanban → Investigate source; doesn't break drag functionality but spams console
**2026-02-28** - `npm run build` includes electron-builder packaging which fails with macOS code-signing issues → Use `npx tsc --noEmit` for pre-commit type validation instead
**2026-02-28** - Specialties in list pages: fetch specialties separately with useEffect, build `id→name` map, assign colors via deterministic hash (`hash % palette.length`) so same specialty always = same color
**2026-02-28** - QA: Clicking Pipeline cards only drags, can't navigate to detail → Need to differentiate click vs drag gesture in @dnd-kit event handlers
**2026-02-28** - GLOBAL RULE: Airtable is the single source of truth. Every app field MUST map to an Airtable field — no local-only data fields. When adding new fields: (1) check if it exists in Airtable, (2) create it if not, (3) add to field-maps.ts + converters.ts, (4) determine if it's a primary field or lookup from a linked record
**2026-03-01** - Tailwind JIT limitation: CSS var() doesn't work reliably in arbitrary values (`shadow-[...]`, `z-[...]`, `rounded-[...]`) — use inline `style={}` for any CSS property that needs a design token. Never use Tailwind arbitrary values with CSS vars.
**2026-03-01** - GLOBAL RULE: UI rebuild workflow — before writing ANY UI code: (1) read the approved mockup HTML, (2) read the database schema for field names, (3) verify framework config (tailwind.config, dark mode), (4) use inline styles not Tailwind arbitrary values for design tokens, (5) visually verify after each change
**2026-03-01** - Apple HIG: `cursor-pointer` is a critical violation on macOS. Reset.css covers `button` but not `<label>` or custom interactive elements — add explicit `cursor-default` anywhere you'd normally write `cursor-pointer`
**2026-03-01** - Always use `text-[var(--text-on-accent)]` for text on colored backgrounds (accent, red, green) — never raw `text-white`. In light mode `--text-primary` is dark grey and will fail contrast on colored buttons
**2026-03-01** - With react-jsx transform, `React.ReactNode` as a type is a namespace error (`React` not in scope). Use `import type { ReactNode } from 'react'` and reference `ReactNode` directly
**2026-03-01** - Page components inside flex parents (`<main class="flex-1 flex overflow-hidden">`) need explicit `width: '100%'` to fill available space — without it, content only sizes to intrinsic width
**2026-03-01** - `--text-label` token is 42% opacity in dark mode — too faint for any readable content. Use `--text-secondary` (55%) as minimum for anything users need to read. Reserve `--text-label` only for purely decorative/optional hints
**2026-03-01** - macOS scrollbars should be overlay-style (native). Don't force visible scrollbar thumbs with background color — use `background: transparent` on `::-webkit-scrollbar-thumb` and let macOS handle it
**2026-03-01** - HIG sidebar active state: MUST use solid `--color-accent` bg + `--text-on-accent` (white) text. Never use translucent accent bg + accent-colored text for the selected item
**2026-03-01** - ILS CRM readability standard: body text 14-15px (not strict HIG 13px), supporting text 12-13px, uppercase headers 11-12px. Edward finds strict HIG minimums too small on 1400×900 window
**2026-02-28** - When promoting a table from read-only to full CRUD, always remove it from `READ_ONLY_TABLES` in sync-engine.ts — interactions was left in the set after CRUD was shipped, silently orphaning all locally-created interactions
**2026-02-28** - Filtering linked records with `jsonString.includes(recordId)` causes false positives when one ID is a prefix of another → Always `JSON.parse()` the array first, then use `.includes()` on the array
**2026-02-28** - `shell:openExternal` must validate URL scheme before calling — bad data from Airtable (e.g. `file://` in a LinkedIn URL field) would otherwise open local files → Allowlist `https://`, `http://`, `mailto:`, `tel:` only
**2026-02-28** - SQLite `due_date = date('now')` fails silently when dates are stored as full ISO strings (`2026-02-28T00:00:00.000Z`) → Use `date(due_date) = date('now')` to strip the time component first
**2026-03-02** - Tasks page mockup UX decisions: (1) Categories use colored dots for smart lists, colored swatches (small rectangles) for type filters, avatar circles for assignees — shape differentiates content type. (2) Detail pane uses inline click-to-edit (no Edit button) — hover highlights field values, click opens editor, auto-save on blur. (3) Type badges softened to rgba 0.10 alpha + font-weight 500 for system-integrated feel. (4) All 12 task types from Airtable schema shown (not just in-use ones), with dimmed "0" count for empty types
**2026-03-02** - Mockup file: `/Users/EdwardHodge_1/Desktop/CLAUDE MOCKUPS/ils-crm-tasks-v2.html` — approved 4-column layout (App Sidebar 220px | Categories 210px | Task List 380px | Detail flex-1). Real Airtable data. HIG-audited (12 violations found and fixed). These patterns must be followed when implementing in Electron
**2026-03-02** - Agent-based tech debt scans can report false positives (e.g. `checkbox()` "unused" when it's actually called via mapping type) → Always verify findings with Grep before deleting code
**2026-03-02** - Airtable collaborator fields return `{id, email, name}` objects → Add `'collaborator'` converter type that extracts `.name`. Skip in `localToAirtable` (read-only like formula/rollup). 6 collaborator fields across 5 tables.
**2026-03-03** - Badge text unreadable in dark mode (darker accessible text on dark tinted backgrounds) → Add `fgDark` property to all color maps with Apple bright dark-mode system colors. Use `useDarkMode()` hook + `isDark ? fgDark : fg`. Dark mode mapping: Blue→#409CFF, Green→#30D158, Orange→#FF9F0A, Red→#FF453A, Purple→#BF5AF2, Indigo→#5E5CE6, Teal→#40CBE0, Pink→#FF375F. Cross-component encoding: "bg|fg|fgDark" string format for specialty colors passed through props
**2026-03-03** - LinkedIn scraping: (1) Server-side fetch always returns 999/auth wall — use Electron BrowserWindow instead. (2) `og:image` meta tag contains the BANNER image, not profile photo — skip it entirely. (3) Profile photos have `profile-displayphoto-shrink` in URL; banners have `profile-displaybackgroundimage`. (4) Non-authenticated BrowserWindows can't see profile photos — use `persist:linkedin` session partition for persistent cookies. (5) After LinkedIn login, it redirects to `/feed/` not back to target — detect post-login redirect and navigate to target URL automatically
**2026-03-03** - `window.prompt()` silently returns null in Electron (no error, no dialog) → Never use `window.prompt/confirm/alert` in Electron renderer. Use inline inputs in popovers or IPC-based dialogs instead
**2026-03-05** - macOS Gatekeeper "damaged" error on unsigned app → Run `xattr -c -r /Applications/AppName.app` (flags must be separate: `-c -r`, NOT `-cr`)
**2026-03-05** - Electron app shows stale UI despite correct source files → Clear Vite cache: `rm -rf node_modules/.vite dist-electron` then restart dev. Always verify with fresh build when UI doesn't match code
**2026-03-11** - Stage color maps were duplicated in 6 files → Centralized to `src/config/stages.ts` (single source of truth). Use convenience helpers: `stageDotColor()`, `stageBadgeTokens()`, `stageBarColor()`, `stageFullColors()`, `stageStatusBadgeColors()`. Never add local stage color maps in components
**2026-03-03** - Grouped list section headers blend with list items when using --text-secondary → Use --text-primary color, 0.5px bottom border, 18px top padding for clear group separation. Count: same font size as label (11px), --text-secondary, fontWeight 500
**2026-03-09** - Auto-updater for private GitHub repos: (1) `publish.private: true` in package.json is REQUIRED — without it, electron-updater hits `releases.atom` (404 for private repos) instead of `api.github.com`. (2) Set BOTH `process.env.GH_TOKEN` and `autoUpdater.requestHeaders = { Authorization: \`token ${TOKEN}\` }` before `checkForUpdatesAndNotify()`. (3) Token lives in gitignored `electron/updater-token.ts`, compiled into the binary
**2026-03-09** - GitHub release asset naming: GitHub replaces spaces with dots in uploaded filenames. `productName: "ILS CRM"` generates `ILS CRM-*.dmg` but GitHub serves as `ILS.CRM-*.dmg`. Fix: rename all files from `ILS CRM` → `ILS-CRM` (dashes) AND run `sed 's/ILS CRM/ILS-CRM/g'` on `latest-mac.yml` before uploading
**2026-03-09** - Gatekeeper bypass for unsigned apps: users must right-click → Open on first launch (shows "Open" button in dialog). Double-clicking shows hard block with no option. Only needed once per app install
**2026-03-09** - Deployment folder: `01_IMAGINE LAB STUDIOS/08_RESOURCES/CRM App Deployment/`. Contains arm64 + x64 DMGs, install guide, API token instructions. Old versions go in `Archive/`
**2026-03-10** - HTML `<input type="url">` triggers native browser validation requiring protocol prefix → Use `type="text"` for URL fields and let normalizeUrl() handle protocol on save
**2026-03-10** - normalizeUrl() was prepending https:// to email addresses → Skip values containing `@` before adding protocol prefix
**2026-03-10** - Collaborator converter changed from storing plain name to full JSON (`{id, email, name}`) for write-back support, but UI pages weren't updated → Always update display code when changing storage format. Shared utility: `src/utils/collaborator.ts` (parseCollaboratorName, buildCollaboratorMap, resolveCollaboratorSave)
**2026-03-10** - Electron `console.log` throws EPIPE when app launched without terminal (e.g. from Dock) → Add `process.stdout?.on('error', () => {})` and same for stderr early in main.ts, before any console.log calls
**2026-03-11** - Adding a new Airtable table requires updating VALID_TABLES whitelist in `electron/database/queries/entities.ts` (SQL injection prevention). Without it, all CRUD queries for the new table throw "Invalid table name". Checklist: field-maps → converters → schema → preload → register.ts → sync-engine → **entities.ts VALID_TABLES**
**2026-03-11** - v3.3.2 released with stale Vite frontend (dist/ compiled at 23:07 for v3.3.1, Portal CMS committed at 00:09 for v3.3.2) — `npm run package` was skipped during high-context session (5 releases in 6h, context rot) → ALWAYS: (1) `rm -rf dist dist-electron node_modules/.vite` before release builds, (2) `grep` the built bundle for recently added features before uploading, (3) max 2 releases per session — context rot causes skipped steps. v3.3.3 is the corrected release
**2026-03-11** - "dragEvent is not defined" console spam in Pipeline → React 18 dev-mode artifact in react-dom.development.js, absent in production builds. Not a code bug
**2026-03-11** - multiSelect values stored with extra wrapping quotes (`"\"Business Development\""`) → `jsonArray()` didn't clean elements like `cleanSelectValue()` does for singleSelect. Fixed: both `airtableToLocal` and `localToAirtable` now map multiSelect elements through `cleanSelectValue()`
**2026-03-12** - Portal Access dropdowns had hardcoded stage/status options that didn't match Airtable schema (same pattern as #7 from 2026-02-28 QA) → When adding select fields to new components, always check Airtable field schema for exact option values. Don't copy options from old/different components
**2026-03-12** - Framer has no public CMS REST API → Use HTTP HEAD requests to published page URLs (`imaginelabstudios.com/ils-clients/{slug}`) for health checking. 200 = live, 404 = not published. Stagger 200ms between requests (rate limit). Framer project URL: `https://framer.com/projects/ImagineLab-Front-Page--qq2NfIkO8OdMKvVMZXJR-8RBFW?node=uzKrlTPBU`
**2026-03-12** - Portal Page Address with spaces/capitals ("Haus Collection") causes 404 on Framer → page_address must be a URL slug (lowercase, hyphens). Three-layer fix: slugify on edit, cascade Client Pages → Portal Access on rename, validation sweep on load auto-fixes bad slugs from Airtable UI edits
**2026-03-12** - Airtable REST API returns field **names** as keys by default, not field **IDs** → Swift converters use field IDs (e.g. `fldMkz6x5i8YaofZj`), so `fetchAllRecords` must include `returnFieldsByFieldId=true` query parameter. Without it, all fields parse as nil (records sync with correct count but every property is empty). The Electron app uses field names in converters so it doesn't hit this — but the Swift app was designed around field IDs for schema consistency
**2026-03-12** - Pipeline hardcoded 7 stage names that didn't match Airtable's actual 11 options (e.g. "Qualified" vs "Qualification", missing "Meeting Scheduled", "Initial Contact", etc.) → Always check Airtable field schema metadata API for actual select option values before hardcoding. Both Electron `stages.ts` and Swift `stages` array were out of date
**2026-03-12** - Swift `String(format: "$%,.0f", value)` produces literal "$,.0f" — the `,` flag for digit grouping is not supported in Swift's String(format:) → Use `NumberFormatter` with `.currency` style and `maximumFractionDigits = 0` instead

## Deployment Process

1. Bump version in `package.json`
2. `npm run package` (builds to `/tmp/ils-crm-release/`)
3. Rename files: `for f in ILS\ CRM-*; do mv "$f" "${f//ILS CRM/ILS-CRM}"; done`
4. Fix yml: `sed -i '' 's/ILS CRM/ILS-CRM/g' latest-mac.yml`
5. `gh release create v<version>` with all renamed assets + latest-mac.yml
6. Copy DMGs to deployment folder (arm64 + x64), move old ones to Archive

## Key Commands

```bash
# Development
npm run dev          # Start Electron app in dev mode
npm run build        # Build for production
npm run package      # Package with electron-builder

# Airtable
# All Airtable operations go through the MCP tools or API scripts in /scripts
```

## References

- Shared patterns: `@../_master/` (Electron, Tailwind, Vercel)
- Global preferences: `~/CLAUDE.md`

## Parallel Build Architecture

### Strategy: Electron Primary, Swift Shadow

Two apps sharing one Airtable base (`appYXbUdcmSwBoPFU`), same API key, same field IDs.

| Layer | Electron (primary) | Swift (shadow) |
|-------|-------------------|----------------|
| UI framework | React 18 + React Router 6 | SwiftUI + NavigationSplitView |
| Local cache | sql.js (SQLite in-memory) | SwiftData (backed by SQLite) |
| Sync engine | `electron/airtable/sync-engine.ts` | `swift-app/.../Services/SyncEngine.swift` |
| API client | `electron/airtable/client.ts` | `swift-app/.../Services/AirtableService.swift` (actor) |
| Field maps | `electron/airtable/field-maps.ts` | `swift-app/.../Config/AirtableConfig.swift` |
| Schema | `electron/database/schema.ts` (CREATE TABLE) | `@Model` classes in `swift-app/.../Models/` |
| Converters | `electron/airtable/converters.ts` | TODO: Codable conformances on each Model |
| IPC bridge | `preload.ts` contextBridge | N/A (no process boundary in native app) |
| Shared schema | `/schema/*.json` (11 JSON Schema files with Airtable field IDs) | Same — both apps reference these |

### Decision Protocol

**STOP-AND-REPORT rule:** If any of these are encountered while working on the Swift build, **STOP immediately and report to the user** rather than silently working around it:

1. **Missing Airtable field** — A field exists in Electron but has no Airtable field ID in `field-maps.ts` or `/schema/`
2. **API limitation** — Airtable API doesn't support an operation the Swift app needs (e.g. formula field creation, view management)
3. **Ambiguous sync behavior** — Unclear which app "wins" when both are running simultaneously against the same base
4. **New Electron feature** — A feature was added to Electron that has no corresponding `/schema/` update or PARITY.md entry
5. **Security concern** — Any pattern that would expose the API key, store credentials insecurely, or bypass URL scheme validation
6. **Data model mismatch** — Swift model doesn't match the JSON Schema or Electron SQLite schema for the same table
7. **Read-only table violation** — Attempting to push to Specialties or Portal Logs

**Never invent workarounds.** The user is not a developer — silent workarounds create invisible bugs.

### Translation Rules: Electron → Swift

| Electron Pattern | Swift Equivalent | Notes |
|-----------------|-----------------|-------|
| `useState` / `useEffect` | `@State` / `.onAppear` / `.task` | |
| `useEntityList(entity)` hook | `@Query` macro with sort/filter | SwiftData handles reactivity |
| `useEntityForm(entity)` hook | `@Bindable` on `@Model` object | Two-way binding is native |
| `window.electronAPI.entity.create()` | `context.insert(model)` | No IPC — direct SwiftData |
| `window.electronAPI.entity.update()` | Mutate `@Model` properties directly | SwiftData auto-saves |
| `window.electronAPI.entity.delete()` | `context.delete(model)` | |
| React Router `MemoryRouter` | `NavigationSplitView` + `NavigationStack` | |
| `<Sheet>` slide-in panel | `.sheet()` or `.inspector()` modifier | |
| `CommandPalette` (Cmd+K) | `.searchable()` + `.searchScopes()` | |
| `@dnd-kit` Kanban | `.draggable()` / `.dropDestination()` | Native DnD on macOS 13+ |
| `contextBridge` / `preload.ts` | N/A | No process boundary |
| `ipcMain.handle()` / `ipcRenderer.invoke()` | Direct function calls | No serialization needed |
| Tailwind CSS utility classes | SwiftUI modifiers + system styles | Follow Apple HIG natively |
| `tokens.css` design tokens | `Color(.systemBlue)` etc. | Use system semantic colors |
| `isDev` console gating | `#if DEBUG` | Compile-time, not runtime |
| `fuse.js` full-text search | `#Predicate` with `.localizedStandardContains()` | |
| JSON-encoded arrays in SQLite | Native `[String]` arrays in SwiftData | SwiftData handles Codable |
| `_pending_push INTEGER` flag | `isPendingPush: Bool` property | Same semantics |
| `safeParseArray()` for linked IDs | Native array — no JSON parsing needed | SwiftData stores natively |

### Sync Rules

1. **Same Airtable base** — Both apps use `appYXbUdcmSwBoPFU` with the same PAT
2. **Same sync architecture** — Push pending first, then pull. Airtable wins on conflict.
3. **Same rate limit strategy** — 200ms stagger between table syncs (5 req/sec limit)
4. **Same read-only tables** — Specialties and Portal Logs never push
5. **Same field IDs** — All Airtable field IDs in `/schema/*.json` are the single source of truth
6. **No simultaneous sync** — Do NOT run both apps' sync engines at the same time against the same base. One app syncs at a time.
7. **API key storage** — Electron uses SQLite settings table. Swift MUST use Keychain (security improvement).
8. **Cross-app sync lock** — Both apps write `/tmp/ils-crm-sync.lock` when syncing and delete it when done. Before starting sync, check if the lock file exists and is not stale (>120s old). This prevents Electron and Swift from syncing simultaneously against the same Airtable base.

### Known Issues That Swift Must Also Respect

From Lessons Learned (apply to both builds):

1. **Emoji-prefixed select options** — Airtable select values have emoji prefixes (`🔴 High` not `High`). Always fetch from metadata API before creating/updating.
2. **Linked record JSON arrays** — In Electron, stored as JSON strings. In Swift, native `[String]` arrays. But when converting Airtable API responses, use safe parsing (don't crash on malformed data).
3. **`isSyncing` mutex** — Actor isolation in Swift handles this, but the SyncEngine must still guard `fullSync()` against re-entry.
4. **Formula fields are read-only** — Never include `probabilityValue`, `framerPageUrl`, or `overdue` in create/update payloads.
5. **Linked record filtering** — Never use string `.contains()` to match record IDs. Always compare against the parsed array. (In Swift, native array `.contains()` is already correct.)
6. **URL scheme validation** — Only open `https://`, `http://`, `mailto:`, `tel:` URLs. Airtable data may contain `file://` URLs.
7. **Interaction table is CRUD** — Was accidentally left as read-only in Electron. Ensure it's NOT in `readOnlyTables`.
8. **Airtable batch limits** — Max 10 records per create/update/delete request.
9. **ISO date comparisons** — Dates from Airtable are full ISO strings. SwiftData uses native `Date` type, so this is handled automatically (unlike the SQLite `date()` workaround in Electron).
10. **Engagement type is multi-select** — Both Opportunities and Projects use `multipleSelects` for engagement type, NOT `singleSelect`.

### Advancing the Swift Build

When a new Electron feature ships, follow this protocol:

1. **Update `/schema/`** — If new Airtable fields were added, update the corresponding JSON Schema file with field ID, type, and relationships
2. **Update Swift Model** — Add the new property to the corresponding `@Model` class in `swift-app/.../Models/`
3. **Update `PARITY.md`** — Set the Electron status to the new state and note what Swift needs
4. **Update `AirtableConfig.swift`** — If new tables, read-only changes, or field ID additions
5. **Implement the View** — Replace the stub/TODO with the actual SwiftUI implementation
6. **Run the checklist:**
   - [ ] Does the Swift model match the JSON Schema exactly?
   - [ ] Are read-only fields (formula, lookup, rollup) excluded from push?
   - [ ] Are select options fetched from metadata API (not hardcoded)?
   - [ ] Is `isPendingPush` set correctly on save?
   - [ ] Does the view follow Apple HIG (not Electron/web patterns)?

## Update Protocol

When Claude makes a mistake: **"Update CLAUDE.md so you don't make that mistake again."**
