import SwiftUI
import SwiftData

/// Company detail view — mirrors src/components/companies/Company360Page.tsx
///
/// Displays all company fields organized into Form sections:
/// - Header with avatar, name, industry
/// - Company Info (website, phone, industry, type, size, revenue, etc.)
/// - Address (combined from street, city, state, zip, country)
/// - Description & Notes
/// - Details (created, modified, record ID)
///
/// Only shows sections/rows where data is non-nil and non-empty.
struct CompanyDetailView: View {
    let company: Company

    private var displayName: String {
        company.companyName ?? "Unknown"
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                headerSection
                    .padding(.bottom, 16)

                Form {
                    companyInfoSection
                    addressSection
                    descriptionSection
                    notesSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
        .navigationTitle(displayName)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(name: displayName, size: 64)

            Text(displayName)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let industry = company.industry, !industry.isEmpty {
                Text(industry)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let companyType = company.companyType, !companyType.isEmpty {
                BadgeView(text: companyType, color: companyTypeColor(companyType))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 20)
    }

    // MARK: - Company Info

    @ViewBuilder
    private var companyInfoSection: some View {
        let hasWebsite = company.website?.isEmpty == false
        let hasIndustry = company.industry?.isEmpty == false
        let hasType = company.companyType?.isEmpty == false
        let hasSize = company.companySize?.isEmpty == false
        let hasRevenue = company.annualRevenue?.isEmpty == false
        let hasFoundingYear = company.foundingYear != nil
        let hasNaics = company.naicsCode?.isEmpty == false
        let hasLeadSource = company.leadSource?.isEmpty == false
        let hasReferredBy = company.referredBy?.isEmpty == false
        let hasEntityType = company.type?.isEmpty == false

        let hasAny = hasWebsite || hasIndustry || hasType || hasSize ||
                     hasRevenue || hasFoundingYear || hasNaics || hasLeadSource ||
                     hasReferredBy || hasEntityType

        if hasAny {
            Section("Company Info") {
                if let website = company.website, !website.isEmpty {
                    Button {
                        let urlString = website.contains("://") ? website : "https://\(website)"
                        openURL(urlString)
                    } label: {
                        HStack {
                            Text("Website")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(website)
                                .foregroundStyle(.blue)
                        }
                        .frame(minHeight: 28)
                    }
                    .buttonStyle(.plain)
                }

                if let industry = company.industry, !industry.isEmpty {
                    FieldRow(label: "Industry", value: industry)
                }

                if let companyType = company.companyType, !companyType.isEmpty {
                    FieldRow(label: "Company Type", value: companyType)
                }

                if let entityType = company.type, !entityType.isEmpty {
                    FieldRow(label: "Type", value: entityType)
                }

                if let size = company.companySize, !size.isEmpty {
                    FieldRow(label: "Company Size", value: size)
                }

                if let revenue = company.annualRevenue, !revenue.isEmpty {
                    FieldRow(label: "Annual Revenue", value: revenue)
                }

                if let year = company.foundingYear {
                    FieldRow(label: "Founded", value: "\(year)")
                }

                if let naics = company.naicsCode, !naics.isEmpty {
                    FieldRow(label: "NAICS Code", value: naics)
                }

                if let leadSource = company.leadSource, !leadSource.isEmpty {
                    FieldRow(label: "Lead Source", value: leadSource)
                }

                if let referredBy = company.referredBy, !referredBy.isEmpty {
                    FieldRow(label: "Referred By", value: referredBy)
                }
            }
        }
    }

    // MARK: - Address

    @ViewBuilder
    private var addressSection: some View {
        let parts: [String] = [
            company.address,
            company.city,
            company.stateRegion,
            company.postalCode,
            company.country
        ].compactMap { $0?.isEmpty == false ? $0 : nil }

        if !parts.isEmpty {
            Section("Address") {
                if let street = company.address, !street.isEmpty {
                    FieldRow(label: "Street", value: street)
                }
                if let city = company.city, !city.isEmpty {
                    FieldRow(label: "City", value: city)
                }
                if let state = company.stateRegion, !state.isEmpty {
                    FieldRow(label: "State/Region", value: state)
                }
                if let zip = company.postalCode, !zip.isEmpty {
                    FieldRow(label: "Postal Code", value: zip)
                }
                if let country = company.country, !country.isEmpty {
                    FieldRow(label: "Country", value: country)
                }
            }
        }
    }

    // MARK: - Description

    @ViewBuilder
    private var descriptionSection: some View {
        if let description = company.companyDescription, !description.isEmpty {
            Section("Description") {
                Text(description)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Notes

    @ViewBuilder
    private var notesSection: some View {
        if let notes = company.notes, !notes.isEmpty {
            Section("Notes") {
                Text(notes)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let created = company.createdDate {
                FieldRow(label: "Created", value: created.formatted(date: .abbreviated, time: .shortened))
            }

            if let modified = company.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            HStack {
                Text("Record ID")
                    .foregroundStyle(.secondary)
                Spacer()
                Text(company.id)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .textSelection(.enabled)
            }
            .frame(minHeight: 28)
        }
    }

    // MARK: - Helpers

    private func openURL(_ urlString: String) {
        guard let url = URL(string: urlString),
              let scheme = url.scheme,
              ["https", "http", "mailto", "tel"].contains(scheme) else { return }
        NSWorkspace.shared.open(url)
    }

    private func companyTypeColor(_ type: String) -> Color {
        let lower = type.lowercased()
        if lower.contains("client") { return .blue }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor") { return .green }
        if lower.contains("prospect") { return .orange }
        if lower.contains("lead") { return .teal }
        if lower.contains("agency") { return .indigo }
        return .secondary
    }
}
