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

    private var portalPageURL: String? {
        guard let addr = record.pageAddress, !addr.isEmpty else { return nil }
        return FramerPortalConfig.pageURL(for: addr)?.absoluteString
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
                            openURL(url)
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

            detailRow(videoSectionsCell, pageSectionsCell)
            detailRow(accessDetailsCell, activityCell)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var videoSectionsCell: some View {
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
    }

    private var pageSectionsCell: some View {
        BentoCell(title: "Page Sections") {
            VStack(alignment: .leading, spacing: 8) {
                Text("Additional page sections are not yet modeled in SwiftData.")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)

                if let portalPageURL {
                    Button {
                        openRawURL(portalPageURL)
                    } label: {
                        Label("Open Portal Page", systemImage: "arrow.up.right.square")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(.borderless)
                }
            }
        }
    }

    private var accessDetailsCell: some View {
        BentoCell(title: "Access Details") {
            VStack(spacing: 0) {
                DetailFieldRow(
                    label: "Page Address",
                    value: record.pageAddress ?? "\u{2014}",
                    isLink: portalPageURL != nil,
                    linkURL: portalPageURL
                )
                BentoFieldRow(label: "Auth Code", value: "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}")
                DetailFieldRow(
                    label: "Email",
                    value: record.email ?? record.contactEmailLookup ?? "\u{2014}",
                    isLink: (record.email ?? record.contactEmailLookup)?.isEmpty == false,
                    linkURL: (record.email ?? record.contactEmailLookup).map { "mailto:\($0)" }
                )
            }
        }
    }

    private var activityCell: some View {
        BentoCell(title: "Activity") {
            VStack(spacing: 0) {
                DetailFieldRow(label: "Last Login", value: lastLoginFormatted)
                DetailFieldRow(label: "Total Logins", value: totalLogins)
                DetailFieldRow(label: "Created", value: dateAddedFormatted)
            }
        }
    }

    private func detailRow<Leading: View, Trailing: View>(
        _ leading: Leading,
        _ trailing: Trailing
    ) -> some View {
        HStack(alignment: .top, spacing: 10) {
            leading
                .frame(maxWidth: .infinity, alignment: .topLeading)
            trailing
                .frame(maxWidth: .infinity, alignment: .topLeading)
        }
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

    private func openRawURL(_ rawValue: String) {
        guard let url = URL(string: rawValue) else { return }
        openURL(url)
    }
}

// MARK: - Preview

#Preview {
    let container = PortalAccessDetailPreviewData.makeContainer()
    let descriptor = FetchDescriptor<PortalAccessRecord>()
    let record = try! container.mainContext.fetch(descriptor).first!

    return PortalAccessDetailView(record: record)
        .frame(width: 720, height: 600)
        .modelContainer(container)
}

@MainActor
private enum PortalAccessDetailPreviewData {
    static func makeContainer() -> ModelContainer {
        let schema = Schema([
            PortalAccessRecord.self,
            ClientPage.self,
            PortalLog.self,
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [configuration])
        let context = container.mainContext

        let page = ClientPage(id: "page_lvr")
        page.pageAddress = "las-vegas-raiders"
        page.clientName = "Las Vegas Raiders"
        page.vPrMagic = true
        page.vHighLight = true
        page.v360 = false
        page.vFullL = true

        let record = PortalAccessRecord(id: "recTest1", name: "Kristen Banks")
        record.pageAddress = "las-vegas-raiders"
        record.email = "kristen@raiders.com"
        record.status = "ACTIVE"
        record.stage = "Client"
        record.framerPageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"
        record.dateAdded = Calendar.current.date(byAdding: .month, value: -2, to: Date())

        let log = PortalLog(id: "portal_log_1")
        log.clientName = "Kristen Banks"
        log.clientEmail = "kristen@raiders.com"
        log.company = "Las Vegas Raiders"
        log.pageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"
        log.timestamp = Calendar.current.date(byAdding: .day, value: -2, to: Date())

        context.insert(page)
        context.insert(record)
        context.insert(log)

        return container
    }
}
