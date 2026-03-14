import SwiftUI
import SwiftData

/// View mode for portal access records: flat list, grouped by page, or grouped by person.
enum PortalViewMode: String, CaseIterable {
    case all = "All"
    case byPage = "By Page"
    case byPerson = "By Person"
}

/// Portal Access list with three viewing modes: All (flat list),
/// By Page (grouped by page address), and By Person (grouped by email).
///
/// Mirrors the Electron Portal Access page with the same "By Page" /
/// "By Person" tab views.
struct PortalAccessView: View {
    @Query(sort: \PortalAccessRecord.name) private var records: [PortalAccessRecord]
    @Query private var clientPages: [ClientPage]
    @State private var searchText = ""
    @State private var selectedRecord: PortalAccessRecord?
    @State private var viewMode: PortalViewMode = .all
    @State private var selectedPage: String?
    @State private var selectedAccessRecord: PortalAccessRecord?
    @State private var showGrantAccess = false
    @State private var healthService = FramerHealthService()

    // MARK: - Filtered Data

    private var filteredRecords: [PortalAccessRecord] {
        if searchText.isEmpty { return records }
        let query = searchText
        return records.filter { record in
            (record.name?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.email?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.pageAddress?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.company?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactNameLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactCompanyLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactEmailLookup?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if records.isEmpty {
                EmptyStateView(
                    title: "No portal access records",
                    description: "Portal access records will appear here once synced from Airtable.",
                    systemImage: "globe"
                )
            } else if filteredRecords.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No portal access records match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                switch viewMode {
                case .all:
                    recordList
                case .byPage:
                    byPageList
                case .byPerson:
                    byPersonList
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search portal access...")
        .navigationTitle("Client Portal")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Picker("View", selection: $viewMode) {
                    ForEach(PortalViewMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 240)
            }
        }
        .sheet(item: $selectedRecord) { record in
            PortalAccessDetailView(record: record)
                .frame(minWidth: 480, minHeight: 600)
        }
    }

    // MARK: - Record List

    private var recordList: some View {
        List {
            ForEach(filteredRecords, id: \.id) { record in
                Button {
                    selectedRecord = record
                } label: {
                    recordRow(record)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.inset)
    }

    // MARK: - By Page (Dual-Pane)

    /// Color palette for page dots — deterministic by index.
    private static let pageDotColors: [Color] = [
        .blue, .green, .orange, .purple, .red, .teal, .pink, .indigo
    ]

    private var byPageList: some View {
        HStack(spacing: 0) {
            pageListSidebar
                .frame(width: 260)
            Divider()
            pageDetailPane
        }
        .sheet(item: $selectedAccessRecord) { record in
            PortalAccessDetailView(record: record)
                .frame(minWidth: 480, minHeight: 600)
        }
    }

    /// Grouped page data derived from filteredRecords.
    private var groupedByPage: [(pageAddress: String, records: [PortalAccessRecord])] {
        let grouped = Dictionary(grouping: filteredRecords) { $0.pageAddress ?? "No Page" }
        return grouped.keys
            .sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
            .map { (pageAddress: $0, records: grouped[$0] ?? []) }
    }

    /// Best display name for a page address — first record's name or company, else pageAddress.
    private func pageDisplayName(for pageAddress: String, records: [PortalAccessRecord]) -> String {
        if let first = records.first {
            if let name = first.name, !name.isEmpty { return name }
            if let company = first.company, !company.isEmpty { return company }
            if let lookup = first.contactNameLookup, !lookup.isEmpty { return lookup }
            if let companyLookup = first.contactCompanyLookup, !companyLookup.isEmpty { return companyLookup }
        }
        return pageAddress
    }

    // MARK: - Page List Sidebar

    private var pageListSidebar: some View {
        VStack(spacing: 0) {
            // Health summary bar
            HStack(spacing: 8) {
                if healthService.isChecking {
                    ProgressView()
                        .controlSize(.small)
                    Text("Checking...")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                } else if !healthService.healthMap.isEmpty {
                    Circle().fill(.green).frame(width: 6, height: 6)
                    Text("\(healthService.liveCount) Live")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Circle().fill(.red).frame(width: 6, height: 6)
                    Text("\(healthService.errorCount) Error")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    Task { await healthService.checkHealth(slugs: allPageAddresses) }
                } label: {
                    Label("Check Health", systemImage: "heart.text.square")
                        .font(.system(size: 11))
                }
                .buttonStyle(.borderless)
                .controlSize(.small)
                .disabled(healthService.isChecking)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(nsColor: .controlBackgroundColor))

            Divider()

            ScrollView {
                VStack(spacing: 1) {
                    ForEach(Array(groupedByPage.enumerated()), id: \.element.pageAddress) { index, group in
                        let isSelected = selectedPage == group.pageAddress
                        let dotColor = Self.pageDotColors[index % Self.pageDotColors.count]

                        Button {
                            selectedPage = group.pageAddress
                        } label: {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(dotColor)
                                    .frame(width: 8, height: 8)

                                Text(pageDisplayName(for: group.pageAddress, records: group.records))
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(isSelected ? .white : .primary)
                                    .lineLimit(1)

                                Spacer()

                                // Health status dot
                                Circle()
                                    .fill(healthDotColor(for: group.pageAddress))
                                    .frame(width: 8, height: 8)
                                    .help(healthService.healthMap[group.pageAddress]?.rawValue.capitalized ?? "Unchecked")

                                Text("\(group.records.count)")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(isSelected ? .white.opacity(0.85) : .secondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(
                                        Capsule()
                                            .fill(isSelected ? Color.white.opacity(0.2) : Color.secondary.opacity(0.12))
                                    )
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(isSelected ? Color.accentColor : Color.clear)
                            )
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("page_\(group.pageAddress)")
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }

            Divider()

            Text("\(groupedByPage.count) Pages")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
        }
        .background(Color(nsColor: .controlBackgroundColor))
    }

    // MARK: - Page Detail Pane

    private var pageDetailPane: some View {
        Group {
            if let page = selectedPage {
                let pageRecords = filteredRecords.filter { ($0.pageAddress ?? "No Page") == page }
                if pageRecords.isEmpty {
                    EmptyStateView(
                        title: "No records",
                        description: "No access records match the current search for this page.",
                        systemImage: "doc.text"
                    )
                } else {
                    pageDetailContent(pageAddress: page, pageRecords: pageRecords)
                }
            } else {
                EmptyStateView(
                    title: "Select a page",
                    description: "Choose a page to view access details.",
                    systemImage: "doc.text"
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func pageDetailContent(pageAddress: String, pageRecords: [PortalAccessRecord]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 4) {
                Text(pageDisplayName(for: pageAddress, records: pageRecords))
                    .font(.system(size: 15, weight: .bold))
                Text(pageAddress)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider()

            // URL bar + Page fields + Section toggles + Access records
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // URL Bar
                    if pageAddress != "No Page" && !pageAddress.isEmpty {
                        HStack {
                            Text("imaginelabstudios.com/ils-clients/\(pageAddress)")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            Spacer()
                            Button("Open") {
                                if let url = URL(string: "https://imaginelabstudios.com/ils-clients/\(pageAddress)") {
                                    NSWorkspace.shared.open(url)
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                        }
                        .padding(10)
                        .background(Color(nsColor: .controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal, 16)
                        .padding(.top, 12)
                        .padding(.bottom, 12)
                    }

                    // Page fields + Section toggles (only if ClientPage record exists)
                    if let page = clientPage(for: pageAddress) {
                        VStack(alignment: .leading, spacing: 0) {
                            // Client Name + Subtitle
                            if let name = page.clientName, !name.isEmpty {
                                fieldRow("Client Name", value: name)
                                    .padding(.horizontal, 16)
                            }
                            if let subtitle = page.pageSubtitle, !subtitle.isEmpty {
                                fieldRow("Subtitle", value: subtitle)
                                    .padding(.horizontal, 16)
                            }
                        }
                        .padding(.bottom, 8)

                        // Form box with page fields
                        VStack(spacing: 0) {
                            if let addr = page.pageAddress {
                                formRow("Page Address", value: addr)
                            }
                            if let deck = page.deckUrl, !deck.isEmpty {
                                formRow("Deck URL", value: deck, isLink: true)
                            }
                            if let prep = page.preparedFor, !prep.isEmpty {
                                formRow("Prepared For", value: prep)
                            }
                            if let ty = page.thankYou, !ty.isEmpty {
                                formRow("Thank You", value: ty)
                            }
                        }
                        .background(Color(nsColor: .controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)

                        // Section toggles
                        VStack(alignment: .leading, spacing: 8) {
                            Text("PAGE SECTIONS")
                                .font(.system(size: 11, weight: .bold))
                                .tracking(0.5)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 8) {
                                sectionDot("Header", isOn: page.head)
                                sectionDot("Practical Magic", isOn: page.vPrMagic)
                                sectionDot("Highlights", isOn: page.vHighLight)
                                sectionDot("360 Video", isOn: page.v360)
                                sectionDot("Full Length", isOn: page.vFullL)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                        .padding(.bottom, 12)
                    }

                    // Section header + Grant Access button
                    HStack {
                        Text("PEOPLE WITH ACCESS (\(pageRecords.count))")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(0.5)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)

                        Spacer()

                        Button {
                            showGrantAccess = true
                        } label: {
                            Label("Grant Access", systemImage: "person.badge.plus")
                                .font(.system(size: 11))
                        }
                        .buttonStyle(.borderless)
                        .controlSize(.small)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 8)
                    .sheet(isPresented: $showGrantAccess) {
                        GrantAccessSheet(pageAddress: pageAddress)
                    }

                    // Access records list
                    VStack(spacing: 0) {
                        ForEach(pageRecords, id: \.id) { record in
                            Button {
                                selectedAccessRecord = record
                            } label: {
                                HStack(spacing: 10) {
                                    AvatarView(name: displayName(for: record), avatarSize: .small)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(displayName(for: record))
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundStyle(.primary)
                                            .lineLimit(1)

                                        if let subtitle = personSubtitle(for: record) {
                                            Text(subtitle)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }
                                    }

                                    Spacer()

                                    if let stage = record.stage, !stage.isEmpty {
                                        StatusBadge(text: stage, color: stageColor(stage))
                                    }

                                    if let dateAdded = record.dateAdded {
                                        Text(dateAdded.formatted(date: .abbreviated, time: .omitted))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            Divider()
                                .padding(.leading, 54)
                        }
                    }
                }
            }
        }
    }

    /// Subtitle for a person row in page detail: email or company.
    private func personSubtitle(for record: PortalAccessRecord) -> String? {
        if let email = record.email ?? record.contactEmailLookup, !email.isEmpty {
            return email
        }
        if let company = record.company ?? record.contactCompanyLookup, !company.isEmpty {
            return company
        }
        return nil
    }

    /// Stage color for badges in detail pane.
    private func stageColor(_ stage: String) -> Color {
        let lower = stage.lowercased()
        if lower.contains("live") { return .green }
        if lower.contains("build") || lower.contains("design") { return .blue }
        if lower.contains("onboard") { return .teal }
        if lower.contains("prospect") || lower.contains("lead") { return .orange }
        if lower.contains("closed") || lower.contains("lost") { return .red }
        return .secondary
    }

    // MARK: - Client Page Lookup

    private func clientPage(for address: String?) -> ClientPage? {
        guard let addr = address else { return nil }
        return clientPages.first { $0.pageAddress == addr }
    }

    // MARK: - Page Field Helpers

    @ViewBuilder
    private func fieldRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func formRow(_ label: String, value: String, isLink: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Spacer()
            if isLink, let url = URL(string: value.hasPrefix("http") ? value : "https://\(value)") {
                Link(value, destination: url)
                    .font(.system(size: 13))
            } else {
                Text(value)
                    .font(.system(size: 13))
                    .foregroundStyle(.primary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Divider().padding(.leading, 12)
        }
    }

    @ViewBuilder
    private func sectionDot(_ label: String, isOn: Bool) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isOn ? Color.green : Color(nsColor: .tertiaryLabelColor))
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(isOn ? .primary : .secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(Capsule())
    }

    // MARK: - By Person List

    private var byPersonList: some View {
        let grouped = Dictionary(grouping: filteredRecords) { record in
            record.email ?? record.contactEmailLookup ?? "No Email"
        }
        let sortedKeys = grouped.keys.sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }

        return List {
            ForEach(sortedKeys, id: \.self) { email in
                let records = grouped[email] ?? []
                let bestName = records.first.map { displayName(for: $0) } ?? email

                Section {
                    ForEach(records, id: \.id) { record in
                        Button { selectedRecord = record } label: { recordRow(record) }
                            .buttonStyle(.plain)
                    }
                } header: {
                    HStack {
                        Image(systemName: "person")
                        VStack(alignment: .leading) {
                            Text(bestName)
                            if email != "No Email" {
                                Text(email)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        Text("\(records.count)")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .listStyle(.inset)
    }

    // MARK: - Record Row

    private func recordRow(_ record: PortalAccessRecord) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: displayName(for: record), size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(for: record))
                    .font(.body)
                    .lineLimit(1)

                if let subtitle = rowSubtitle(for: record) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let status = record.status, !status.isEmpty {
                BadgeView(
                    text: status,
                    color: statusColor(status)
                )
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    /// Best display name: direct name, then contact lookup, then email, then page address.
    private func displayName(for record: PortalAccessRecord) -> String {
        if let name = record.name, !name.isEmpty { return name }
        if let lookup = record.contactNameLookup, !lookup.isEmpty { return lookup }
        if let email = record.email, !email.isEmpty { return email }
        if let page = record.pageAddress, !page.isEmpty { return page }
        return "Unknown"
    }

    /// Subtitle: page address if name exists, otherwise email or company.
    private func rowSubtitle(for record: PortalAccessRecord) -> String? {
        if let page = record.pageAddress, !page.isEmpty {
            return page
        }
        if let email = record.email ?? record.contactEmailLookup, !email.isEmpty {
            return email
        }
        if let company = record.company ?? record.contactCompanyLookup, !company.isEmpty {
            return company
        }
        return nil
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

    // MARK: - Health Helpers

    /// All unique page addresses from records (for health checking).
    private var allPageAddresses: [String] {
        let addresses = Set(filteredRecords.compactMap { $0.pageAddress }.filter { !$0.isEmpty })
        return Array(addresses).sorted()
    }

    /// Color for a health status dot.
    private func healthDotColor(for slug: String) -> Color {
        switch healthService.healthMap[slug] {
        case .live: return .green
        case .error: return .red
        case .unchecked, .none: return .gray
        }
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

    return NavigationStack {
        PortalAccessView()
    }
    .modelContainer(for: [PortalAccessRecord.self, ClientPage.self], inMemory: true)
}
