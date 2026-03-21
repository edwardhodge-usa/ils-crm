import SwiftUI
import SwiftData

/// Company detail pane — Bento Box layout matching approved mockup.
///
/// Layout:
/// - BentoHeroCard: logo avatar (roundedRect 56px) + name + "Industry · Location" subtitle
///   + Website pill + Call pill + Contacts/Active Opp/Revenue stats
/// - BentoGrid (2 columns) Row 1: COMPANY INFO cell + LOCATION & CONTACT cell
/// - BentoGrid (2 columns) Row 2: PEOPLE/OPPS/PROJECTS combined cell + NOTES cell
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

    private var revenueDisplay: String {
        if let revenue = company.annualRevenue, !revenue.isEmpty {
            return revenue
        }
        return "\u{2014}"
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
                        BentoHeroStat(value: "\(linkedContacts.count)", label: "Contacts")
                        BentoHeroStat(value: "\(openOpportunities.count)", label: "Active Opp")
                        BentoHeroStat(value: revenueDisplay, label: "Revenue")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                // MARK: Grid Row 1 — Company Info + Location & Contact
                BentoGrid(columns: 2) {
                    companyInfoBentoCell
                    locationContactBentoCell
                }

                // MARK: Grid Row 2 — People/Opps/Projects + Notes
                BentoGrid(columns: 2) {
                    linkedRecordsBentoCell
                    notesBentoCell
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

    // MARK: - Company Info BentoCell (Row 1, left)

    private var companyInfoBentoCell: some View {
        BentoCell(title: "Company Info") {
            VStack(spacing: 0) {
                BentoFieldRow(label: "Industry", value: company.industry ?? "\u{2014}")
                BentoFieldRow(label: "Size", value: company.companySize ?? "\u{2014}")
                BentoFieldRow(label: "Revenue", value: company.annualRevenue ?? "\u{2014}")
                BentoFieldRow(label: "Lead Source", value: company.leadSource ?? "\u{2014}")
            }
        }
    }

    // MARK: - Location & Contact BentoCell (Row 1, right)

    private var locationContactBentoCell: some View {
        BentoCell(title: "Location & Contact") {
            VStack(spacing: 0) {
                BentoFieldRow(label: "City", value: company.city ?? "\u{2014}")
                BentoFieldRow(label: "State", value: company.stateRegion ?? "\u{2014}")
                BentoFieldRow(label: "Country", value: company.country ?? "\u{2014}")
                if let phone = companyPhone, !phone.isEmpty {
                    BentoFieldRow(label: "Phone", value: phone)
                } else {
                    BentoFieldRow(label: "Phone", value: "\u{2014}")
                }
            }
        }
    }

    // MARK: - Linked Records BentoCell (Row 2, left) — People + Opps + Projects combined

    private var linkedRecordsBentoCell: some View {
        BentoCell(title: "People") {
            VStack(alignment: .leading, spacing: 0) {
                // People chips
                if linkedContacts.isEmpty {
                    Text("No contacts linked")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 4)
                } else {
                    FlowLayout(spacing: 6) {
                        ForEach(linkedContacts, id: \.id) { contact in
                            BentoChip(text: contact.contactName ?? "Unknown")
                        }
                    }
                }

                // Opportunities subsection
                VStack(alignment: .leading, spacing: 0) {
                    Text("OPPORTUNITIES")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.5)
                        .padding(.top, 10)
                        .padding(.bottom, 6)

                    if resolvedOpportunityNames.isEmpty {
                        Text("No opportunities linked")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 4)
                    } else {
                        FlowLayout(spacing: 6) {
                            ForEach(resolvedOpportunityNames, id: \.self) { name in
                                BentoChip(text: name)
                            }
                        }
                    }
                }

                // Projects subsection
                VStack(alignment: .leading, spacing: 0) {
                    Text("PROJECTS")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.5)
                        .padding(.top, 10)
                        .padding(.bottom, 6)

                    if resolvedProjectNames.isEmpty {
                        Text("No projects linked")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 4)
                    } else {
                        FlowLayout(spacing: 6) {
                            ForEach(resolvedProjectNames, id: \.self) { name in
                                BentoChip(text: name)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Notes BentoCell (Row 2, right)

    private var notesBentoCell: some View {
        BentoCell(title: "Notes") {
            EditableFieldRow(
                label: "",
                key: "notes",
                type: .textarea,
                value: notesText,
                onSave: { _, newValue in
                    if let text = newValue as? String {
                        company.notes = text
                        company.localModifiedAt = Date()
                        company.isPendingPush = true
                    }
                }
            )
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
}
