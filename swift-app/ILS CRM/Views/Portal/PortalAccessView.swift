import SwiftUI
import SwiftData

/// View mode for portal access records: by client, grouped by page, or all access.
enum PortalViewMode: String, CaseIterable {
    case byClient = "By Client"
    case byPage = "By Page"
    case all = "All Access"
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
    @State private var viewMode: PortalViewMode = .byClient
    @State private var selectedPage: String?
    @State private var selectedAccessRecord: PortalAccessRecord?
    @State private var showGrantAccess = false
    @State private var showDeletePageConfirm = false
    @State private var healthService = FramerHealthService()
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    // MARK: - Filtered Data

    private var filteredRecords: [PortalAccessRecord] {
        if searchText.isEmpty { return records }
        let query = searchText
        return records.filter { record in
            (record.name?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.email?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.pageAddress?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactCompanyLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactNameLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactJobTitleLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
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
                case .byClient:
                    byClientSplitView
                case .byPage:
                    byPageList
                case .all:
                    allSplitView
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search portal access...")
        .navigationTitle("Client Portal")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                portalModeTabs
            }
        }
        .onDisappear {
            healthService.cancelCheck()
        }
    }

    private var portalModeTabs: some View {
        HStack(spacing: 6) {
            ForEach(PortalViewMode.allCases, id: \.self) { mode in
                let isSelected = viewMode == mode

                Button {
                    viewMode = mode
                } label: {
                    Text(mode.rawValue)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(isSelected ? Color.white : Color.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule(style: .continuous)
                                .fill(isSelected ? Color.accentColor : Color.platformControlBackground)
                        )
                        .overlay {
                            if !isSelected {
                                Capsule(style: .continuous)
                                    .strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(
            Capsule(style: .continuous)
                .fill(Color.platformControlBackground)
        )
    }

    // MARK: - All (Split Pane: list | detail)

    private var allSplitView: some View {
        HStack(spacing: 0) {
            List(selection: $selectedRecord) {
                ForEach(filteredRecords, id: \.id) { record in
                    Button {
                        selectedRecord = record
                    } label: {
                        recordRow(record)
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            if selectedRecord?.id == record.id { selectedRecord = nil }
                            revokeAccess(record)
                        } label: {
                            Label("Revoke", systemImage: "xmark.circle")
                        }
                    }
                }
            }
            .listStyle(.inset)
            .frame(minWidth: 300)

            Divider()

            Group {
                if let record = selectedRecord {
                    ScrollView {
                        PortalAccessDetailView(record: record)
                    }
                } else {
                    EmptyStateView(
                        title: "Select a record",
                        description: "Choose a portal access record to view details.",
                        systemImage: "person.crop.rectangle"
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
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

    /// Best display name for a page address — uses ClientPage clientName, or titlecases the slug.
    /// Never returns a person's name (PortalAccessRecord.name is a person, not a page).
    private func pageDisplayName(for pageAddress: String, records: [PortalAccessRecord]) -> String {
        // 1. Try to find a ClientPage record matching this pageAddress
        if let page = clientPage(for: pageAddress),
           let clientName = page.clientName, !clientName.isEmpty {
            return clientName
        }
        // 2. Titlecase the slug: "haus-collection" → "Haus Collection"
        let titleCased = pageAddress
            .split(separator: "-")
            .map { $0.prefix(1).uppercased() + $0.dropFirst() }
            .joined(separator: " ")
        return titleCased.isEmpty ? pageAddress : titleCased
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
                    healthService.startHealthCheck(slugs: allPageAddresses)
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
            .background(Color.platformControlBackground)

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
        .background(Color.platformControlBackground)
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
        let page = clientPage(for: pageAddress)

        return ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                pageHeroCard(pageAddress: pageAddress, pageRecords: pageRecords, page: page)

                if pageAddress != "No Page" && !pageAddress.isEmpty {
                    pageURLBar(pageAddress: pageAddress)
                }

                if let page {
                    BentoGrid(columns: 2) {
                        pageContentCell(page)
                        sectionTogglesCell(page)
                    }
                }

                peopleWithAccessCell(pageAddress: pageAddress, pageRecords: pageRecords)

                // Delete page
                Divider()
                    .padding(.vertical, 4)

                Button(role: .destructive) {
                    showDeletePageConfirm = true
                } label: {
                    Text("Delete Page…")
                        .font(.system(size: 13, weight: .medium))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.red)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .sheet(isPresented: $showGrantAccess) {
            GrantAccessSheet(pageAddress: pageAddress)
        }
        .confirmationDialog(
            "Delete \(pageDisplayName(for: pageAddress, records: pageRecords))?",
            isPresented: $showDeletePageConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete Page and \(pageRecords.count) Access Record\(pageRecords.count == 1 ? "" : "s")", role: .destructive) {
                deletePage(pageAddress: pageAddress, pageRecords: pageRecords, page: page)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently remove the page and all associated access records from Airtable.")
        }
    }

    /// Subtitle for a person row in page detail: email or company.
    private func personSubtitle(for record: PortalAccessRecord) -> String? {
        if let email = record.email ?? record.contactEmailLookup, !email.isEmpty {
            return email
        }
        if let company = record.contactCompanyLookup, !company.isEmpty {
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

    private static let defaultPageTitle = "Capabilities Presentation"
    private static let defaultPageSubtitle = "We've prepared this overview of our capabilities, approach and video examples — please don't hesitate to reach out with any questions."

    private func pageHeroCard(pageAddress: String, pageRecords: [PortalAccessRecord], page: ClientPage?) -> some View {
        HStack(spacing: 14) {
            AvatarView(
                name: pageDisplayName(for: pageAddress, records: pageRecords),
                size: 56,
                shape: .roundedRect
            )

            VStack(alignment: .leading, spacing: 3) {
                Text(pageDisplayName(for: pageAddress, records: pageRecords))
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(1)

                Text(pageAddress)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    BentoPill(text: pageHealthLabel(for: pageAddress), color: pageHealthColor(for: pageAddress))

                    if pageAddress != "No Page" && !pageAddress.isEmpty {
                        Button {
                            openPortalPage(pageAddress)
                        } label: {
                            BentoPill(text: "Open Page", color: .accentColor)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 12)

            HStack(spacing: 16) {
                BentoHeroStat(value: "\(pageRecords.count)", label: "People")
                BentoHeroStat(value: videoSectionSummary(for: page), label: "Videos On")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        }
    }

    private func pageURLBar(pageAddress: String) -> some View {
        HStack(spacing: 10) {
            Text(FramerPortalConfig.displayURL(for: pageAddress))
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .lineLimit(1)

            Spacer()

            Button("Open") {
                openPortalPage(pageAddress)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.small)
        }
        .padding(10)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.primary.opacity(0.08), lineWidth: 1)
        }
    }

    private func pageContentCell(_ page: ClientPage) -> some View {
        BentoCell(title: "Page Content") {
            VStack(alignment: .leading, spacing: 10) {
                BentoTextInput(
                    label: "Page Title",
                    value: page.pageTitle?.trimmedNilIfEmpty ?? Self.defaultPageTitle,
                    onSave: { newValue in
                        page.pageTitle = newValue.trimmedNilIfEmpty
                        markPageDirty(page)
                    }
                )
                BentoTextInput(
                    label: "Subtitle",
                    value: page.pageSubtitle?.trimmedNilIfEmpty ?? Self.defaultPageSubtitle,
                    onSave: { newValue in
                        page.pageSubtitle = newValue.trimmedNilIfEmpty
                        markPageDirty(page)
                    }
                )
                BentoTextInput(
                    label: "Prepared For",
                    value: page.preparedFor?.trimmedNilIfEmpty ?? "Client contact",
                    onSave: { newValue in
                        page.preparedFor = newValue.trimmedNilIfEmpty
                        markPageDirty(page)
                    }
                )
                BentoTextInput(
                    label: "Thank You",
                    value: page.thankYou?.trimmedNilIfEmpty ?? "Closing message",
                    onSave: { newValue in
                        page.thankYou = newValue.trimmedNilIfEmpty
                        markPageDirty(page)
                    }
                )
                BentoTextInput(
                    label: "Deck URL",
                    value: page.deckUrl?.trimmedNilIfEmpty ?? "drive.google.com/...",
                    onSave: { newValue in
                        page.deckUrl = newValue.trimmedNilIfEmpty
                        markPageDirty(page)
                    }
                )
            }
        }
    }

    private func sectionTogglesCell(_ page: ClientPage) -> some View {
        BentoCell(title: "Section Toggles") {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Video Sections")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 18), GridItem(.flexible(), spacing: 18)], spacing: 8) {
                        portalToggle("Practical Magic", binding: portalPageBinding(page, keyPath: \.vPrMagic))
                        portalToggle("Show Highlights", binding: portalPageBinding(page, keyPath: \.vHighLight))
                        portalToggle("360 Videos", binding: portalPageBinding(page, keyPath: \.v360))
                        portalToggle("Full Length", binding: portalPageBinding(page, keyPath: \.vFullL))
                    }
                }

                Divider()

                VStack(alignment: .leading, spacing: 6) {
                    Text("Page Sections")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 18), GridItem(.flexible(), spacing: 18)], spacing: 8) {
                        portalToggle("Header", binding: portalPageBinding(page, keyPath: \.head))
                        portalStaticToggle("Photos", isOn: true)
                        portalStaticToggle("Team", isOn: false)
                        portalStaticToggle("Testimonials", isOn: true)
                    }
                }
            }
        }
    }

    private func peopleWithAccessCell(pageAddress: String, pageRecords: [PortalAccessRecord]) -> some View {
        BentoCell(title: "People With Access (\(pageRecords.count))") {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Invite and manage who can see this portal page.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                    Spacer()

                    Button {
                        showGrantAccess = true
                    } label: {
                        Label("Grant Access", systemImage: "plus.circle")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .buttonStyle(.borderless)
                }
                .padding(.bottom, 8)

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

                                if let subtitle = accessRowSubtitle(for: record, pageAddress: pageAddress) {
                                    Text(subtitle)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }

                            Spacer()

                            if let stage = record.stage, !stage.isEmpty {
                                BentoPill(text: stage, color: stageColor(stage))
                            }

                            if let dateAdded = record.dateAdded {
                                Text(dateAdded.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 48, alignment: .trailing)
                            }

                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    if record.id != pageRecords.last?.id {
                        Divider()
                            .padding(.leading, 44)
                    }
                }
            }
        }
    }

    private func portalToggle(_ title: String, binding: Binding<Bool>) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .lineLimit(1)

            Spacer()

            Toggle("", isOn: binding)
                .toggleStyle(.switch)
                .labelsHidden()
        }
        .frame(minHeight: 30)
    }

    private func portalStaticToggle(_ title: String, isOn: Bool) -> some View {
        HStack(spacing: 8) {
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .lineLimit(1)

            Spacer()

            Circle()
                .fill(isOn ? Color.green : Color.secondary.opacity(0.35))
                .frame(width: 10, height: 10)
        }
        .frame(minHeight: 30)
    }

    private func portalPageBinding(_ page: ClientPage, keyPath: ReferenceWritableKeyPath<ClientPage, Bool>) -> Binding<Bool> {
        Binding(
            get: { page[keyPath: keyPath] },
            set: { newValue in
                page[keyPath: keyPath] = newValue
                markPageDirty(page)
            }
        )
    }

    private func markPageDirty(_ page: ClientPage) {
        page.isPendingPush = true
        page.localModifiedAt = Date()
    }

    private func openPortalPage(_ pageAddress: String) {
        guard let url = FramerPortalConfig.pageURL(for: pageAddress),
              url.scheme == "https",
              url.host == FramerPortalConfig.allowedHost else { return }
        openURL(url)
    }

    private func pageHealthLabel(for pageAddress: String) -> String {
        if healthService.isChecking, healthService.healthMap[pageAddress] == nil {
            return "Checking"
        }

        switch healthService.healthMap[pageAddress] {
        case .some(.live):
            return "Live"
        case .some(.error):
            return "Issue"
        case .some(.unchecked), .none:
            return "Unchecked"
        }
    }

    private func pageHealthColor(for pageAddress: String) -> Color {
        if healthService.isChecking, healthService.healthMap[pageAddress] == nil {
            return .orange
        }

        switch healthService.healthMap[pageAddress] {
        case .some(.live):
            return .green
        case .some(.error):
            return .red
        case .some(.unchecked), .none:
            return .secondary
        }
    }

    private func videoSectionSummary(for page: ClientPage?) -> String {
        guard let page else { return "0/4" }
        let enabled = [page.vPrMagic, page.vHighLight, page.v360, page.vFullL].filter { $0 }.count
        return "\(enabled)/4"
    }

    private func accessRowSubtitle(for record: PortalAccessRecord, pageAddress: String) -> String? {
        let company = record.contactCompanyLookup
        let email = record.email ?? record.contactEmailLookup

        switch (company, email) {
        case let (company?, email?) where !company.isEmpty && !email.isEmpty:
            return "\(company) · \(email)"
        case let (_, email?) where !email.isEmpty:
            return "\(pageDisplayName(for: pageAddress, records: [record])) · \(email)"
        case let (company?, _) where !company.isEmpty:
            return company
        default:
            return nil
        }
    }

    private func revokeAccess(_ record: PortalAccessRecord) {
        syncEngine.trackDeletion(tableId: PortalAccessRecord.airtableTableId, recordId: record.id)
        modelContext.delete(record)
    }

    private func deletePage(pageAddress: String, pageRecords: [PortalAccessRecord], page: ClientPage?) {
        // Cascade: delete all access records for this page
        for record in pageRecords {
            syncEngine.trackDeletion(tableId: PortalAccessRecord.airtableTableId, recordId: record.id)
            modelContext.delete(record)
        }
        // Delete the page itself
        if let page {
            syncEngine.trackDeletion(tableId: ClientPage.airtableTableId, recordId: page.id)
            modelContext.delete(page)
        }
        selectedPage = nil
    }

    // MARK: - By Client (Split Pane: list | detail)

    /// Count of enabled section toggles for a given page address.
    private func sectionCount(for pageAddress: String?) -> Int {
        guard let page = clientPage(for: pageAddress) else { return 0 }
        return [page.vPrMagic, page.vHighLight, page.v360, page.vFullL].filter { $0 }.count
    }

    private var byClientSplitView: some View {
        HStack(spacing: 0) {
            List(selection: $selectedRecord) {
                ForEach(filteredRecords, id: \.id) { record in
                    Button {
                        selectedRecord = record
                    } label: {
                        byClientRow(record)
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            if selectedRecord?.id == record.id { selectedRecord = nil }
                            revokeAccess(record)
                        } label: {
                            Label("Revoke", systemImage: "xmark.circle")
                        }
                    }
                }
            }
            .listStyle(.inset)
            .frame(minWidth: 300)

            Divider()

            Group {
                if let record = selectedRecord {
                    ScrollView {
                        PortalAccessDetailView(record: record)
                    }
                } else {
                    EmptyStateView(
                        title: "Select a record",
                        description: "Choose a portal access record to view details.",
                        systemImage: "person.crop.rectangle"
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    /// Row for By Client mode: name + "Company · N sections" subtitle.
    private func byClientRow(_ record: PortalAccessRecord) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: displayName(for: record), size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(for: record))
                    .font(.body)
                    .lineLimit(1)

                Text(byClientSubtitle(for: record))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
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

    /// Subtitle for By Client row: "Company · N sections".
    ///
    /// `contactCompanyLookup` travels Contact → Companies (a linked field that
    /// itself holds record IDs), so the lookup returns one or more `recXXXXX`
    /// strings rather than display names. Resolve them locally via
    /// `LinkedRecordResolver` so the user sees company names.
    private func byClientSubtitle(for record: PortalAccessRecord) -> String {
        let count = sectionCount(for: record.pageAddress)
        let sectionsLabel = "\(count) section\(count == 1 ? "" : "s")"
        let company = resolvedCompanyName(for: record)
        if company.isEmpty {
            return sectionsLabel
        }
        return "\(company) \u{00B7} \(sectionsLabel)"
    }

    /// Resolve `contactCompanyLookup` to display names. Handles three cases:
    /// 1. nil / empty → ""
    /// 2. Comma-joined record IDs (Airtable lookup of a linked field) → resolve via Companies
    /// 3. Plain text already a name → pass through unchanged
    private func resolvedCompanyName(for record: PortalAccessRecord) -> String {
        guard let raw = record.contactCompanyLookup?.trimmingCharacters(in: .whitespaces),
              !raw.isEmpty else { return "" }

        let parts = raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        let recordIDs = parts.filter { $0.hasPrefix("rec") && $0.count > 3 }

        // No record-ID-shaped tokens → assume already-resolved text, pass through.
        guard !recordIDs.isEmpty else { return raw }

        let resolver = LinkedRecordResolver(context: modelContext)
        let names = resolver.resolveCompanies(ids: recordIDs)
        if names.isEmpty {
            // Resolver couldn't match (records not synced yet) — fall back to raw
            // so we don't show empty subtitle, but raw IDs is the documented bug.
            return ""
        }
        return names.joined(separator: ", ")
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
        if let company = record.contactCompanyLookup, !company.isEmpty {
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

private extension String {
    var trimmedNilIfEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

// MARK: - Preview

#Preview {
    let container = PortalPreviewData.makePortalAccessContainer()

    return NavigationStack {
        PortalAccessView()
    }
    .modelContainer(container)
    .environment(SyncEngine(modelContainer: container))
}

@MainActor
private enum PortalPreviewData {
    static func makePortalAccessContainer() -> ModelContainer {
        let schema = Schema([
            PortalAccessRecord.self,
            ClientPage.self,
            PortalLog.self,
            Contact.self,
            Company.self,
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [configuration])
        let context = container.mainContext

        let page = ClientPage(id: "page_lvr")
        page.pageAddress = "las-vegas-raiders"
        page.clientName = "Las Vegas Raiders"
        page.pageTitle = "We've prepared this overview of our capabilities, approach and video examples."
        page.pageSubtitle = "Your Vision, Our Expertise"
        page.preparedFor = "Kristen Banks, VP Operations"
        page.thankYou = "Thank you for considering ImagineLab Studios."
        page.deckUrl = "drive.google.com/raiders-deck"
        page.head = true
        page.vPrMagic = true
        page.vHighLight = true
        page.v360 = false
        page.vFullL = true

        let kristen = PortalAccessRecord(id: "access_kristen", name: "Kristen Banks")
        kristen.pageAddress = "las-vegas-raiders"
        kristen.email = "kristen@raiders.com"
        kristen.status = "ACTIVE"
        kristen.stage = "Client"
        kristen.dateAdded = Calendar.current.date(byAdding: .day, value: -48, to: Date())
        kristen.framerPageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"

        let murph = PortalAccessRecord(id: "access_murph", name: "Murph")
        murph.pageAddress = "las-vegas-raiders"
        murph.email = "murph@raiders.com"
        murph.status = "ACTIVE"
        murph.stage = "Client"
        murph.dateAdded = Calendar.current.date(byAdding: .day, value: -12, to: Date())
        murph.framerPageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"

        let blackstonePage = ClientPage(id: "page_blackstone")
        blackstonePage.pageAddress = "blackstone-group"
        blackstonePage.clientName = "Blackstone Group"
        blackstonePage.pageTitle = "A private portal overview tailored for Blackstone."
        blackstonePage.vPrMagic = true

        let blackstone = PortalAccessRecord(id: "access_blackstone", name: "Jordan Lee")
        blackstone.pageAddress = "blackstone-group"
        blackstone.email = "jordan@blackstone.com"
        blackstone.status = "ACTIVE"
        blackstone.stage = "Prospect"
        blackstone.dateAdded = Calendar.current.date(byAdding: .day, value: -6, to: Date())

        let log1 = PortalLog(id: "log_1")
        log1.clientName = "Kristen Banks"
        log1.clientEmail = "kristen@raiders.com"
        log1.company = "Las Vegas Raiders"
        log1.pageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"
        log1.timestamp = Calendar.current.date(byAdding: .day, value: -1, to: Date())

        let log2 = PortalLog(id: "log_2")
        log2.clientName = "Murph"
        log2.clientEmail = "murph@raiders.com"
        log2.company = "Las Vegas Raiders"
        log2.pageUrl = "https://imaginelabstudios.com/ils-clients/las-vegas-raiders"
        log2.timestamp = Calendar.current.date(byAdding: .day, value: -3, to: Date())

        context.insert(page)
        context.insert(kristen)
        context.insert(murph)
        context.insert(blackstonePage)
        context.insert(blackstone)
        context.insert(log1)
        context.insert(log2)

        return container
    }
}
