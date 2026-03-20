import SwiftUI
import SwiftData

/// Portal Access detail view — bento box layout.
///
/// Single ScrollView wrapping:
/// - BentoHeroCard (avatar, name, subtitle, action pills, stats)
/// - BentoGrid row 1: Access Status + Portal & Business
/// - BentoGrid row 2: Key Dates + Notes
/// - Conditional: Linked Contact cell
struct PortalAccessDetailView: View {
    @Bindable var record: PortalAccessRecord

    @Query private var clientPages: [ClientPage]

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    // MARK: - Computed Properties

    /// Best display name for the record.
    private var displayName: String {
        if let name = record.name, !name.isEmpty { return name }
        if let lookup = record.contactNameLookup, !lookup.isEmpty { return lookup }
        if let email = record.email, !email.isEmpty { return email }
        if let page = record.pageAddress, !page.isEmpty { return page }
        return "Unknown"
    }

    /// Hero subtitle: "Position · Company" or just one
    private var heroSubtitle: String? {
        let parts = [record.positionTitle, record.company].compactMap { $0 }.filter { !$0.isEmpty }
        if parts.isEmpty { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    /// Days active since dateAdded.
    private var daysActive: String {
        guard let dateAdded = record.dateAdded else { return "\u{2014}" }
        let days = Calendar.current.dateComponents([.day], from: dateAdded, to: Date()).day ?? 0
        return "\(days)"
    }

    /// Count of enabled video sections from linked ClientPage.
    private var sectionsCount: String {
        guard let addr = record.pageAddress,
              let page = clientPages.first(where: { $0.pageAddress == addr }) else {
            return "\u{2014}"
        }
        let count = [page.head, page.vPrMagic, page.vHighLight, page.v360, page.vFullL]
            .filter { $0 }
            .count
        return "\(count)"
    }

    /// Formatted project budget as currency.
    private var formattedBudget: String {
        guard let budget = record.projectBudget, budget > 0 else { return "\u{2014}" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: budget)) ?? "$\(Int(budget))"
    }

    /// Stage color for pills.
    private func stageColor(_ stage: String) -> Color {
        let lower = stage.lowercased()
        if lower.contains("client") { return .green }
        if lower.contains("lead") { return .orange }
        if lower.contains("prospect") { return .blue }
        if lower.contains("partner") { return .teal }
        if lower.contains("past") { return .red }
        return .secondary
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
        if upper.contains("PENDING") { return .orange }
        if upper.contains("EXPIRED") { return .yellow }
        if upper.contains("REVOKED") { return .red }
        return .secondary
    }

    /// Whether any contact lookup fields are populated.
    private var hasContactLookupData: Bool {
        let fields: [String?] = [
            record.contactNameLookup, record.contactEmailLookup,
            record.contactPhoneLookup, record.contactJobTitleLookup,
            record.contactCompanyLookup, record.contactIndustryLookup,
            record.contactWebsiteLookup, record.contactTagsLookup,
            record.contactAddressLineLookup, record.contactCityLookup,
            record.contactStateLookup, record.contactCountryLookup
        ]
        return fields.contains { $0?.isEmpty == false }
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

    // MARK: - Body

    var body: some View {
        VStack(spacing: 10) {

            // MARK: Hero Card
                BentoHeroCard(
                    name: displayName,
                    subtitle: heroSubtitle,
                    avatarSize: 56,
                    avatarShape: .circle
                ) {
                    // Action pills
                    if let email = record.email, !email.isEmpty {
                        Button {
                            if let url = URL(string: "mailto:\(email)") {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            BentoPill(text: "Email", color: .accentColor)
                        }
                        .buttonStyle(.plain)
                    }

                    if let pageUrl = record.framerPageUrl, !pageUrl.isEmpty {
                        Button {
                            let urlStr = pageUrl.hasPrefix("http") ? pageUrl : "https://\(pageUrl)"
                            if let url = URL(string: urlStr) {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            BentoPill(text: "Portal", color: .green)
                        }
                        .buttonStyle(.plain)
                    }
                } stats: {
                    BentoHeroStat(value: daysActive, label: "Days Active")
                    BentoHeroStat(value: sectionsCount, label: "Sections")
                    BentoHeroStat(value: formattedBudget, label: "Budget")
                }

                // MARK: Grid Row 1 — Access Status + Portal & Business
                BentoGrid(columns: 2) {

                    // ACCESS STATUS
                    BentoCell(title: "Access Status") {
                        VStack(alignment: .leading, spacing: 8) {

                            // Stage + Status pills
                            HStack(spacing: 6) {
                                if let stage = record.stage, !stage.isEmpty {
                                    BentoPill(text: stage, color: stageColor(stage))
                                }
                                if let status = record.status, !status.isEmpty {
                                    BentoPill(text: status, color: statusColor(status))
                                }
                            }

                            Divider()

                            VStack(spacing: 0) {
                                BentoFieldRow(label: "Lead Source", value: record.leadSource ?? "")
                                BentoFieldRow(label: "Decision Maker", value: record.decisionMaker ?? "")
                                BentoFieldRow(
                                    label: "Services",
                                    value: record.servicesInterestedIn.isEmpty
                                        ? ""
                                        : record.servicesInterestedIn.joined(separator: ", ")
                                )
                            }
                        }
                    }

                    // PORTAL & BUSINESS
                    BentoCell(title: "Portal & Business") {
                        VStack(spacing: 0) {
                            BentoFieldRow(label: "Page Address", value: record.pageAddress ?? "")
                            BentoFieldRow(label: "Website", value: record.website ?? "")
                            BentoFieldRow(label: "Phone", value: record.phoneNumber ?? "")
                            BentoFieldRow(label: "Industry", value: record.industry ?? "")
                        }
                    }
                }

                // MARK: Grid Row 2 — Key Dates + Notes
                BentoGrid(columns: 2) {

                    // KEY DATES
                    BentoCell(title: "Key Dates") {
                        VStack(spacing: 0) {
                            BentoFieldRow(
                                label: "Date Added",
                                value: record.dateAdded.map {
                                    DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .none)
                                } ?? ""
                            )

                            EditableFieldRow(
                                label: "Follow Up",
                                key: "followUpDate",
                                type: .date,
                                value: record.followUpDate.map { Self.isoFormatter.string(from: $0) },
                                onSave: saveField
                            )

                            EditableFieldRow(
                                label: "Expected Start",
                                key: "expectedProjectStartDate",
                                type: .date,
                                value: record.expectedProjectStartDate.map { Self.isoFormatter.string(from: $0) },
                                onSave: saveField
                            )
                        }
                    }

                    // NOTES
                    BentoCell(title: "Notes") {
                        VStack(alignment: .leading, spacing: 8) {
                            EditableFieldRow(
                                label: "",
                                key: "notes",
                                type: .textarea,
                                value: record.notes,
                                onSave: saveField
                            )
                        }
                    }
                }

                // MARK: Conditional — Linked Contact
                if hasContactLookupData {
                    BentoCell(title: "Linked Contact") {
                        VStack(spacing: 0) {
                            if let name = record.contactNameLookup, !name.isEmpty {
                                BentoFieldRow(label: "Name", value: name)
                            }
                            if let email = record.contactEmailLookup, !email.isEmpty {
                                BentoFieldRow(label: "Email", value: email)
                            }
                            if let phone = record.contactPhoneLookup, !phone.isEmpty {
                                BentoFieldRow(label: "Phone", value: phone)
                            }
                            if let jobTitle = record.contactJobTitleLookup, !jobTitle.isEmpty {
                                BentoFieldRow(label: "Job Title", value: jobTitle)
                            }
                            if let company = record.contactCompanyLookup, !company.isEmpty {
                                BentoFieldRow(label: "Company", value: company)
                            }
                            if let industry = record.contactIndustryLookup, !industry.isEmpty {
                                BentoFieldRow(label: "Industry", value: industry)
                            }
                            if let website = record.contactWebsiteLookup, !website.isEmpty {
                                BentoFieldRow(label: "Website", value: website)
                            }
                            if let tags = record.contactTagsLookup, !tags.isEmpty {
                                BentoFieldRow(label: "Tags", value: tags)
                            }
                            if hasContactAddressFields {
                                BentoFieldRow(label: "Location", value: contactLocationFormatted)
                            }
                        }
                    }
                }

        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
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
        .frame(width: 720, height: 600)
}
