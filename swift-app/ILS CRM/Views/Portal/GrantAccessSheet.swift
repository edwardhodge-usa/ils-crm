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
    @Query private var companies: [Company]
    @Query private var existingAccess: [PortalAccessRecord]
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""

    // MARK: - Derived Data

    private var companyNameById: [String: String] {
        Dictionary(companies.compactMap { c in
            guard let name = c.companyName else { return nil }
            return (c.id, name)
        }, uniquingKeysWith: { _, last in last })
    }

    private func resolvedCompanyName(for contact: Contact) -> String? {
        guard let firstId = contact.companiesIds.first else { return nil }
        return companyNameById[firstId]
    }

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
                ($0.companiesIds.compactMap { companyNameById[$0] }.contains { $0.localizedCaseInsensitiveContains(query) })
            }
        }
        return Array(list.prefix(50))
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Grant Access")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Select a contact to grant portal access for this page.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
            }
            .padding(12)

            Divider()

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
            .padding(.vertical, 8)

            Divider()

            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                TextField("Search contacts...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

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
                } else if let company = resolvedCompanyName(for: contact), !company.isEmpty {
                    Text(company)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "plus.circle.fill")
                .font(.system(size: 14))
                .foregroundStyle(Color.accentColor)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    // MARK: - Grant Access

    private func grantAccess(to contact: Contact) {
        // Prevent duplicate access — check if this contact already has access to this page
        let hasAccess = existingAccess.contains { record in
            record.pageAddress == pageAddress &&
            record.contactIds.contains(contact.id)
        }
        if hasAccess { dismiss(); return }

        let record = PortalAccessRecord(
            id: "local_\(UUID().uuidString)",
            name: contact.contactName,
            isPendingPush: true
        )
        record.pageAddress = pageAddress
        record.email = contact.email
        record.company = resolvedCompanyName(for: contact)
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
        .modelContainer(for: [Contact.self, Company.self, PortalAccessRecord.self], inMemory: true)
}
