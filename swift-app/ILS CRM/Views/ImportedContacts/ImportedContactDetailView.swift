import SwiftUI
import SwiftData

/// Imported Contact detail view — displays key fields from the staging record.
///
/// Mirrors the Electron imported contacts detail pane. Takes a non-optional
/// ImportedContact (parent view resolves selection before presenting).
///
/// Sections shown only when they contain non-nil, non-empty data.
/// The model has ~48 fields — this view surfaces the most important ones
/// organized into logical sections.
struct ImportedContactDetailView: View {
    let importedContact: ImportedContact

    @Environment(\.dismiss) private var dismiss

    // Linked entity queries — fetch all, filter by imported contact's ID arrays
    @Query(sort: \Specialty.specialty) private var allSpecialties: [Specialty]
    @Query(sort: \Contact.importedContactName) private var allContacts: [Contact]

    private var linkedSpecialties: [Specialty] {
        allSpecialties.filter { importedContact.specialtiesIds.contains($0.id) }
    }

    private var linkedContacts: [Contact] {
        allContacts.filter { importedContact.relatedCrmContactIds.contains($0.id) }
    }

    private var displayName: String {
        if let name = importedContact.importedContactName, !name.isEmpty {
            return name
        }
        let first = importedContact.firstName ?? ""
        let last = importedContact.lastName ?? ""
        let combined = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return combined.isEmpty ? "Unknown" : combined
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                Form {
                    contactInfoSection
                    importInfoSection
                    relatedSection
                    businessSection
                    companyDetailsSection
                    notesSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(
                name: displayName,
                size: 64,
                photoURL: importedContact.contactPhotoUrl.flatMap { URL(string: $0) }
            )

            Text(displayName)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let jobTitle = importedContact.jobTitle, !jobTitle.isEmpty {
                Text(jobTitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if let status = importedContact.onboardingStatus, !status.isEmpty {
                StatusBadge(text: status, color: onboardingStatusColor(status))
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Contact Info

    @ViewBuilder
    private var contactInfoSection: some View {
        let hasEmail = importedContact.email?.isEmpty == false
        let hasPhone = importedContact.phone?.isEmpty == false
        let hasMobile = importedContact.mobilePhone?.isEmpty == false
            && importedContact.mobilePhone != importedContact.phone
        let hasWorkPhone = importedContact.workPhone?.isEmpty == false
            && importedContact.workPhone != importedContact.phone
        let hasOfficePhone = importedContact.officePhone?.isEmpty == false
            && importedContact.officePhone != importedContact.phone
        let hasLinkedIn = importedContact.linkedInUrl?.isEmpty == false
        let hasWebsite = importedContact.website?.isEmpty == false

        if hasEmail || hasPhone || hasMobile || hasWorkPhone || hasOfficePhone
            || hasLinkedIn || hasWebsite {
            Section("Contact Info") {
                if let email = importedContact.email, !email.isEmpty {
                    linkRow(label: "Email", value: email, urlString: "mailto:\(email)")
                }

                if let phone = importedContact.phone, !phone.isEmpty {
                    linkRow(label: "Phone", value: phone, urlString: "tel:\(phone)")
                }

                if let mobile = importedContact.mobilePhone, !mobile.isEmpty,
                   mobile != importedContact.phone {
                    linkRow(label: "Mobile", value: mobile, urlString: "tel:\(mobile)")
                }

                if let workPhone = importedContact.workPhone, !workPhone.isEmpty,
                   workPhone != importedContact.phone {
                    linkRow(label: "Work Phone", value: workPhone, urlString: "tel:\(workPhone)")
                }

                if let officePhone = importedContact.officePhone, !officePhone.isEmpty,
                   officePhone != importedContact.phone {
                    linkRow(label: "Office Phone", value: officePhone, urlString: "tel:\(officePhone)")
                }

                if let linkedin = importedContact.linkedInUrl, !linkedin.isEmpty {
                    let url = linkedin.hasPrefix("http") ? linkedin : "https://\(linkedin)"
                    linkRow(label: "LinkedIn", value: linkedin, urlString: url)
                }

                if let website = importedContact.website, !website.isEmpty {
                    let url = website.hasPrefix("http") ? website : "https://\(website)"
                    linkRow(label: "Website", value: website, urlString: url)
                }
            }
        }
    }

    // MARK: - Import Info

    @ViewBuilder
    private var importInfoSection: some View {
        let hasSource = importedContact.importSource?.isEmpty == false
        let hasDate = importedContact.importDate != nil
        let hasCategorization = importedContact.categorization?.isEmpty == false
        let hasTags = !importedContact.tags.isEmpty
        let hasEventTags = importedContact.eventTags?.isEmpty == false
        let hasSyncFlag = importedContact.syncToContacts

        if hasSource || hasDate || hasCategorization || hasTags || hasEventTags || hasSyncFlag {
            Section("Import Info") {
                if let source = importedContact.importSource, !source.isEmpty {
                    FieldRow(label: "Import Source", value: source)
                }

                if let date = importedContact.importDate {
                    FieldRow(label: "Import Date", value: date.formatted(date: .abbreviated, time: .omitted))
                }

                if let categorization = importedContact.categorization, !categorization.isEmpty {
                    HStack {
                        Text("Categorization")
                            .foregroundStyle(.secondary)
                        Spacer()
                        BadgeView(
                            text: categorization,
                            color: categorizationColor(categorization)
                        )
                    }
                    .frame(minHeight: 28)
                }

                if !importedContact.tags.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Tags")
                            .foregroundStyle(.secondary)
                        FlowLayout(spacing: 6) {
                            ForEach(importedContact.tags, id: \.self) { tag in
                                BadgeView(text: tag, color: .teal)
                            }
                        }
                    }
                    .frame(minHeight: 28)
                }

                if let eventTags = importedContact.eventTags, !eventTags.isEmpty {
                    FieldRow(label: "Event Tags", value: eventTags)
                }

                if importedContact.syncToContacts {
                    HStack {
                        Text("Sync to Contacts")
                            .foregroundStyle(.secondary)
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                    .frame(minHeight: 28)
                }
            }
        }
    }

    // MARK: - Related (Linked Entities)

    @ViewBuilder
    private var relatedSection: some View {
        let hasSpecialties = !linkedSpecialties.isEmpty
        let hasContacts = !linkedContacts.isEmpty

        if hasSpecialties || hasContacts {
            Section("Related") {
                if hasSpecialties {
                    RelatedRecordRow(
                        label: "Specialties",
                        items: linkedSpecialties.compactMap { $0.specialty }
                    )
                }

                if hasContacts {
                    RelatedRecordRow(
                        label: "CRM Contacts",
                        items: linkedContacts.compactMap { $0.importedContactName }
                    )
                }
            }
        }
    }

    // MARK: - Business

    @ViewBuilder
    private var businessSection: some View {
        let hasCompany = importedContact.company?.isEmpty == false
        let hasIndustry = importedContact.companyIndustry?.isEmpty == false
        let hasCompanyType = importedContact.companyType?.isEmpty == false
        let hasCompanySize = importedContact.companySize?.isEmpty == false
        let hasAddress = hasContactAddressFields

        if hasCompany || hasIndustry || hasCompanyType || hasCompanySize || hasAddress {
            Section("Business") {
                if let company = importedContact.company, !company.isEmpty {
                    FieldRow(label: "Company", value: company)
                }

                if let industry = importedContact.companyIndustry, !industry.isEmpty {
                    FieldRow(label: "Industry", value: industry)
                }

                if let companyType = importedContact.companyType, !companyType.isEmpty {
                    FieldRow(label: "Company Type", value: companyType)
                }

                if let companySize = importedContact.companySize, !companySize.isEmpty {
                    FieldRow(label: "Company Size", value: companySize)
                }

                if hasContactAddressFields {
                    FieldRow(label: "Address", value: formattedContactAddress)
                }
            }
        }
    }

    // MARK: - Company Details

    @ViewBuilder
    private var companyDetailsSection: some View {
        let hasRevenue = importedContact.companyAnnualRevenue?.isEmpty == false
        let hasFoundingYear = importedContact.companyFoundingYear?.isEmpty == false
        let hasNaics = importedContact.companyNaicsCode?.isEmpty == false
        let hasDescription = importedContact.companyDescription?.isEmpty == false
        let hasCompanyAddress = hasCompanyAddressFields

        if hasRevenue || hasFoundingYear || hasNaics || hasDescription || hasCompanyAddress {
            Section("Company Details") {
                if let revenue = importedContact.companyAnnualRevenue, !revenue.isEmpty {
                    FieldRow(label: "Annual Revenue", value: revenue)
                }

                if let year = importedContact.companyFoundingYear, !year.isEmpty {
                    FieldRow(label: "Founded", value: year)
                }

                if let naics = importedContact.companyNaicsCode, !naics.isEmpty {
                    FieldRow(label: "NAICS Code", value: naics)
                }

                if hasCompanyAddressFields {
                    FieldRow(label: "Company Address", value: formattedCompanyAddress)
                }

                if let description = importedContact.companyDescription, !description.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Description")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(description)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    // MARK: - Notes

    @ViewBuilder
    private var notesSection: some View {
        let hasNote = importedContact.note?.isEmpty == false
        let hasReviewNotes = importedContact.reviewNotes?.isEmpty == false
        let hasRejection = importedContact.reasonForRejection?.isEmpty == false

        if hasNote || hasReviewNotes || hasRejection {
            Section("Notes") {
                if let note = importedContact.note, !note.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Note")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(note)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let reviewNotes = importedContact.reviewNotes, !reviewNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Review Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(reviewNotes)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let reason = importedContact.reasonForRejection, !reason.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Reason for Rejection")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(reason)
                            .font(.body)
                            .foregroundStyle(.red)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let modified = importedContact.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            if let localMod = importedContact.localModifiedAt {
                FieldRow(label: "Local Modified", value: localMod.formatted(date: .abbreviated, time: .shortened))
            }

            if importedContact.isPendingPush {
                HStack {
                    Text("Pending Push")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "arrow.up.circle.fill")
                        .foregroundStyle(.orange)
                }
                .frame(minHeight: 28)
            }

            // Airtable record ID — small, for debugging
            Text(importedContact.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Helpers

    /// Builds a tappable link row for contact info fields, with URL scheme validation.
    private func linkRow(label: String, value: String, urlString: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            if let url = URL(string: urlString),
               let scheme = url.scheme,
               ["https", "http", "mailto", "tel"].contains(scheme) {
                Link(value, destination: url)
                    .foregroundStyle(Color.accentColor)
            } else {
                Text(value)
                    .foregroundStyle(.primary)
            }
        }
        .frame(minHeight: 28)
    }

    /// Deterministic color for onboarding status badges.
    private func onboardingStatusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("approved") { return .green }
        if lower.contains("rejected") { return .red }
        if lower.contains("pending") { return .orange }
        return .secondary
    }

    /// Deterministic color for categorization badges.
    private func categorizationColor(_ value: String) -> Color {
        let lower = value.lowercased()
        if lower.contains("client") { return .blue }
        if lower.contains("lead") { return .orange }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor") { return .green }
        if lower.contains("prospect") { return .yellow }
        return .gray
    }

    // MARK: - Contact Address

    /// Whether any contact address field is populated.
    private var hasContactAddressFields: Bool {
        let fields: [String?] = [
            importedContact.addressLine, importedContact.city,
            importedContact.state, importedContact.country,
            importedContact.postalCode
        ]
        return fields.contains { $0?.isEmpty == false }
    }

    /// Formats contact address from available components.
    private var formattedContactAddress: String {
        formatAddress(
            line: importedContact.addressLine,
            city: importedContact.city,
            state: importedContact.state,
            postalCode: importedContact.postalCode,
            country: importedContact.country
        )
    }

    // MARK: - Company Address

    /// Whether any company address field is populated.
    private var hasCompanyAddressFields: Bool {
        let fields: [String?] = [
            importedContact.companyStreetAddress, importedContact.companyCity,
            importedContact.companyState, importedContact.companyCountry,
            importedContact.companyPostalCode
        ]
        return fields.contains { $0?.isEmpty == false }
    }

    /// Formats company address from available components.
    private var formattedCompanyAddress: String {
        var line = importedContact.companyStreetAddress ?? ""
        if let line2 = importedContact.companyStreetAddress2, !line2.isEmpty {
            line = line.isEmpty ? line2 : "\(line), \(line2)"
        }
        return formatAddress(
            line: line.isEmpty ? nil : line,
            city: importedContact.companyCity,
            state: importedContact.companyState,
            postalCode: importedContact.companyPostalCode,
            country: importedContact.companyCountry
        )
    }

    /// Shared address formatter.
    private func formatAddress(line: String?, city: String?, state: String?,
                               postalCode: String?, country: String?) -> String {
        var parts: [String] = []

        if let line = line, !line.isEmpty {
            parts.append(line)
        }

        var cityStateParts: [String] = []
        if let city = city, !city.isEmpty {
            cityStateParts.append(city)
        }
        if let state = state, !state.isEmpty {
            cityStateParts.append(state)
        }
        if !cityStateParts.isEmpty {
            var cityState = cityStateParts.joined(separator: ", ")
            if let postal = postalCode, !postal.isEmpty {
                cityState += " \(postal)"
            }
            parts.append(cityState)
        } else if let postal = postalCode, !postal.isEmpty {
            parts.append(postal)
        }

        if let country = country, !country.isEmpty {
            parts.append(country)
        }

        return parts.joined(separator: "\n")
    }
}

// MARK: - Preview

#Preview {
    let contact = ImportedContact(
        id: "recIMPORT123",
        importedContactName: "John Doe"
    )
    contact.firstName = "John"
    contact.lastName = "Doe"
    contact.email = "john@example.com"
    contact.phone = "+1 555-0200"
    contact.mobilePhone = "+1 555-0201"
    contact.jobTitle = "Marketing Director"
    contact.company = "Acme Corp"
    contact.companyIndustry = "Technology"
    contact.companyType = "Startup"
    contact.companySize = "50-100"
    contact.onboardingStatus = "Approved"
    contact.importSource = "Conference"
    contact.importDate = Calendar.current.date(byAdding: .day, value: -5, to: Date())
    contact.categorization = "Lead"
    contact.note = "Met at CES 2026. Interested in partnership opportunities."
    contact.city = "San Francisco"
    contact.state = "CA"
    contact.country = "USA"

    return ImportedContactDetailView(importedContact: contact)
        .frame(width: 500, height: 800)
}
