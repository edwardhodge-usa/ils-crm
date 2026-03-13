import SwiftUI
import SwiftData
import Combine

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
    @State private var showNewContact = false

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
        .toolbar {
            Button { showNewContact = true } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(item: $selectedContact) { contact in
            ImportedContactDetailSheet(importedContact: contact)
                .frame(minWidth: 480, minHeight: 500)
        }
        .sheet(isPresented: $showNewContact) {
            NavigationStack {
                ImportedContactFormView(importedContact: nil)
            }
            .frame(minWidth: 500, minHeight: 600)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewContact = true
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

// MARK: - Imported Contact Detail Sheet (with Edit button)

/// Wraps ImportedContactDetailView in a NavigationStack and adds an Edit toolbar button.
private struct ImportedContactDetailSheet: View {
    let importedContact: ImportedContact

    @State private var showEditForm = false

    var body: some View {
        NavigationStack {
            ImportedContactDetailView(importedContact: importedContact)
                .toolbar {
                    ToolbarItem(placement: .automatic) {
                        Button {
                            showEditForm = true
                        } label: {
                            Image(systemName: "pencil")
                        }
                        .help("Edit Imported Contact")
                    }
                }
        }
        .sheet(isPresented: $showEditForm) {
            NavigationStack {
                ImportedContactFormView(importedContact: importedContact)
            }
            .frame(minWidth: 500, minHeight: 600)
        }
    }
}

// MARK: - Imported Contact Form

/// Create / edit form for imported contacts.
/// Pass `importedContact: nil` to create, or an existing ImportedContact to edit.
struct ImportedContactFormView: View {
    let importedContact: ImportedContact?  // nil = create, non-nil = edit

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    // MARK: - Form State

    // Contact fields
    @State private var importedContactName: String = ""
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var mobilePhone: String = ""
    @State private var jobTitle: String = ""

    // Company fields
    @State private var company: String = ""
    @State private var companyIndustry: String = ""
    @State private var companyType: String = ""
    @State private var companySize: String = ""

    // Classification fields
    @State private var categorization: String = ""
    @State private var onboardingStatus: String = ""
    @State private var importSource: String = ""

    // Notes
    @State private var note: String = ""
    @State private var reviewNotes: String = ""
    @State private var reasonForRejection: String = ""

    // Checkbox
    @State private var syncToContacts: Bool = false

    private var isEditing: Bool { importedContact != nil }

    // MARK: - Picker Options

    private static let categorizationOptions = [
        "", "Client", "Lead", "Partner", "Vendor", "Prospect", "Other"
    ]

    private static let onboardingStatusOptions = [
        "", "Approved", "Rejected", "Pending Review"
    ]

    // MARK: - Body

    var body: some View {
        Form {
            contactSection
            companySection
            classificationSection
            notesSection
        }
        .formStyle(.grouped)
        .navigationTitle(isEditing ? "Edit Imported Contact" : "New Imported Contact")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(importedContactName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear { loadExisting() }
    }

    // MARK: - Sections

    private var contactSection: some View {
        Section("Contact") {
            TextField("Imported Contact Name", text: $importedContactName)
            TextField("First Name", text: $firstName)
            TextField("Last Name", text: $lastName)
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
            TextField("Phone", text: $phone)
                .textContentType(.telephoneNumber)
            TextField("Mobile Phone", text: $mobilePhone)
                .textContentType(.telephoneNumber)
            TextField("Job Title", text: $jobTitle)
        }
    }

    private var companySection: some View {
        Section("Company") {
            TextField("Company", text: $company)
            TextField("Industry", text: $companyIndustry)
            TextField("Company Type", text: $companyType)
            TextField("Company Size", text: $companySize)
        }
    }

    private var classificationSection: some View {
        Section("Classification") {
            Picker("Categorization", selection: $categorization) {
                ForEach(Self.categorizationOptions, id: \.self) { option in
                    Text(option.isEmpty ? "None" : option).tag(option)
                }
            }

            Picker("Onboarding Status", selection: $onboardingStatus) {
                ForEach(Self.onboardingStatusOptions, id: \.self) { option in
                    Text(option.isEmpty ? "None" : option).tag(option)
                }
            }

            TextField("Import Source", text: $importSource)

            Toggle("Sync to Contacts", isOn: $syncToContacts)
        }
    }

    @ViewBuilder
    private var notesSection: some View {
        Section("Notes") {
            VStack(alignment: .leading, spacing: 4) {
                Text("Note")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: $note)
                    .frame(minHeight: 80)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Review Notes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: $reviewNotes)
                    .frame(minHeight: 80)
            }

            if onboardingStatus == "Rejected" {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Reason for Rejection")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextEditor(text: $reasonForRejection)
                        .frame(minHeight: 80)
                }
            }
        }
    }

    // MARK: - Load Existing

    private func loadExisting() {
        guard let contact = importedContact else { return }
        importedContactName = contact.importedContactName ?? ""
        firstName = contact.firstName ?? ""
        lastName = contact.lastName ?? ""
        email = contact.email ?? ""
        phone = contact.phone ?? ""
        mobilePhone = contact.mobilePhone ?? ""
        jobTitle = contact.jobTitle ?? ""
        company = contact.company ?? ""
        companyIndustry = contact.companyIndustry ?? ""
        companyType = contact.companyType ?? ""
        companySize = contact.companySize ?? ""
        categorization = contact.categorization ?? ""
        onboardingStatus = contact.onboardingStatus ?? ""
        importSource = contact.importSource ?? ""
        note = contact.note ?? ""
        reviewNotes = contact.reviewNotes ?? ""
        reasonForRejection = contact.reasonForRejection ?? ""
        syncToContacts = contact.syncToContacts
    }

    // MARK: - Save

    private func save() {
        let trimmedName = importedContactName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let contact = importedContact {
            // Edit existing
            contact.importedContactName = trimmedName
            contact.firstName = firstName.nilIfEmpty
            contact.lastName = lastName.nilIfEmpty
            contact.email = email.nilIfEmpty
            contact.phone = phone.nilIfEmpty
            contact.mobilePhone = mobilePhone.nilIfEmpty
            contact.jobTitle = jobTitle.nilIfEmpty
            contact.company = company.nilIfEmpty
            contact.companyIndustry = companyIndustry.nilIfEmpty
            contact.companyType = companyType.nilIfEmpty
            contact.companySize = companySize.nilIfEmpty
            contact.categorization = categorization.nilIfEmpty
            contact.onboardingStatus = onboardingStatus.nilIfEmpty
            contact.importSource = importSource.nilIfEmpty
            contact.note = note.nilIfEmpty
            contact.reviewNotes = reviewNotes.nilIfEmpty
            contact.reasonForRejection = reasonForRejection.nilIfEmpty
            contact.syncToContacts = syncToContacts
            contact.localModifiedAt = Date()
            contact.isPendingPush = true
        } else {
            // Create new
            let newContact = ImportedContact(
                id: "local_\(UUID().uuidString)",
                importedContactName: trimmedName,
                isPendingPush: true
            )
            newContact.firstName = firstName.nilIfEmpty
            newContact.lastName = lastName.nilIfEmpty
            newContact.email = email.nilIfEmpty
            newContact.phone = phone.nilIfEmpty
            newContact.mobilePhone = mobilePhone.nilIfEmpty
            newContact.jobTitle = jobTitle.nilIfEmpty
            newContact.company = company.nilIfEmpty
            newContact.companyIndustry = companyIndustry.nilIfEmpty
            newContact.companyType = companyType.nilIfEmpty
            newContact.companySize = companySize.nilIfEmpty
            newContact.categorization = categorization.nilIfEmpty
            newContact.onboardingStatus = onboardingStatus.nilIfEmpty
            newContact.importSource = importSource.nilIfEmpty
            newContact.note = note.nilIfEmpty
            newContact.reviewNotes = reviewNotes.nilIfEmpty
            newContact.reasonForRejection = reasonForRejection.nilIfEmpty
            newContact.syncToContacts = syncToContacts
            newContact.localModifiedAt = Date()
            modelContext.insert(newContact)
        }

        dismiss()
    }
}

// MARK: - String Extension

private extension String {
    /// Returns nil if the string is empty, otherwise returns self.
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
