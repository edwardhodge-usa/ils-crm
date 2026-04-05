import SwiftUI
import SwiftData
import Combine

// MARK: - Sort Order

enum ImportedContactSortOrder: String, CaseIterable, CustomStringConvertible {
    case confidence = "Confidence"
    case newest     = "Newest"
    case threads    = "Threads"

    var description: String { rawValue }
}

// MARK: - Source Filter

enum ImportedContactSourceFilter: String, CaseIterable {
    case all      = "All"
    case email    = "Email"
    case contacts = "Contacts"
}

// MARK: - ImportedContactsView

/// Email Intelligence staging view — 2-column list/detail split.
///
/// Left column: source filter tabs, search, sorted list with relationship badges.
/// Right column: inline detail pane for selected suggestion.
struct ImportedContactsView: View {
    @Query(sort: \ImportedContact.importedContactName) private var allContacts: [ImportedContact]
    @Query private var allEnrichmentItems: [EnrichmentQueueItem]
    @Query private var companies: [Company]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var selectedContact: ImportedContact?
    @State private var selectedEnrichment: EnrichmentQueueItem?
    @State private var sourceFilter: ImportedContactSourceFilter = .all
    @AppStorage("sort-imported") private var sortOrder: ImportedContactSortOrder = .confidence
    @State private var showReviewForm = false
    @State private var showNewContact = false

    // Scan engine — created lazily (not injected via environment since App doesn't provide it yet)
    @State private var scanEngine: EmailScanEngine?
    @State private var oAuthService = GmailOAuthService()

    /// Pending enrichment items (not yet approved/dismissed)
    private var pendingEnrichment: [EnrichmentQueueItem] {
        allEnrichmentItems.filter { item in
            let status = item.status?.lowercased() ?? ""
            return !status.contains("approved") && !status.contains("dismissed")
        }
    }

    // MARK: - Derived Data

    /// Active contacts (excludes dismissed/rejected)
    private var activeContacts: [ImportedContact] {
        allContacts.filter { contact in
            let status = contact.onboardingStatus?.lowercased() ?? ""
            return !status.contains("rejected") && !status.contains("dismissed")
        }
    }

    /// Source-filtered contacts
    private var sourceFilteredContacts: [ImportedContact] {
        switch sourceFilter {
        case .all:
            return activeContacts
        case .email:
            return activeContacts.filter { ($0.source ?? "").lowercased().contains("email") }
        case .contacts:
            return activeContacts.filter {
                let source = ($0.source ?? "").lowercased()
                return !source.contains("email") && !source.isEmpty
            }
        }
    }

    /// Search-filtered contacts
    private var filteredContacts: [ImportedContact] {
        var result = sourceFilteredContacts

        if !searchText.isEmpty {
            result = result.filter { contact in
                (contact.importedContactName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.firstName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.lastName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.email?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (contact.company?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return sortContacts(result)
    }

    /// Counts for source filter tabs
    private func sourceCount(_ filter: ImportedContactSourceFilter) -> Int {
        switch filter {
        case .all: return activeContacts.count
        case .email: return activeContacts.filter { ($0.source ?? "").lowercased().contains("email") }.count
        case .contacts:
            return activeContacts.filter {
                let source = ($0.source ?? "").lowercased()
                return !source.contains("email") && !source.isEmpty
            }.count
        }
    }

    /// Whether a contact is an enrichment row (already in CRM)
    private func isEnrichment(_ contact: ImportedContact) -> Bool {
        !contact.relatedCrmContactIds.isEmpty
    }

    // MARK: - Sort

    private func sortContacts(_ contacts: [ImportedContact]) -> [ImportedContact] {
        switch sortOrder {
        case .confidence:
            return contacts.sorted { ($0.confidenceScore ?? 0) > ($1.confidenceScore ?? 0) }
        case .newest:
            return contacts.sorted {
                ($0.lastSeenDate ?? .distantPast) > ($1.lastSeenDate ?? .distantPast)
            }
        case .threads:
            return contacts.sorted { ($0.emailThreadCount ?? 0) > ($1.emailThreadCount ?? 0) }
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            listColumn
                .frame(width: 380)
                .background(Color(.controlBackgroundColor))

            Divider()

            detailColumn
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .onAppear {
            if scanEngine == nil {
                let container = modelContext.container
                let gmailClient = GmailAPIClient(oAuthService: oAuthService)
                scanEngine = EmailScanEngine(
                    modelContainer: container,
                    gmailClient: gmailClient,
                    oAuthService: oAuthService
                )
            }
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

    // MARK: - List Column

    private var listColumn: some View {
        VStack(spacing: 0) {
            // Header with scan button
            HStack(spacing: 8) {
                Text("Email Intelligence")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(-0.2)

                Text("\(activeContacts.count + pendingEnrichment.count)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Capsule())

                Spacer()

                if let engine = scanEngine {
                    if engine.isScanning {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Button {
                            Task { await engine.scanNow() }
                        } label: {
                            Text("Scan Now")
                                .font(.system(size: 12, weight: .semibold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 4)
                                .background(Color.accentColor)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .disabled(!oAuthService.isConnected)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            // Last scan timestamp / classifying status
            if let engine = scanEngine {
                if engine.progress.status == .classifying {
                    HStack(spacing: 6) {
                        ProgressView()
                            .controlSize(.mini)
                        Text("Classifying \(engine.progress.processed)/\(engine.progress.total) candidates...")
                            .font(.system(size: 11))
                            .foregroundStyle(.purple)
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 6)
                } else if engine.progress.status == .complete {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(.green)
                        Text("Scan complete — \(engine.progress.candidatesFound) candidates found")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.bottom, 6)
                }
            }

            Divider()

            // Search bar
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.tertiary)
                    .font(.system(size: 13))
                TextField("Search by name or email...", text: $searchText)
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

            // Source filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(ImportedContactSourceFilter.allCases, id: \.self) { filter in
                        let isSelected = sourceFilter == filter
                        let count = sourceCount(filter)
                        Button {
                            sourceFilter = filter
                        } label: {
                            HStack(spacing: 4) {
                                Text(filter.rawValue)
                                    .font(.system(size: 11, weight: .medium))
                                Text("\(count)")
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(isSelected ? Color.accentColor : Color(nsColor: .controlBackgroundColor))
                            )
                            .foregroundStyle(isSelected ? .white : .primary)
                            .overlay {
                                if !isSelected {
                                    Capsule(style: .continuous)
                                        .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
            }

            Divider()

            // Sort control bar
            HStack(spacing: 6) {
                Text("\(filteredContacts.count) suggestions")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                SortDropdown(
                    options: ImportedContactSortOrder.allCases,
                    selection: $sortOrder
                )
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)

            Divider()

            // Contact list
            if allContacts.isEmpty {
                EmptyStateView(
                    title: "No suggestions yet",
                    description: "Connect Gmail in Settings to scan for contact suggestions.",
                    systemImage: "envelope.badge.person.crop"
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredContacts.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: searchText.isEmpty
                        ? "No suggestions match the current filter."
                        : "No suggestions match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                contactList
            }
        }
    }

    // MARK: - Contact List

    @ViewBuilder
    private var contactList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                // Enrichment queue items (shown first with green styling)
                if !pendingEnrichment.isEmpty {
                    ForEach(pendingEnrichment, id: \.id) { item in
                        enrichmentRow(item)
                        Divider().padding(.leading, 52)
                    }
                }

                // Imported contacts
                ForEach(filteredContacts, id: \.id) { contact in
                    contactRow(contact)
                    Divider().padding(.leading, 52)
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Enrichment Row

    private func enrichmentRow(_ item: EnrichmentQueueItem) -> some View {
        let isSelected = selectedEnrichment?.id == item.id

        return Button {
            selectedEnrichment = item
            selectedContact = nil
        } label: {
            HStack(spacing: 10) {
                // Green star icon
                ZStack {
                    Circle()
                        .fill(isSelected ? Color.white.opacity(0.2) : Color.green.opacity(0.12))
                        .frame(width: 32, height: 32)
                    Image(systemName: "sparkle")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(isSelected ? .white : .green)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.fieldName ?? "Field Update")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .lineLimit(1)

                    if let suggested = item.suggestedValue, !suggested.isEmpty {
                        Text(suggested)
                            .font(.caption)
                            .foregroundStyle(isSelected ? .white.opacity(0.75) : .green)
                            .lineLimit(1)
                    }
                }

                Spacer()

                if !isSelected {
                    Text("UPDATE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.green)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                if let confidence = item.confidenceScore, !isSelected {
                    Text("\(Int(confidence))%")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(confidence >= 80 ? .green : confidence >= 50 ? .yellow : Color(white: 0.55))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background((confidence >= 80 ? Color.green : confidence >= 50 ? Color.yellow : Color.gray).opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                Group {
                    if isSelected {
                        Color.accentColor
                    } else {
                        Color.green.opacity(0.06)
                    }
                }
            )
            .overlay(alignment: .leading) {
                if !isSelected {
                    Rectangle()
                        .fill(Color.green)
                        .frame(width: 2.5)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Contact Row

    private func contactRow(_ contact: ImportedContact) -> some View {
        let isSelected = selectedContact?.id == contact.id
        let enrichment = isEnrichment(contact)

        return Button {
            selectedContact = contact
            selectedEnrichment = nil
        } label: {
            HStack(spacing: 10) {
                AvatarView(
                    name: displayName(for: contact),
                    avatarSize: .medium
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(displayName(for: contact))
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(isSelected ? .white : .primary)
                        .lineLimit(1)

                    if enrichment {
                        Text("Already in CRM — new data found")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(isSelected ? .white.opacity(0.8) : .green)
                            .lineLimit(1)
                    } else if let subtitle = contactSubtitle(for: contact) {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(isSelected ? .white.opacity(0.75) : .secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                // AI classification indicator
                if !isSelected {
                    let isAI = contact.classificationSource?.lowercased() == "ai"
                    HStack(spacing: 3) {
                        Circle()
                            .fill(isAI ? Color.green : Color.gray)
                            .frame(width: 6, height: 6)
                        Text(isAI ? "AI" : "Heuristic")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(isAI ? .green : .secondary)
                    }
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background((isAI ? Color.green : Color.gray).opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                // Thread count
                if let threads = contact.emailThreadCount, threads > 0, !isSelected {
                    HStack(spacing: 2) {
                        Image(systemName: "envelope")
                            .font(.system(size: 9))
                        Text("\(threads)")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Color.secondary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                // Relationship type badge
                if let relType = contact.relationshipType, !relType.isEmpty, !isSelected {
                    StatusBadge(
                        text: relType,
                        color: relationshipColor(relType)
                    )
                }

                // Confidence badge
                if let confidence = contact.confidenceScore, !isSelected {
                    confidenceBadge(confidence)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                Group {
                    if isSelected {
                        Color.accentColor
                    } else if enrichment {
                        Color.green.opacity(0.06)
                    } else {
                        Color.clear
                    }
                }
            )
            .overlay(alignment: .leading) {
                if enrichment && !isSelected {
                    Rectangle()
                        .fill(Color.green)
                        .frame(width: 2.5)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Detail Column

    private var detailColumn: some View {
        Group {
            if let enrichment = selectedEnrichment {
                EnrichmentDetailView(item: enrichment)
                    .id(enrichment.id)
            } else if let contact = selectedContact {
                ImportedContactDetailView(
                    importedContact: contact,
                    onShowReviewForm: { showReviewForm = true }
                )
                .id(contact.id)
                .sheet(isPresented: $showReviewForm) {
                    SuggestionReviewForm(importedContact: contact)
                        .frame(minWidth: 500, minHeight: 550)
                }
            } else {
                EmptyStateView(
                    title: "Select a suggestion",
                    description: "Choose a contact suggestion from the list to review.",
                    systemImage: "person.crop.rectangle.stack"
                )
            }
        }
    }

    // MARK: - Helpers

    private func displayName(for contact: ImportedContact) -> String {
        if let name = contact.importedContactName, !name.isEmpty {
            return name
        }
        let first = contact.firstName ?? ""
        let last = contact.lastName ?? ""
        let combined = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return combined.isEmpty ? (contact.email ?? "Unknown") : combined
    }

    private func contactSubtitle(for contact: ImportedContact) -> String? {
        var parts: [String] = []
        if let title = contact.jobTitle, !title.isEmpty {
            parts.append(title)
        }
        if let company = contact.company, !company.isEmpty {
            parts.append(company)
        }
        if !parts.isEmpty { return parts.joined(separator: " \u{00B7} ") }
        return contact.email
    }

    private func relationshipColor(_ type: String) -> Color {
        let lower = type.lowercased()
        if lower.contains("client")     { return .blue }
        if lower.contains("vendor")     { return .purple }
        if lower.contains("employee")   { return .green }
        if lower.contains("contractor") { return .orange }
        if lower.contains("partner")    { return .teal }
        return .secondary
    }

    private func confidenceBadge(_ score: Double) -> some View {
        let percentage = Int(score)
        let color: Color = {
            if percentage >= 80 { return .green }
            if percentage >= 50 { return .yellow }
            return Color(white: 0.55)
        }()

        return Text("\(percentage)%")
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Imported Contact Form (retained from original for create/edit)

struct ImportedContactFormView: View {
    let importedContact: ImportedContact?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var importedContactName: String = ""
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var mobilePhone: String = ""
    @State private var jobTitle: String = ""
    @State private var company: String = ""
    @State private var companyIndustry: String = ""
    @State private var companyType: String = ""
    @State private var companySize: String = ""
    @State private var categorization: String = ""
    @State private var onboardingStatus: String = ""
    @State private var importSource: String = ""
    @State private var note: String = ""
    @State private var reviewNotes: String = ""
    @State private var reasonForRejection: String = ""
    @State private var syncToContacts: Bool = false

    private var isEditing: Bool { importedContact != nil }

    private static let categorizationOptions = [
        "", "Client", "Lead", "Partner", "Vendor", "Prospect", "Other"
    ]

    private static let onboardingStatusOptions = [
        "", "Approved", "Rejected", "Pending Review"
    ]

    var body: some View {
        Form {
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

            Section("Company") {
                TextField("Company", text: $company)
                TextField("Industry", text: $companyIndustry)
                TextField("Company Type", text: $companyType)
                TextField("Company Size", text: $companySize)
            }

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

    private func save() {
        let trimmedName = importedContactName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let contact = importedContact {
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
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
