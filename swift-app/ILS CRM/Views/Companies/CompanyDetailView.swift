import SwiftUI
import SwiftData

/// Company detail pane — Bento Box layout.
///
/// Layout:
/// - BentoHeroCard: logo avatar (roundedRect 56px) + name + "Industry · Location" subtitle
///   + Website pill + Call pill + People/Deals/Pipeline stats
/// - BentoGrid (2 columns) Row 1: PEOPLE cell + ACTIVE DEAL cell
/// - BentoGrid (2 columns) Row 2: COMPANY DETAILS cell + LOCATION & CONTACT cell
/// - Edit / Delete moved to toolbar
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

    private var totalValue: String {
        let sum = openOpportunities.compactMap { $0.dealValue }.reduce(0, +)
        if sum == 0 { return "\u{2014}" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: sum)) ?? "\u{2014}"
    }

    private var fullAddress: String {
        let parts: [String] = [
            company.address,
            company.city,
            company.stateRegion,
            company.postalCode,
            company.country
        ].compactMap { $0?.isEmpty == false ? $0 : nil }
        return parts.joined(separator: ", ")
    }

    /// Hero subtitle: "Industry · City, State" or either part alone
    private var heroSubtitle: String? {
        let industry = company.industry?.isEmpty == false ? company.industry : nil
        let location = locationSubtitle.isEmpty ? nil : locationSubtitle
        let parts = [industry, location].compactMap { $0 }
        if parts.isEmpty { return nil }
        return parts.joined(separator: " \u{00B7} ")
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

                        }
                        .padding(.top, 2)
                    }

                    Spacer(minLength: 8)

                    // Stats
                    HStack(spacing: 16) {
                        BentoHeroStat(value: "\(linkedContacts.count)", label: "People")
                        BentoHeroStat(value: "\(openOpportunities.count)", label: "Active Deals")
                        BentoHeroStat(value: totalValue, label: "Pipeline")
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

    // MARK: - People BentoCell

    private var peopleBentoCell: some View {
        BentoCell(title: "People") {
            VStack(alignment: .leading, spacing: 0) {
                // Header button row
                HStack {
                    Spacer()
                    Button {
                        showingContactsPicker = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.accentColor)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 4)

                if linkedContacts.isEmpty {
                    Text("No contacts")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 8)
                } else {
                    VStack(spacing: 0) {
                        ForEach(linkedContacts, id: \.id) { contact in
                            contactRow(contact)
                            if contact.id != linkedContacts.last?.id {
                                Divider()
                                    .padding(.leading, 42)
                            }
                        }
                    }
                }
            }
        }
    }

    private func contactRow(_ contact: Contact) -> some View {
        HStack(spacing: 8) {
            AvatarView(name: contact.contactName ?? "?", size: 30, shape: .circle)

            VStack(alignment: .leading, spacing: 1) {
                Text(contact.contactName ?? "Unknown")
                    .font(.system(size: 13, weight: .medium))
                    .lineLimit(1)

                if let title = contact.jobTitle, !title.isEmpty {
                    Text(title)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
    }

    // MARK: - Active Deal BentoCell

    private var activeDealBentoCell: some View {
        BentoCell(title: "Active Deal") {
            VStack(alignment: .leading, spacing: 0) {
                // Header button row
                HStack {
                    Spacer()
                    Button {
                        showingOpportunitiesPicker = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color.accentColor)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.bottom, 4)

                if let opp = openOpportunities.first {
                    // Opportunity name + stage pill + value
                    VStack(alignment: .leading, spacing: 6) {
                        Text(opp.opportunityName ?? "Untitled")
                            .font(.system(size: 13, weight: .medium))
                            .lineLimit(2)

                        HStack(spacing: 6) {
                            if let stage = opp.salesStage, !stage.isEmpty {
                                BentoPill(text: stage, color: stageColor(for: stage))
                            }

                            if let value = opp.dealValue, value > 0 {
                                Text(formattedCurrency(value))
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.bottom, 8)

                    // Project chips below divider
                    if !company.projectsIds.isEmpty {
                        Divider()
                            .padding(.bottom, 8)

                        HStack {
                            Button {
                                showingProjectsPicker = true
                            } label: {
                                Image(systemName: "plus")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Color.accentColor)
                            }
                            .buttonStyle(.plain)

                            Spacer()
                        }
                        .padding(.bottom, 4)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(company.projectsIds, id: \.self) { projectId in
                                    BentoChip(text: projectId)
                                }
                            }
                        }
                    }
                } else {
                    Text("No active deals")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 8)

                    // Still show projects section if there are any
                    if !company.projectsIds.isEmpty {
                        Divider()
                            .padding(.vertical, 6)

                        HStack {
                            Button {
                                showingProjectsPicker = true
                            } label: {
                                Image(systemName: "plus")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Color.accentColor)
                            }
                            .buttonStyle(.plain)

                            Spacer()
                        }
                        .padding(.bottom, 4)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(company.projectsIds, id: \.self) { projectId in
                                    BentoChip(text: projectId)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Company Details BentoCell

    @ViewBuilder
    private var companyDetailsBentoCell: some View {
        let hasIndustry = !(company.industry ?? "").isEmpty
        let hasSize = !(company.companySize ?? "").isEmpty
        let hasRevenue = !(company.annualRevenue ?? "").isEmpty
        let hasFounded = company.foundingYear != nil
        let hasLeadSource = !(company.leadSource ?? "").isEmpty

        if hasIndustry || hasSize || hasRevenue || hasFounded || hasLeadSource {
            BentoCell(title: "Company Details") {
                VStack(spacing: 0) {
                    if let industry = company.industry, !industry.isEmpty {
                        BentoFieldRow(label: "Industry", value: industry)
                    }
                    if let size = company.companySize, !size.isEmpty {
                        BentoFieldRow(label: "Size", value: size)
                    }
                    if let revenue = company.annualRevenue, !revenue.isEmpty {
                        BentoFieldRow(label: "Revenue", value: revenue)
                    }
                    if let year = company.foundingYear {
                        BentoFieldRow(label: "Founded", value: "\(year)")
                    }
                    if let leadSource = company.leadSource, !leadSource.isEmpty {
                        BentoFieldRow(label: "Lead Source", value: leadSource)
                    }
                }
            }
        }
    }

    // MARK: - Location & Contact BentoCell

    @ViewBuilder
    private var locationContactBentoCell: some View {
        let hasAddress = !fullAddress.isEmpty
        let hasWebsite = websiteURL != nil
        let hasCity = !(company.city ?? "").isEmpty

        if hasAddress || hasWebsite || hasCity {
            BentoCell(title: "Location & Contact") {
                VStack(spacing: 0) {
                    if !fullAddress.isEmpty {
                        BentoFieldRow(label: "Address", value: fullAddress)
                    } else if let city = company.city, !city.isEmpty {
                        let locationParts = [city, company.stateRegion].compactMap { $0?.isEmpty == false ? $0 : nil }
                        BentoFieldRow(label: "City", value: locationParts.joined(separator: ", "))
                    }
                    if let website = company.website, !website.isEmpty {
                        BentoFieldRow(label: "Website", value: website)
                    }
                }
            }
        }
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

    private func formattedCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }

    private func stageColor(for stage: String) -> Color {
        switch stage {
        case "Initial Contact":    return .blue
        case "Qualification":      return .cyan
        case "Meeting Scheduled":  return .orange
        case "Proposal Sent":      return .indigo
        case "Negotiation":        return .teal
        case "Contract Sent":      return .mint
        case "Development":        return .purple
        case "Investment":         return .pink
        case "Closed Won":         return .green
        case "Closed Lost":        return .red
        case "Future Client":      return .yellow
        default:                   return .blue
        }
    }
}
