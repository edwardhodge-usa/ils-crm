import SwiftUI
import SwiftData

/// Contacts list — mirrors src/components/contacts/ContactListPage.tsx
///
/// Features:
/// - Searchable list with contacts sorted by name, grouped by first letter
/// - Contact row with avatar, name, company/email subtitle
/// - Navigation via NavigationLink(value:) for parent NavigationSplitView
/// - Empty state when no contacts exist
///
/// Electron hooks: useEntityList('contacts')
struct ContactsView: View {
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @State private var searchText = ""
    @State private var selectedContact: Contact?
    @State private var showNewContact = false

    // MARK: - Filtered & Grouped Data

    private var filteredContacts: [Contact] {
        if searchText.isEmpty { return contacts }
        let query = searchText
        return contacts.filter { contact in
            (contact.contactName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.email?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.company?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    /// Contacts grouped by the first letter of contactName, with keys sorted alphabetically.
    /// Contacts with no name or names starting with non-letter characters go under "#".
    private var groupedContacts: [(letter: String, contacts: [Contact])] {
        let grouped = Dictionary(grouping: filteredContacts) { contact -> String in
            guard let name = contact.contactName,
                  let first = name.first else { return "#" }
            let upper = String(first).uppercased()
            return upper.rangeOfCharacter(from: .letters) != nil ? upper : "#"
        }
        return grouped
            .sorted { $0.key < $1.key }
            .map { (letter: $0.key, contacts: $0.value) }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if contacts.isEmpty {
                EmptyStateView(
                    title: "No contacts yet",
                    description: "Contacts will appear here once synced from Airtable.",
                    systemImage: "person.crop.circle"
                )
            } else if filteredContacts.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No contacts match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                contactList
            }
        }
        .searchable(text: $searchText, prompt: "Search contacts...")
        .navigationTitle("Contacts")
        .toolbar {
            Button { showNewContact = true } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showNewContact) {
            ContactFormView(contact: nil)
                .frame(minWidth: 480, minHeight: 560)
        }
    }

    // MARK: - Contact List

    private var contactList: some View {
        List(selection: $selectedContact) {
            ForEach(groupedContacts, id: \.letter) { group in
                Section {
                    ForEach(group.contacts, id: \.id) { contact in
                        NavigationLink(value: contact.id) {
                            contactRow(contact)
                        }
                    }
                } header: {
                    SectionHeader(title: group.letter, count: group.contacts.count)
                }
            }
        }
        .listStyle(.sidebar)
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: Contact) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: contact.contactName ?? "?", size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.contactName ?? "Unknown")
                    .font(.body)
                    .lineLimit(1)

                // Show company if available, otherwise email
                if let subtitle = contactSubtitle(for: contact) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Categorization badge if available
            if let categorization = contact.categorization, !categorization.isEmpty {
                BadgeView(
                    text: categorization,
                    color: categorizationColor(categorization)
                )
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    /// Returns the best subtitle for a contact row: company, then email, then nil.
    private func contactSubtitle(for contact: Contact) -> String? {
        if let company = contact.company, !company.isEmpty {
            return company
        }
        if let email = contact.email, !email.isEmpty {
            return email
        }
        return nil
    }

    /// Deterministic color for categorization badges.
    private func categorizationColor(_ categorization: String) -> Color {
        let lower = categorization.lowercased()
        if lower.contains("client") { return .blue }
        if lower.contains("lead") { return .orange }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor") { return .green }
        if lower.contains("prospect") { return .teal }
        return .secondary
    }
}

// MARK: - Contact Detail (360 View)

/// Mirrors src/components/contacts/Contact360Page.tsx
struct Contact360View: View {
    let contactId: String

    @Query private var contacts: [Contact]
    @State private var showEditContact = false

    private var contact: Contact? {
        contacts.first { $0.id == contactId }
    }

    var body: some View {
        if let contact {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(contact.contactName ?? "—")
                        .font(.title)
                    // TODO: Full 360 detail — contact info, linked records,
                    // interactions timeline, tasks, proposals
                }
                .padding()
            }
            .navigationTitle(contact.contactName ?? "Contact")
            .toolbar {
                ToolbarItem(placement: .automatic) {
                    Button {
                        showEditContact = true
                    } label: {
                        Image(systemName: "pencil")
                    }
                    .help("Edit Contact")
                }
            }
            .sheet(isPresented: $showEditContact) {
                ContactFormView(contact: contact)
                    .frame(minWidth: 480, minHeight: 560)
            }
        } else {
            Text("Contact not found")
                .foregroundStyle(.secondary)
        }
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
                // If user manually edits the display name, stop auto-computing
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

        // Determine if the current name matches auto-computed
        autoComputeName = contactName == computedName
    }

    private func save() {
        if let contact {
            // Edit existing
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
            // Create new
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
    /// Returns nil if the string is empty, otherwise returns self.
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
