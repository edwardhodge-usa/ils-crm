import SwiftUI

/// Portal Access detail view — inline editing with click-to-edit fields.
///
/// Mirrors the Electron Portal Access detail pane. Uses @Bindable for direct
/// SwiftData mutation with auto-save on blur/commit.
///
/// Uses shared DetailComponents (DetailSection, EditableFieldRow, DetailFieldRow)
/// for consistent inline editing across all entity detail views.
struct PortalAccessDetailView: View {
    @Bindable var record: PortalAccessRecord

    @Environment(\.dismiss) private var dismiss

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // MARK: - Header
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                // MARK: - Editable Sections
                accessInfoSection
                portalBusinessSection
                keyDatesSection
                notesSection
                contactLookupSection
                detailsSection

                Spacer(minLength: 24)
            }
            .padding(.horizontal, 16)
        }
        .scrollIndicators(.automatic)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(name: displayName, size: AvatarSize.xlarge.dimension)

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

    private var accessInfoSection: some View {
        DetailSection(title: "ACCESS INFO") {
            EditableFieldRow(label: "Page Address", key: "pageAddress", type: .readonly,
                value: record.pageAddress)
            EditableFieldRow(label: "Stage", key: "stage",
                type: .singleSelect(options: [
                    "Prospect", "Lead", "Client", "Past Client", "Partner"
                ]),
                value: record.stage, onSave: saveField)
            EditableFieldRow(label: "Status", key: "status",
                type: .singleSelect(options: [
                    "ACTIVE", "IN-ACTIVE", "PENDING", "EXPIRED", "REVOKED"
                ]),
                value: record.status, onSave: saveField)
            EditableFieldRow(label: "Email", key: "email", type: .readonly,
                value: record.email, isLink: true)
            EditableFieldRow(label: "Position", key: "positionTitle", type: .text,
                value: record.positionTitle, onSave: saveField)
            EditableFieldRow(label: "Company", key: "company", type: .readonly,
                value: record.company)
            EditableFieldRow(label: "Decision Maker", key: "decisionMaker", type: .text,
                value: record.decisionMaker, onSave: saveField)
            EditableFieldRow(label: "Lead Source", key: "leadSource", type: .text,
                value: record.leadSource, onSave: saveField)
        }
    }

    // MARK: - Portal & Business

    private var portalBusinessSection: some View {
        DetailSection(title: "PORTAL & BUSINESS") {
            EditableFieldRow(label: "Website", key: "website", type: .text,
                value: record.website, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Phone", key: "phoneNumber", type: .text,
                value: record.phoneNumber, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Industry", key: "industry", type: .text,
                value: record.industry, onSave: saveField)
            EditableFieldRow(label: "Project Budget", key: "projectBudget",
                type: .number(prefix: "$"),
                value: record.projectBudget.map { String(format: "%.0f", $0) },
                onSave: saveField)
            EditableFieldRow(label: "Services", key: "servicesInterestedIn",
                type: .multiSelect(options: [
                    "Strategy/Consulting", "Design/Concept Development",
                    "Production/Fabrication Oversight", "Opening/Operations Support",
                    "Executive Producing"
                ]),
                value: record.servicesInterestedIn.joined(separator: ", "),
                onSave: saveField)
        }
    }

    // MARK: - Key Dates

    private var keyDatesSection: some View {
        DetailSection(title: "KEY DATES") {
            EditableFieldRow(label: "Follow Up", key: "followUpDate", type: .date,
                value: record.followUpDate.map { Self.isoFormatter.string(from: $0) },
                onSave: saveField)
            EditableFieldRow(label: "Expected Start", key: "expectedProjectStartDate", type: .date,
                value: record.expectedProjectStartDate.map { Self.isoFormatter.string(from: $0) },
                onSave: saveField)
            DetailFieldRow(label: "Date Added", value: record.dateAdded.map {
                DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
            } ?? "—")
        }
    }

    // MARK: - Notes

    private var notesSection: some View {
        DetailSection(title: "NOTES") {
            EditableFieldRow(label: "", key: "notes", type: .textarea,
                value: record.notes, onSave: saveField)
        }
    }

    // MARK: - Linked Contact Lookups (readonly)

    @ViewBuilder
    private var contactLookupSection: some View {
        let hasAny = [
            record.contactNameLookup, record.contactEmailLookup,
            record.contactPhoneLookup, record.contactJobTitleLookup,
            record.contactCompanyLookup, record.contactIndustryLookup,
            record.contactWebsiteLookup, record.contactTagsLookup,
            record.contactAddressLineLookup, record.contactCityLookup,
            record.contactStateLookup, record.contactCountryLookup
        ].contains { $0?.isEmpty == false }

        if hasAny {
            DetailSection(title: "LINKED CONTACT") {
                if let name = record.contactNameLookup, !name.isEmpty {
                    DetailFieldRow(label: "Name", value: name)
                }
                if let email = record.contactEmailLookup, !email.isEmpty {
                    DetailFieldRow(label: "Email", value: email, isLink: true,
                        linkURL: "mailto:\(email)")
                }
                if let phone = record.contactPhoneLookup, !phone.isEmpty {
                    DetailFieldRow(label: "Phone", value: phone, isLink: true,
                        linkURL: "tel:\(phone)")
                }
                if let jobTitle = record.contactJobTitleLookup, !jobTitle.isEmpty {
                    DetailFieldRow(label: "Job Title", value: jobTitle)
                }
                if let company = record.contactCompanyLookup, !company.isEmpty {
                    DetailFieldRow(label: "Company", value: company)
                }
                if let industry = record.contactIndustryLookup, !industry.isEmpty {
                    DetailFieldRow(label: "Industry", value: industry)
                }
                if let website = record.contactWebsiteLookup, !website.isEmpty {
                    DetailFieldRow(label: "Website", value: website, isLink: true,
                        linkURL: website.hasPrefix("http") ? website : "https://\(website)")
                }
                if let tags = record.contactTagsLookup, !tags.isEmpty {
                    DetailFieldRow(label: "Tags", value: tags)
                }
                if hasContactAddressFields {
                    DetailFieldRow(label: "Location", value: contactLocationFormatted)
                }
            }
        }
    }

    // MARK: - Details (metadata, readonly)

    private var detailsSection: some View {
        DetailSection(title: "DETAILS") {
            if let modified = record.airtableModifiedAt {
                DetailFieldRow(label: "Last Modified",
                    value: modified.formatted(date: .abbreviated, time: .shortened))
            }
            if let localMod = record.localModifiedAt {
                DetailFieldRow(label: "Local Modified",
                    value: localMod.formatted(date: .abbreviated, time: .shortened))
            }
            VStack(spacing: 0) {
                HStack {
                    Text(record.id)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .textSelection(.enabled)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 28)
                Divider()
            }
        }
    }

    // MARK: - Save Handler

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "stage": record.stage = str
        case "status": record.status = str
        case "leadSource": record.leadSource = str
        case "servicesInterestedIn":
            record.servicesInterestedIn = str?.components(separatedBy: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty } ?? []
        case "projectBudget":
            if let s = str, let d = Double(s) { record.projectBudget = d }
            else { record.projectBudget = nil }
        case "followUpDate":
            if let s = str {
                record.followUpDate = Self.isoFormatter.date(from: s)
            } else { record.followUpDate = nil }
        case "expectedProjectStartDate":
            if let s = str {
                record.expectedProjectStartDate = Self.isoFormatter.date(from: s)
            } else { record.expectedProjectStartDate = nil }
        case "decisionMaker": record.decisionMaker = str
        case "positionTitle": record.positionTitle = str
        case "phoneNumber": record.phoneNumber = str
        case "website": record.website = str
        case "industry": record.industry = str
        case "address": record.address = str
        case "notes": record.notes = str
        default: break
        }
        record.localModifiedAt = Date()
        record.isPendingPush = true
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
    record.stage = "Lead"
    record.company = "Haus Group"
    record.positionTitle = "Creative Director"
    record.industry = "Real Estate"
    record.website = "https://hauscollection.com"
    record.framerPageUrl = "https://portal.imaginelabstudios.com/haus-collection"
    record.notes = "Premium client portal — showcasing brand identity and web design work."
    record.dateAdded = Calendar.current.date(byAdding: .month, value: -3, to: Date())
    record.projectBudget = 25000
    record.servicesInterestedIn = ["Strategy/Consulting", "Design/Concept Development"]
    record.contactNameLookup = "Jane Doe"
    record.contactEmailLookup = "jane@hauscollection.com"
    record.contactJobTitleLookup = "CEO"

    return PortalAccessDetailView(record: record)
        .frame(width: 500, height: 800)
}
