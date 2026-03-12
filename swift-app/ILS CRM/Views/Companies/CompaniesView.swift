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

// MARK: - Company Form (stub)

/// Mirrors src/components/companies/CompanyForm.tsx
struct CompanyFormView: View {
    let companyId: String?

    var body: some View {
        Form {
            Text("Company form — coming soon")
        }
        .navigationTitle(companyId == nil ? "New Company" : "Edit Company")
    }
}
