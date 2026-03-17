# ILS CRM — Project Instructions

## Quick Context
- **What**: Master CRM — Airtable schema management, API integrations, Electron desktop app + Swift app
- **Stack**: Electron + React + TypeScript + Vite + Tailwind (app), Swift/SwiftUI (swift-app/), Airtable API (backend)
- **Status**: v3.4.3 — On main
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
- Swift converters use field IDs; Electron uses field names — keep in sync when schema changes
- Before debugging Swift sync 422 errors: fetch live schema via `mcp__airtable__describe_table`, compare against Swift converter's `F` enum
- `@Environment(\.dismiss)` unreliable in macOS sheets → pass `@Binding var isPresented` directly
- Use `Button` with `.buttonStyle(.plain)` instead of `onTapGesture` in ScrollView (unreliable)
- Use `.system(size:)` fonts, not semantic SwiftUI fonts (.title2, .headline) — unpredictable sizes
- Swift `String(format:)` doesn't support `,` flag for digit grouping → use `NumberFormatter`
- XCUITest: build-for-testing first, clear xattrs, then test-without-building. SwiftUI launches with 0 windows — open via File menu

### UI / HIG
- `cursor-pointer` is a HIG violation on macOS — use `cursor-default` on all interactive elements
- Use `text-[var(--text-on-accent)]` for text on colored backgrounds — never raw `text-white`
- `--text-label` (42% opacity dark mode) too faint for readable content — minimum is `--text-secondary` (55%)
- ILS CRM readability: body 14-15px, supporting 12-13px, uppercase headers 11-12px (not strict HIG 13px minimums)
- macOS scrollbars: overlay-style (native), transparent scrollbar thumb background
- HIG sidebar active state: solid `--color-accent` bg + `--text-on-accent` text

### Release / Deploy
- Auto-updater: `publish.private: true` required in package.json. Set GH_TOKEN + requestHeaders. Token in gitignored `electron/updater-token.ts`
- GitHub renames spaces to dots in filenames → rename `ILS CRM` → `ILS-CRM` in assets + `latest-mac.yml`
- Gatekeeper: `xattr -c -r` (flags separate), users right-click → Open on first launch
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

Vault memory for this project: `~/Library/Mobile Documents/com~apple~CloudDocs/80_Obsidian Vault/ImagineLab Studios/Claude Memory/projects/ils-crm.md`

When writing to vault memory: APPEND with date prefix, never rewrite. Cross-project patterns go to `_shared/`.

## Parallel Build Architecture

See `docs/PARALLEL-BUILD.md` for the Electron <> Swift translation guide, sync rules, and decision protocol.
