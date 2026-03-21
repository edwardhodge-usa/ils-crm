import SwiftUI
import SwiftData

/// Portal Access detail view — bento box layout matching the Portal "Proposed Bento" mockup.
///
/// Single ScrollView wrapping:
/// - BentoHeroCard (avatar, name, company subtitle, "View Portal" pill, Sections + Last Login stats)
/// - BentoGrid row 1: Video Sections + Page Sections (toggle indicators)
/// - BentoGrid row 2: Access Details + Activity
struct PortalAccessDetailView: View {
    @Bindable var record: PortalAccessRecord

    @Query private var clientPages: [ClientPage]
    @Query(sort: \PortalLog.timestamp, order: .reverse) private var portalLogs: [PortalLog]

    // MARK: - Computed Properties

    /// Best display name for the record.
    private var displayName: String {
        if let name = record.name, !name.isEmpty { return name }
        if let lookup = record.contactNameLookup, !lookup.isEmpty { return lookup }
        if let email = record.email, !email.isEmpty { return email }
        if let page = record.pageAddress, !page.isEmpty { return page }
        return "Unknown"
    }

    /// Hero subtitle: company name (matching mockup "Las Vegas Raiders").
    private var heroSubtitle: String? {
        if let company = record.company, !company.isEmpty { return company }
        if let lookup = record.contactCompanyLookup, !lookup.isEmpty { return lookup }
        return nil
    }

    /// Linked ClientPage for this record's page address.
    private var linkedClientPage: ClientPage? {
        guard let addr = record.pageAddress else { return nil }
        return clientPages.first { $0.pageAddress == addr }
    }

    /// Count of enabled video section toggles from linked ClientPage.
    private var sectionsCount: Int {
        guard let page = linkedClientPage else { return 0 }
        return [page.vPrMagic, page.vHighLight, page.v360, page.vFullL].filter { $0 }.count
    }

    /// Portal logs matching this record's email.
    private var matchingLogs: [PortalLog] {
        guard let email = record.email ?? record.contactEmailLookup, !email.isEmpty else { return [] }
        let lower = email.lowercased()
        return portalLogs.filter { ($0.clientEmail ?? "").lowercased() == lower }
    }

    /// Days since most recent PortalLog entry, formatted as "Nd" or em dash.
    private var lastLoginDays: String {
        guard let mostRecent = matchingLogs.first?.timestamp else { return "\u{2014}" }
        let days = Calendar.current.dateComponents([.day], from: mostRecent, to: Date()).day ?? 0
        return "\(days)d"
    }

    /// Most recent login date formatted for Activity cell.
    private var lastLoginFormatted: String {
        guard let mostRecent = matchingLogs.first?.timestamp else { return "\u{2014}" }
        return DateFormatter.localizedString(from: mostRecent, dateStyle: .medium, timeStyle: .none)
    }

    /// Total login count.
    private var totalLogins: String {
        let count = matchingLogs.count
        return count > 0 ? "\(count)" : "\u{2014}"
    }

    /// Date added formatted.
    private var dateAddedFormatted: String {
        guard let date = record.dateAdded else { return "\u{2014}" }
        return DateFormatter.localizedString(from: date, dateStyle: .medium, timeStyle: .none)
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
                // Action pill: "View Portal"
                if let pageUrl = record.framerPageUrl, !pageUrl.isEmpty {
                    Button {
                        let urlStr = pageUrl.hasPrefix("http") ? pageUrl : "https://\(pageUrl)"
                        if let url = URL(string: urlStr) {
                            NSWorkspace.shared.open(url)
                        }
                    } label: {
                        BentoPill(text: "View Portal", color: .blue)
                    }
                    .buttonStyle(.plain)
                }
            } stats: {
                BentoHeroStat(value: "\(sectionsCount)", label: "Sections")
                BentoHeroStat(value: lastLoginDays, label: "Last Login")
            }

            // MARK: Row 1 — Video Sections + Page Sections
            BentoGrid(columns: 2) {

                // VIDEO SECTIONS
                BentoCell(title: "Video Sections") {
                    if let page = linkedClientPage {
                        toggleGrid([
                            ("Practical Magic", page.vPrMagic),
                            ("Show Highlights", page.vHighLight),
                            ("360 Videos", page.v360),
                            ("Full Length", page.vFullL),
                        ])
                    } else {
                        Text("No page data")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                }

                // PAGE SECTIONS
                // ClientPage model currently only has video toggles.
                // Show placeholder per mockup structure — these fields
                // will map to Airtable once the schema is extended.
                BentoCell(title: "Page Sections") {
                    Text("No page data")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
            }

            // MARK: Row 2 — Access Details + Activity
            BentoGrid(columns: 2) {

                // ACCESS DETAILS
                BentoCell(title: "Access Details") {
                    VStack(spacing: 0) {
                        // Page Address — shown in accent color as tappable link
                        VStack(spacing: 0) {
                            HStack {
                                Text("Page Address")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                                Spacer()
                                if let addr = record.pageAddress, !addr.isEmpty {
                                    Button {
                                        if let url = URL(string: "https://imaginelabstudios.com/ils-clients/\(addr)") {
                                            NSWorkspace.shared.open(url)
                                        }
                                    } label: {
                                        Text(addr)
                                            .font(.system(size: 13))
                                            .foregroundStyle(Color.accentColor)
                                            .lineLimit(1)
                                    }
                                    .buttonStyle(.plain)
                                } else {
                                    Text("\u{2014}")
                                        .font(.system(size: 13))
                                        .foregroundStyle(.primary)
                                }
                            }
                            .frame(minHeight: 28)
                            Divider()
                        }

                        // Auth Code — masked
                        BentoFieldRow(label: "Auth Code", value: "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}")

                        // Email
                        BentoFieldRow(label: "Email", value: record.email ?? record.contactEmailLookup ?? "\u{2014}")
                    }
                }

                // ACTIVITY
                BentoCell(title: "Activity") {
                    VStack(spacing: 0) {
                        BentoFieldRow(label: "Last Login", value: lastLoginFormatted)
                        BentoFieldRow(label: "Total Logins", value: totalLogins)
                        BentoFieldRow(label: "Created", value: dateAddedFormatted)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Toggle Grid Helper

    /// 2-column grid of display-only toggle indicators matching the mockup style.
    private func toggleGrid(_ items: [(String, Bool)]) -> some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
        ]
        return LazyVGrid(columns: columns, spacing: 6) {
            ForEach(items, id: \.0) { label, isOn in
                HStack(spacing: 4) {
                    Text(label)
                        .font(.system(size: 12))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Spacer(minLength: 2)
                    if isOn {
                        Text("\u{2713} On")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.green)
                    } else {
                        Text("\u{2717} Off")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    let record = PortalAccessRecord(id: "recTest1", name: "Kristen Banks")
    record.pageAddress = "las-vegas-raiders"
    record.email = "kristen@raiders.com"
    record.status = "ACTIVE"
    record.stage = "Client"
    record.company = "Las Vegas Raiders"
    record.framerPageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"
    record.dateAdded = Calendar.current.date(byAdding: .month, value: -2, to: Date())

    return PortalAccessDetailView(record: record)
        .frame(width: 720, height: 600)
}
