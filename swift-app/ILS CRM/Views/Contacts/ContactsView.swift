import SwiftUI
import SwiftData
import Combine

// MARK: - SortMode

enum ContactSortMode: String, CaseIterable, CustomStringConvertible {
    case nameAZ    = "Name A–Z"
    case company   = "Company"
    case newest    = "Newest First"

    var description: String { rawValue }
}

// MARK: - ContactsView

/// Contacts list + inline detail — mirrors src/components/contacts/ContactListPage.tsx
///
/// Layout: fixed 380pt list panel | Divider | flex detail panel
/// List supports three sort modes: Name A–Z (default), Company grouping, Newest First.
struct ContactsView: View {
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @Query private var companies: [Company]
    @Query(sort: \Specialty.specialty) private var specialties: [Specialty]

    @State private var searchText = ""
    @State private var selectedContact: Contact?
    @AppStorage("sort-contacts") private var sortMode: ContactSortMode = .nameAZ
    @State private var categoryFilter: String = "All"
    @State private var showingNewContact = false

    private static let categoryFilterOptions = [
        "All", "Client", "Prospect", "Partner", "Consultant", "Talent",
        "Vendor Contact", "Industry Peer", "Employee", "Investor", "Advisor", "VIP", "Press", "Other"
    ]

    private static let specialtyColors: [Color] = [.indigo, .green, .purple, .orange, .teal, .red, .pink, .blue]

    // MARK: - Derived Data

    /// Company ID → company name lookup built from the Companies query.
    private var companyNameById: [String: String] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { c in
            guard let name = c.companyName else { return nil }
            return (c.id, name)
        })
    }

    /// Specialty ID → name lookup.
    private var specialtyNameById: [String: String] {
        Dictionary(uniqueKeysWithValues: specialties.compactMap { s in
            guard let name = s.specialty, !name.isEmpty else { return nil }
            return (s.id, name)
        })
    }

    private var filteredContacts: [Contact] {
        var result = contacts

        // Category filter
        if categoryFilter != "All" {
            result = result.filter { $0.categorization.contains(categoryFilter) }
        }

        // Search filter
        if !searchText.isEmpty {
            result = result.filter { contact in
                (contact.contactName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.email?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.companiesIds.compactMap { companyNameById[$0] }.contains { $0.localizedCaseInsensitiveContains(searchText) }) ||
                (contact.jobTitle?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return result
    }

    private func categoryCount(_ category: String) -> Int {
        if category == "All" { return contacts.count }
        return contacts.filter { $0.categorization.contains(category) }.count
    }

    private func specialtyColor(for name: String) -> Color {
        var hash = 0
        for char in name.unicodeScalars { hash = (hash &* 31 &+ Int(char.value)) & 0xfffff }
        return Self.specialtyColors[hash % Self.specialtyColors.count]
    }

    // MARK: - Grouping

    /// Returns contacts grouped by first company name (or "NO COMPANY"), sorted alphabetically
    /// with "NO COMPANY" first.
    private var groupedByCompany: [(key: String, contacts: [Contact])] {
        let grouped = Dictionary(grouping: filteredContacts) { contact -> String in
            // Use the first linked company ID to resolve a name
            if let firstId = contact.companiesIds.first,
               let name = companyNameById[firstId],
               !name.isEmpty {
                return name.uppercased()
            }
            return "NO COMPANY"
        }

        let sorted = grouped.sorted { a, b in
            if a.key == "NO COMPANY" { return true }
            if b.key == "NO COMPANY" { return false }
            return a.key < b.key
        }

        return sorted.map { (key: $0.key, contacts: $0.value) }
    }

    /// Returns contacts grouped by first letter of sort name (A–Z).
    private var groupedAlpha: [(key: String, contacts: [Contact])] {
        let sorted = filteredContacts.sorted { a, b in
            sortKey(for: a) < sortKey(for: b)
        }

        let grouped = Dictionary(grouping: sorted) { contact -> String in
            let name = sortKey(for: contact)
            guard let first = name.first else { return "#" }
            let upper = String(first).uppercased()
            return upper.rangeOfCharacter(from: .letters) != nil ? upper : "#"
        }

        let sortedKeys = grouped.keys.sorted()
        return sortedKeys.compactMap { key in
            guard let contacts = grouped[key] else { return nil }
            return (key: key, contacts: contacts)
        }
    }

    /// Returns contacts sorted by modified date, newest first (no grouping).
    private var sortedByNewest: [Contact] {
        filteredContacts.sorted { a, b in
            let dateA = a.localModifiedAt ?? a.airtableModifiedAt ?? .distantPast
            let dateB = b.localModifiedAt ?? b.airtableModifiedAt ?? .distantPast
            return dateA > dateB
        }
    }

    private func sortKey(for contact: Contact) -> String {
        if let ln = contact.lastName, !ln.isEmpty { return ln }
        if let cn = contact.contactName, !cn.isEmpty { return cn }
        return ""
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // ── Left: List Panel ──────────────────────────────────────
            VStack(spacing: 0) {
                ListHeader(
                    title: "Contacts",
                    count: contacts.count,
                    buttonLabel: "+ New Contact",
                    onButton: { showingNewContact = true }
                )

                Divider()

                // Search bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.tertiary)
                        .font(.system(size: 13))
                    TextField("Search contacts…", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.tertiary)
                                .font(.system(size: 13))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.platformControlBackground)

                Divider()

                // Category filter pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(Self.categoryFilterOptions, id: \.self) { option in
                            let isSelected = categoryFilter == option
                            let count = categoryCount(option)
                            Button {
                                categoryFilter = option
                            } label: {
                                HStack(spacing: 4) {
                                    Text(option)
                                        .font(.system(size: 11, weight: .medium))
                                    if count > 0 && option != "All" {
                                        Text("\(count)")
                                            .font(.system(size: 9, weight: .semibold))
                                            .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                                    }
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule(style: .continuous)
                                        .fill(isSelected ? Color.accentColor : Color.platformControlBackground)
                                )
                                .foregroundStyle(isSelected ? .white : .primary)
                                .overlay {
                                    if !isSelected {
                                        Capsule(style: .continuous)
                                            .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                }

                Divider()

                // Sort control bar
                HStack(spacing: 6) {
                    Text("\(filteredContacts.count) contacts")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    SortDropdown(
                        options: ContactSortMode.allCases,
                        selection: $sortMode
                    )
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)

                Divider()

                // Contact list
                if contacts.isEmpty {
                    EmptyStateView(
                        title: "No contacts yet",
                        description: "Contacts will appear here once synced from Airtable.",
                        systemImage: "person.crop.circle"
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredContacts.isEmpty {
                    EmptyStateView(
                        title: "No results",
                        description: "No contacts match \"\(searchText)\".",
                        systemImage: "magnifyingglass"
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    contactList
                }
            }
            .frame(width: 380)
            .background(Color.platformControlBackground)

            Divider()

            // ── Right: Detail Panel ───────────────────────────────────
            Group {
                if let contact = selectedContact {
                    ContactDetailView(contact: contact)
                        .id(contact.id) // Force re-render when selection changes
                } else {
                    EmptyStateView(
                        title: "Select a contact",
                        description: "Choose a contact from the list to view details.",
                        systemImage: "person.crop.circle"
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .sheet(isPresented: $showingNewContact) {
            ContactFormView(contact: nil)
                .frame(minWidth: 480, minHeight: 560)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showingNewContact = true
        }
    }

    // MARK: - Contact List

    @ViewBuilder
    private var contactList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: .sectionHeaders) {
                switch sortMode {
                case .company:
                    ForEach(groupedByCompany, id: \.key) { group in
                        Section {
                            ForEach(group.contacts, id: \.id) { contact in
                                contactRow(contact)
                            }
                        } header: {
                            groupHeader(title: group.key, count: group.contacts.count)
                        }
                    }
                case .nameAZ:
                    ForEach(groupedAlpha, id: \.key) { group in
                        Section {
                            ForEach(group.contacts, id: \.id) { contact in
                                contactRow(contact)
                            }
                        } header: {
                            groupHeader(title: group.key, count: group.contacts.count)
                        }
                    }
                case .newest:
                    ForEach(sortedByNewest, id: \.id) { contact in
                        contactRow(contact)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Group Header

    private func groupHeader(title: String, count: Int) -> some View {
        HStack {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(0.4)
                .foregroundStyle(.primary)
            Spacer()
            Text("\(count)")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .background(Color.platformWindowBackground.opacity(0.95))
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: Contact) -> some View {
        let isSelected = selectedContact?.id == contact.id

        return Button {
            selectedContact = contact
        } label: {
            HStack(spacing: 10) {
                AvatarView(
                    name: contact.contactName ?? "?",
                    avatarSize: .medium,
                    photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) }
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(contact.contactName ?? "Unknown")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .lineLimit(1)

                    if let subtitle = rowSubtitle(for: contact) {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(isSelected ? .white.opacity(0.75) : .secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                // Specialty badge
                if !isSelected,
                   let firstSpecId = contact.specialtiesIds.first,
                   let specName = specialtyNameById[firstSpecId] {
                    let specColor = specialtyColor(for: specName)
                    Text(specName)
                        .font(.system(size: 10, weight: .semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(specColor.opacity(0.15))
                        .foregroundStyle(specColor)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                if let cat = contact.categorization.first, !cat.isEmpty, !isSelected {
                    StatusBadge(
                        text: contact.categorization.joined(separator: ", "),
                        color: categorizationColor(cat)
                    )
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(isSelected ? Color.accentColor : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    /// Best subtitle for a list row: job title + company, or email.
    private func rowSubtitle(for contact: Contact) -> String? {
        var parts: [String] = []
        if let title = contact.jobTitle, !title.isEmpty {
            parts.append(title)
        }
        // Resolve company name from linked record
        let companyName: String? = {
            if let firstId = contact.companiesIds.first,
               let name = companyNameById[firstId],
               !name.isEmpty {
                return name
            }
            return nil
        }()
        if let company = companyName, !company.isEmpty {
            parts.append(company)
        }
        if !parts.isEmpty { return parts.joined(separator: " · ") }
        return contact.email
    }

    private func categorizationColor(_ value: String) -> Color {
        let lower = value.lowercased()
        if lower.contains("client")  { return .blue }
        if lower.contains("lead")    { return .orange }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor")  { return .green }
        if lower.contains("prospect"){ return .teal }
        return .secondary
    }
}

// MARK: - Contact Form

/// Mirrors src/components/contacts/ContactForm.tsx
/// Pass `contact: nil` to create a new contact, or an existing Contact to edit.
struct ContactFormView: View {
    let contact: Contact?  // nil = create new

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Company.companyName) private var allCompanies: [Company]

    // MARK: - Form State

    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var contactName: String = ""
    @State private var autoComputeName: Bool = true

    @State private var email: String = ""
    @State private var mobilePhone: String = ""
    @State private var workPhone: String = ""

    @State private var jobTitle: String = ""
    @State private var selectedCompanyIds: Set<String> = []
    @State private var showingCompanyPicker = false

    @State private var categorization: Set<String> = []
    @State private var leadSource: String = ""
    @State private var industry: String = ""

    @State private var notes: String = ""

    private var isEditing: Bool { contact != nil }

    private var computedName: String {
        let parts = [firstName, lastName].filter { !$0.isEmpty }
        return parts.joined(separator: " ")
    }

    private static let categorizationOptions = [
        "Client", "Prospect", "Partner", "Consultant", "Talent", "Vendor Contact",
        "Industry Peer", "Employee", "Investor", "Advisor", "VIP", "Press", "Other"
    ]

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                nameSection
                contactInfoSection
                professionalSection
                classificationSection
                notesSection
            }
            .formStyle(.grouped)
            .navigationTitle(isEditing ? "Edit Contact" : "New Contact")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(firstName.isEmpty && lastName.isEmpty && contactName.isEmpty)
                }
            }
            .onAppear { loadFromContact() }
            .onChange(of: firstName) { updateComputedName() }
            .onChange(of: lastName) { updateComputedName() }
        }
    }

    // MARK: - Sections

    private var nameSection: some View {
        Section("Name") {
            TextField("First Name", text: $firstName)
            TextField("Last Name", text: $lastName)
            HStack {
                TextField("Display Name", text: $contactName)
                if autoComputeName {
                    Text("auto")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .onChange(of: contactName) {
                if contactName != computedName {
                    autoComputeName = false
                }
            }
        }
    }

    private var contactInfoSection: some View {
        Section("Contact Info") {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
            TextField("Mobile Phone", text: $mobilePhone)
                .textContentType(.telephoneNumber)
            TextField("Work Phone", text: $workPhone)
                .textContentType(.telephoneNumber)
        }
    }

    /// Resolved name of the first selected company, or nil.
    private var selectedCompanyName: String? {
        allCompanies.first(where: { selectedCompanyIds.contains($0.id) })?.companyName
    }

    private var professionalSection: some View {
        Section("Professional") {
            Button {
                showingCompanyPicker = true
            } label: {
                HStack {
                    Text("Company")
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(selectedCompanyName ?? "Select Company…")
                        .foregroundStyle(selectedCompanyName != nil ? .primary : .secondary)
                }
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $showingCompanyPicker) {
                LinkedRecordPicker(
                    title: "Select Company",
                    entityType: .companies,
                    currentIds: selectedCompanyIds,
                    onSave: { ids in selectedCompanyIds = ids }
                )
            }
            TextField("Job Title", text: $jobTitle)
        }
    }

    private var classificationSection: some View {
        Section("Classification") {
            VStack(alignment: .leading, spacing: 6) {
                Text("Categorization")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 6)], spacing: 6) {
                    ForEach(Self.categorizationOptions, id: \.self) { option in
                        let isSelected = categorization.contains(option)
                        Button {
                            if isSelected {
                                categorization.remove(option)
                            } else {
                                categorization.insert(option)
                            }
                        } label: {
                            Text(option)
                                .font(.system(size: 12, weight: .medium))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .frame(maxWidth: .infinity)
                                .background(
                                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                                        .fill(isSelected ? Color.accentColor : Color.platformControlBackground)
                                )
                                .foregroundStyle(isSelected ? .white : .primary)
                                .overlay {
                                    if !isSelected {
                                        RoundedRectangle(cornerRadius: 6, style: .continuous)
                                            .strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.vertical, 4)
            TextField("Lead Source", text: $leadSource)
            TextField("Industry", text: $industry)
        }
    }

    private var notesSection: some View {
        Section("Notes") {
            TextEditor(text: $notes)
                .frame(minHeight: 80)
        }
    }

    // MARK: - Load / Save

    private func loadFromContact() {
        guard let contact else { return }
        firstName = contact.firstName ?? ""
        lastName = contact.lastName ?? ""
        contactName = contact.contactName ?? ""
        email = contact.email ?? ""
        mobilePhone = contact.mobilePhone ?? ""
        workPhone = contact.workPhone ?? ""
        jobTitle = contact.jobTitle ?? ""
        selectedCompanyIds = Set(contact.companiesIds)
        categorization = Set(contact.categorization)
        leadSource = contact.leadSource ?? ""
        industry = contact.industry ?? ""
        notes = contact.notes ?? ""

        autoComputeName = contactName == computedName
    }

    private func save() {
        if let contact {
            contact.firstName = firstName.nilIfEmpty
            contact.lastName = lastName.nilIfEmpty
            contact.contactName = contactName.nilIfEmpty
            contact.email = email.nilIfEmpty
            contact.mobilePhone = mobilePhone.nilIfEmpty
            contact.workPhone = workPhone.nilIfEmpty
            contact.companiesIds = Array(selectedCompanyIds)
            contact.jobTitle = jobTitle.nilIfEmpty
            contact.categorization = Array(categorization)
            contact.leadSource = leadSource.nilIfEmpty
            contact.industry = industry.nilIfEmpty
            contact.notes = notes.nilIfEmpty
            contact.localModifiedAt = Date()
            contact.isPendingPush = true
        } else {
            let newContact = Contact(
                id: "local_\(UUID().uuidString)",
                isPendingPush: true
            )
            newContact.firstName = firstName.nilIfEmpty
            newContact.lastName = lastName.nilIfEmpty
            newContact.contactName = contactName.nilIfEmpty
            newContact.email = email.nilIfEmpty
            newContact.mobilePhone = mobilePhone.nilIfEmpty
            newContact.workPhone = workPhone.nilIfEmpty
            newContact.companiesIds = Array(selectedCompanyIds)
            newContact.jobTitle = jobTitle.nilIfEmpty
            newContact.categorization = Array(categorization)
            newContact.leadSource = leadSource.nilIfEmpty
            newContact.industry = industry.nilIfEmpty
            newContact.notes = notes.nilIfEmpty
            newContact.localModifiedAt = Date()
            context.insert(newContact)
        }
        dismiss()
    }

    private func updateComputedName() {
        if autoComputeName {
            contactName = computedName
        }
    }
}

// MARK: - String Extension

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
@MainActor
private let contactsPreviewContainer: ModelContainer = {
    do {
        let schema = Schema([
            Contact.self,
            Company.self,
            Opportunity.self,
            Project.self,
            Proposal.self,
            CRMTask.self,
            Interaction.self,
            ImportedContact.self,
            Specialty.self,
            PortalAccessRecord.self,
            PortalLog.self,
            ClientPage.self
        ])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        let context = container.mainContext

        let acme = Company(id: "preview-company-acme", companyName: "Acme Architecture")
        let northstar = Company(id: "preview-company-northstar", companyName: "Northstar Builders")

        let jordan = Contact(
            id: "preview-contact-jordan",
            contactName: "Jordan Lee",
            categorization: ["Client"]
        )
        jordan.firstName = "Jordan"
        jordan.lastName = "Lee"
        jordan.jobTitle = "Principal"
        jordan.email = "jordan@acmearchitecture.com"
        jordan.companiesIds = [acme.id]
        jordan.localModifiedAt = Date()

        let casey = Contact(
            id: "preview-contact-casey",
            contactName: "Casey Morgan",
            categorization: ["Lead"]
        )
        casey.firstName = "Casey"
        casey.lastName = "Morgan"
        casey.jobTitle = "Project Director"
        casey.email = "casey@northstarbuilders.com"
        casey.companiesIds = [northstar.id]
        casey.localModifiedAt = Calendar.current.date(byAdding: .day, value: -2, to: Date())

        let taylor = Contact(
            id: "preview-contact-taylor",
            contactName: "Taylor Brooks",
            categorization: ["Prospect"]
        )
        taylor.firstName = "Taylor"
        taylor.lastName = "Brooks"
        taylor.jobTitle = "Design Manager"
        taylor.email = "taylor@example.com"
        taylor.localModifiedAt = Calendar.current.date(byAdding: .day, value: -7, to: Date())

        let opportunity = Opportunity(
            id: "preview-opportunity-riverside",
            opportunityName: "Riverside Campus Expansion"
        )
        opportunity.salesStage = "Proposal Sent"
        opportunity.associatedContactIds = [jordan.id]
        opportunity.companyIds = [acme.id]
        opportunity.dealValue = 185_000
        opportunity.localModifiedAt = Date()

        context.insert(acme)
        context.insert(northstar)
        context.insert(jordan)
        context.insert(casey)
        context.insert(taylor)
        context.insert(opportunity)

        return container
    } catch {
        fatalError("Failed to create ContactsView preview container: \(error)")
    }
}()

@MainActor
private let contactsPreviewSyncEngine = SyncEngine(modelContainer: contactsPreviewContainer)

#Preview {
    ContactsView()
        .frame(width: 1200, height: 800)
        .modelContainer(contactsPreviewContainer)
        .environment(contactsPreviewSyncEngine)
}
