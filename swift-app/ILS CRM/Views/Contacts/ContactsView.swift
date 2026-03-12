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
        } else {
            Text("Contact not found")
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Contact Form

/// Mirrors src/components/contacts/ContactForm.tsx
struct ContactFormView: View {
    let contactId: String?  // nil = create new

    var body: some View {
        Form {
            // TODO: Form fields mirroring Electron's ContactForm
            // useEntityForm('contacts') equivalent
            Text("Contact form — coming soon")
        }
        .navigationTitle(contactId == nil ? "New Contact" : "Edit Contact")
    }
}
