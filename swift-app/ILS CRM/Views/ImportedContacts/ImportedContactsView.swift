import SwiftUI
import SwiftData

/// Imported Contacts staging view — mirrors src/components/imported-contacts/ImportedContactsPage.tsx
///
/// Features:
/// - Searchable list with imported contacts sorted by name
/// - Status badges (Approved / Rejected / pending)
/// - Sheet-based detail view on selection
/// - Empty state when no imported contacts exist
///
/// Electron hooks: useEntityList('importedContacts')
struct ImportedContactsView: View {
    @Query(sort: \ImportedContact.importedContactName) private var contacts: [ImportedContact]
    @State private var searchText = ""
    @State private var selectedContact: ImportedContact?

    // MARK: - Filtered Data

    private var filteredContacts: [ImportedContact] {
        if searchText.isEmpty { return contacts }
        let query = searchText
        return contacts.filter { contact in
            (contact.importedContactName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.firstName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.lastName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.email?.localizedCaseInsensitiveContains(query) ?? false) ||
            (contact.company?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if contacts.isEmpty {
                EmptyStateView(
                    title: "No imported contacts",
                    description: "Imported contacts will appear here once synced from Airtable.",
                    systemImage: "person.crop.circle.badge.plus"
                )
            } else if filteredContacts.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No imported contacts match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                contactList
            }
        }
        .searchable(text: $searchText, prompt: "Search imported contacts...")
        .navigationTitle("Imported Contacts")
        .sheet(item: $selectedContact) { contact in
            ImportedContactDetailView(importedContact: contact)
                .frame(minWidth: 480, minHeight: 500)
        }
    }

    // MARK: - Contact List

    private var contactList: some View {
        List(filteredContacts, id: \.id, selection: $selectedContact) { contact in
            Button {
                selectedContact = contact
            } label: {
                contactRow(contact)
            }
            .buttonStyle(.plain)
        }
        .listStyle(.sidebar)
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: ImportedContact) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: displayName(for: contact), size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(for: contact))
                    .font(.body)
                    .lineLimit(1)

                if let subtitle = contactSubtitle(for: contact) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let status = contact.onboardingStatus, !status.isEmpty {
                StatusBadge(text: status, color: onboardingStatusColor(status))
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    /// Returns the best display name for an imported contact.
    private func displayName(for contact: ImportedContact) -> String {
        if let name = contact.importedContactName, !name.isEmpty {
            return name
        }
        let first = contact.firstName ?? ""
        let last = contact.lastName ?? ""
        let combined = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return combined.isEmpty ? "Unknown" : combined
    }

    /// Returns the best subtitle: email, then company, then import source.
    private func contactSubtitle(for contact: ImportedContact) -> String? {
        if let email = contact.email, !email.isEmpty {
            return email
        }
        if let company = contact.company, !company.isEmpty {
            return company
        }
        if let source = contact.importSource, !source.isEmpty {
            return source
        }
        return nil
    }

    /// Deterministic color for onboarding status badges.
    private func onboardingStatusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("approved") { return .green }
        if lower.contains("rejected") { return .red }
        if lower.contains("pending") { return .orange }
        return .secondary
    }
}
