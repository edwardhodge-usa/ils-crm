#if os(iOS)
import SwiftUI
import SwiftData

/// iPhone companies list + detail — dark neon bento design.
struct iOSCompaniesView: View {
    @Query(sort: \Company.companyName) private var companies: [Company]
    @Query private var allContacts: [Contact]
    @Query private var allOpportunities: [Opportunity]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @State private var searchText = ""
    @State private var sortBy: String = "name"
    @State private var showNewCompany = false

    // MARK: - Filtered & Sorted

    private var filteredCompanies: [Company] {
        let base: [Company]
        if searchText.isEmpty {
            base = Array(companies)
        } else {
            base = companies.filter {
                ($0.companyName?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                ($0.industry?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                ($0.website?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        switch sortBy {
        case "type":
            return base.sorted {
                let a = $0.companyType ?? ""; let b = $1.companyType ?? ""
                if a == b { return ($0.companyName ?? "") < ($1.companyName ?? "") }
                if a.isEmpty { return false }; if b.isEmpty { return true }
                return a < b
            }
        case "newest":
            return base.sorted {
                ($0.airtableModifiedAt ?? .distantPast) > ($1.airtableModifiedAt ?? .distantPast)
            }
        default:
            return base.sorted { ($0.companyName ?? "") < ($1.companyName ?? "") }
        }
    }

    private func contactCount(for company: Company) -> Int {
        allContacts.filter { $0.companiesIds.contains(company.id) }.count
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            List {
                // Search + stats + sort
                Section {
                    // Search
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(NeonTheme.textTertiary)
                        TextField("Search companies", text: $searchText)
                            .font(.system(size: 15))
                            .foregroundStyle(NeonTheme.textPrimary)
                    }
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(NeonTheme.cardSurface)
                    )
                    .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)

                    statsRow
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)

                    sortChips
                        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }

                // Companies
                if filteredCompanies.isEmpty {
                    Section {
                        NeonEmptyState(
                            icon: "building.2",
                            title: searchText.isEmpty ? "No Companies" : "No Results",
                            subtitle: searchText.isEmpty ? "Companies sync from Airtable" : "No companies match \"\(searchText)\""
                        )
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                } else {
                    Section {
                        ForEach(filteredCompanies) { company in
                            NavigationLink(value: company.id) {
                                companyRow(company)
                            }
                            .listRowBackground(NeonTheme.cardSurface)
                            .listRowSeparator(.hidden)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .listSectionSpacing(4)
            .background(NeonTheme.background)
            .scrollContentBackground(.hidden)
            .navigationTitle("Companies")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNewCompany = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(NeonTheme.cyan)
                    }
                }
            }
            .refreshable { await syncEngine.forceSync() }
            .sheet(isPresented: $showNewCompany) {
                NavigationStack {
                    iOSCompanyFormView()
                }
            }
            .navigationDestination(for: String.self) { companyId in
                if let company = companies.first(where: { $0.id == companyId }) {
                    iOSCompanyDetailView(company: company)
                }
            }
        }
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 12) {
            neonStatCard(count: companies.count, label: "Total", color: NeonTheme.cyan, icon: "building.2.fill")
            neonStatCard(
                count: companies.filter { $0.companyType?.lowercased().contains("client") ?? false }.count,
                label: "Clients", color: NeonTheme.electricBlue, icon: "star.fill"
            )
            neonStatCard(
                count: companies.filter { $0.companyType?.lowercased().contains("prospect") ?? false }.count,
                label: "Prospects", color: NeonTheme.neonOrange, icon: "scope"
            )
        }
    }

    private func neonStatCard(count: Int, label: String, color: Color, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.5), radius: 4)
            Text("\(count)")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(NeonTheme.textSecondary)
                .textCase(.uppercase)
                .tracking(0.4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(NeonTheme.cardSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Sort Chips

    private var sortChips: some View {
        HStack(spacing: 8) {
            Text("\(filteredCompanies.count) companies")
                .font(.system(size: 12))
                .foregroundStyle(NeonTheme.textSecondary)
            Spacer()
            ForEach(["name", "type", "newest"], id: \.self) { option in
                let label = option == "name" ? "Name" : option == "type" ? "Type" : "Newest"
                let isSelected = sortBy == option
                Button { sortBy = option } label: {
                    Text(label)
                        .font(.system(size: 12, weight: .semibold))
                        .padding(.horizontal, 12)
                        .frame(minHeight: 32)
                        .background(
                            Capsule().fill(isSelected ? NeonTheme.cyan : NeonTheme.cardSurface)
                        )
                        .foregroundStyle(isSelected ? .black : NeonTheme.textPrimary)
                        .overlay {
                            if !isSelected {
                                Capsule().stroke(NeonTheme.cardBorderGlow, lineWidth: 1)
                            }
                        }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Company Row

    private func companyRow(_ company: Company) -> some View {
        HStack(spacing: 12) {
            AvatarView(
                name: company.companyName ?? "?",
                avatarSize: .medium,
                photoURL: company.logoUrl.flatMap { URL(string: $0) },
                shape: .roundedRect
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(company.companyName ?? "Unknown")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(NeonTheme.textPrimary)
                    .lineLimit(1)

                if let industry = company.industry, !industry.isEmpty {
                    Text(industry)
                        .font(.system(size: 12))
                        .foregroundStyle(NeonTheme.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                if let type = company.companyType, !type.isEmpty {
                    NeonPillBadge(text: type, color: companyTypeColor(type))
                }

                let contacts = contactCount(for: company)
                if contacts > 0 {
                    Text("\(contacts) \(contacts == 1 ? "contact" : "contacts")")
                        .font(.system(size: 10))
                        .foregroundStyle(NeonTheme.textTertiary)
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(NeonTheme.textTertiary)
        }
        .frame(minHeight: 44)
    }
}

// MARK: - Company Detail View

struct iOSCompanyDetailView: View {
    let company: Company
    @Query private var allContacts: [Contact]
    @Query private var allOpportunities: [Opportunity]
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine
    @State private var showDeleteConfirm = false

    private var linkedContacts: [Contact] {
        allContacts.filter { company.contactsIds.contains($0.id) }
    }

    private var openOpportunities: [Opportunity] {
        allOpportunities.filter {
            $0.companyIds.contains(company.id) &&
            !($0.salesStage?.lowercased().contains("closed") ?? false) &&
            !($0.salesStage?.lowercased().contains("won") ?? false) &&
            !($0.salesStage?.lowercased().contains("lost") ?? false)
        }
    }

    private var locationText: String {
        [company.city, company.stateRegion, company.country]
            .compactMap { $0?.isEmpty == false ? $0 : nil }
            .joined(separator: ", ")
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                heroCard

                NeonCard(header: "People") {
                    if linkedContacts.isEmpty {
                        Text("No contacts linked")
                            .font(.system(size: 13))
                            .foregroundStyle(NeonTheme.textTertiary)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(linkedContacts) { contact in
                                HStack(spacing: 10) {
                                    AvatarView(name: contact.contactName ?? "?", avatarSize: .small,
                                        photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) })
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(contact.contactName ?? "Unknown")
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundStyle(NeonTheme.textPrimary)
                                        if let title = contact.jobTitle, !title.isEmpty {
                                            Text(title)
                                                .font(.system(size: 12))
                                                .foregroundStyle(NeonTheme.textSecondary)
                                        }
                                    }
                                    Spacer()
                                }
                                .frame(minHeight: 44)
                            }
                        }
                    }
                }

                NeonCard(header: "Active Deals") {
                    if openOpportunities.isEmpty {
                        Text("No active deals")
                            .font(.system(size: 13))
                            .foregroundStyle(NeonTheme.textTertiary)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(openOpportunities) { opp in
                                HStack {
                                    Text(opp.opportunityName ?? "Untitled")
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(NeonTheme.textPrimary)
                                        .lineLimit(1)
                                    Spacer()
                                    if let stage = opp.salesStage, !stage.isEmpty {
                                        NeonPillBadge(text: stage, color: NeonTheme.electricBlue)
                                    }
                                }
                                .frame(minHeight: 32)
                            }
                        }
                    }
                }

                NeonCard(header: "Company Details") {
                    VStack(spacing: 0) {
                        NeonFieldRow(label: "Industry", value: company.industry)
                        NeonFieldRow(label: "Size", value: company.companySize)
                        NeonFieldRow(label: "Revenue", value: company.annualRevenue)
                        NeonFieldRow(label: "Lead Source", value: company.leadSource)
                        NeonFieldRow(label: "Website", value: company.website)
                    }
                }

                NeonCard(header: "Location") {
                    VStack(spacing: 0) {
                        if let address = company.address, !address.isEmpty {
                            NeonFieldRow(label: "Address", value: address)
                        }
                        NeonFieldRow(label: "City", value: locationText.isEmpty ? nil : locationText)
                        NeonFieldRow(label: "Postal Code", value: company.postalCode)
                    }
                }

                if let notes = company.notes, !notes.isEmpty {
                    NeonCard(header: "Notes") {
                        Text(notes)
                            .font(.system(size: 14))
                            .foregroundStyle(NeonTheme.textPrimary)
                    }
                }

                NeonDestructiveButton(title: "Delete Company", icon: "trash") {
                    showDeleteConfirm = true
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .navigationTitle(company.companyName ?? "Company")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this company?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Company.airtableTableId, recordId: company.id)
                modelContext.delete(company)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Hero Card

    private var heroCard: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: company.companyName ?? "?",
                size: 52,
                photoURL: company.logoUrl.flatMap { URL(string: $0) },
                shape: .roundedRect
            )

            VStack(alignment: .leading, spacing: 3) {
                Text(company.companyName ?? "Unknown")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(NeonTheme.textPrimary)

                if let industry = company.industry, !industry.isEmpty {
                    Text(industry)
                        .font(.system(size: 13))
                        .foregroundStyle(NeonTheme.textSecondary)
                }

                if let type = company.companyType, !type.isEmpty {
                    let color = companyTypeColor(type)
                    Text(type)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(color)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(color.opacity(0.12))
                        .clipShape(Capsule())
                        .padding(.top, 2)
                }
            }

            Spacer()

            VStack(spacing: 4) {
                Text("\(linkedContacts.count)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(NeonTheme.cyan)
                Text("People")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(NeonTheme.textSecondary)
                    .textCase(.uppercase)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(NeonTheme.cardSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(NeonTheme.cardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }
}

// MARK: - Company Form

struct iOSCompanyFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var companyName = ""
    @State private var companyType = ""
    @State private var industry = ""
    @State private var website = ""
    @State private var notes = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                NeonCard(header: "Company") {
                    TextField("Company Name", text: $companyName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(NeonTheme.textPrimary)
                }

                NeonCard(header: "Details") {
                    VStack(spacing: 10) {
                        NeonTextField(placeholder: "Type", text: $companyType)
                        NeonTextField(placeholder: "Industry", text: $industry)
                        NeonTextField(placeholder: "Website", text: $website)
                    }
                }

                NeonCard(header: "Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(NeonTheme.textPrimary)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(NeonTheme.background)
        .scrollContentBackground(.hidden)
        .navigationTitle("New Company")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
                    .foregroundStyle(NeonTheme.textSecondary)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? NeonTheme.textTertiary : NeonTheme.cyan)
                    .disabled(companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    private func save() {
        let name = companyName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let newCompany = Company(id: "local_\(UUID().uuidString)", companyName: name, isPendingPush: true)
        newCompany.companyType = companyType.isEmpty ? nil : companyType
        newCompany.industry = industry.isEmpty ? nil : industry
        newCompany.website = website.isEmpty ? nil : website
        newCompany.notes = notes.isEmpty ? nil : notes
        newCompany.localModifiedAt = Date()
        modelContext.insert(newCompany)
        dismiss()
    }
}
#endif
