# Parallel Build Architecture

## Strategy: Electron Primary, Swift Shadow

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

## Decision Protocol

**STOP-AND-REPORT rule:** If any of these are encountered while working on the Swift build, **STOP immediately and report to the user** rather than silently working around it:

1. **Missing Airtable field** — A field exists in Electron but has no Airtable field ID in `field-maps.ts` or `/schema/`
2. **API limitation** — Airtable API doesn't support an operation the Swift app needs (e.g. formula field creation, view management)
3. **Ambiguous sync behavior** — Unclear which app "wins" when both are running simultaneously against the same base
4. **New Electron feature** — A feature was added to Electron that has no corresponding `/schema/` update or PARITY.md entry
5. **Security concern** — Any pattern that would expose the API key, store credentials insecurely, or bypass URL scheme validation
6. **Data model mismatch** — Swift model doesn't match the JSON Schema or Electron SQLite schema for the same table
7. **Read-only table violation** — Attempting to push to Specialties or Portal Logs

**Never invent workarounds.** The user is not a developer — silent workarounds create invisible bugs.

## Translation Rules: Electron → Swift

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

## Sync Rules

1. **Same Airtable base** — Both apps use `appYXbUdcmSwBoPFU` with the same PAT
2. **Same sync architecture** — Push pending first, then pull. Airtable wins on conflict.
3. **Same rate limit strategy** — 200ms stagger between table syncs (5 req/sec limit)
4. **Same read-only tables** — Specialties and Portal Logs never push
5. **Same field IDs** — All Airtable field IDs in `/schema/*.json` are the single source of truth
6. **No simultaneous sync** — Do NOT run both apps' sync engines at the same time against the same base. One app syncs at a time.
7. **API key storage** — Electron uses SQLite settings table. Swift MUST use Keychain (security improvement).
8. **Cross-app sync lock** — Both apps write `/tmp/ils-crm-sync.lock` when syncing and delete it when done. Before starting sync, check if the lock file exists and is not stale (>120s old). This prevents Electron and Swift from syncing simultaneously against the same Airtable base.

## Known Issues That Swift Must Also Respect

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

## Advancing the Swift Build

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
