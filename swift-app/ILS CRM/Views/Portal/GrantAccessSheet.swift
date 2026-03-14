import SwiftUI
import SwiftData

/// Sheet that lets the user search for a Contact and grant them portal access
/// to a specific page. Creates a new PortalAccessRecord linked to the selected
/// contact and the given page address.
///
/// Mirrors the Electron "Grant Access" flow available in Client Portal > By Page.
struct GrantAccessSheet: View {
    let pageAddress: String

    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""

    // MARK: - Filtered Contacts

    private var filteredContacts: [Contact] {
        let list: [Contact]
        if searchText.isEmpty {
            list = contacts
        } else {
            let query = searchText
            list = contacts.filter {
                ($0.contactName ?? "").localizedCaseInsensitiveContains(query) ||
                ($0.email ?? "").localizedCaseInsensitiveContains(query) ||
                ($0.company ?? "").localizedCaseInsensitiveContains(query)
            }
        }
        return Array(list.prefix(50))
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Grant Access")
                    .font(.system(size: 15, weight: .semibold))
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
            }
            .padding(12)

            Divider()

            // Search
            TextField("Search contacts...", text: $searchText)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)

            // Page context
            HStack(spacing: 6) {
                Image(systemName: "doc.text")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                Text("Page: \(pageAddress)")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 6)

            Divider()

            // Contact list
            if filteredContacts.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.questionmark")
                        .font(.system(size: 28))
                        .foregroundStyle(.tertiary)
                    Text(searchText.isEmpty ? "No contacts available" : "No contacts match \"\(searchText)\"")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else {
                List(filteredContacts, id: \.id) { contact in
                    Button {
                        grantAccess(to: contact)
                    } label: {
                        contactRow(contact)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
        .frame(width: 360, height: 420)
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: Contact) -> some View {
        HStack(spacing: 10) {
            AvatarView(name: contact.contactName ?? "?", avatarSize: .small)

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.contactName ?? "Unknown")
                    .font(.system(size: 13, weight: .medium))
                    .lineLimit(1)

                if let email = contact.email, !email.isEmpty {
                    Text(email)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else if let company = contact.company, !company.isEmpty {
                    Text(company)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
        .contentShape(Rectangle())
    }

    // MARK: - Grant Access

    private func grantAccess(to contact: Contact) {
        let record = PortalAccessRecord(
            id: "local_\(UUID().uuidString)",
            name: contact.contactName,
            isPendingPush: true
        )
        record.pageAddress = pageAddress
        record.email = contact.email
        record.company = contact.company
        record.status = "ACTIVE"
        record.stage = "Prospect"
        record.dateAdded = Date()
        record.contactIds = [contact.id]

        context.insert(record)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    GrantAccessSheet(pageAddress: "haus-collection")
        .modelContainer(for: [Contact.self, PortalAccessRecord.self], inMemory: true)
}
