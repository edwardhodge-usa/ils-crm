import SwiftUI
import SwiftData

// MARK: - SortMode

enum ContactSortMode: String, CaseIterable, CustomStringConvertible {
    case company   = "Company"
    case nameAZ    = "Name A–Z"
    case nameZA    = "Name Z–A"

    var description: String { rawValue }
}

// MARK: - ContactsView

/// Contacts list + inline detail — mirrors src/components/contacts/ContactListPage.tsx
///
/// Layout: fixed 380pt list panel | Divider | flex detail panel
/// List supports three sort modes: Company grouping (default), A–Z, Z–A.
struct ContactsView: View {
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @Query private var companies: [Company]

    @State private var searchText = ""
    @State private var selectedContact: Contact?
    @State private var sortMode: ContactSortMode = .company
    @State private var showingNewContact = false

    // MARK: - Derived Data

    /// Company ID → company name lookup built from the Companies query.
    private var companyNameById: [String: String] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { c in
            guard let name = c.companyName else { return nil }
            return (c.id, name)
        })
    }

    private var filteredContacts: [Contact] {
        guard !searchText.isEmpty else { return contacts }
        let query = searchText.lowercased()
        return contacts.filter { contact in
            (contact.contactName?.lowercased().contains(query) ?? false) ||
            (contact.email?.lowercased().contains(query) ?? false) ||
            (contact.company?.lowercased().contains(query) ?? false) ||
            (contact.jobTitle?.lowercased().contains(query) ?? false)
        }
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
            // Fall back to the free-text company field
            if let name = contact.company, !name.isEmpty {
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

    /// Returns contacts grouped by first letter of sort name.
    private var groupedAlpha: [(key: String, contacts: [Contact])] {
        let ascending = sortMode != .nameZA

        let sorted = filteredContacts.sorted { a, b in
            let nameA = sortKey(for: a)
            let nameB = sortKey(for: b)
            return ascending ? nameA < nameB : nameA > nameB
        }

        let grouped = Dictionary(grouping: sorted) { contact -> String in
            let name = sortKey(for: contact)
            guard let first = name.first else { return "#" }
            let upper = String(first).uppercased()
            return upper.rangeOfCharacter(from: .letters) != nil ? upper : "#"
        }

        // Sort group keys to match ascending/descending
        let sortedKeys = grouped.keys.sorted { ascending ? $0 < $1 : $0 > $1 }
        return sortedKeys.compactMap { key in
            guard let contacts = grouped[key] else { return nil }
            return (key: key, contacts: contacts)
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
                .background(Color(.controlBackgroundColor))

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
            .background(Color(.controlBackgroundColor))

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
    }

    // MARK: - Contact List

    @ViewBuilder
    private var contactList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: .sectionHeaders) {
                if sortMode == .company {
                    ForEach(groupedByCompany, id: \.key) { group in
                        Section {
                            ForEach(group.contacts, id: \.id) { contact in
                                contactRow(contact)
                            }
                        } header: {
                            groupHeader(title: group.key, count: group.contacts.count)
                        }
                    }
                } else {
                    ForEach(groupedAlpha, id: \.key) { group in
                        Section {
                            ForEach(group.contacts, id: \.id) { contact in
                                contactRow(contact)
                            }
                        } header: {
                            groupHeader(title: group.key, count: group.contacts.count)
                        }
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
        .background(Color(.windowBackgroundColor).opacity(0.95))
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
                    avatarSize: .medium
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

                if let cat = contact.categorization, !cat.isEmpty, !isSelected {
                    StatusBadge(
                        text: cat,
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
        // Try linked company first, then free-text field
        let companyName: String? = {
            if let firstId = contact.companiesIds.first,
               let name = companyNameById[firstId],
               !name.isEmpty {
                return name
            }
            return contact.company
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

    // MARK: - Form State

    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var contactName: String = ""
    @State private var autoComputeName: Bool = true

    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var mobilePhone: String = ""
    @State private var workPhone: String = ""

    @State private var company: String = ""
    @State private var jobTitle: String = ""

    @State private var categorization: String = ""
    @State private var leadSource: String = ""
    @State private var industry: String = ""

    @State private var notes: String = ""

    private var isEditing: Bool { contact != nil }

    private var computedName: String {
        let parts = [firstName, lastName].filter { !$0.isEmpty }
        return parts.joined(separator: " ")
    }

    private static let categorizationOptions = [
        "", "Client", "Lead", "Partner", "Vendor", "Prospect", "Other"
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
            TextField("Phone", text: $phone)
                .textContentType(.telephoneNumber)
            TextField("Mobile Phone", text: $mobilePhone)
                .textContentType(.telephoneNumber)
            TextField("Work Phone", text: $workPhone)
                .textContentType(.telephoneNumber)
        }
    }

    private var professionalSection: some View {
        Section("Professional") {
            TextField("Company", text: $company)
            TextField("Job Title", text: $jobTitle)
        }
    }

    private var classificationSection: some View {
        Section("Classification") {
            Picker("Categorization", selection: $categorization) {
                ForEach(Self.categorizationOptions, id: \.self) { option in
                    Text(option.isEmpty ? "None" : option).tag(option)
                }
            }
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
        phone = contact.phone ?? ""
        mobilePhone = contact.mobilePhone ?? ""
        workPhone = contact.workPhone ?? ""
        company = contact.company ?? ""
        jobTitle = contact.jobTitle ?? ""
        categorization = contact.categorization ?? ""
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
            contact.phone = phone.nilIfEmpty
            contact.mobilePhone = mobilePhone.nilIfEmpty
            contact.workPhone = workPhone.nilIfEmpty
            contact.company = company.nilIfEmpty
            contact.jobTitle = jobTitle.nilIfEmpty
            contact.categorization = categorization.nilIfEmpty
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
            newContact.phone = phone.nilIfEmpty
            newContact.mobilePhone = mobilePhone.nilIfEmpty
            newContact.workPhone = workPhone.nilIfEmpty
            newContact.company = company.nilIfEmpty
            newContact.jobTitle = jobTitle.nilIfEmpty
            newContact.categorization = categorization.nilIfEmpty
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
