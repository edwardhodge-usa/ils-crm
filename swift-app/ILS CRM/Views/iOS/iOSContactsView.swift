#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone contacts list + detail — dark neon bento design.
struct iOSContactsView: View {
    @Query(sort: \Contact.contactName) private var contacts: [Contact]
    @Query private var companies: [Company]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var categoryFilter = "All"
    @State private var showNewContact = false

    private static let categoryOptions = [
        "All", "Client", "Prospect", "Partner", "Consultant", "Talent",
        "Vendor Contact", "Industry Peer", "Employee", "Investor", "Advisor", "VIP"
    ]

    // MARK: - Derived Data

    private var companyNameById: [String: String] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { c in
            guard let name = c.companyName else { return nil }
            return (c.id, name)
        })
    }

    private var filteredContacts: [Contact] {
        var result = Array(contacts)

        if categoryFilter != "All" {
            result = result.filter { $0.categorization.contains(categoryFilter) }
        }

        if !searchText.isEmpty {
            result = result.filter { contact in
                (contact.contactName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.email?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.jobTitle?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                contact.companiesIds.compactMap { companyNameById[$0] }
                    .contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }

        return result
    }

    private func categoryCount(_ category: String) -> Int {
        if category == "All" { return contacts.count }
        return contacts.filter { $0.categorization.contains(category) }.count
    }

    private func contactSubtitle(_ contact: Contact) -> String? {
        var parts: [String] = []
        if let title = contact.jobTitle, !title.isEmpty { parts.append(title) }
        if let firstId = contact.companiesIds.first, let name = companyNameById[firstId] {
            parts.append(name)
        }
        if !parts.isEmpty { return parts.joined(separator: " \u{00B7} ") }
        return contact.email
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            List {
                // Search + filter chips + count
                Section {
                    // Search
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(NeonTheme.textTertiary)
                        TextField("Search contacts", text: $searchText)
                            .font(.system(size: 15))
                            .foregroundStyle(NeonTheme.textPrimary)
                    }
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(NeonTheme.cardSurface)
                    )
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)

                    categoryChips
                        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 0, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)

                    HStack {
                        Text("\(filteredContacts.count) contacts")
                            .font(.system(size: 12))
                            .foregroundStyle(NeonTheme.textSecondary)
                        Spacer()
                    }
                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }

                // Contact list
                if filteredContacts.isEmpty {
                    Section {
                        NeonEmptyState(
                            icon: "person.crop.circle",
                            title: searchText.isEmpty ? "No Contacts" : "No Results",
                            subtitle: searchText.isEmpty ? "Contacts sync from Airtable" : "No contacts match \"\(searchText)\""
                        )
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    Section {
                        ForEach(filteredContacts) { contact in
                            NavigationLink(value: contact.id) {
                                contactRow(contact)
                            }
                            .listRowBackground(NeonTheme.cardSurface)
                            .listRowSeparator(.hidden)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .listSectionSpacing(4)
            .background(NeonTheme.background)
            .scrollContentBackground(.hidden)
            .navigationTitle("Contacts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNewContact = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(NeonTheme.cyan)
                    }
                }
            }
            .refreshable { await syncEngine.forceSync() }
            .sheet(isPresented: $showNewContact) {
                NavigationStack {
                    iOSContactFormView()
                }
            }
            .navigationDestination(for: String.self) { contactId in
                if let contact = contacts.first(where: { $0.id == contactId }) {
                    iOSContactDetailView(contact: contact)
                }
            }
        }
    }

    // MARK: - Category Chips

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Self.categoryOptions, id: \.self) { option in
                    let isSelected = categoryFilter == option
                    let count = categoryCount(option)
                    let color = option == "All" ? NeonTheme.cyan : categorizationColor(option)
                    Button {
                        categoryFilter = isSelected && option != "All" ? "All" : option
                    } label: {
                        HStack(spacing: 3) {
                            Text(option)
                                .font(.system(size: 13, weight: .semibold))
                            if count > 0 && option != "All" {
                                Text("\(count)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(isSelected ? .black.opacity(0.5) : color)
                            }
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 36)
                        .background(
                            Capsule().fill(isSelected ? color : NeonTheme.cardSurface)
                        )
                        .foregroundStyle(isSelected ? .black : NeonTheme.textPrimary)
                        .overlay {
                            if !isSelected {
                                Capsule().stroke(color.opacity(0.2), lineWidth: 1)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: Contact) -> some View {
        HStack(spacing: 12) {
            AvatarView(
                name: contact.contactName ?? "?",
                avatarSize: .medium,
                photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) }
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.contactName ?? "Unknown")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(NeonTheme.textPrimary)
                    .lineLimit(1)

                if let subtitle = contactSubtitle(contact) {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(NeonTheme.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let cat = contact.categorization.first, !cat.isEmpty {
                NeonPillBadge(text: cat, color: categorizationColor(cat))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(NeonTheme.textTertiary)
        }
        .frame(minHeight: 44)
    }
}

// MARK: - Contact Detail

struct iOSContactDetailView: View {
    @Bindable var contact: Contact
    @Query private var companies: [Company]
    @Query private var opportunities: [Opportunity]
    @Environment(\.modelContext) private var modelContext
    @Environment(\.openURL) private var openURL
    @Environment(SyncEngine.self) private var syncEngine
    @State private var showDeleteConfirm = false

    private var contactName: String {
        contact.contactName ?? [contact.firstName, contact.lastName].compactMap { $0 }.joined(separator: " ")
    }

    private var linkedCompanies: [Company] {
        companies.filter { contact.companiesIds.contains($0.id) }
    }

    private var linkedOpportunities: [Opportunity] {
        opportunities.filter { $0.associatedContactIds.contains(contact.id) }
    }

    private var locationText: String {
        [contact.city, contact.state, contact.country]
            .compactMap { $0?.isEmpty == false ? $0 : nil }
            .joined(separator: ", ")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                heroCard

                NeonCard(header: "Overview") {
                    VStack(spacing: 0) {
                        NeonFieldRow(label: "Industry", value: contact.industry)
                        NeonFieldRow(label: "Lead Source", value: contact.leadSource)
                        NeonFieldRow(label: "Title", value: contact.jobTitle)
                        if let score = contact.leadScore {
                            NeonFieldRow(label: "Lead Score", value: "\(score)")
                        }
                    }
                }

                NeonCard(header: "Contact Channels") {
                    VStack(spacing: 0) {
                        NeonContactLink(label: "Email", value: contact.email, urlPrefix: "mailto:")
                        NeonContactLink(label: "Mobile", value: contact.mobilePhone, urlPrefix: "tel:")
                        NeonContactLink(label: "Office", value: contact.workPhone, urlPrefix: "tel:")
                        NeonContactLink(label: "LinkedIn", value: contact.linkedInUrl, urlPrefix: nil)
                    }
                }

                if !linkedCompanies.isEmpty {
                    NeonCard(header: "Companies") {
                        VStack(spacing: 6) {
                            ForEach(linkedCompanies) { company in
                                HStack(spacing: 10) {
                                    AvatarView(name: company.companyName ?? "?", avatarSize: .small, shape: .roundedRect)
                                    Text(company.companyName ?? "Unknown")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(NeonTheme.textPrimary)
                                    Spacer()
                                }
                                .frame(minHeight: 44)
                            }
                        }
                    }
                }

                if !linkedOpportunities.isEmpty {
                    NeonCard(header: "Opportunities") {
                        VStack(spacing: 8) {
                            ForEach(linkedOpportunities) { opp in
                                HStack {
                                    Text(opp.opportunityName ?? "Untitled")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(NeonTheme.textPrimary)
                                        .lineLimit(1)
                                    Spacer()
                                    if let stage = opp.salesStage {
                                        NeonPillBadge(text: stage, color: NeonTheme.electricBlue)
                                    }
                                }
                                .frame(minHeight: 32)
                            }
                        }
                    }
                }

                if !locationText.isEmpty {
                    NeonCard(header: "Location") {
                        VStack(spacing: 0) {
                            NeonFieldRow(label: "Location", value: locationText)
                            if let address = contact.addressLine, !address.isEmpty {
                                NeonFieldRow(label: "Address", value: address)
                            }
                        }
                    }
                }

                if let notes = contact.notes, !notes.isEmpty {
                    NeonCard(header: "Notes") {
                        Text(notes)
                            .font(.system(size: 14))
                            .foregroundStyle(NeonTheme.textPrimary)
                    }
                }

                NeonDestructiveButton(title: "Delete Contact", icon: "trash") {
                    showDeleteConfirm = true
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .navigationTitle(contactName.isEmpty ? "Contact" : contactName)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this contact?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Contact.airtableTableId, recordId: contact.id)
                modelContext.delete(contact)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Hero Card

    private var heroCard: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: contactName.isEmpty ? "?" : contactName,
                size: 52,
                photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) }
            )

            VStack(alignment: .leading, spacing: 3) {
                Text(contactName.isEmpty ? "Unknown" : contactName)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(NeonTheme.textPrimary)

                let subtitle = [contact.jobTitle, linkedCompanies.first?.companyName]
                    .compactMap({ $0?.isEmpty == false ? $0 : nil })
                    .joined(separator: " \u{00B7} ")
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundStyle(NeonTheme.textSecondary)
                }

                // Action pills
                HStack(spacing: 6) {
                    if let email = contact.email, !email.isEmpty {
                        Button {
                            if let url = URL(string: "mailto:\(email)") { openURL(url) }
                        } label: {
                            neonPillButton("Email", color: NeonTheme.electricBlue)
                        }
                    }
                    if let phone = contact.mobilePhone ?? contact.workPhone, !phone.isEmpty {
                        Button {
                            let digits = phone.filter { $0.isNumber || $0 == "+" }
                            if let url = URL(string: "tel:\(digits)") { openURL(url) }
                        } label: {
                            neonPillButton("Call", color: NeonTheme.neonGreen)
                        }
                    }
                }
                .padding(.top, 2)
            }

            Spacer()

            if !contact.categorization.isEmpty {
                VStack(spacing: 4) {
                    ForEach(contact.categorization.prefix(2), id: \.self) { cat in
                        let color = categorizationColor(cat)
                        Text(cat)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(color)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(color.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(NeonTheme.cardSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(NeonTheme.cardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }

    private func neonPillButton(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .frame(minHeight: 28)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(color.opacity(0.2), lineWidth: 1))
    }
}

// MARK: - Contact Form

struct iOSContactFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Company.companyName) private var allCompanies: [Company]

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var mobilePhone = ""
    @State private var jobTitle = ""
    @State private var notes = ""
    @State private var selectedCompanyIds: Set<String> = []
    @State private var showCompanyPicker = false

    private var computedName: String {
        [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                NeonCard(header: "Name") {
                    VStack(spacing: 10) {
                        NeonTextField(placeholder: "First Name", text: $firstName)
                        NeonTextField(placeholder: "Last Name", text: $lastName)
                    }
                }

                NeonCard(header: "Contact Info") {
                    VStack(spacing: 10) {
                        NeonTextField(placeholder: "Email", text: $email)
                        NeonTextField(placeholder: "Mobile Phone", text: $mobilePhone)
                    }
                }

                NeonCard(header: "Professional") {
                    VStack(spacing: 10) {
                        NeonTextField(placeholder: "Job Title", text: $jobTitle)
                        Button { showCompanyPicker = true } label: {
                            HStack {
                                Text("Company")
                                    .foregroundStyle(NeonTheme.textSecondary)
                                Spacer()
                                let name = allCompanies.first(where: { selectedCompanyIds.contains($0.id) })?.companyName
                                Text(name ?? "Select...")
                                    .foregroundStyle(name != nil ? NeonTheme.textPrimary : NeonTheme.textTertiary)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 11))
                                    .foregroundStyle(NeonTheme.textTertiary)
                            }
                            .padding(10)
                            .frame(minHeight: 44)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill(NeonTheme.background)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(NeonTheme.cardBorderGlow, lineWidth: 1)
                            )
                        }
                    }
                }

                NeonCard(header: "Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(NeonTheme.textPrimary)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .navigationTitle("New Contact")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
                    .foregroundStyle(NeonTheme.textSecondary)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(computedName.isEmpty ? NeonTheme.textTertiary : NeonTheme.cyan)
                    .disabled(computedName.isEmpty)
            }
        }
        .sheet(isPresented: $showCompanyPicker) {
            LinkedRecordPicker(
                title: "Select Company",
                entityType: .companies,
                currentIds: selectedCompanyIds,
                onSave: { ids in selectedCompanyIds = ids }
            )
        }
    }

    private func save() {
        guard !computedName.isEmpty else { return }
        let newContact = Contact(id: "local_\(UUID().uuidString)", contactName: computedName, isPendingPush: true)
        newContact.firstName = firstName.isEmpty ? nil : firstName
        newContact.lastName = lastName.isEmpty ? nil : lastName
        newContact.email = email.isEmpty ? nil : email
        newContact.mobilePhone = mobilePhone.isEmpty ? nil : mobilePhone
        newContact.jobTitle = jobTitle.isEmpty ? nil : jobTitle
        newContact.companiesIds = Array(selectedCompanyIds)
        newContact.notes = notes.isEmpty ? nil : notes
        newContact.localModifiedAt = Date()
        modelContext.insert(newContact)
        dismiss()
    }
}
#endif
