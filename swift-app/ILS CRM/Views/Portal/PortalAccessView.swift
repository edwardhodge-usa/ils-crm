import SwiftUI
import SwiftData

/// Portal Access list — flat list of portal access records with search,
/// status badges, and sheet-based detail presentation.
///
/// Mirrors the Electron Portal Access page but uses a simpler flat list
/// instead of the "By Page" / "By Person" tab views.
struct PortalAccessView: View {
    @Query(sort: \PortalAccessRecord.name) private var records: [PortalAccessRecord]
    @State private var searchText = ""
    @State private var selectedRecord: PortalAccessRecord?

    // MARK: - Filtered Data

    private var filteredRecords: [PortalAccessRecord] {
        if searchText.isEmpty { return records }
        let query = searchText
        return records.filter { record in
            (record.name?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.email?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.pageAddress?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.company?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactNameLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactCompanyLookup?.localizedCaseInsensitiveContains(query) ?? false) ||
            (record.contactEmailLookup?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if records.isEmpty {
                EmptyStateView(
                    title: "No portal access records",
                    description: "Portal access records will appear here once synced from Airtable.",
                    systemImage: "globe"
                )
            } else if filteredRecords.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No portal access records match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                recordList
            }
        }
        .searchable(text: $searchText, prompt: "Search portal access...")
        .navigationTitle("Client Portal")
        .sheet(item: $selectedRecord) { record in
            PortalAccessDetailView(record: record)
                .frame(minWidth: 480, minHeight: 600)
        }
    }

    // MARK: - Record List

    private var recordList: some View {
        List {
            ForEach(filteredRecords, id: \.id) { record in
                Button {
                    selectedRecord = record
                } label: {
                    recordRow(record)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.inset)
    }

    // MARK: - Record Row

    private func recordRow(_ record: PortalAccessRecord) -> some View {
        HStack(spacing: 12) {
            AvatarView(name: displayName(for: record), size: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(displayName(for: record))
                    .font(.body)
                    .lineLimit(1)

                if let subtitle = rowSubtitle(for: record) {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let status = record.status, !status.isEmpty {
                BadgeView(
                    text: status,
                    color: statusColor(status)
                )
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    /// Best display name: direct name, then contact lookup, then email, then page address.
    private func displayName(for record: PortalAccessRecord) -> String {
        if let name = record.name, !name.isEmpty { return name }
        if let lookup = record.contactNameLookup, !lookup.isEmpty { return lookup }
        if let email = record.email, !email.isEmpty { return email }
        if let page = record.pageAddress, !page.isEmpty { return page }
        return "Unknown"
    }

    /// Subtitle: page address if name exists, otherwise email or company.
    private func rowSubtitle(for record: PortalAccessRecord) -> String? {
        if let page = record.pageAddress, !page.isEmpty {
            return page
        }
        if let email = record.email ?? record.contactEmailLookup, !email.isEmpty {
            return email
        }
        if let company = record.company ?? record.contactCompanyLookup, !company.isEmpty {
            return company
        }
        return nil
    }

    /// Status color: ACTIVE = green, IN-ACTIVE = red, others = secondary.
    private func statusColor(_ status: String) -> Color {
        let upper = status.uppercased()
        if upper.contains("ACTIVE") && !upper.contains("IN-ACTIVE") && !upper.contains("INACTIVE") {
            return .green
        }
        if upper.contains("IN-ACTIVE") || upper.contains("INACTIVE") {
            return .red
        }
        return .secondary
    }
}

// MARK: - Preview

#Preview {
    let record = PortalAccessRecord(id: "recTest1", name: "Haus Collection")
    record.pageAddress = "haus-collection"
    record.email = "client@example.com"
    record.status = "ACTIVE"
    record.stage = "Live"
    record.company = "Haus Group"

    return NavigationStack {
        PortalAccessView()
    }
    .modelContainer(for: PortalAccessRecord.self, inMemory: true)
}
