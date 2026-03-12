import SwiftUI

/// Portal Access detail view — displays all key fields organized in sections.
///
/// Mirrors the Electron Portal Access detail pane. Takes a non-optional
/// PortalAccessRecord (parent view resolves selection before presenting).
///
/// Sections shown only when they contain non-nil, non-empty data.
/// The model has 37 fields including 12 lookups — this view focuses on the
/// most useful fields and groups them logically.
struct PortalAccessDetailView: View {
    let record: PortalAccessRecord

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: - Header
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                // MARK: - Form Sections
                Form {
                    accessInfoSection
                    portalDetailsSection
                    contactLookupSection
                    servicesSection
                    notesSection
                    datesSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(name: displayName, size: 64)

            Text(displayName)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let position = record.positionTitle, !position.isEmpty {
                Text(position)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            if let status = record.status, !status.isEmpty {
                BadgeView(text: status, color: statusColor(status))
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Access Info

    @ViewBuilder
    private var accessInfoSection: some View {
        let hasPage = record.pageAddress?.isEmpty == false
        let hasStatus = record.status?.isEmpty == false
        let hasStage = record.stage?.isEmpty == false
        let hasEmail = record.email?.isEmpty == false
        let hasPosition = record.positionTitle?.isEmpty == false
        let hasCompany = record.company?.isEmpty == false
        let hasDecisionMaker = record.decisionMaker?.isEmpty == false
        let hasPrimaryContact = record.primaryContact?.isEmpty == false
        let hasLeadSource = record.leadSource?.isEmpty == false

        if hasPage || hasStatus || hasStage || hasEmail || hasPosition
            || hasCompany || hasDecisionMaker || hasPrimaryContact || hasLeadSource {
            Section("Access Info") {
                if let page = record.pageAddress, !page.isEmpty {
                    FieldRow(label: "Page Address", value: page)
                }

                if let status = record.status, !status.isEmpty {
                    HStack {
                        Text("Status")
                            .foregroundStyle(.secondary)
                        Spacer()
                        BadgeView(text: status, color: statusColor(status))
                    }
                    .frame(minHeight: 28)
                }

                if let stage = record.stage, !stage.isEmpty {
                    FieldRow(label: "Stage", value: stage)
                }

                if let email = record.email, !email.isEmpty {
                    linkRow(label: "Email", value: email, urlString: "mailto:\(email)")
                }

                if let position = record.positionTitle, !position.isEmpty {
                    FieldRow(label: "Position", value: position)
                }

                if let company = record.company, !company.isEmpty {
                    FieldRow(label: "Company", value: company)
                }

                if let dm = record.decisionMaker, !dm.isEmpty {
                    FieldRow(label: "Decision Maker", value: dm)
                }

                if let primary = record.primaryContact, !primary.isEmpty {
                    FieldRow(label: "Primary Contact", value: primary)
                }

                if let source = record.leadSource, !source.isEmpty {
                    FieldRow(label: "Lead Source", value: source)
                }
            }
        }
    }

    // MARK: - Portal Details

    @ViewBuilder
    private var portalDetailsSection: some View {
        let hasFramerUrl = record.framerPageUrl?.isEmpty == false
        let hasWebsite = record.website?.isEmpty == false
        let hasPhone = record.phoneNumber?.isEmpty == false
        let hasAddress = record.address?.isEmpty == false
        let hasIndustry = record.industry?.isEmpty == false
        let hasBudget = record.projectBudget != nil

        if hasFramerUrl || hasWebsite || hasPhone || hasAddress || hasIndustry || hasBudget {
            Section("Portal & Business") {
                if let framerUrl = record.framerPageUrl, !framerUrl.isEmpty {
                    let url = framerUrl.hasPrefix("http") ? framerUrl : "https://\(framerUrl)"
                    linkRow(label: "Portal URL", value: framerUrl, urlString: url)
                }

                if let website = record.website, !website.isEmpty {
                    let url = website.hasPrefix("http") ? website : "https://\(website)"
                    linkRow(label: "Website", value: website, urlString: url)
                }

                if let phone = record.phoneNumber, !phone.isEmpty {
                    linkRow(label: "Phone", value: phone, urlString: "tel:\(phone)")
                }

                if let address = record.address, !address.isEmpty {
                    FieldRow(label: "Address", value: address)
                }

                if let industry = record.industry, !industry.isEmpty {
                    FieldRow(label: "Industry", value: industry)
                }

                if let budget = record.projectBudget {
                    FieldRow(label: "Project Budget", value: budgetFormatted(budget))
                }
            }
        }
    }

    // MARK: - Contact Lookup

    @ViewBuilder
    private var contactLookupSection: some View {
        let hasContactName = record.contactNameLookup?.isEmpty == false
        let hasContactEmail = record.contactEmailLookup?.isEmpty == false
        let hasContactPhone = record.contactPhoneLookup?.isEmpty == false
        let hasContactJobTitle = record.contactJobTitleLookup?.isEmpty == false
        let hasContactCompany = record.contactCompanyLookup?.isEmpty == false
        let hasContactIndustry = record.contactIndustryLookup?.isEmpty == false
        let hasContactWebsite = record.contactWebsiteLookup?.isEmpty == false
        let hasContactTags = record.contactTagsLookup?.isEmpty == false
        let hasContactAddress = hasContactAddressFields

        let hasAny = hasContactName || hasContactEmail || hasContactPhone
            || hasContactJobTitle || hasContactCompany || hasContactIndustry
            || hasContactWebsite || hasContactTags || hasContactAddress

        if hasAny {
            Section("Linked Contact") {
                if let name = record.contactNameLookup, !name.isEmpty {
                    FieldRow(label: "Name", value: name)
                }

                if let email = record.contactEmailLookup, !email.isEmpty {
                    linkRow(label: "Email", value: email, urlString: "mailto:\(email)")
                }

                if let phone = record.contactPhoneLookup, !phone.isEmpty {
                    linkRow(label: "Phone", value: phone, urlString: "tel:\(phone)")
                }

                if let jobTitle = record.contactJobTitleLookup, !jobTitle.isEmpty {
                    FieldRow(label: "Job Title", value: jobTitle)
                }

                if let company = record.contactCompanyLookup, !company.isEmpty {
                    FieldRow(label: "Company", value: company)
                }

                if let industry = record.contactIndustryLookup, !industry.isEmpty {
                    FieldRow(label: "Industry", value: industry)
                }

                if let website = record.contactWebsiteLookup, !website.isEmpty {
                    let url = website.hasPrefix("http") ? website : "https://\(website)"
                    linkRow(label: "Website", value: website, urlString: url)
                }

                if let tags = record.contactTagsLookup, !tags.isEmpty {
                    FieldRow(label: "Tags", value: tags)
                }

                if hasContactAddressFields {
                    FieldRow(label: "Location", value: contactLocationFormatted)
                }
            }
        }
    }

    // MARK: - Services Interested In

    @ViewBuilder
    private var servicesSection: some View {
        if !record.servicesInterestedIn.isEmpty {
            Section("Services Interested In") {
                FlowLayout(spacing: 6) {
                    ForEach(record.servicesInterestedIn, id: \.self) { service in
                        BadgeView(text: service, color: .teal)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    // MARK: - Notes

    @ViewBuilder
    private var notesSection: some View {
        if let notes = record.notes, !notes.isEmpty {
            Section("Notes") {
                Text(notes)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Dates

    @ViewBuilder
    private var datesSection: some View {
        let hasDateAdded = record.dateAdded != nil
        let hasExpectedStart = record.expectedProjectStartDate != nil
        let hasFollowUp = record.followUpDate != nil

        if hasDateAdded || hasExpectedStart || hasFollowUp {
            Section("Key Dates") {
                if let dateAdded = record.dateAdded {
                    FieldRow(label: "Date Added", value: dateAdded.formatted(date: .abbreviated, time: .omitted))
                }

                if let expectedStart = record.expectedProjectStartDate {
                    FieldRow(label: "Expected Start", value: expectedStart.formatted(date: .abbreviated, time: .omitted))
                }

                if let followUp = record.followUpDate {
                    FieldRow(label: "Follow Up", value: followUp.formatted(date: .abbreviated, time: .omitted))
                }
            }
        }
    }

    // MARK: - Details (metadata)

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let modified = record.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            if let localMod = record.localModifiedAt {
                FieldRow(label: "Local Modified", value: localMod.formatted(date: .abbreviated, time: .shortened))
            }

            // Airtable record ID — small, for debugging
            Text(record.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Helpers

    /// Best display name for the record.
    private var displayName: String {
        if let name = record.name, !name.isEmpty { return name }
        if let lookup = record.contactNameLookup, !lookup.isEmpty { return lookup }
        if let email = record.email, !email.isEmpty { return email }
        if let page = record.pageAddress, !page.isEmpty { return page }
        return "Unknown"
    }

    /// Status color: ACTIVE = green, IN-ACTIVE = red, others = secondary.
    private func statusColor(_ status: String) -> Color {
        let upper = status.uppercased()
        if upper.contains("ACTIVE") && !upper.contains("IN-ACTIVE") && !upper.contains("INACTIVE") {
            return .green
        }
        if upper.contains("IN-ACTIVE") || upper.contains("INACTIVE") {
            return .red
        }
        return .secondary
    }

    /// Builds a tappable link row with URL scheme validation.
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
                    .lineLimit(1)
            } else {
                Text(value)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
            }
        }
        .frame(minHeight: 28)
    }

    /// Formats project budget as currency.
    private func budgetFormatted(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }

    /// Whether any contact address lookup fields are populated.
    private var hasContactAddressFields: Bool {
        let fields: [String?] = [
            record.contactAddressLineLookup,
            record.contactCityLookup,
            record.contactStateLookup,
            record.contactCountryLookup
        ]
        return fields.contains { $0?.isEmpty == false }
    }

    /// Formatted contact location from lookup fields.
    private var contactLocationFormatted: String {
        var parts: [String] = []

        if let line = record.contactAddressLineLookup, !line.isEmpty {
            parts.append(line)
        }

        var cityStateParts: [String] = []
        if let city = record.contactCityLookup, !city.isEmpty {
            cityStateParts.append(city)
        }
        if let state = record.contactStateLookup, !state.isEmpty {
            cityStateParts.append(state)
        }
        if !cityStateParts.isEmpty {
            parts.append(cityStateParts.joined(separator: ", "))
        }

        if let country = record.contactCountryLookup, !country.isEmpty {
            parts.append(country)
        }

        return parts.joined(separator: "\n")
    }
}

// MARK: - Preview

#Preview {
    let record = PortalAccessRecord(id: "recTest1", name: "Haus Collection")
    record.pageAddress = "haus-collection"
    record.email = "client@example.com"
    record.status = "ACTIVE"
    record.stage = "Live"
    record.company = "Haus Group"
    record.positionTitle = "Creative Director"
    record.industry = "Real Estate"
    record.website = "https://hauscollection.com"
    record.framerPageUrl = "https://portal.imaginelabstudios.com/haus-collection"
    record.notes = "Premium client portal — showcasing brand identity and web design work."
    record.dateAdded = Calendar.current.date(byAdding: .month, value: -3, to: Date())
    record.projectBudget = 25000
    record.servicesInterestedIn = ["Web Design", "Brand Identity", "Content Strategy"]
    record.contactNameLookup = "Jane Doe"
    record.contactEmailLookup = "jane@hauscollection.com"
    record.contactJobTitleLookup = "CEO"

    return PortalAccessDetailView(record: record)
        .frame(width: 500, height: 800)
}
