import SwiftUI
import SwiftData

/// Command Palette -- Cmd+K global search across all CRM entities.
/// Mirrors Electron's CommandPalette.tsx.
///
/// NOTE: Uses @Binding isPresented instead of @Environment(\.dismiss) per
/// project lesson: dismiss is unreliable in macOS sheets.
/// NOTE: Uses fetch-all + in-memory .filter{} instead of #Predicate per
/// project lesson: #Predicate crashes on macOS 26.4 beta.
struct CommandPaletteView: View {
    @Environment(\.modelContext) private var modelContext
    @Binding var isPresented: Bool
    @State private var searchText = ""

    /// Called when user selects a result -- passes the NavItem to navigate to.
    var onNavigate: (NavItem) -> Void

    // MARK: - Entity Type

    enum EntityType: String, CaseIterable {
        case contact = "Contacts"
        case company = "Companies"
        case opportunity = "Pipeline"
        case project = "Projects"
        case proposal = "Proposals"
        case task = "Tasks"
        case interaction = "Interactions"

        var icon: String {
            switch self {
            case .contact: return "person.2"
            case .company: return "building.2"
            case .opportunity: return "chart.bar.horizontal.page"
            case .project: return "folder"
            case .proposal: return "doc.text"
            case .task: return "checklist"
            case .interaction: return "bubble.left.and.bubble.right"
            }
        }

        var navItem: NavItem {
            switch self {
            case .contact: return .contacts
            case .company: return .companies
            case .opportunity: return .pipeline
            case .project: return .projects
            case .proposal: return .proposals
            case .task: return .tasks
            case .interaction: return .interactions
            }
        }

        var badgeColor: Color {
            switch self {
            case .contact: return .blue
            case .company: return .purple
            case .opportunity: return .green
            case .project: return .orange
            case .proposal: return .indigo
            case .task: return .red
            case .interaction: return .teal
            }
        }
    }

    // MARK: - Search Result

    struct SearchResult: Identifiable {
        let id: String
        let name: String
        let subtitle: String?
        let entityType: EntityType
    }

    // MARK: - Results Computation

    private var results: [EntityType: [SearchResult]] {
        guard !searchText.isEmpty else { return [:] }
        let query = searchText
        var grouped: [EntityType: [SearchResult]] = [:]

        // Contacts
        let contacts = (try? modelContext.fetch(FetchDescriptor<Contact>())) ?? []
        let contactResults = contacts.filter {
            $0.contactName?.localizedCaseInsensitiveContains(query) ?? false ||
            $0.email?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.contactName ?? "Unknown", subtitle: $0.jobTitle, entityType: .contact)
        }
        if !contactResults.isEmpty { grouped[.contact] = Array(contactResults) }

        // Companies
        let companies = (try? modelContext.fetch(FetchDescriptor<Company>())) ?? []
        let companyResults = companies.filter {
            $0.companyName?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.companyName ?? "Unknown", subtitle: $0.industry, entityType: .company)
        }
        if !companyResults.isEmpty { grouped[.company] = Array(companyResults) }

        // Opportunities
        let opps = (try? modelContext.fetch(FetchDescriptor<Opportunity>())) ?? []
        let oppResults = opps.filter {
            $0.opportunityName?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.opportunityName ?? "Unknown", subtitle: $0.salesStage, entityType: .opportunity)
        }
        if !oppResults.isEmpty { grouped[.opportunity] = Array(oppResults) }

        // Projects
        let projects = (try? modelContext.fetch(FetchDescriptor<Project>())) ?? []
        let projectResults = projects.filter {
            $0.projectName?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.projectName ?? "Unknown", subtitle: $0.status, entityType: .project)
        }
        if !projectResults.isEmpty { grouped[.project] = Array(projectResults) }

        // Proposals
        let proposals = (try? modelContext.fetch(FetchDescriptor<Proposal>())) ?? []
        let proposalResults = proposals.filter {
            $0.proposalName?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.proposalName ?? "Unknown", subtitle: $0.status, entityType: .proposal)
        }
        if !proposalResults.isEmpty { grouped[.proposal] = Array(proposalResults) }

        // Tasks
        let tasks = (try? modelContext.fetch(FetchDescriptor<CRMTask>())) ?? []
        let taskResults = tasks.filter {
            $0.task?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.task ?? "Unknown", subtitle: $0.status, entityType: .task)
        }
        if !taskResults.isEmpty { grouped[.task] = Array(taskResults) }

        // Interactions
        let interactions = (try? modelContext.fetch(FetchDescriptor<Interaction>())) ?? []
        let interactionResults = interactions.filter {
            $0.subject?.localizedCaseInsensitiveContains(query) ?? false
        }.prefix(5).map {
            SearchResult(id: $0.id, name: $0.subject ?? "Unknown", subtitle: $0.type, entityType: .interaction)
        }
        if !interactionResults.isEmpty { grouped[.interaction] = Array(interactionResults) }

        return grouped
    }

    private var totalResults: Int {
        results.values.reduce(0) { $0 + $1.count }
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            searchField
            Divider()
            resultsList
        }
        .frame(width: 500, height: 400)
    }

    // MARK: - Search Field

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16))
                .foregroundStyle(.secondary)
            TextField("Search all records...", text: $searchText)
                .font(.system(size: 15))
                .textFieldStyle(.plain)
            Text("Cmd+K")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.tertiary)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(Color.secondary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Results List

    @ViewBuilder
    private var resultsList: some View {
        if searchText.isEmpty {
            emptyPrompt(icon: "magnifyingglass", message: "Type to search across all records")
        } else if totalResults == 0 {
            emptyPrompt(icon: "magnifyingglass", message: "No results for \"\(searchText)\"")
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(EntityType.allCases, id: \.self) { entityType in
                        if let items = results[entityType], !items.isEmpty {
                            sectionHeader(entityType.rawValue)
                            ForEach(items) { item in
                                resultRow(item: item, entityType: entityType)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Private Methods

    private func emptyPrompt(icon: String, message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundStyle(.tertiary)
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 40)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 4)
    }

    private func resultRow(item: SearchResult, entityType: EntityType) -> some View {
        Button {
            onNavigate(entityType.navItem)
            isPresented = false
        } label: {
            HStack(spacing: 10) {
                Image(systemName: entityType.icon)
                    .font(.system(size: 13))
                    .foregroundStyle(entityType.badgeColor)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 1) {
                    Text(item.name)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    if let subtitle = item.subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Text(entityType.rawValue)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(entityType.badgeColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(entityType.badgeColor.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
