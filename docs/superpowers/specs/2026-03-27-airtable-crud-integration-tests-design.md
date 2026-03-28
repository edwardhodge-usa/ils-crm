# Airtable CRUD Integration Tests — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Automated integration tests verifying Contacts, Companies, and Portal Access CRUD flows through to Airtable in both Electron and Swift apps.

## Goal

Verify that creating, updating, and deleting records in both the Electron and Swift CRM apps results in correct data in Airtable. Tests use the Airtable REST API as the source of truth — if the data isn't in Airtable, the test fails.

## Architecture

Two test layers across two apps:

| Layer | Electron | Swift |
|-------|----------|-------|
| **Engine-level** | Vitest tests calling `createRecord`/`updateRecord`/`deleteRemoteRecord` from `sync-engine.ts` | Swift Testing (`@Test`) calling `AirtableService` actor directly |
| **UI smoke** | Node script calling IPC code paths (same path renderer uses) | XCUITest launching app, filling forms, submitting |

**Verification:** After each mutation, fetch the record from Airtable REST API and assert field values match.

**Cleanup:** All test records use `__TEST_<timestamp>` prefix. Teardown deletes all test records via `batchDelete`. Standalone cleanup script as safety net.

## Entities & Fields

### Contacts (tbl9Q8m06ivkTYyvR)

| Field | Field ID | Type | Test value |
|-------|----------|------|------------|
| First Name | fldBzVPUdMy99vfvp | singleLineText | `__TEST_<ts>_John` |
| Last Name | fldq4VxEf0jJgi6O5 | singleLineText | `TestContact` |
| Email | fldBjSvbdd5WXmoIG | email | `__test_<ts>@test.invalid` |
| Industry | fldHoIj9zCNB15avX | singleSelect | `Technology` |

Update test changes: Email → `__test_<ts>_updated@test.invalid`, Industry → `Healthcare`

### Companies (tblEauAm0ZYuMbHUa)

| Field | Field ID | Type | Test value |
|-------|----------|------|------------|
| Company Name | fldVYiMOLq3LJgbZ3 | singleLineText | `__TEST_<ts>_Acme Corp` |
| Type | fldtLJxxK5oT6Nzjn | singleSelect | `Prospect` |
| Industry | fldPz4rknFpmEXZAD | singleSelect | `Technology` |

Update test changes: Type → `Active Client`, Industry → `Entertainment`

### Portal Access (tblN1jruT8VeucPKa)

| Field | Field ID | Type | Test value |
|-------|----------|------|------------|
| Name | fldqnVE5ppj8ACyf3 | singleLineText | `__TEST_<ts>_Portal` |
| Page Address | fldkAjPIMUMlHNT2A | singleLineText | `__test-<ts>` |
| Status | fldqbzNiTFt7jpdyW | singleSelect | `ACTIVE` |
| Contact | fld1tMK48dxrLU9R4 | linkedRecord | (linked to test Contact) |

Update test changes: Status → `IN-ACTIVE`, Page Title (`flddcfM0XRw309R9P`) → `Updated Test Page`

## Test Scenarios

### Engine-Level (per entity)

1. **Create** — Call create function with test fields → fetch from Airtable → assert all fields match
2. **Update** — Modify fields on the created record → push → fetch from Airtable → assert updated values
3. **Delete** — Delete the record → verify Airtable returns 404 / not found

### Cross-Entity

4. **Linked records** — Create Contact → Create Company → Link Contact to Company → Create Portal Access linked to Contact → Verify all three records + relationships in Airtable

### UI Smoke (per entity)

5. **Contact form** — Launch app → navigate to Contacts → create new → fill form → submit → verify in Airtable
6. **Company form** — Same flow for Companies
7. **Portal Access form** — Same flow for Portal Access

## File Structure

```
# Electron
tests/integration/airtable-crud.test.ts     # Engine-level tests (Vitest)
tests/integration/ui-smoke.test.ts           # UI smoke via IPC code paths (Vitest)
tests/integration/helpers/airtable-verify.ts # Shared verification + cleanup helpers

# Swift
swift-app/ILS CRM Tests/                     # New unit test target
  AirtableCRUDTests.swift                    # Engine-level tests (Swift Testing)
swift-app/ILS CRM UITests/
  UISmokeCRUDTests.swift                     # UI smoke tests (XCUITest)

# Shared
scripts/cleanup-test-records.ts              # Standalone cleanup for __TEST_ records
```

## Electron Engine Tests — Detail

**File:** `tests/integration/airtable-crud.test.ts`

- Import `createRecord`, `updateRecord`, `deleteRemoteRecord` from `electron/airtable/sync-engine.ts`
- Import `fetchRecord` from `electron/airtable/client.ts` for verification
- API key + base ID: read from env vars (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`) or app SQLite DB
- Each test creates → verifies → stores record ID for cleanup
- `afterAll`: batch delete all created records from Airtable
- Timeout: 30s per test (Airtable rate limit: 5 req/sec)
- 200ms delay between API calls to respect rate limits

## Electron UI Smoke — Detail

**File:** `tests/integration/ui-smoke.test.ts`

- Calls the same code path the renderer triggers: `createRecord(tableName, fields)` with form-shaped field data (field names, not IDs — the converter handles mapping)
- Verifies via `fetchRecord` that the record arrived in Airtable
- Not browser automation — tests the IPC→sync→Airtable pipeline programmatically
- Same cleanup pattern as engine tests

## Swift Engine Tests — Detail

**File:** `swift-app/ILS CRM Tests/AirtableCRUDTests.swift`

- New test target in `project.yml` (unit test bundle, not UI test)
- Uses `AirtableService` actor directly with API key from env var
- Each test: instantiate service → call `batchCreate` / `batchUpdate` / `batchDelete` → call `fetchAllRecords` with filter to verify
- `addTeardownBlock` to clean up test records
- Test data uses `__TEST_` prefix for identification

## Swift UI Smoke — Detail

**File:** `swift-app/ILS CRM UITests/UISmokeCRUDTests.swift`

- XCUITest: launch app → Settings → verify API key is configured
- Navigate to Contacts → tap "+" button → fill First Name, Last Name, Email → submit
- Wait for sync (poll sync status or fixed delay)
- Verify: call Airtable API from test code to confirm record exists
- Cleanup: delete test records via API call in teardown

## Verification Helper

Shared pattern used by both Electron and Swift tests:

```
verifyInAirtable(tableId, recordId) → {
  1. GET /v0/{baseId}/{tableId}/{recordId}
  2. Assert response status 200
  3. Assert fields match expected values
  4. Return record data
}

verifyDeleted(tableId, recordId) → {
  1. GET /v0/{baseId}/{tableId}/{recordId}
  2. Assert response status 404 or error
}
```

## Cleanup Strategy

1. **Per-test cleanup:** Each test stores created record IDs. `afterAll`/`addTeardownBlock` calls `batchDelete`.
2. **Standalone script:** `scripts/cleanup-test-records.ts` — searches each table for records matching `__TEST_` in the name/first-name field. Deletes all matches. Run manually if tests crash before cleanup.

## Constraints

- Airtable rate limit: 5 requests/second. Tests must include 200ms delays between API calls.
- Portal Access requires a linked Contact — cross-entity test must create Contact first.
- singleSelect fields must use exact option names from Airtable schema (verified in exploration phase).
- Swift tests need the Xcode project regenerated via `xcodegen` to include the new test target.
