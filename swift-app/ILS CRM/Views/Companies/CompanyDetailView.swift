import SwiftUI
import SwiftData

/// Company detail pane — Bento Box layout matching approved mockup.
///
/// Layout:
/// - BentoHeroCard: logo avatar (roundedRect 56px) + name + "Industry · Location" subtitle
///   + Website pill + Call pill + People/Active Deal/Pipeline stats
/// - BentoGrid (2 columns) Row 1: PEOPLE cell (avatar rows) + ACTIVE DEAL cell
/// - BentoGrid (2 columns) Row 2: COMPANY DETAILS cell + LOCATION & CONTACT cell
/// - Edit / Delete in toolbar
struct CompanyDetailView: View {
    let company: Company
    let allContacts: [Contact]
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @State private var isUploadingLogo = false
    @State private var showingContactsPicker = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingProjectsPicker = false
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @Query private var allOpportunities: [Opportunity]

    // MARK: - Derived data

    private var linkedContacts: [Contact] {
        allContacts.filter { company.contactsIds.contains($0.id) }
    }

    private var openOpportunities: [Opportunity] {
        allOpportunities.filter {
            $0.companyIds.contains(company.id) && isOpenStage($0.salesStage)
        }
    }

    private var locationSubtitle: String {
        let parts: [String] = [company.city, company.stateRegion, company.country]
            .compactMap { $0?.isEmpty == false ? $0 : nil }
        return parts.joined(separator: ", ")
    }

    private var websiteURL: String? {
        guard let w = company.website, !w.isEmpty else { return nil }
        return w.contains("://") ? w : "https://\(w)"
    }

    /// Pipeline display: sum of open opportunity dealValues, formatted as abbreviated currency.
    private var pipelineDisplay: String {
        let total = openOpportunities.compactMap(\.dealValue).reduce(0, +)
        guard total > 0 else { return "\u{2014}" }
        return abbreviatedCurrency(total)
    }

    private var resolvedProjectNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProjects(ids: company.projectsIds)
    }

    private var resolvedOpportunityNames: [String] {
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveOpportunities(ids: company.salesOpportunitiesIds)
    }

    /// Hero subtitle: "Industry · City, State" or either part alone
    private var heroSubtitle: String? {
        let industry = company.industry?.isEmpty == false ? company.industry : nil
        let location = locationSubtitle.isEmpty ? nil : locationSubtitle
        let parts = [industry, location].compactMap { $0 }
        if parts.isEmpty { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    /// Notes text — prefer `notes`, fall back to `companyDescription`
    private var notesText: String {
        if let notes = company.notes, !notes.isEmpty { return notes }
        if let desc = company.companyDescription, !desc.isEmpty { return desc }
        return ""
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {

                // MARK: Hero Card
                HStack(spacing: 14) {
                    EditableAvatarView(
                        name: company.companyName ?? "?",
                        size: 56,
                        photoURL: company.logoUrl.flatMap { URL(string: $0) },
                        shape: .roundedRect,
                        isUploading: isUploadingLogo,
                        websiteDomain: company.website,
                        onPhotoSelected: { data in uploadCompanyLogo(data) },
                        onPhotoRemoved: { removeCompanyLogo() }
                    )
                    .id(company.logoUrl)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(company.companyName ?? "Unknown")
                            .font(.system(size: 16, weight: .semibold))
                            .lineLimit(1)

                        if let subtitle = heroSubtitle {
                            Text(subtitle)
                                .font(.system(size: 12, weight: .regular))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }

                        // Action pills
                        HStack(spacing: 6) {
                            if let url = websiteURL, let displayWeb = company.website {
                                Button {
                                    if let u = URL(string: url) {
                                        NSWorkspace.shared.open(u)
                                    }
                                } label: {
                                    BentoPill(text: "Website", color: .blue)
                                }
                                .buttonStyle(.plain)
                                .help(displayWeb)
                            }

                            // Call pill — opens tel: URL
                            if let phone = companyPhone, !phone.isEmpty {
                                Button {
                                    let digits = phone.filter { $0.isNumber || $0 == "+" }
                                    if let telURL = URL(string: "tel:\(digits)") {
                                        NSWorkspace.shared.open(telURL)
                                    }
                                } label: {
                                    BentoPill(text: "Call", color: .green)
                                }
                                .buttonStyle(.plain)
                                .help(phone)
                            }
                        }
                        .padding(.top, 2)
                    }

                    Spacer(minLength: 8)

                    // Stats
                    HStack(spacing: 16) {
                        BentoHeroStat(value: "\(linkedContacts.count)", label: "People")
                        BentoHeroStat(value: "\(openOpportunities.count)", label: "Active Deal")
                        BentoHeroStat(value: pipelineDisplay, label: "Pipeline")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                // MARK: Grid Row 1 — People + Active Deal
                BentoGrid(columns: 2) {
                    peopleBentoCell
                    activeDealBentoCell
                }

                // MARK: Grid Row 2 — Company Details + Location & Contact
                BentoGrid(columns: 2) {
                    companyDetailsBentoCell
                    locationContactBentoCell
                }

                Spacer(minLength: 32)
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    showingContactsPicker = true
                } label: {
                    Image(systemName: "person.badge.plus")
                }
                .help("Link Contacts")
            }
            ToolbarItem(placement: .automatic) {
                Button {
                    showingOpportunitiesPicker = true
                } label: {
                    Image(systemName: "dollarsign.circle.fill")
                }
                .help("Link Opportunities")
            }
            ToolbarItem(placement: .automatic) {
                Button {
                    showingProjectsPicker = true
                } label: {
                    Image(systemName: "folder.badge.plus")
                }
                .help("Link Projects")
            }
            ToolbarItem(placement: .automatic) {
                Button {
                    showEdit = true
                } label: {
                    Image(systemName: "pencil")
                }
                .help("Edit Company")
            }
            ToolbarItem(placement: .automatic) {
                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "trash")
                }
                .help("Delete Company")
            }
        }
        .sheet(isPresented: $showEdit) {
            CompanyFormView(company: company)
                .frame(minWidth: 480, minHeight: 560)
        }
        .confirmationDialog(
            "Delete \"\(company.companyName ?? "company")\"?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Company.airtableTableId, recordId: company.id)
                modelContext.delete(company)
                onDelete?()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingContactsPicker) {
            LinkedRecordPicker(
                title: "Link Contacts",
                entityType: .contacts,
                currentIds: Set(company.contactsIds),
                onSave: { ids in
                    company.contactsIds = Array(ids)
                    company.localModifiedAt = Date()
                    company.isPendingPush = true
                }
            )
        }
        .sheet(isPresented: $showingOpportunitiesPicker) {
            LinkedRecordPicker(
                title: "Link Opportunities",
                entityType: .opportunities,
                currentIds: Set(company.salesOpportunitiesIds),
                onSave: { ids in
                    company.salesOpportunitiesIds = Array(ids)
                    company.localModifiedAt = Date()
                    company.isPendingPush = true
                }
            )
        }
        .sheet(isPresented: $showingProjectsPicker) {
            LinkedRecordPicker(
                title: "Link Projects",
                entityType: .projects,
                currentIds: Set(company.projectsIds),
                onSave: { ids in
                    company.projectsIds = Array(ids)
                    company.localModifiedAt = Date()
                    company.isPendingPush = true
                }
            )
        }
    }

    // MARK: - People BentoCell (Row 1, left) — Avatar rows

    private var peopleBentoCell: some View {
        BentoCell(title: "People") {
            VStack(alignment: .leading, spacing: 0) {
                if linkedContacts.isEmpty {
                    Text("No contacts linked")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 4)
                } else {
                    ForEach(Array(linkedContacts.enumerated()), id: \.element.id) { index, contact in
                        HStack(spacing: 10) {
                            AvatarView(
                                name: contact.contactName ?? "?",
                                size: 30,
                                photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) },
                                shape: .circle
                            )

                            VStack(alignment: .leading, spacing: 1) {
                                Text(contact.contactName ?? "Unknown")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(.primary)
                                    .lineLimit(1)

                                if let title = contact.jobTitle, !title.isEmpty {
                                    Text(title)
                                        .font(.system(size: 12))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }

                            Spacer()
                        }
                        .padding(.vertical, 6)

                        if index < linkedContacts.count - 1 {
                            Divider()
                        }
                    }
                }
            }
        }
    }

    // MARK: - Active Deal BentoCell (Row 1, right)

    private var activeDealBentoCell: some View {
        BentoCell(title: "Active Deal") {
            VStack(alignment: .leading, spacing: 0) {
                if openOpportunities.isEmpty {
                    Text("No active deals")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 4)
                } else {
                    let deal = openOpportunities[0]

                    // Deal name
                    Text(deal.opportunityName ?? "Untitled Deal")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                        .padding(.bottom, 6)

                    // Stage pill + value
                    HStack(spacing: 8) {
                        if let stage = deal.salesStage, !stage.isEmpty {
                            BentoPill(text: stage, color: stageColor(for: stage))
                        }

                        if let value = deal.dealValue, value > 0 {
                            Text(abbreviatedCurrency(value))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.green)
                        }
                    }

                    // Projects sub-section
                    let dealProjectNames = resolveDealProjects(deal)
                    if !dealProjectNames.isEmpty {
                        Divider()
                            .padding(.vertical, 8)

                        Text("PROJECTS")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.secondary)
                            .tracking(0.5)
                            .padding(.bottom, 6)

                        FlowLayout(spacing: 6) {
                            ForEach(dealProjectNames, id: \.self) { name in
                                BentoChip(text: name)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Company Details BentoCell (Row 2, left)

    private var companyDetailsBentoCell: some View {
        BentoCell(title: "Company Details") {
            VStack(spacing: 0) {
                BentoFieldRow(label: "Industry", value: company.industry ?? "\u{2014}")
                BentoFieldRow(label: "Size", value: company.companySize ?? "\u{2014}")
                BentoFieldRow(label: "Revenue", value: company.annualRevenue ?? "\u{2014}")
                if let founded = company.foundingYear {
                    BentoFieldRow(label: "Founded", value: "\(founded)")
                }
                BentoFieldRow(label: "Lead Source", value: company.leadSource ?? "\u{2014}")
            }
        }
    }

    // MARK: - Location & Contact BentoCell (Row 2, right)

    private var locationContactBentoCell: some View {
        BentoCell(title: "Location & Contact") {
            VStack(spacing: 0) {
                if let address = company.address, !address.isEmpty {
                    BentoFieldRow(label: "Address", value: address)
                }
                BentoFieldRow(label: "City", value: {
                    let parts: [String] = [company.city, company.stateRegion, company.country]
                        .compactMap { $0?.isEmpty == false ? $0 : nil }
                    return parts.isEmpty ? "\u{2014}" : parts.joined(separator: ", ")
                }())
                if let phone = companyPhone, !phone.isEmpty {
                    BentoFieldRow(label: "Phone", value: phone)
                } else {
                    BentoFieldRow(label: "Phone", value: "\u{2014}")
                }
                if let website = company.website, !website.isEmpty {
                    BentoFieldRow(label: "Website", value: website)
                }
            }
        }
    }

    // MARK: - Phone helper

    /// Derive phone from linked contacts' work phone as fallback (Company model has no phone field).
    private var companyPhone: String? {
        // Check first linked contact for a work phone
        if let contact = linkedContacts.first {
            if let work = contact.workPhone, !work.isEmpty { return work }
            if let mobile = contact.mobilePhone, !mobile.isEmpty { return mobile }
        }
        return nil
    }

    // MARK: - Logo Upload/Remove

    private func uploadCompanyLogo(_ data: Data) {
        isUploadingLogo = true
        Task {
            defer { isUploadingLogo = false }
            do {
                _ = try await syncEngine.uploadAttachment(
                    tableId: AirtableConfig.Tables.companies,
                    recordId: company.id,
                    fieldId: "fldhCu5ooToK84g4G",
                    imageData: data,
                    filename: "\(company.companyName ?? "company").jpg"
                )
                await syncEngine.forceSync()
            } catch {
                print("[CompanyDetail] Logo upload failed: \(error.localizedDescription)")
            }
        }
    }

    private func removeCompanyLogo() {
        isUploadingLogo = true
        Task {
            defer { isUploadingLogo = false }
            do {
                try await syncEngine.removeAttachment(
                    tableId: AirtableConfig.Tables.companies,
                    recordId: company.id,
                    fieldId: "fldhCu5ooToK84g4G"
                )
                await syncEngine.forceSync()
            } catch {
                print("[CompanyDetail] Logo remove failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Helpers

    private func isOpenStage(_ stage: String?) -> Bool {
        guard let stage else { return true }
        let lower = stage.lowercased()
        return !lower.contains("closed") && !lower.contains("won") && !lower.contains("lost")
    }

    /// Stage color lookup — mirrors PipelineView's stageColors map.
    private func stageColor(for stage: String) -> Color {
        let colors: [String: Color] = [
            "Initial Contact": .blue,
            "Qualification": .cyan,
            "Meeting Scheduled": .orange,
            "Proposal Sent": .indigo,
            "Negotiation": .teal,
            "Contract Sent": .mint,
            "Development": .purple,
            "Investment": .pink,
            "Closed Won": .green,
            "Closed Lost": .red,
        ]
        return colors[stage] ?? .gray
    }

    /// Format a Double as abbreviated currency: "$1.2K", "$185K", "$2.3M"
    private func abbreviatedCurrency(_ value: Double) -> String {
        if value >= 1_000_000 {
            let millions = value / 1_000_000
            if millions.truncatingRemainder(dividingBy: 1) == 0 {
                return "$\(Int(millions))M"
            }
            return String(format: "$%.1fM", millions)
        } else if value >= 1_000 {
            let thousands = value / 1_000
            if thousands.truncatingRemainder(dividingBy: 1) == 0 {
                return "$\(Int(thousands))K"
            }
            return String(format: "$%.1fK", thousands)
        } else {
            return String(format: "$%.0f", value)
        }
    }

    /// Resolve project names for a specific opportunity's linked projects.
    private func resolveDealProjects(_ deal: Opportunity) -> [String] {
        guard !deal.projectIds.isEmpty else { return [] }
        let resolver = LinkedRecordResolver(context: modelContext)
        return resolver.resolveProjects(ids: deal.projectIds)
    }
}
