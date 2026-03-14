import SwiftUI
import SwiftData
import Combine

/// Companies list+detail split — mirrors src/components/companies/CompanyListPage.tsx
///
/// Features:
/// - HStack split: 380pt fixed list + flex detail
/// - ListHeader, search bar, SortDropdown
/// - Grouped by first letter (alphabetical, "#" for non-letters)
/// - Company row: AvatarView + name + subtitle + company type badge + contact count
/// - Detail pane: CompanyDetailView or EmptyStateView
struct CompaniesView: View {
    @Query(sort: \Company.companyName) private var companies: [Company]
    @Query private var allContacts: [Contact]
    @State private var searchText = ""
    @AppStorage("sort-companies") private var sortBy: String = "name"
    @State private var selectedCompany: Company?
    @State private var showNewCompany = false

    // MARK: - Sort Label

    private var sortLabel: String {
        switch sortBy {
        case "type": return "Type"
        case "industry": return "Industry"
        case "newest": return "Newest First"
        default: return "Name A–Z"
        }
    }

    // MARK: - Filtered & Sorted Data

    private var filteredCompanies: [Company] {
        let base: [Company]
        if searchText.isEmpty {
            base = Array(companies)
        } else {
            let query = searchText
            base = companies.filter { company in
                (company.companyName?.localizedCaseInsensitiveContains(query) ?? false) ||
                (company.industry?.localizedCaseInsensitiveContains(query) ?? false) ||
                (company.website?.localizedCaseInsensitiveContains(query) ?? false)
            }
        }

        switch sortBy {
        case "type":
            return base.sorted {
                let a = $0.companyType ?? ""
                let b = $1.companyType ?? ""
                if a == b { return ($0.companyName ?? "") < ($1.companyName ?? "") }
                if a.isEmpty { return false }
                if b.isEmpty { return true }
                return a < b
            }
        case "industry":
            return base.sorted {
                let a = $0.industry ?? ""
                let b = $1.industry ?? ""
                if a == b { return ($0.companyName ?? "") < ($1.companyName ?? "") }
                if a.isEmpty { return false }
                if b.isEmpty { return true }
                return a < b
            }
        case "newest":
            return base.sorted {
                let a = $0.airtableModifiedAt ?? $0.localModifiedAt ?? .distantPast
                let b = $1.airtableModifiedAt ?? $1.localModifiedAt ?? .distantPast
                return a > b
            }
        default: // "name"
            return base.sorted { ($0.companyName ?? "") < ($1.companyName ?? "") }
        }
    }

    /// Companies grouped by context-appropriate key based on current sort.
    private var groupedCompanies: [(letter: String, companies: [Company])] {
        let list = filteredCompanies

        switch sortBy {
        case "type":
            let grouped = Dictionary(grouping: list) { ($0.companyType ?? "").isEmpty ? "Other" : $0.companyType! }
            return grouped
                .sorted {
                    if $0.key == "Other" { return false }
                    if $1.key == "Other" { return true }
                    return $0.key < $1.key
                }
                .map { (letter: $0.key, companies: $0.value) }

        case "industry":
            let grouped = Dictionary(grouping: list) { ($0.industry ?? "").isEmpty ? "Other" : $0.industry! }
            return grouped
                .sorted {
                    if $0.key == "Other" { return false }
                    if $1.key == "Other" { return true }
                    return $0.key < $1.key
                }
                .map { (letter: $0.key, companies: $0.value) }

        case "newest":
            // No grouping for date sort — single flat section
            return list.isEmpty ? [] : [(letter: "All Companies", companies: list)]

        default: // "name" — group by first letter
            let grouped = Dictionary(grouping: list) { company -> String in
                guard let name = company.companyName,
                      let first = name.first else { return "#" }
                let upper = String(first).uppercased()
                return upper.rangeOfCharacter(from: .letters) != nil ? upper : "#"
            }
            return grouped
                .sorted {
                    if $0.key == "#" { return false }
                    if $1.key == "#" { return true }
                    return $0.key < $1.key
                }
                .map { (letter: $0.key, companies: $0.value) }
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // Left list pane
            leftPane
                .frame(width: 380)

            Divider()

            // Right detail pane
            if let company = selectedCompany {
                CompanyDetailView(
                    company: company,
                    allContacts: allContacts,
                    onEdit: {},
                    onDelete: { deleteCompany(company) }
                )
            } else {
                EmptyStateView(
                    title: "Select a company",
                    description: "Choose a company to view details",
                    systemImage: "building.2"
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .sheet(isPresented: $showNewCompany) {
            CompanyFormView(company: nil)
                .frame(minWidth: 480, minHeight: 560)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewCompany = true
        }
    }

    // MARK: - Left Pane

    private var leftPane: some View {
        VStack(spacing: 0) {
            ListHeader(
                title: "Companies",
                count: companies.count,
                buttonLabel: "+ New Company",
                onButton: { showNewCompany = true }
            )

            Divider()

            // Search + Sort bar
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                    TextField("Search companies...", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 6))

                Menu {
                    Button("Name A–Z") { sortBy = "name" }
                    Button("Type") { sortBy = "type" }
                    Button("Industry") { sortBy = "industry" }
                    Button("Newest First") { sortBy = "newest" }
                } label: {
                    HStack(spacing: 4) {
                        Text(sortLabel)
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                    }
                }
                .menuStyle(.borderlessButton)
                .fixedSize()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // List content
            if companies.isEmpty {
                Spacer()
                EmptyStateView(
                    title: "No companies yet",
                    description: "Companies will appear here once synced from Airtable.",
                    systemImage: "building.2"
                )
                Spacer()
            } else if filteredCompanies.isEmpty {
                Spacer()
                EmptyStateView(
                    title: "No results",
                    description: "No companies match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
                Spacer()
            } else {
                companyList
            }
        }
    }

    // MARK: - Company List

    private var companyList: some View {
        List(selection: $selectedCompany) {
            ForEach(groupedCompanies, id: \.letter) { group in
                Section {
                    ForEach(group.companies, id: \.id) { company in
                        companyRow(company)
                            .tag(company)
                            .listRowInsets(EdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12))
                    }
                } header: {
                    SectionHeader(title: group.letter, count: group.companies.count)
                }
            }
        }
        .listStyle(.sidebar)
    }

    // MARK: - Company Row

    private func companyRow(_ company: Company) -> some View {
        HStack(spacing: 10) {
            AvatarView(name: company.companyName ?? "?", avatarSize: .medium, photoURL: company.logoUrl.flatMap { URL(string: $0) }, shape: .roundedRect)

            VStack(alignment: .leading, spacing: 2) {
                Text(company.companyName ?? "Unknown")
                    .font(.system(size: 13, weight: .medium))
                    .lineLimit(1)

                if let subtitle = companySubtitle(for: company) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                if let companyType = company.companyType, !companyType.isEmpty {
                    StatusBadge(text: companyType, color: companyTypeColor(companyType))
                }

                let count = contactCount(for: company)
                if count > 0 {
                    Text(count == 1 ? "1 contact" : "\(count) contacts")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    private func contactCount(for company: Company) -> Int {
        allContacts.filter { $0.companiesIds.contains(company.id) }.count
    }

    private func companySubtitle(for company: Company) -> String? {
        if let industry = company.industry, !industry.isEmpty { return industry }
        if let website = company.website, !website.isEmpty { return website }
        return nil
    }

    private func companyTypeColor(_ type: String) -> Color {
        let lower = type.lowercased()
        if lower.contains("client")  { return .blue }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor")  { return .green }
        if lower.contains("prospect"){ return .orange }
        if lower.contains("lead")    { return .teal }
        if lower.contains("agency")  { return .indigo }
        return .secondary
    }

    private func deleteCompany(_ company: Company) {
        if selectedCompany?.id == company.id {
            selectedCompany = nil
        }
    }
}

// MARK: - Company Form

/// Full create/edit form — mirrors src/components/companies/CompanyForm.tsx
///
/// - `company: nil` → create mode (inserts new Company with local_ prefix ID)
/// - `company: existing` → edit mode (updates in place)
struct CompanyFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let company: Company?  // nil = create, non-nil = edit

    // MARK: - Form State

    @State private var companyName: String = ""
    @State private var companyType: String = ""
    @State private var industry: String = ""
    @State private var companySize: String = ""
    @State private var website: String = ""
    @State private var address: String = ""
    @State private var city: String = ""
    @State private var stateRegion: String = ""
    @State private var country: String = ""
    @State private var postalCode: String = ""
    @State private var notes: String = ""

    private var isCreate: Bool { company == nil }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                Section("Company") {
                    TextField("Company Name", text: $companyName)
                }

                Section("Details") {
                    TextField("Company Type", text: $companyType)
                    TextField("Industry", text: $industry)
                    TextField("Company Size", text: $companySize)
                    TextField("Website", text: $website)
                }

                Section("Address") {
                    TextField("Address", text: $address)
                    TextField("City", text: $city)
                    TextField("State / Region", text: $stateRegion)
                    TextField("Country", text: $country)
                    TextField("Postal Code", text: $postalCode)
                }

                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
            }
            .formStyle(.grouped)
            .navigationTitle(isCreate ? "New Company" : "Edit Company")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear { loadExisting() }
        }
    }

    // MARK: - Load Existing (edit mode)

    private func loadExisting() {
        guard let company else { return }
        companyName  = company.companyName ?? ""
        companyType  = company.companyType ?? ""
        industry     = company.industry ?? ""
        companySize  = company.companySize ?? ""
        website      = company.website ?? ""
        address      = company.address ?? ""
        city         = company.city ?? ""
        stateRegion  = company.stateRegion ?? ""
        country      = company.country ?? ""
        postalCode   = company.postalCode ?? ""
        notes        = company.notes ?? ""
    }

    // MARK: - Save

    private func save() {
        let trimmedName = companyName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let company {
            // Edit mode — update existing
            company.companyName  = trimmedName
            company.companyType  = companyType.nilIfEmpty
            company.industry     = industry.nilIfEmpty
            company.companySize  = companySize.nilIfEmpty
            company.website      = website.nilIfEmpty
            company.address      = address.nilIfEmpty
            company.city         = city.nilIfEmpty
            company.stateRegion  = stateRegion.nilIfEmpty
            company.country      = country.nilIfEmpty
            company.postalCode   = postalCode.nilIfEmpty
            company.notes        = notes.nilIfEmpty
            company.localModifiedAt = Date()
            company.isPendingPush   = true
        } else {
            // Create mode — insert new
            let newCompany = Company(
                id: "local_\(UUID().uuidString)",
                companyName: trimmedName,
                isPendingPush: true
            )
            newCompany.companyType  = companyType.nilIfEmpty
            newCompany.industry     = industry.nilIfEmpty
            newCompany.companySize  = companySize.nilIfEmpty
            newCompany.website      = website.nilIfEmpty
            newCompany.address      = address.nilIfEmpty
            newCompany.city         = city.nilIfEmpty
            newCompany.stateRegion  = stateRegion.nilIfEmpty
            newCompany.country      = country.nilIfEmpty
            newCompany.postalCode   = postalCode.nilIfEmpty
            newCompany.notes        = notes.nilIfEmpty
            newCompany.localModifiedAt = Date()
            modelContext.insert(newCompany)
        }

        dismiss()
    }
}

// MARK: - String Extension

private extension String {
    /// Returns nil if the string is empty, otherwise returns self.
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
