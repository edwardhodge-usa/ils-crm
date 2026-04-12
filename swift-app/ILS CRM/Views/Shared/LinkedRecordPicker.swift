import SwiftUI
import SwiftData

// MARK: - LinkedEntityType

/// Identifies which entity table to pick from.
enum LinkedEntityType {
    case contacts
    case companies
    case opportunities
    case projects
    case proposals
}

// MARK: - LinkedRecordPicker

/// Reusable sheet for picking linked records to associate with another entity.
/// Mirrors the Electron app's linked-record picker pattern.
///
/// Because SwiftUI's @Query cannot be parameterized dynamically at runtime,
/// we use separate private sub-views per entity type, each with its own @Query.
struct LinkedRecordPicker: View {
    let title: String
    let entityType: LinkedEntityType
    let currentIds: Set<String>
    let onSave: (Set<String>) -> Void

    @State private var selectedIds: Set<String>
    @State private var searchText = ""
    @Environment(\.dismiss) private var dismiss

    init(title: String, entityType: LinkedEntityType, currentIds: Set<String>, onSave: @escaping (Set<String>) -> Void) {
        self.title = title
        self.entityType = entityType
        self.currentIds = currentIds
        self.onSave = onSave
        self._selectedIds = State(initialValue: currentIds)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search...", text: $searchText)
                        .textFieldStyle(.plain)
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(.systemGray6))
                )
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                Divider()
                entityList
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        onSave(selectedIds)
                        dismiss()
                    }
                }
            }
        }
        #if os(macOS)
        .frame(width: 400, height: 480)
        #else
        .presentationDetents([.medium, .large])
        #endif
    }

    @ViewBuilder
    private var entityList: some View {
        switch entityType {
        case .contacts:
            ContactPickerList(selectedIds: $selectedIds, searchText: searchText)
        case .companies:
            CompanyPickerList(selectedIds: $selectedIds, searchText: searchText)
        case .opportunities:
            OpportunityPickerList(selectedIds: $selectedIds, searchText: searchText)
        case .projects:
            ProjectPickerList(selectedIds: $selectedIds, searchText: searchText)
        case .proposals:
            ProposalPickerList(selectedIds: $selectedIds, searchText: searchText)
        }
    }
}

// MARK: - ContactPickerList

private struct ContactPickerList: View {
    @Binding var selectedIds: Set<String>
    let searchText: String

    @Query(sort: \Contact.contactName) private var allContacts: [Contact]

    private var filtered: [Contact] {
        if searchText.isEmpty { return allContacts }
        let query = searchText
        return allContacts.filter {
            ($0.contactName ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        if filtered.isEmpty {
            emptyState
        } else {
            List(filtered, id: \.id) { contact in
                PickerRow(
                    isSelected: selectedIds.contains(contact.id),
                    name: contact.contactName ?? "Unknown",
                    photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) },
                    shape: .circle
                ) {
                    toggleSelection(contact.id)
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(searchText.isEmpty ? "No contacts available" : "No contacts match \"\(searchText)\"")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }
}

// MARK: - CompanyPickerList

private struct CompanyPickerList: View {
    @Binding var selectedIds: Set<String>
    let searchText: String

    @Query(sort: \Company.companyName) private var allCompanies: [Company]

    private var filtered: [Company] {
        if searchText.isEmpty { return allCompanies }
        let query = searchText
        return allCompanies.filter {
            ($0.companyName ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        if filtered.isEmpty {
            emptyState
        } else {
            List(filtered, id: \.id) { company in
                PickerRow(
                    isSelected: selectedIds.contains(company.id),
                    name: company.companyName ?? "Unknown",
                    photoURL: company.logoUrl.flatMap { URL(string: $0) },
                    shape: .roundedRect
                ) {
                    toggleSelection(company.id)
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(searchText.isEmpty ? "No companies available" : "No companies match \"\(searchText)\"")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }
}

// MARK: - OpportunityPickerList

private struct OpportunityPickerList: View {
    @Binding var selectedIds: Set<String>
    let searchText: String

    @Query(sort: \Opportunity.opportunityName) private var allOpportunities: [Opportunity]

    private var filtered: [Opportunity] {
        if searchText.isEmpty { return allOpportunities }
        let query = searchText
        return allOpportunities.filter {
            ($0.opportunityName ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        if filtered.isEmpty {
            emptyState
        } else {
            List(filtered, id: \.id) { opportunity in
                PickerRow(
                    isSelected: selectedIds.contains(opportunity.id),
                    name: opportunity.opportunityName ?? "Unknown",
                    photoURL: nil,
                    shape: .roundedRect
                ) {
                    toggleSelection(opportunity.id)
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(searchText.isEmpty ? "No opportunities available" : "No opportunities match \"\(searchText)\"")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }
}

// MARK: - ProjectPickerList

private struct ProjectPickerList: View {
    @Binding var selectedIds: Set<String>
    let searchText: String

    @Query(sort: \Project.projectName) private var allProjects: [Project]

    private var filtered: [Project] {
        if searchText.isEmpty { return allProjects }
        let query = searchText
        return allProjects.filter {
            ($0.projectName ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        if filtered.isEmpty {
            emptyState
        } else {
            List(filtered, id: \.id) { project in
                PickerRow(
                    isSelected: selectedIds.contains(project.id),
                    name: project.projectName ?? "Unknown",
                    photoURL: nil,
                    shape: .roundedRect
                ) {
                    toggleSelection(project.id)
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(searchText.isEmpty ? "No projects available" : "No projects match \"\(searchText)\"")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }
}

// MARK: - ProposalPickerList

private struct ProposalPickerList: View {
    @Binding var selectedIds: Set<String>
    let searchText: String

    @Query(sort: \Proposal.proposalName) private var allProposals: [Proposal]

    private var filtered: [Proposal] {
        if searchText.isEmpty { return allProposals }
        let query = searchText
        return allProposals.filter {
            ($0.proposalName ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        if filtered.isEmpty {
            emptyState
        } else {
            List(filtered, id: \.id) { proposal in
                PickerRow(
                    isSelected: selectedIds.contains(proposal.id),
                    name: proposal.proposalName ?? "Unknown",
                    photoURL: nil,
                    shape: .roundedRect
                ) {
                    toggleSelection(proposal.id)
                }
            }
            .listStyle(.plain)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(searchText.isEmpty ? "No proposals available" : "No proposals match \"\(searchText)\"")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }
}

// MARK: - PickerRow (shared row view)

/// Reusable row for all picker lists: checkmark + avatar + name.
private struct PickerRow: View {
    let isSelected: Bool
    let name: String
    let photoURL: URL?
    let shape: AvatarShape
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .imageScale(.large)
                    .foregroundStyle(isSelected ? Color.accentColor : .secondary)

                AvatarView(name: name, avatarSize: .small, photoURL: photoURL, shape: shape)

                Text(name)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(name)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Preview

#Preview {
    LinkedRecordPicker(
        title: "Link Contacts",
        entityType: .contacts,
        currentIds: [],
        onSave: { _ in }
    )
    .modelContainer(for: [Contact.self, Company.self, Opportunity.self, Project.self, Proposal.self], inMemory: true)
}
