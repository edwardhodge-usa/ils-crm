# Grill Fixes — Swift App Data Integrity & Polish

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 CRITICAL and 9 WARNING issues found during adversarial code review of the Swift app's inline editing, sync engine, and new services.

**Architecture:** Data integrity fixes first (nil propagation, stale state, sync conflicts), then performance (N+1 queries), then UX polish (input validation, cancellation, formatters). Each task is independent except Task 4 (sync) which must be verified carefully.

**Tech Stack:** SwiftUI, SwiftData, macOS 14+, Airtable REST API

**Project root:** `~/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm/`
**Swift app root:** `swift-app/ILS CRM/`
**Build command:** `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

---

## Chunk 1: Data Integrity (CRITICAL fixes)

### Task 1: AirtableFieldsBuilder — Send null for cleared fields

**Files:**
- Modify: `swift-app/ILS CRM/Models/Converters/AirtableConvertible.swift:161-196`

**Problem:** `set()` methods skip nil values — cleared fields never propagate to Airtable. User clears a field, sync restores the old value.

**Fix:** Change all `set()` methods to include nil as `NSNull()`. This is safe because: (a) we only push `isPendingPush` records, (b) all model properties are populated from Airtable on pull, (c) read-only fields are excluded from `toAirtableFields()`.

- [ ] **Step 1: Read AirtableConvertible.swift**

Read `swift-app/ILS CRM/Models/Converters/AirtableConvertible.swift`. Find the `AirtableFieldsBuilder` struct (around line 150).

- [ ] **Step 2: Change set() for String? to include nil**

Replace (line ~161):
```swift
mutating func set(_ fieldId: String, _ value: String?) {
    if let value { fields[fieldId] = value }
}
```
With:
```swift
mutating func set(_ fieldId: String, _ value: String?) {
    fields[fieldId] = value as Any? ?? NSNull()
}
```

- [ ] **Step 3: Change set() for Int? and Double?**

Same pattern for Int? (line ~166) and Double? (line ~171):
```swift
mutating func set(_ fieldId: String, _ value: Int?) {
    fields[fieldId] = value as Any? ?? NSNull()
}

mutating func set(_ fieldId: String, _ value: Double?) {
    fields[fieldId] = value as Any? ?? NSNull()
}
```

- [ ] **Step 4: Change setDate() to include nil**

Replace (line ~176):
```swift
mutating func setDate(_ fieldId: String, _ value: Date?) {
    if let value {
        let formatter = ISO8601DateFormatter()
        fields[fieldId] = formatter.string(from: value)
    }
}
```
With:
```swift
mutating func setDate(_ fieldId: String, _ value: Date?) {
    if let value {
        let formatter = ISO8601DateFormatter()
        fields[fieldId] = formatter.string(from: value)
    } else {
        fields[fieldId] = NSNull()
    }
}
```

- [ ] **Step 5: Change setMultiSelect() and setLinkedIds() to send empty as null**

Replace (line ~189):
```swift
mutating func setMultiSelect(_ fieldId: String, _ value: [String]) {
    if !value.isEmpty { fields[fieldId] = value }
}
```
With:
```swift
mutating func setMultiSelect(_ fieldId: String, _ value: [String]) {
    fields[fieldId] = value.isEmpty ? NSNull() : value as Any
}
```

Same for setLinkedIds (line ~195).

- [ ] **Step 6: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 7: Commit**

```bash
git add "swift-app/ILS CRM/Models/Converters/AirtableConvertible.swift"
git commit -m "fix(swift): send null for cleared fields — fixes silent revert on sync"
```

---

### Task 2: EditableFieldRow — Fix stale state on entity switch

**Files:**
- Modify: `swift-app/ILS CRM/Views/Shared/DetailComponents.swift:220-225`

**Problem:** `onAppear` only fires when the view enters the hierarchy. Switching between records (clicking different contacts in a list) reuses the same view instance — `@State` vars retain stale values from the previous record. MultiSelect checkmarks and edit text show wrong data.

**Fix:** Replace `onAppear` with `onChange(of: value)` + an `onAppear` for initial setup. Also add `onChange(of: key)` to catch entity switches where the same field position has different data.

- [ ] **Step 1: Read DetailComponents.swift**

Read the EditableFieldRow struct (lines 189-457).

- [ ] **Step 2: Replace onAppear with onChange + onAppear**

Replace the `.onAppear` block (lines 220-225) with:

```swift
.onAppear {
    resetState()
}
.onChange(of: value) { _, _ in
    resetState()
}
.onChange(of: key) { _, _ in
    resetState()
}
```

- [ ] **Step 3: Add resetState() method**

Add inside the struct:

```swift
private func resetState() {
    editText = value ?? ""
    isEditing = false
    if case .multiSelect = type, let val = value, !val.isEmpty {
        selectedOptions = Set(val.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) })
    } else if case .multiSelect = type {
        selectedOptions = []
    }
}
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/Shared/DetailComponents.swift"
git commit -m "fix(swift): reset EditableFieldRow state on entity switch — prevents stale multiSelect"
```

---

### Task 3: EditableFieldRow — Fix checkbox Bool, number tap, multiSelect save

**Files:**
- Modify: `swift-app/ILS CRM/Views/Shared/DetailComponents.swift`

**Problems:**
- Checkbox sends `Bool` via onSave (line 401), everything else sends `String` — inconsistent
- Number field has duplicate tap gesture (inline + applyTapGesture)
- MultiSelect join/split is fragile with comma-containing values

- [ ] **Step 1: Fix checkbox to send String instead of Bool**

Replace checkBinding (lines 398-402):
```swift
private var checkBinding: Binding<Bool> {
    Binding<Bool>(
        get: { value == "true" || value == "1" },
        set: { newValue in onSave?(key, newValue ? "true" : "false") }
    )
}
```

Then update `OpportunityDetailView.swift` saveField for `qualificationsSent`:
```swift
case "qualificationsSent":
    opportunity.qualificationsSent = (str == "true")
```

- [ ] **Step 2: Remove duplicate tap gesture from number case**

In the `.number` case (lines 336-360), remove the inline `.onTapGesture` on the else branch (lines 356-359). The `applyTapGesture` extension already handles `.number`. Replace:

```swift
} else {
    Text(formatNumber(value, prefix: prefix))
        .font(.system(size: 13))
        .foregroundStyle(value != nil ? .secondary : .tertiary)
        .onTapGesture {
            editText = value ?? ""
            isEditing = true
        }
}
```

With:

```swift
} else {
    Text(formatNumber(value, prefix: prefix))
        .font(.system(size: 13))
        .foregroundStyle(value != nil ? .secondary : .tertiary)
}
```

- [ ] **Step 3: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Views/Shared/DetailComponents.swift" "swift-app/ILS CRM/Views/Pipeline/OpportunityDetailView.swift"
git commit -m "fix(swift): checkbox sends String not Bool, remove duplicate number tap gesture"
```

---

### Task 4: SyncEngine — Preserve in-flight edits during pull

**Files:**
- Modify: `swift-app/ILS CRM/Services/SyncEngine.swift:296-304`

**Problem:** Pull sync does delete-then-insert for every record, including those with `isPendingPush = true`. User editing when 60s poll fires loses their work.

**Fix:** Check `isPendingPush` before overwriting. If a record has pending local changes, skip the upsert — the local version wins until it's pushed.

- [ ] **Step 1: Read SyncEngine.swift pull section**

Read `swift-app/ILS CRM/Services/SyncEngine.swift` around lines 287-315.

- [ ] **Step 2: Add isPendingPush guard in upsert loop**

Replace the upsert loop (lines ~296-304):
```swift
for record in records {
    if let old = existingById[record.id] {
        context.delete(old)
    }
    let model = T.from(record: record, context: context)
    context.insert(model)
}
```

With:
```swift
for record in records {
    if let old = existingById[record.id] {
        // Skip records with pending local edits — local version wins until pushed
        if old.isPendingPush { continue }
        context.delete(old)
    }
    let model = T.from(record: record, context: context)
    context.insert(model)
}
```

- [ ] **Step 3: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Services/SyncEngine.swift"
git commit -m "fix(swift): preserve in-flight edits during pull sync — isPendingPush records skip upsert"
```

---

## Chunk 2: Performance + Services (CRITICAL #1 + WARNINGs)

### Task 5: LinkedRecordResolver — Batch fetch instead of N+1

**Files:**
- Modify: `swift-app/ILS CRM/Utils/LinkedRecordResolver.swift`

**Problem:** Each resolution method does a separate FetchDescriptor query per ID. An Opportunity with 16 linked records = 16 SwiftData fetches, re-executed every render.

**Fix:** Replace per-ID queries with batch-fetch methods that take an array of IDs, fetch all matching records in one query, and return a dictionary.

- [ ] **Step 1: Read LinkedRecordResolver.swift**

Read the full file (~49 lines).

- [ ] **Step 2: Rewrite with batch methods**

Replace the entire struct with:

```swift
import SwiftData
import Foundation

/// Resolves Airtable record IDs to display names using batch SwiftData queries.
/// Use resolveX(ids:) methods — they fetch all matching records in a single query.
struct LinkedRecordResolver {
    let context: ModelContext

    func resolveContacts(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Contact>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { c in
            c.contactName.map { (c.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveCompanies(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Company>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { c in
            c.companyName.map { (c.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveOpportunities(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Opportunity>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { o in
            o.opportunityName.map { (o.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveProjects(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Project>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { p in
            p.projectName.map { (p.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveProposals(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Proposal>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { p in
            p.proposalName.map { (p.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveTasks(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<CRMTask>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { t in
            t.task.map { (t.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }

    func resolveInteractions(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Interaction>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { i in
            i.subject.map { (i.id, $0) }
        })
        return ids.compactMap { lookup[$0] }
    }
}
```

- [ ] **Step 3: Update callers to use batch methods**

In each detail view that uses LinkedRecordResolver, change from:
```swift
private var resolvedContactNames: [String] {
    let resolver = LinkedRecordResolver(context: modelContext)
    return task.contactsIds.compactMap { resolver.contactName(id: $0) }
}
```
To:
```swift
private var resolvedContactNames: [String] {
    LinkedRecordResolver(context: modelContext).resolveContacts(ids: task.contactsIds)
}
```

Update in: `TaskDetailView.swift`, `OpportunityDetailView.swift`, `ProjectDetailView.swift`, `ProposalDetailView.swift`.

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Utils/LinkedRecordResolver.swift" "swift-app/ILS CRM/Views/"
git commit -m "fix(swift): batch-fetch linked records — eliminates N+1 queries per render"
```

---

### Task 6: FramerHealthService — Cancellation + re-entrancy guard

**Files:**
- Modify: `swift-app/ILS CRM/Services/FramerHealthService.swift`

**Problem:** No cancellation on view disappear; double-tap "Check Health" runs concurrent checks.

- [ ] **Step 1: Read FramerHealthService.swift**

Read the full file (~53 lines).

- [ ] **Step 2: Add task handle and re-entrancy guard**

Add a stored task property and modify `checkHealth`:

```swift
private var checkTask: Task<Void, Never>?

func cancelCheck() {
    checkTask?.cancel()
    checkTask = nil
    isChecking = false
}

func startHealthCheck(slugs: [String]) {
    checkTask?.cancel()
    checkTask = Task {
        await checkHealth(slugs: slugs)
    }
}
```

In `checkHealth`, add cancellation check inside the loop:

```swift
for slug in slugs where !slug.isEmpty {
    if Task.isCancelled { break }
    // ... existing HEAD request logic ...
}
```

- [ ] **Step 3: Update PortalAccessView caller**

In `PortalAccessView.swift`, change the button action from:
```swift
Task { await healthService.checkHealth(slugs: allPageAddresses) }
```
To:
```swift
healthService.startHealthCheck(slugs: allPageAddresses)
```

Add `.onDisappear { healthService.cancelCheck() }` to the view.

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Services/FramerHealthService.swift" "swift-app/ILS CRM/Views/Portal/PortalAccessView.swift"
git commit -m "fix(swift): FramerHealthService cancellation + re-entrancy guard"
```

---

### Task 7: GrantAccessSheet — Duplicate access check

**Files:**
- Modify: `swift-app/ILS CRM/Views/Portal/GrantAccessSheet.swift`

**Problem:** No check for existing access — user can grant the same contact access to the same page multiple times.

- [ ] **Step 1: Read GrantAccessSheet.swift**

Read the file, find `grantAccess(to:)` method (~line 132).

- [ ] **Step 2: Add @Query for existing Portal Access records**

Add to the struct:
```swift
@Query private var existingAccess: [PortalAccessRecord]
```

- [ ] **Step 3: Add duplicate check in grantAccess**

Before creating the record, check:
```swift
private func grantAccess(to contact: Contact) {
    // Check for existing access
    let hasAccess = existingAccess.contains { record in
        record.pageAddress == pageAddress &&
        record.contactIds.contains(contact.id)
    }
    if hasAccess { dismiss(); return }

    // ... existing creation logic ...
}
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/Portal/GrantAccessSheet.swift"
git commit -m "fix(swift): prevent duplicate portal access grants"
```

---

## Chunk 3: UX Polish (WARNINGs)

### Task 8: Cached date formatters + number input validation + DatePicker debounce

**Files:**
- Modify: `swift-app/ILS CRM/Views/Shared/DetailComponents.swift`
- Modify: Detail views that allocate ISO8601DateFormatter per render

**Problems:**
- ISO8601DateFormatter allocated per render in 5 views
- Number field accepts non-numeric input
- DatePicker fires onSave on every scroll tick

- [ ] **Step 1: Add static cached formatters to EditableFieldRow**

Add at the top of the EditableFieldRow struct:

```swift
private static let isoFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withFullDate]
    return f
}()
```

Update `dateBinding` to use `Self.isoFormatter` instead of creating new instances.

- [ ] **Step 2: Update detail views to use cached formatter**

In each detail view that has `ISO8601DateFormatter().string(from:)` in the body, replace with a static formatter. Files: `ContactDetailView`, `ProjectDetailView`, `OpportunityDetailView`, `ProposalDetailView`, `InteractionDetailView`, `PortalAccessDetailView`.

Pattern — add static at top of each file:
```swift
private static let isoFormatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withFullDate]
    return f
}()
```

Then replace `ISO8601DateFormatter().string(from: date)` with `Self.isoFormatter.string(from: date)`.

- [ ] **Step 3: Add number input filtering**

In the `.number` case TextField, add input filtering:

```swift
TextField("", text: $editText)
    .font(.system(size: 13))
    .textFieldStyle(.plain)
    .focused($textFieldFocused)
    .onSubmit { commitEdit() }
    .frame(maxWidth: 120)
    .multilineTextAlignment(.trailing)
    .onChange(of: editText) { _, newValue in
        let filtered = newValue.filter { $0.isNumber || $0 == "." || $0 == "-" }
        if filtered != newValue { editText = filtered }
    }
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/"
git commit -m "fix(swift): cached date formatters, number input validation"
```

---

### Task 9: Build Verification

- [ ] **Step 1: Clean build**

```bash
cd swift-app && xcodebuild clean build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:|warning:"
```

Expected: `BUILD SUCCEEDED` with 0 errors.

- [ ] **Step 2: Verify all fixes**

Read each modified file and confirm:
1. AirtableFieldsBuilder `set()` includes nil as NSNull
2. EditableFieldRow has `resetState()` with `onChange(of: value/key)`
3. checkBinding sends String "true"/"false"
4. Number case has no inline onTapGesture
5. SyncEngine pull loop checks `isPendingPush` before delete
6. LinkedRecordResolver uses batch fetch
7. FramerHealthService has cancellation
8. GrantAccessSheet checks for duplicates
9. Date formatters are static/cached

---

## Parallelization Guide

**Independent tasks (can run in parallel):**
- Tasks 1, 2, 3, 4, 5, 6, 7, 8 — all modify different files

**Exception:** Tasks 2 and 3 both modify `DetailComponents.swift` — run sequentially or merge into one subagent.

**Recommended execution:**
1. Tasks 1, 4, 5, 6, 7 in parallel (different files)
2. Tasks 2+3 as one subagent (same file: DetailComponents.swift)
3. Task 8 after 2+3 (also touches DetailComponents.swift)
4. Task 9 last (verification)

## Verification Goals

- [ ] Clearing a text field in the UI and syncing sends null to Airtable (not skipped)
- [ ] Switching between records in a list resets EditableFieldRow state
- [ ] Editing a field during sync poll does not lose the edit
- [ ] Linked record sections don't do N+1 queries
- [ ] FramerHealthService stops checking when navigating away
- [ ] Double-clicking "Grant Access" for same contact doesn't create duplicates
- [ ] Number fields reject non-numeric input
- [ ] `xcodebuild build` succeeds with 0 errors
