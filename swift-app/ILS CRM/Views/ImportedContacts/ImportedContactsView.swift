import SwiftUI
import SwiftData

/// Imported Contacts staging view — mirrors src/components/imported-contacts/ImportedContactsPage.tsx
///
/// Features to implement:
/// - List of staged contacts with onboarding status
/// - Approve / Reject actions (IPC: importedContacts:approve, importedContacts:reject)
/// - Known Electron bug: all names showing "—" (linked field resolution)
struct ImportedContactsView: View {
    @Query(sort: \ImportedContact.importedContactName) private var contacts: [ImportedContact]

    var body: some View {
        List(contacts, id: \.id) { contact in
            VStack(alignment: .leading) {
                Text(contact.importedContactName ?? "—")
                    .fontWeight(.medium)
                HStack {
                    if let status = contact.onboardingStatus {
                        Text(status)
                            .font(.caption)
                            .foregroundStyle(status == "Approved" ? .green : .secondary)
                    }
                    if let source = contact.importSource {
                        Text(source)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Imported Contacts")
    }
}
