import SwiftUI
import SwiftData

/// Companies list — mirrors src/components/companies/CompanyListPage.tsx
///
/// Features:
/// - Searchable list with company name, industry, website filtering
/// - Grouped by first letter of company name
/// - Navigation to CompanyDetailView
/// - Empty state when no companies exist
///
/// Electron hooks: useEntityList('companies')
struct CompaniesView: View {
    @Query(sort: \Company.companyName) private var companies: [Company]
    @State private var searchText = ""
    @State private var selectedCompany: Company?
    @State private var showNewCompany = false

    // MARK: - Filtered & Grouped Data

    private var filteredCompanies: [Company] {
        if searchText.isEmpty { return companies }
        let query = searchText
        return companies.filter { company in
            (company.companyName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (company.industry?.localizedCaseInsensitiveContains(query) ?? false) ||
            (company.website?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    /// Companies grouped by the first letter of companyName, with keys sorted alphabetically.
    /// Companies with no name or names starting with non-letter characters go under "#".
    private var groupedCompanies: [(letter: String, companies: [Company])] {
        let grouped = Dictionary(grouping: filteredCompanies) { company -> String in
            guard let name = company.companyName,
                  let first = name.first else { return "#" }
            let upper = String(first).uppercased()
            return upper.rangeOfCharacter(from: .letters) != nil ? upper : "#"
        }
        return grouped
            .sorted { $0.key < $1.key }
            .map { (letter: $0.key, companies: $0.value) }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if companies.isEmpty {
                EmptyStateView(
                    title: "No companies yet",
                    description: "Companies will appear here once synced from Airtable.",
                    systemImage: "building.2"
                )
            } else if filteredCompanies.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No companies match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                companyList
            }
        }
        .searchable(text: $searchText, prompt: "Search companies...")
        .navigationTitle("Companies")
        .toolbar {
            Button { showNewCompany = true } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showNewCompany) {
            CompanyFormView(company: nil)
                .frame(minWidth: 480, minHeight: 560)
        }
    }

    // MARK: - Company List

    private var companyList: some View {
        List(selection: $selectedCompany) {
            ForEach(groupedCompanies, id: \.letter) { group in
                Section {
                    ForEach(group.companies, id: \.id) { company in
                        NavigationLink(value: company.id) {
                            companyRow(company)
                        }
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
        HStack(spacing: 12) {
            AvatarView(name: company.companyName ?? "?", size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(company.companyName ?? "Unknown")
                    .font(.body)
                    .lineLimit(1)

                if let subtitle = companySubtitle(for: company) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let companyType = company.companyType, !companyType.isEmpty {
                BadgeView(
                    text: companyType,
                    color: companyTypeColor(companyType)
                )
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    /// Returns the best subtitle for a company row: industry, then website, then nil.
    private func companySubtitle(for company: Company) -> String? {
        if let industry = company.industry, !industry.isEmpty {
            return industry
        }
        if let website = company.website, !website.isEmpty {
            return website
        }
        return nil
    }

    /// Deterministic color for company type badges.
    private func companyTypeColor(_ type: String) -> Color {
        let lower = type.lowercased()
        if lower.contains("client") { return .blue }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor") { return .green }
        if lower.contains("prospect") { return .orange }
        if lower.contains("lead") { return .teal }
        if lower.contains("agency") { return .indigo }
        return .secondary
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
        companyName = company.companyName ?? ""
        companyType = company.companyType ?? ""
        industry = company.industry ?? ""
        companySize = company.companySize ?? ""
        website = company.website ?? ""
        address = company.address ?? ""
        city = company.city ?? ""
        stateRegion = company.stateRegion ?? ""
        country = company.country ?? ""
        postalCode = company.postalCode ?? ""
        notes = company.notes ?? ""
    }

    // MARK: - Save

    private func save() {
        let trimmedName = companyName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        if let company {
            // Edit mode — update existing
            company.companyName = trimmedName
            company.companyType = companyType.nilIfEmpty
            company.industry = industry.nilIfEmpty
            company.companySize = companySize.nilIfEmpty
            company.website = website.nilIfEmpty
            company.address = address.nilIfEmpty
            company.city = city.nilIfEmpty
            company.stateRegion = stateRegion.nilIfEmpty
            company.country = country.nilIfEmpty
            company.postalCode = postalCode.nilIfEmpty
            company.notes = notes.nilIfEmpty
            company.localModifiedAt = Date()
            company.isPendingPush = true
        } else {
            // Create mode — insert new
            let newCompany = Company(
                id: "local_\(UUID().uuidString)",
                companyName: trimmedName,
                isPendingPush: true
            )
            newCompany.companyType = companyType.nilIfEmpty
            newCompany.industry = industry.nilIfEmpty
            newCompany.companySize = companySize.nilIfEmpty
            newCompany.website = website.nilIfEmpty
            newCompany.address = address.nilIfEmpty
            newCompany.city = city.nilIfEmpty
            newCompany.stateRegion = stateRegion.nilIfEmpty
            newCompany.country = country.nilIfEmpty
            newCompany.postalCode = postalCode.nilIfEmpty
            newCompany.notes = notes.nilIfEmpty
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
