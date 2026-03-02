import SwiftUI
import SwiftData

/// Contacts list — mirrors src/components/contacts/ContactListPage.tsx
///
/// Features to implement:
/// - Searchable list with filter tabs (All, Leads, Clients, Partners, Vendors)
/// - Contact row with name, company, categorization badge, specialty tags
/// - Navigation to Contact360View (detail) and ContactFormView (create/edit)
/// - Specialty color coding via deterministic hash
///
/// Electron hooks: useEntityList('contacts')
struct ContactsView: View {
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @State private var searchText = ""
    @State private var showNewContact = false

    var filteredContacts: [Contact] {
        if searchText.isEmpty { return contacts }
        return contacts.filter {
            $0.contactName?.localizedCaseInsensitiveContains(searchText) ?? false
        }
    }

    var body: some View {
        List(filteredContacts, id: \.id) { contact in
            NavigationLink(value: contact.id) {
                VStack(alignment: .leading) {
                    Text(contact.contactName ?? "—")
                        .fontWeight(.medium)
                    if let company = contact.company {
                        Text(company)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
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
