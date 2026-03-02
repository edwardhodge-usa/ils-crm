import SwiftUI
import SwiftData

/// Companies list — mirrors src/components/companies/CompanyListPage.tsx
///
/// Features to implement:
/// - Searchable list with company name, type, industry
/// - Navigation to Company360View and CompanyFormView
///
/// Electron hooks: useEntityList('companies')
struct CompaniesView: View {
    @Query(sort: \Company.companyName) private var companies: [Company]
    @State private var searchText = ""

    var filteredCompanies: [Company] {
        if searchText.isEmpty { return companies }
        return companies.filter {
            $0.companyName?.localizedCaseInsensitiveContains(searchText) ?? false
        }
    }

    var body: some View {
        List(filteredCompanies, id: \.id) { company in
            NavigationLink(value: company.id) {
                VStack(alignment: .leading) {
                    Text(company.companyName ?? "—")
                        .fontWeight(.medium)
                    if let industry = company.industry {
                        Text(industry)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search companies...")
        .navigationTitle("Companies")
        .toolbar {
            Button { /* TODO: new company sheet */ } label: {
                Image(systemName: "plus")
            }
        }
    }
}

/// Mirrors src/components/companies/Company360Page.tsx
struct Company360View: View {
    let companyId: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading) {
                // TODO: Company detail with linked contacts, opportunities, projects
                Text("Company detail — coming soon")
            }
            .padding()
        }
        .navigationTitle("Company")
    }
}

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
