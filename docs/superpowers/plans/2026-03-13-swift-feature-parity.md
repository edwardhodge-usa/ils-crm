# Swift Feature Parity — Complete Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the ILS CRM Swift app to full feature parity with the Electron app (v3.4.3) — inline editing across all detail views, missing fields, Client Portal Wave 3 features, and linked record name resolution.

**Architecture:** First extend `EditableFieldRow` with `multiSelect`, `number`, and `isLink` support. Then roll out inline editing to 6 detail views (each is an independent file — highly parallelizable). Add missing fields to CompanyDetailView (display-only, matching Electron). Implement Client Portal Wave 3 (health monitoring, grant access). Finish with linked record name resolution and XCUITest updates.

**Tech Stack:** SwiftUI, SwiftData, macOS 14+, Airtable REST API, `@FocusState`, `@Bindable`, `@Query`, `Menu`/`Picker`/`Toggle`

**Project root:** `~/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm/`
**Swift app root:** `swift-app/ILS CRM/`
**Electron reference:** `src/` (source of truth for feature parity)
**Build command:** `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

**Parity Rules:**
- Electron CompanyDetail is read-only (no inline editing) — Swift should match
- All other detail views use inline editing in Electron — Swift must match
- Fields that are `readonly` in Electron (formula, rollup, collaborator display) stay `readonly` in Swift
- `@Bindable` on SwiftData `@Model` objects enables direct mutation — `@Model` is a reference type, so parent views pass by reference automatically
- Set `localModifiedAt = Date()` and `isPendingPush = true` on every save
- Use exact Airtable option strings (including emoji prefixes like `🔴 High`)

**Model property type rules (match Swift model, not Electron):**
- `String?` fields → `.text`, `.singleSelect`, or `.readonly`
- `[String]` fields → `.multiSelect` — pass `value: array.joined(separator: ", ")`, save with `.components(separatedBy: ", ").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }`
- `Date?` fields → `.date` — EditableFieldRow passes ISO string via onSave, parse with `ISO8601DateFormatter`
- `Double?` fields → `.number(prefix:)` — pass `value: String(format: "%.0f", val)`, save with `Double(str)`
- `Int?` fields → `.number(prefix: nil)` — pass `value: "\(val)"`, save with `Int(str)`
- `Bool` fields → `.checkbox`

**Existing EditableFieldRow internals (MUST match):**
- `@FocusState` variable name is `textFieldFocused` (NOT `isFocused`)
- No `startEditing()` method exists — set `editText = value ?? ""; isEditing = true` inline
- Tap gesture handled by `applyTapGesture` extension which matches `.text, .textarea` cases

---

## Chunk 1: EditableFieldRow Enhancement + Contact & Company Views

### Task 1: Add multiSelect, number, and isLink to EditableFieldRow

**Files:**
- Modify: `swift-app/ILS CRM/Views/Shared/DetailComponents.swift`

**Context:** EditableFieldRow currently supports 6 types: `text`, `textarea`, `singleSelect(options:)`, `date`, `checkbox`, `readonly`. Electron also uses `multiSelect` (checkboxes in dropdown) and `number`/`currency` (formatted numeric input). Several views also need `isLink` for URL/email/phone display. The `@FocusState` variable is named `textFieldFocused`.

- [ ] **Step 1: Read current EditableFieldRow**

Read `swift-app/ILS CRM/Views/Shared/DetailComponents.swift`. Find the `EditableFieldType` enum and `EditableFieldRow` struct. Note the `applyTapGesture` extension at the bottom of the file.

- [ ] **Step 2: Add new cases to EditableFieldType enum**

```swift
enum EditableFieldType {
    case text
    case textarea
    case singleSelect(options: [String])
    case multiSelect(options: [String])  // NEW
    case number(prefix: String?)         // NEW — "$" for currency, nil for plain numbers
    case date
    case checkbox
    case readonly
}
```

Note: Swift enum cases with associated values do NOT support default parameter values. Always pass the argument explicitly: `.number(prefix: nil)` or `.number(prefix: "$")`.

- [ ] **Step 3: Add isLink property and multiSelect state to EditableFieldRow**

Add these properties to the struct:

```swift
var isLink: Bool = false
@State private var selectedOptions: Set<String> = []
```

Add initialization in the body's `.onAppear` (attach to the outermost `VStack(spacing: 0)`):

```swift
.onAppear {
    editText = value ?? ""
    if case .multiSelect = type, let val = value, !val.isEmpty {
        selectedOptions = Set(val.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) })
    }
}
```

- [ ] **Step 4: Update applyTapGesture to handle .number**

Find the `applyTapGesture` extension. Add `.number` to the switch case that currently handles `.text, .textarea`:

```swift
case .text, .textarea, .number:
    content.onTapGesture {
        editText = value ?? ""
        isEditing = true
    }
```

- [ ] **Step 5: Add multiSelect view to the valueView computed property**

```swift
case .multiSelect(let options):
    Menu {
        ForEach(options, id: \.self) { option in
            Button(action: {
                if selectedOptions.contains(option) {
                    selectedOptions.remove(option)
                } else {
                    selectedOptions.insert(option)
                }
                let sorted = options.filter { selectedOptions.contains($0) }
                let joined = sorted.isEmpty ? nil : sorted.joined(separator: ", ")
                onSave?(key, joined)
            }) {
                HStack {
                    Text(option)
                    Spacer()
                    if selectedOptions.contains(option) {
                        Image(systemName: "checkmark")
                    }
                }
            }
        }
    } label: {
        HStack(spacing: 4) {
            if selectedOptions.isEmpty {
                Text("—")
                    .font(.system(size: 13))
                    .foregroundStyle(.tertiary)
            } else {
                Text(selectedOptions.sorted().joined(separator: ", "))
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            Text("⌃")
                .font(.system(size: 10))
                .foregroundStyle(.tertiary)
        }
    }
    .menuStyle(.borderlessButton)
```

- [ ] **Step 6: Add number view to the valueView computed property**

```swift
case .number(let prefix):
    if isEditing {
        HStack(spacing: 2) {
            if let p = prefix {
                Text(p)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
            TextField("", text: $editText)
                .font(.system(size: 13))
                .textFieldStyle(.plain)
                .focused($textFieldFocused)
                .onSubmit { commitEdit() }
                .frame(maxWidth: 120)
                .multilineTextAlignment(.trailing)
        }
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

Add a helper method inside the struct:

```swift
private func formatNumber(_ val: String?, prefix: String?) -> String {
    guard let val = val, let num = Double(val) else { return "—" }
    let formatter = NumberFormatter()
    formatter.numberStyle = prefix == "$" ? .currency : .decimal
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: num)) ?? "—"
}
```

- [ ] **Step 7: Add isLink behavior to display mode**

In the display text section (non-editing state), when `isLink` is true and value is not nil, make the text open the URL on tap:

```swift
// In the default display text area, wrap with link behavior:
if !isEditing && isLink, let val = value, !val.isEmpty {
    Text(val)
        .font(.system(size: 13))
        .foregroundStyle(.blue)
        .onTapGesture {
            // Validate URL scheme
            let url: URL?
            if val.contains("@") && !val.hasPrefix("mailto:") {
                url = URL(string: "mailto:\(val)")
            } else if val.hasPrefix("http://") || val.hasPrefix("https://") || val.hasPrefix("mailto:") || val.hasPrefix("tel:") {
                url = URL(string: val)
            } else {
                url = URL(string: "https://\(val)")
            }
            if let url { NSWorkspace.shared.open(url) }
        }
}
```

- [ ] **Step 8: Build and verify**

Run: `cd swift-app && xcodebuild build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"`

Expected: `BUILD SUCCEEDED`

- [ ] **Step 9: Commit**

```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/03_Custom\ Apps/ils-crm
git add "swift-app/ILS CRM/Views/Shared/DetailComponents.swift"
git commit -m "feat(swift): add multiSelect, number, and isLink to EditableFieldRow"
```

---

### Task 2: ContactDetailView — Inline Editing

**Files:**
- Modify: `swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift`

**Context:** Currently all fields are read-only (`DetailFieldRow`). Electron's contact detail has inline editing for most fields. The Contact model properties are all `String?` except: `leadScore: Int?`, `lastContactDate: Date?`, `tags: [String]`, `specialtiesIds: [String]`, sync metadata, and linked record IDs. Note: `@Model` is a reference type — passing to `@Bindable` works automatically.

**Contact model properties relevant to display/edit:**
- contactName, firstName, lastName, jobTitle, company (String?)
- email, phone, mobilePhone, workPhone, linkedInUrl, website (String?)
- addressLine, city, state, country, postalCode (String?)
- categorization, qualificationStatus, leadSource, industry, clientType (String?)
- qualityRating, reliabilityRating, partnerStatus, partnerType, rateInfo (String?)
- eventTags, notes, leadNote (String?)
- leadScore (Int?), lastContactDate (Date?)
- tags ([String])

- [ ] **Step 1: Read current ContactDetailView**

Read `swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift`.

- [ ] **Step 2: Change to @Bindable**

Replace `let contact: Contact` with:

```swift
@Bindable var contact: Contact
```

- [ ] **Step 3: Add saveField helper**

```swift
private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "jobTitle": contact.jobTitle = str
    case "email": contact.email = str
    case "phone": contact.phone = str
    case "mobilePhone": contact.mobilePhone = str
    case "workPhone": contact.workPhone = str
    case "linkedInUrl": contact.linkedInUrl = str
    case "website": contact.website = str
    case "addressLine": contact.addressLine = str
    case "city": contact.city = str
    case "state": contact.state = str
    case "country": contact.country = str
    case "industry": contact.industry = str
    case "leadSource": contact.leadSource = str
    case "categorization": contact.categorization = str
    case "qualificationStatus": contact.qualificationStatus = str
    case "eventTags": contact.eventTags = str
    case "notes": contact.notes = str
    case "partnerType": contact.partnerType = str
    case "partnerStatus": contact.partnerStatus = str
    case "rateInfo": contact.rateInfo = str
    case "qualityRating": contact.qualityRating = str
    case "reliabilityRating": contact.reliabilityRating = str
    case "leadScore":
        if let s = str { contact.leadScore = Int(s) }
        else { contact.leadScore = nil }
    case "lastContactDate":
        if let s = str {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withFullDate]
            contact.lastContactDate = f.date(from: s)
        } else { contact.lastContactDate = nil }
    default: break
    }
    contact.localModifiedAt = Date()
    contact.isPendingPush = true
}
```

- [ ] **Step 4: Convert CONTACT INFO fields to EditableFieldRow**

```swift
DetailSection(title: "CONTACT INFO") {
    EditableFieldRow(label: "Title", key: "jobTitle", type: .text, value: contact.jobTitle, onSave: saveField)
    EditableFieldRow(label: "Email", key: "email", type: .text, value: contact.email, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Mobile", key: "mobilePhone", type: .text, value: contact.mobilePhone, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Office", key: "workPhone", type: .text, value: contact.workPhone, isLink: true, onSave: saveField)
    EditableFieldRow(label: "LinkedIn", key: "linkedInUrl", type: .text, value: contact.linkedInUrl, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Website", key: "website", type: .text, value: contact.website, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Address", key: "addressLine", type: .text, value: contact.addressLine, onSave: saveField)
    EditableFieldRow(label: "City", key: "city", type: .text, value: contact.city, onSave: saveField)
    EditableFieldRow(label: "State", key: "state", type: .text, value: contact.state, onSave: saveField)
    EditableFieldRow(label: "Country", key: "country", type: .text, value: contact.country, onSave: saveField)
}
```

- [ ] **Step 5: Convert CRM INFO fields to EditableFieldRow**

```swift
DetailSection(title: "CRM INFO") {
    EditableFieldRow(label: "Categorization", key: "categorization",
        type: .singleSelect(options: [
            "Lead", "Customer", "Partner", "Vendor", "Talent", "Other", "Unknown",
            "VIP", "Investor", "Speaker", "Press", "Influencer", "Board Member", "Advisor"
        ]), value: contact.categorization, onSave: saveField)
    EditableFieldRow(label: "Industry", key: "industry",
        type: .singleSelect(options: [
            "Technology", "Healthcare", "Finance", "Education", "Manufacturing",
            "Real Estate", "Consulting", "Other", "Hospitality", "Logistics",
            "Fitness", "Legal", "Media", "Design", "Venture Capital", "Retail", "Entertainment"
        ]), value: contact.industry, onSave: saveField)
    EditableFieldRow(label: "Lead Source", key: "leadSource",
        type: .singleSelect(options: [
            "Referral", "Website", "Inbound", "Outbound", "Event",
            "Social Media", "Other", "LinkedIn", "Cold Call"
        ]), value: contact.leadSource, onSave: saveField)
    EditableFieldRow(label: "Qualification", key: "qualificationStatus",
        type: .singleSelect(options: [
            "New", "Contacted", "Qualified", "Unqualified", "Nurturing"
        ]), value: contact.qualificationStatus, onSave: saveField)
    EditableFieldRow(label: "Event Tags", key: "eventTags", type: .text,
        value: contact.eventTags, onSave: saveField)
    EditableFieldRow(label: "Lead Score", key: "leadScore",
        type: .number(prefix: nil),
        value: contact.leadScore.map { "\($0)" }, onSave: saveField)
    EditableFieldRow(label: "Last Contact", key: "lastContactDate",
        type: .date,
        value: contact.lastContactDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
}
```

- [ ] **Step 6: Convert PARTNER/VENDOR fields**

```swift
DetailSection(title: "PARTNER/VENDOR") {
    EditableFieldRow(label: "Partner Type", key: "partnerType",
        type: .singleSelect(options: [
            "Fabricator", "AV/Lighting", "Scenic/Set Builder", "Architect",
            "Interior Designer", "Graphic Designer", "F&B Consultant",
            "Tech/Interactive", "Operations Consultant", "Production Company",
            "Freelancer/Individual", "Other"
        ]), value: contact.partnerType, onSave: saveField)
    EditableFieldRow(label: "Partner Status", key: "partnerStatus",
        type: .singleSelect(options: [
            "Active - Preferred", "Active", "Inactive", "Do Not Use"
        ]), value: contact.partnerStatus, onSave: saveField)
    EditableFieldRow(label: "Quality Rating", key: "qualityRating",
        type: .singleSelect(options: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]),
        value: contact.qualityRating, onSave: saveField)
    EditableFieldRow(label: "Reliability", key: "reliabilityRating",
        type: .singleSelect(options: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]),
        value: contact.reliabilityRating, onSave: saveField)
    EditableFieldRow(label: "Rate Info", key: "rateInfo", type: .text,
        value: contact.rateInfo, onSave: saveField)
}
```

- [ ] **Step 7: Convert NOTES**

```swift
DetailSection(title: "NOTES") {
    EditableFieldRow(label: "", key: "notes", type: .textarea,
        value: contact.notes, onSave: saveField)
}
```

- [ ] **Step 8: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 9: Commit**

```bash
git add "swift-app/ILS CRM/Views/Contacts/ContactDetailView.swift"
git commit -m "feat(swift): inline editing for ContactDetailView — all CRM fields editable"
```

---

### Task 3: CompanyDetailView — Add Missing Fields (Display-Only)

**Files:**
- Modify: `swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift`

**Context:** Electron CompanyDetail is display-only (no inline editing) — Swift matches this. But Swift is missing fields: companyType, companySize, annualRevenue, leadSource, industry. Also missing: Projects and Proposals linked sections.

**Company model properties:** companyName, address, city, stateRegion, country, website, foundingYear (Int?), companyType, companySize, annualRevenue, industry, leadSource, naicsCode, notes, companyDescription (all String? unless noted). Linked IDs: salesOpportunitiesIds, projectsIds, contactsIds, proposalsIds (all [String]).

Note: Company has NO `phone` property.

- [ ] **Step 1: Read CompanyDetailView**

Read `swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift`.

- [ ] **Step 2: Add missing fields to COMPANY INFO section**

Add `DetailFieldRow` entries (read-only) for missing fields. Note `foundingYear` is `Int?`, format as string:

```swift
DetailSection(title: "COMPANY INFO") {
    if let website = company.website, !website.isEmpty {
        DetailFieldRow(label: "Website", value: website, isLink: true)
    }
    if let address = company.address, !address.isEmpty {
        DetailFieldRow(label: "Address", value: address)
    }
    if let industry = company.industry, !industry.isEmpty {
        DetailFieldRow(label: "Industry", value: industry)
    }
    if let companyType = company.companyType, !companyType.isEmpty {
        DetailFieldRow(label: "Type", value: companyType)
    }
    if let size = company.companySize, !size.isEmpty {
        DetailFieldRow(label: "Size", value: size)
    }
    if let revenue = company.annualRevenue, !revenue.isEmpty {
        DetailFieldRow(label: "Annual Revenue", value: revenue)
    }
    if let leadSource = company.leadSource, !leadSource.isEmpty {
        DetailFieldRow(label: "Lead Source", value: leadSource)
    }
    if let naics = company.naicsCode, !naics.isEmpty {
        DetailFieldRow(label: "NAICS Code", value: naics)
    }
    if let founded = company.foundingYear {
        DetailFieldRow(label: "Founded", value: "\(founded)")
    }
}
```

- [ ] **Step 3: Add Projects linked section**

Copy the existing CONTACTS or OPPORTUNITIES section pattern. Add after Opportunities section:

```swift
// PROJECTS section
let projectIds = company.projectsIds
if !projectIds.isEmpty {
    DetailSection(title: "PROJECTS (\(projectIds.count))") {
        // Query projects by IDs — use @Query with filter or manual fetch
        ForEach(projectIds, id: \.self) { projectId in
            // Resolve project name using LinkedRecordResolver pattern
            // For now, show abbreviated ID as placeholder
            HStack {
                Text(projectId.suffix(6).description)
                    .font(.system(size: 13))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
        }
    }
}
```

Repeat for Proposals using `company.proposalsIds`.

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/Companies/CompanyDetailView.swift"
git commit -m "feat(swift): add missing fields and linked sections to CompanyDetailView"
```

---

### Task 4: OpportunityDetailView — Inline Editing

**Files:**
- Modify: `swift-app/ILS CRM/Views/Pipeline/OpportunityDetailView.swift`
  (If file doesn't exist, check `PipelineDetailView.swift` — rename or create as needed)

**Context:** Electron DealDetail has inline editing for: salesStage, dealValue, probability, engagementType (multiSelect), qualsType, leadSource, referredBy, qualificationsSent, expectedCloseDate, nextMeetingDate. The existing Swift view likely uses `Form { Section { } }.formStyle(.grouped)` — this must be restructured to use `VStack` with `DetailSection` + `EditableFieldRow` to match the other detail views.

**Opportunity model properties:**
- opportunityName, referredBy, notesAbout, contractMilestones, lossNotes (String?)
- salesStage, probability, qualsType, leadSource, winLossReason (String?)
- dealValue, probabilityValue (Double?)
- expectedCloseDate, nextMeetingDate (Date?)
- engagementType ([String]) — ARRAY, must join/split
- qualificationsSent (Bool)
- companyIds, associatedContactIds, tasksIds, interactionsIds, projectIds, proposalsIds ([String])

- [ ] **Step 1: Read current file**

Read the opportunity detail view file (check both names).

- [ ] **Step 2: Add @Bindable and saveField**

```swift
@Bindable var opportunity: Opportunity

private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "salesStage": opportunity.salesStage = str
    case "dealValue":
        if let s = str, let d = Double(s) { opportunity.dealValue = d }
        else { opportunity.dealValue = nil }
    case "probability": opportunity.probability = str
    case "engagementType":
        // multiSelect: value comes as comma-separated string, model is [String]
        opportunity.engagementType = str?.components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty } ?? []
    case "qualsType": opportunity.qualsType = str
    case "leadSource": opportunity.leadSource = str
    case "referredBy": opportunity.referredBy = str
    case "qualificationsSent":
        opportunity.qualificationsSent = (value as? Bool) ?? false
    case "expectedCloseDate":
        if let s = str {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withFullDate]
            opportunity.expectedCloseDate = f.date(from: s)
        } else { opportunity.expectedCloseDate = nil }
    case "nextMeetingDate":
        if let s = str {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withFullDate]
            opportunity.nextMeetingDate = f.date(from: s)
        } else { opportunity.nextMeetingDate = nil }
    case "notesAbout": opportunity.notesAbout = str
    default: break
    }
    opportunity.localModifiedAt = Date()
    opportunity.isPendingPush = true
}
```

- [ ] **Step 3: Restructure body — replace Form with VStack + DetailSection**

Remove the existing `Form { Section { } }.formStyle(.grouped)` wrapper. Replace with `ScrollView { VStack(spacing: 0) { ... } }` containing `DetailSection` blocks. This matches the pattern used in TaskDetailView and ContactDetailView.

Build the DEAL INFO section:

```swift
DetailSection(title: "DEAL INFO") {
    EditableFieldRow(label: "Stage", key: "salesStage",
        type: .singleSelect(options: [
            "Initial Contact", "Qualification", "Meeting Scheduled",
            "Proposal Sent", "Contract Sent", "Negotiation",
            "Development", "Investment", "Future Client",
            "Closed Won", "Closed Lost"
        ]), value: opportunity.salesStage, onSave: saveField)
    EditableFieldRow(label: "Value", key: "dealValue",
        type: .number(prefix: "$"),
        value: opportunity.dealValue.map { String(format: "%.0f", $0) },
        onSave: saveField)
    EditableFieldRow(label: "Probability", key: "probability",
        type: .singleSelect(options: [
            "Cold", "Low", "02 Medium", "01 High", "04 FUTURE ROADMAP"
        ]), value: opportunity.probability, onSave: saveField)
    EditableFieldRow(label: "Engagement Type", key: "engagementType",
        type: .multiSelect(options: [
            "Strategy/Consulting", "Design/Concept Development",
            "Production/Fabrication Oversight", "Opening/Operations Support",
            "Executive Producing"
        ]),
        value: opportunity.engagementType.joined(separator: ", "),
        onSave: saveField)
    EditableFieldRow(label: "Quals Type", key: "qualsType",
        type: .singleSelect(options: [
            "Standard Capabilities Deck", "Customized Quals", "Both"
        ]), value: opportunity.qualsType, onSave: saveField)
    EditableFieldRow(label: "Lead Source", key: "leadSource",
        type: .singleSelect(options: [
            "Referral", "Website", "Inbound", "Outbound", "Event",
            "Social Media", "Other", "LinkedIn", "Cold Call"
        ]), value: opportunity.leadSource, onSave: saveField)
    EditableFieldRow(label: "Referred By", key: "referredBy",
        type: .text, value: opportunity.referredBy, onSave: saveField)
    EditableFieldRow(label: "Quals Sent", key: "qualificationsSent",
        type: .checkbox,
        value: opportunity.qualificationsSent ? "true" : "false",
        onSave: saveField)
    EditableFieldRow(label: "Expected Close", key: "expectedCloseDate",
        type: .date,
        value: opportunity.expectedCloseDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
    EditableFieldRow(label: "Next Meeting", key: "nextMeetingDate",
        type: .date,
        value: opportunity.nextMeetingDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
}
```

- [ ] **Step 4: Add NOTES and RELATED sections**

```swift
DetailSection(title: "NOTES") {
    EditableFieldRow(label: "", key: "notesAbout", type: .textarea,
        value: opportunity.notesAbout, onSave: saveField)
}
```

Add `RelatedRecordRow` sections for Company, Contacts, Projects, Proposals using the existing pattern from the file.

- [ ] **Step 5: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 6: Commit**

```bash
git add "swift-app/ILS CRM/Views/Pipeline/"
git commit -m "feat(swift): inline editing for OpportunityDetailView — all deal fields editable"
```

---

## Chunk 2: Remaining Detail Views

### Task 5: ProjectDetailView — Inline Editing

**Files:**
- Modify: `swift-app/ILS CRM/Views/Projects/ProjectDetailView.swift`

**Project model properties:**
- projectName, location, projectDescription, keyMilestones, lessonsLearned (String?)
- status (String?)
- contractValue (Double?)
- startDate, targetCompletion, actualCompletion (Date?)
- engagementType ([String]) — ARRAY
- No `projectLead` property on model (collaborator field excluded from converter — skip in UI)

- [ ] **Step 1: Read ProjectDetailView**

Read `swift-app/ILS CRM/Views/Projects/ProjectDetailView.swift`.

- [ ] **Step 2: Add @Bindable and saveField**

```swift
@Bindable var project: Project

private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "status": project.status = str
    case "engagementType":
        project.engagementType = str?.components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty } ?? []
    case "contractValue":
        if let s = str, let d = Double(s) { project.contractValue = d }
        else { project.contractValue = nil }
    case "location": project.location = str
    case "startDate":
        if let s = str {
            let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
            project.startDate = f.date(from: s)
        } else { project.startDate = nil }
    case "targetCompletion":
        if let s = str {
            let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
            project.targetCompletion = f.date(from: s)
        } else { project.targetCompletion = nil }
    case "projectDescription": project.projectDescription = str
    case "keyMilestones": project.keyMilestones = str
    default: break
    }
    project.localModifiedAt = Date()
    project.isPendingPush = true
}
```

- [ ] **Step 3: Convert PROJECT INFO to EditableFieldRow**

Replace existing Form/DetailFieldRow with VStack/DetailSection if needed:

```swift
DetailSection(title: "PROJECT INFO") {
    EditableFieldRow(label: "Start Date", key: "startDate", type: .date,
        value: project.startDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
    EditableFieldRow(label: "End Date", key: "targetCompletion", type: .date,
        value: project.targetCompletion.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
    EditableFieldRow(label: "Status", key: "status",
        type: .singleSelect(options: [
            "Kickoff", "Discovery", "Concept Development", "Design Development",
            "Production", "Installation", "Opening/Launch", "Closeout",
            "Complete", "On Hold", "Cancelled", "Strategy"
        ]), value: project.status, onSave: saveField)
    EditableFieldRow(label: "Engagement", key: "engagementType",
        type: .multiSelect(options: [
            "Strategy/Consulting", "Design/Concept Development",
            "Production/Fabrication Oversight", "Opening/Operations Support"
        ]),
        value: project.engagementType.joined(separator: ", "),
        onSave: saveField)
    EditableFieldRow(label: "Contract Value", key: "contractValue",
        type: .number(prefix: "$"),
        value: project.contractValue.map { String(format: "%.0f", $0) },
        onSave: saveField)
    EditableFieldRow(label: "Location", key: "location", type: .text,
        value: project.location, onSave: saveField)
}
```

- [ ] **Step 4: Convert NOTES sections to editable**

```swift
DetailSection(title: "DESCRIPTION") {
    EditableFieldRow(label: "", key: "projectDescription", type: .textarea,
        value: project.projectDescription, onSave: saveField)
}
DetailSection(title: "KEY MILESTONES") {
    EditableFieldRow(label: "", key: "keyMilestones", type: .textarea,
        value: project.keyMilestones, onSave: saveField)
}
```

- [ ] **Step 5: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 6: Commit**

```bash
git add "swift-app/ILS CRM/Views/Projects/ProjectDetailView.swift"
git commit -m "feat(swift): inline editing for ProjectDetailView — status, engagement, value editable"
```

---

### Task 6: ProposalDetailView — Inline Editing + Missing Fields

**Files:**
- Modify: `swift-app/ILS CRM/Views/Proposals/ProposalDetailView.swift`

**Proposal model properties:**
- proposalName, version, clientFeedback, performanceMetrics, notes, scopeSummary (String?)
- status, templateUsed, approvalStatus (String?)
- proposedValue (Double?)
- dateSent, validUntil (Date?)
- No `createdBy` property (collaborator excluded from converter — skip in UI)
- clientIds, companyIds, relatedOpportunityIds, tasksIds ([String])

- [ ] **Step 1: Read ProposalDetailView**

Read `swift-app/ILS CRM/Views/Proposals/ProposalDetailView.swift`.

- [ ] **Step 2: Add @Bindable and saveField**

```swift
@Bindable var proposal: Proposal

private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "status": proposal.status = str
    case "approvalStatus": proposal.approvalStatus = str
    case "proposedValue":
        if let s = str, let d = Double(s) { proposal.proposedValue = d }
        else { proposal.proposedValue = nil }
    case "version": proposal.version = str
    case "templateUsed": proposal.templateUsed = str
    case "notes": proposal.notes = str
    case "scopeSummary": proposal.scopeSummary = str
    case "clientFeedback": proposal.clientFeedback = str
    case "performanceMetrics": proposal.performanceMetrics = str
    default: break
    }
    proposal.localModifiedAt = Date()
    proposal.isPendingPush = true
}
```

- [ ] **Step 3: Convert PROPOSAL INFO to EditableFieldRow + add missing fields**

```swift
DetailSection(title: "PROPOSAL INFO") {
    DetailFieldRow(label: "Proposal Date", value: proposal.dateSent.map {
        DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
    })
    DetailFieldRow(label: "Expiration", value: proposal.validUntil.map {
        DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
    })
    EditableFieldRow(label: "Value", key: "proposedValue",
        type: .number(prefix: "$"),
        value: proposal.proposedValue.map { String(format: "%.0f", $0) },
        onSave: saveField)
    EditableFieldRow(label: "Status", key: "status",
        type: .singleSelect(options: [
            "Draft", "Pending Approval", "Approved", "Sent to Client",
            "Closed Won", "Closed Lost", "Submitted", "In Review", "Rejected"
        ]), value: proposal.status, onSave: saveField)
    EditableFieldRow(label: "Approval", key: "approvalStatus",
        type: .singleSelect(options: [
            "Not Submitted", "Submitted", "Approved", "Rejected",
            "Pending", "Under Review"
        ]), value: proposal.approvalStatus, onSave: saveField)
    EditableFieldRow(label: "Version", key: "version", type: .text,
        value: proposal.version, onSave: saveField)
    EditableFieldRow(label: "Template", key: "templateUsed",
        type: .singleSelect(options: [
            "Basic", "Detailed", "Custom", "Standard Template",
            "Custom Template", "Marketing Template", "IT Template",
            "Service Template", "Design Template", "Security Template",
            "Strategy Template", "HR Template", "Event Template"
        ]), value: proposal.templateUsed, onSave: saveField)
}
```

- [ ] **Step 4: Add/convert NOTES sections**

```swift
DetailSection(title: "NOTES") {
    EditableFieldRow(label: "", key: "notes", type: .textarea,
        value: proposal.notes, onSave: saveField)
}
DetailSection(title: "SCOPE SUMMARY") {
    EditableFieldRow(label: "", key: "scopeSummary", type: .textarea,
        value: proposal.scopeSummary, onSave: saveField)
}
DetailSection(title: "CLIENT FEEDBACK") {
    EditableFieldRow(label: "", key: "clientFeedback", type: .textarea,
        value: proposal.clientFeedback, onSave: saveField)
}
```

- [ ] **Step 5: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 6: Commit**

```bash
git add "swift-app/ILS CRM/Views/Proposals/ProposalDetailView.swift"
git commit -m "feat(swift): inline editing for ProposalDetailView — status, value, approval, template editable"
```

---

### Task 7: InteractionDetailView — Inline Editing

**Files:**
- Modify: `swift-app/ILS CRM/Views/Interactions/InteractionDetailView.swift`

**Interaction model properties:**
- subject, summary, nextSteps (String?)
- type, direction (String?)
- date (Date?)
- contactsIds, salesOpportunitiesIds ([String])
- No `loggedBy` property (collaborator excluded — skip in UI)

**IMPORTANT:** The existing view uses `Form { Section { } }.formStyle(.grouped)` with custom `FieldRow` helpers. You must restructure the body to use `ScrollView { VStack(spacing: 0) { ... } }` with `DetailSection` + `EditableFieldRow`. Keep the hero header (type icon + subject + badges) at the top unchanged.

- [ ] **Step 1: Read InteractionDetailView**

Read `swift-app/ILS CRM/Views/Interactions/InteractionDetailView.swift`.

- [ ] **Step 2: Add @Bindable and saveField**

```swift
@Bindable var interaction: Interaction

private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "subject": interaction.subject = str
    case "type": interaction.type = str
    case "direction": interaction.direction = str
    case "date":
        if let s = str {
            let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
            interaction.date = f.date(from: s)
        } else { interaction.date = nil }
    case "summary": interaction.summary = str
    case "nextSteps": interaction.nextSteps = str
    default: break
    }
    interaction.localModifiedAt = Date()
    interaction.isPendingPush = true
}
```

- [ ] **Step 3: Restructure body — replace Form with VStack + DetailSection**

Remove `Form { ... }.formStyle(.grouped)` wrapper. Replace with `ScrollView { VStack(spacing: 0) { ... } }`. Keep the hero header at top. Convert fields:

```swift
DetailSection(title: "INTERACTION INFO") {
    EditableFieldRow(label: "Subject", key: "subject", type: .text,
        value: interaction.subject, onSave: saveField)
    EditableFieldRow(label: "Type", key: "type",
        type: .singleSelect(options: [
            "📧 Email", "📞 Phone Call", "🤝 Meeting (In-Person)",
            "💻 Meeting (Virtual)", "🍽️ Lunch/Dinner",
            "🎪 Conference/Event", "📝 Note"
        ]), value: interaction.type, onSave: saveField)
    EditableFieldRow(label: "Direction", key: "direction",
        type: .singleSelect(options: [
            "Outbound (we initiated)", "Inbound (they initiated)"
        ]), value: interaction.direction, onSave: saveField)
    EditableFieldRow(label: "Date", key: "date", type: .date,
        value: interaction.date.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
}
DetailSection(title: "SUMMARY") {
    EditableFieldRow(label: "", key: "summary", type: .textarea,
        value: interaction.summary, onSave: saveField)
}
DetailSection(title: "NEXT STEPS") {
    EditableFieldRow(label: "", key: "nextSteps", type: .textarea,
        value: interaction.nextSteps, onSave: saveField)
}
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/Interactions/InteractionDetailView.swift"
git commit -m "feat(swift): inline editing for InteractionDetailView — type, direction, summary editable"
```

---

### Task 8: PortalAccessDetailView — Inline Editing

**Files:**
- Modify: `swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift`

**PortalAccessRecord model properties:**
- name, email, pageAddress, decisionMaker, company, address, primaryContact (String?)
- positionTitle, industry, notes, phoneNumber, website (String?)
- status, leadSource, stage (String?)
- framerPageUrl (String?)
- projectBudget (Double?)
- dateAdded, expectedProjectStartDate, followUpDate (Date?)
- servicesInterestedIn ([String]) — ARRAY
- contactIds ([String])
- 12 lookup fields: contactNameLookup, contactCompanyLookup, etc. (String? — readonly)

**IMPORTANT:** The existing view uses `Form { ... }.formStyle(.grouped)` with custom `FieldRow` and `linkRow()` helpers. You must restructure the body to use `ScrollView { VStack(spacing: 0) { ... } }` with `DetailSection` + `EditableFieldRow`. Keep the custom header area (avatar + name + status badge) unchanged.

- [ ] **Step 1: Read PortalAccessDetailView**

Read `swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift`.

- [ ] **Step 2: Add @Bindable and saveField**

```swift
@Bindable var record: PortalAccessRecord

private func saveField(_ key: String, _ value: Any?) {
    let str = value as? String
    switch key {
    case "stage": record.stage = str
    case "status": record.status = str
    case "leadSource": record.leadSource = str
    case "servicesInterestedIn":
        record.servicesInterestedIn = str?.components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty } ?? []
    case "projectBudget":
        if let s = str, let d = Double(s) { record.projectBudget = d }
        else { record.projectBudget = nil }
    case "followUpDate":
        if let s = str {
            let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
            record.followUpDate = f.date(from: s)
        } else { record.followUpDate = nil }
    case "expectedProjectStartDate":
        if let s = str {
            let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
            record.expectedProjectStartDate = f.date(from: s)
        } else { record.expectedProjectStartDate = nil }
    case "decisionMaker": record.decisionMaker = str
    case "positionTitle": record.positionTitle = str
    case "phoneNumber": record.phoneNumber = str
    case "website": record.website = str
    case "industry": record.industry = str
    case "address": record.address = str
    case "notes": record.notes = str
    default: break
    }
    record.localModifiedAt = Date()
    record.isPendingPush = true
}
```

- [ ] **Step 3: Restructure body — replace Form with VStack + DetailSection**

Remove `Form { ... }.formStyle(.grouped)`. Replace with `ScrollView { VStack(spacing: 0) { ... } }`:

```swift
DetailSection(title: "ACCESS INFO") {
    EditableFieldRow(label: "Page Address", key: "pageAddress", type: .readonly,
        value: record.pageAddress)
    EditableFieldRow(label: "Stage", key: "stage",
        type: .singleSelect(options: ["Prospect", "Lead", "Client", "Past Client", "Partner"]),
        value: record.stage, onSave: saveField)
    EditableFieldRow(label: "Status", key: "status",
        type: .singleSelect(options: ["ACTIVE", "IN-ACTIVE", "PENDING", "EXPIRED", "REVOKED"]),
        value: record.status, onSave: saveField)
    EditableFieldRow(label: "Email", key: "email", type: .readonly,
        value: record.email, isLink: true)
    EditableFieldRow(label: "Position", key: "positionTitle", type: .text,
        value: record.positionTitle, onSave: saveField)
    EditableFieldRow(label: "Company", key: "company", type: .readonly,
        value: record.company)
    EditableFieldRow(label: "Decision Maker", key: "decisionMaker", type: .text,
        value: record.decisionMaker, onSave: saveField)
    EditableFieldRow(label: "Lead Source", key: "leadSource", type: .text,
        value: record.leadSource, onSave: saveField)
}
DetailSection(title: "PORTAL & BUSINESS") {
    EditableFieldRow(label: "Website", key: "website", type: .text,
        value: record.website, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Phone", key: "phoneNumber", type: .text,
        value: record.phoneNumber, isLink: true, onSave: saveField)
    EditableFieldRow(label: "Industry", key: "industry", type: .text,
        value: record.industry, onSave: saveField)
    EditableFieldRow(label: "Project Budget", key: "projectBudget",
        type: .number(prefix: "$"),
        value: record.projectBudget.map { String(format: "%.0f", $0) },
        onSave: saveField)
    EditableFieldRow(label: "Services", key: "servicesInterestedIn",
        type: .multiSelect(options: [
            "Strategy/Consulting", "Design/Concept Development",
            "Production/Fabrication Oversight", "Opening/Operations Support",
            "Executive Producing"
        ]),
        value: record.servicesInterestedIn.joined(separator: ", "),
        onSave: saveField)
}
DetailSection(title: "KEY DATES") {
    EditableFieldRow(label: "Follow Up", key: "followUpDate", type: .date,
        value: record.followUpDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
    EditableFieldRow(label: "Expected Start", key: "expectedProjectStartDate", type: .date,
        value: record.expectedProjectStartDate.map { ISO8601DateFormatter().string(from: $0) },
        onSave: saveField)
    DetailFieldRow(label: "Date Added", value: record.dateAdded.map {
        DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
    })
}
DetailSection(title: "NOTES") {
    EditableFieldRow(label: "", key: "notes", type: .textarea,
        value: record.notes, onSave: saveField)
}
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Views/Portal/PortalAccessDetailView.swift"
git commit -m "feat(swift): inline editing for PortalAccessDetailView — stage, status, budget editable"
```

---

## Chunk 3: Client Portal Wave 3 + Linked Record Resolution

### Task 9: Client Portal Health Monitoring

**Files:**
- Create: `swift-app/ILS CRM/Services/FramerHealthService.swift`
- Modify: Client Portal view files in `swift-app/ILS CRM/Views/Portal/`

**Context:** Electron checks published Framer page URLs via HTTP HEAD requests (staggered 200ms). Maps status: live (200), error (404/other). Shows health indicators next to each page.

- [ ] **Step 1: Create FramerHealthService**

Create `swift-app/ILS CRM/Services/FramerHealthService.swift`:

```swift
import Foundation
import Observation

@MainActor
@Observable
final class FramerHealthService {
    enum PageHealth: String {
        case live, error, unchecked
    }

    private(set) var healthMap: [String: PageHealth] = [:]
    private(set) var isChecking = false

    func checkHealth(slugs: [String]) async {
        isChecking = true
        defer { isChecking = false }

        for slug in slugs where !slug.isEmpty {
            guard let url = URL(string: "https://www.imaginelabstudios.com/ils-clients/\(slug)") else {
                healthMap[slug] = .error
                continue
            }
            var request = URLRequest(url: url)
            request.httpMethod = "HEAD"
            request.timeoutInterval = 10

            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                healthMap[slug] = status == 200 ? .live : .error
            } catch {
                healthMap[slug] = .error
            }

            // Stagger 200ms between requests to avoid rate limiting
            try? await Task.sleep(for: .milliseconds(200))
        }
    }

    var liveCount: Int { healthMap.values.filter { $0 == .live }.count }
    var errorCount: Int { healthMap.values.filter { $0 == .error }.count }
}
```

- [ ] **Step 2: Add health indicators to Client Portal page list**

In the Client Portal view, add colored dots next to each page card based on `healthService.healthMap[slug]`:
- `.live` → green circle (`Circle().fill(.green).frame(width: 8, height: 8)`)
- `.error` → red circle
- `.unchecked` → gray circle

- [ ] **Step 3: Add health summary toolbar**

Above the page list, add a toolbar row:

```swift
HStack(spacing: 12) {
    Text("\(healthService.liveCount) Live")
        .foregroundStyle(.green)
    Text("\(healthService.errorCount) Error")
        .foregroundStyle(.red)
    Spacer()
    Button("Check Health") {
        Task { await healthService.checkHealth(slugs: pageAddresses) }
    }
    .disabled(healthService.isChecking)
}
.font(.system(size: 12))
.padding(.horizontal, 12)
.padding(.vertical, 6)
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Services/FramerHealthService.swift" "swift-app/ILS CRM/Views/Portal/"
git commit -m "feat(swift): Client Portal health monitoring — Framer HEAD checks with status indicators"
```

---

### Task 10: Client Portal Grant Access Flow

**Files:**
- Create or modify files in: `swift-app/ILS CRM/Views/Portal/`

**Context:** Electron has a "Grant Access" button that opens a popover to select a contact and grant them access to a Client Page. Creates a new Portal Access record.

- [ ] **Step 1: Create GrantAccessSheet**

```swift
struct GrantAccessSheet: View {
    let pageAddress: String
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    var filteredContacts: [Contact] {
        let list = searchText.isEmpty ? contacts : contacts.filter {
            ($0.contactName ?? "").localizedCaseInsensitiveContains(searchText)
        }
        return Array(list.prefix(50))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Grant Access")
                    .font(.system(size: 15, weight: .semibold))
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(.plain)
            }
            .padding(12)

            // Search
            TextField("Search contacts...", text: $searchText)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)

            // Contact list
            List(filteredContacts, id: \.id) { contact in
                Button(action: { grantAccess(to: contact) }) {
                    HStack {
                        AvatarView(name: contact.contactName ?? "?", size: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(contact.contactName ?? "Unknown")
                                .font(.system(size: 13))
                            if let email = contact.email {
                                Text(email)
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
        }
        .frame(width: 360, height: 400)
    }

    private func grantAccess(to contact: Contact) {
        let record = PortalAccessRecord(
            id: "local_\(UUID().uuidString)",
            name: contact.contactName
        )
        record.pageAddress = pageAddress
        record.email = contact.email
        record.company = contact.company
        record.status = "ACTIVE"
        record.stage = "Prospect"
        record.dateAdded = Date()
        record.isPendingPush = true
        context.insert(record)
        dismiss()
    }
}
```

Note: `PortalAccessRecord(id:name:)` uses the model's init. Check the actual init signature — if it only takes `id:`, adjust: `PortalAccessRecord(id: "local_\(UUID().uuidString)")` then set `.name = contact.contactName`.

- [ ] **Step 2: Wire up "Grant Access" button**

In the Client Portal page detail view, add:

```swift
@State private var showGrantAccess = false

// In the toolbar or header area:
Button("Grant Access") { showGrantAccess = true }
    .sheet(isPresented: $showGrantAccess) {
        GrantAccessSheet(pageAddress: selectedPage.pageAddress ?? "")
    }
```

- [ ] **Step 3: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM/Views/Portal/"
git commit -m "feat(swift): Client Portal grant access — contact picker creates Portal Access record"
```

---

### Task 11: Linked Record Name Resolution

**Files:**
- Create: `swift-app/ILS CRM/Utils/LinkedRecordResolver.swift`
- Modify: Detail views that show linked records (TaskDetailView, ContactDetailView, CompanyDetailView, ProjectDetailView, ProposalDetailView)

**Context:** Linked records currently show abbreviated IDs ("rec" + 6 chars). Need to resolve IDs to display names using SwiftData queries. Important: Do NOT change the `RelatedRecordRow` component signature — that would break all callers. Instead, resolve names before passing to the existing `items: [String]` parameter.

- [ ] **Step 1: Create Utils directory and LinkedRecordResolver**

```bash
mkdir -p "swift-app/ILS CRM/Utils"
```

Create `swift-app/ILS CRM/Utils/LinkedRecordResolver.swift`:

```swift
import SwiftData
import Foundation

/// Resolves Airtable record IDs to display names using local SwiftData cache.
struct LinkedRecordResolver {
    let context: ModelContext

    func contactName(id: String) -> String? {
        let predicate = #Predicate<Contact> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.contactName
    }

    func companyName(id: String) -> String? {
        let predicate = #Predicate<Company> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.companyName
    }

    func opportunityName(id: String) -> String? {
        let predicate = #Predicate<Opportunity> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.opportunityName
    }

    func projectName(id: String) -> String? {
        let predicate = #Predicate<Project> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.projectName
    }

    func proposalName(id: String) -> String? {
        let predicate = #Predicate<Proposal> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.proposalName
    }

    func taskName(id: String) -> String? {
        let predicate = #Predicate<CRMTask> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.task
    }
}
```

- [ ] **Step 2: Add resolver to detail views**

In each detail view that shows linked records, add:

```swift
@Environment(\.modelContext) private var modelContext
```

Then resolve IDs before passing to `RelatedRecordRow`. For example in TaskDetailView:

```swift
private var resolvedContactNames: [String] {
    let resolver = LinkedRecordResolver(context: modelContext)
    return parseIds(task.contactsIds).compactMap { resolver.contactName(id: $0) }
}

// Then in the body:
RelatedRecordRow(label: "Contacts", items: resolvedContactNames)
```

Apply this pattern to all `RelatedRecordRow` usages across detail views. The `items` parameter stays `[String]` — no signature change needed.

- [ ] **Step 3: Add parseIds helper if not already present**

If `parseIds` doesn't exist in Swift, add it to `LinkedRecordResolver.swift`:

```swift
/// Parse a JSON array string or [String] into array of IDs.
func parseIds(_ value: [String]) -> [String] {
    return value
}

func parseIds(_ value: String?) -> [String] {
    guard let value = value, !value.isEmpty else { return [] }
    if value.hasPrefix("[") {
        guard let data = value.data(using: .utf8),
              let arr = try? JSONDecoder().decode([String].self, from: data) else { return [] }
        return arr
    }
    return [value]
}
```

- [ ] **Step 4: Build and verify**

Run build command. Expected: `BUILD SUCCEEDED`

- [ ] **Step 5: Commit**

```bash
git add "swift-app/ILS CRM/Utils/" "swift-app/ILS CRM/Views/"
git commit -m "feat(swift): linked record name resolution — IDs resolve to display names"
```

---

## Chunk 4: Verification + XCUITest

### Task 12: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Clean build**

```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/03_Custom\ Apps/ils-crm/swift-app
xcodebuild clean build -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:|warning:"
```

Expected: `BUILD SUCCEEDED` with 0 errors.

- [ ] **Step 2: Verify EditableFieldRow supports all 8 types**

Read `Views/Shared/DetailComponents.swift`. Confirm `EditableFieldType` enum has: text, textarea, singleSelect, multiSelect, number, date, checkbox, readonly. Confirm `isLink` property exists.

- [ ] **Step 3: Verify each editable detail view**

For each of the 6 editable detail views (Contact, Opportunity, Project, Proposal, Interaction, PortalAccess), confirm:
1. Uses `@Bindable` for the entity
2. Has a `saveField(_ key:, _ value:)` method
3. Sets `localModifiedAt = Date()` and `isPendingPush = true` on every save
4. `[String]` multiSelect fields are joined on display and split on save
5. `Date?` fields parse ISO strings in saveField (not `value as? Date`)
6. `Double?` fields use `Double(str)` in saveField

CompanyDetailView should remain display-only with `DetailFieldRow` (no EditableFieldRow, no saveField).

- [ ] **Step 4: Verify FramerHealthService**

Read `Services/FramerHealthService.swift`. Confirm: `@MainActor @Observable`, HEAD requests, 200ms stagger, health enum.

- [ ] **Step 5: Verify LinkedRecordResolver**

Read `Utils/LinkedRecordResolver.swift`. Confirm resolution methods for: Contact, Company, Opportunity, Project, Proposal, CRMTask.

---

### Task 13: XCUITest Updates

**Files:**
- Modify: `swift-app/ILS CRM UITests/ILS_CRM_UITests.swift`

- [ ] **Step 1: Read current test file**

Read `swift-app/ILS CRM UITests/ILS_CRM_UITests.swift`.

- [ ] **Step 2: Add screenshot test for inline editing view**

```swift
func testDetailViewScreenshots() throws {
    let app = XCUIApplication()
    app.launch()
    sleep(2)

    // Handle window restoration
    if app.windows.count == 0 {
        app.menuBars.menuBarItems["File"].click()
        app.menuBars.menuItems["New Window"].click()
        sleep(2)
    }

    // Navigate to Tasks and screenshot detail
    let tasksNav = app.descendants(matching: .any)["nav_tasks"]
    if tasksNav.exists { tasksNav.click() }
    sleep(1)
    let taskScreenshot = app.screenshot()
    let taskAttachment = XCTAttachment(screenshot: taskScreenshot)
    taskAttachment.name = "tasks-detail-view"
    taskAttachment.lifetime = .keepAlways
    add(taskAttachment)

    // Navigate to Client Portal and screenshot
    let portalNav = app.descendants(matching: .any)["nav_portal"]
    if portalNav.exists { portalNav.click() }
    sleep(1)
    let portalScreenshot = app.screenshot()
    let portalAttachment = XCTAttachment(screenshot: portalScreenshot)
    portalAttachment.name = "client-portal-view"
    portalAttachment.lifetime = .keepAlways
    add(portalAttachment)
}
```

- [ ] **Step 3: Build tests**

```bash
cd swift-app && xcodebuild build-for-testing -project "ILS CRM.xcodeproj" -scheme "ILS CRM" -destination 'platform=macOS' 2>&1 | grep -E "BUILD|error:"
```

Expected: `BUILD SUCCEEDED`

- [ ] **Step 4: Commit**

```bash
git add "swift-app/ILS CRM UITests/"
git commit -m "test(swift): add screenshot tests for detail views and Client Portal"
```

---

## Verification Goals

- [ ] `EditableFieldRow` supports 8 field types: text, textarea, singleSelect, multiSelect, number, date, checkbox, readonly
- [ ] `EditableFieldRow` has `isLink: Bool` property for URL/email/phone display
- [ ] ContactDetailView: CRM fields editable (categorization, industry, lead source, qualification, ratings, lead score, last contact date)
- [ ] CompanyDetailView: Missing fields added (type, size, revenue, lead source, NAICS), Projects/Proposals linked sections — remains display-only
- [ ] OpportunityDetailView: All deal fields editable (stage, value, probability, engagement type, dates) — engagementType uses multiSelect with [String] join/split
- [ ] ProjectDetailView: Status, engagement type (multiSelect), contract value, location, description, milestones editable
- [ ] ProposalDetailView: Status, approval status, value, version, template, notes, scope, client feedback editable
- [ ] InteractionDetailView: Type, direction, date, summary, next steps editable — Form→VStack restructure
- [ ] PortalAccessDetailView: Stage, status, budget, services (multiSelect), dates, notes editable — Form→VStack restructure
- [ ] FramerHealthService: @MainActor, HEAD requests with 200ms stagger, live/error status
- [ ] Grant access flow: Contact picker creates Portal Access record with correct init
- [ ] LinkedRecordResolver: IDs resolve to display names — RelatedRecordRow signature unchanged
- [ ] `xcodebuild build` succeeds with 0 errors
- [ ] XCUITest builds with `app.launch()` and window restoration handling

## Parallelization Guide

**Independent tasks (can run in parallel):**
- Tasks 2, 3, 4, 5, 6, 7, 8 (all detail views — separate files, no dependencies between them)
- Task 9 and Task 10 (Client Portal features — separate files)

**Sequential dependencies:**
- Task 1 (EditableFieldRow enhancement) MUST complete before Tasks 2-8
- Task 11 (linked record resolution) should run after detail views are done (modifies same files)
- Tasks 12-13 (verification) run last

**Recommended execution order:**
1. **Task 1** — prerequisite (multiSelect + number + isLink)
2. **Tasks 2-8** in parallel — 7 subagents, one per detail view
3. **Tasks 9-10** in parallel — Client Portal features
4. **Task 11** — linked record resolution (touches files from step 2)
5. **Tasks 12-13** — verification + tests
