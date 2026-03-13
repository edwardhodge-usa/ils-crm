import SwiftUI
import SwiftData

/// Project detail view — inline right-pane detail.
/// Mirrors src/components/projects/Project360Page.tsx
///
/// Sections:
/// - Breadcrumb + Name + StatusBadge
/// - StatsRow: Contract Value
/// - PROJECT INFO: Lead, Start/End Date, Status, Engagement Type, Contract Value, Location
/// - RELATED: Contacts, Opportunities
/// - NOTES: Description, Key Milestones
struct ProjectDetailView: View {
    let project: Project
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    @State private var showDeleteConfirm = false

    // MARK: - Formatters

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    // MARK: - Computed Properties

    private var displayName: String {
        project.projectName ?? "Unknown"
    }

    private var formattedContractValue: String {
        guard let value = project.contractValue else { return "—" }
        return Self.currencyFormatter.string(from: NSNumber(value: value)) ?? "—"
    }

    private var formattedStartDate: String {
        guard let date = project.startDate else { return "—" }
        return Self.dateFormatter.string(from: date)
    }

    private var formattedEndDate: String {
        guard let date = project.targetCompletion else { return "—" }
        return Self.dateFormatter.string(from: date)
    }

    private var engagementTypeDisplay: String {
        project.engagementType.isEmpty ? "—" : project.engagementType.joined(separator: ", ")
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header area with edit/delete actions
                headerArea
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 12)

                // Stats row
                StatsRow(items: [
                    (label: "Value", value: formattedContractValue)
                ])
                .padding(.horizontal, 16)
                .padding(.bottom, 4)

                // PROJECT INFO section
                DetailSection(title: "PROJECT INFO") {
                    DetailFieldRow(label: "Project Lead", value: "—")
                    DetailFieldRow(label: "Start Date", value: formattedStartDate)
                    DetailFieldRow(label: "End Date", value: formattedEndDate)
                    DetailFieldRow(
                        label: "Status",
                        value: project.status ?? "—",
                        showChevron: true
                    )
                    DetailFieldRow(
                        label: "Engagement Type",
                        value: engagementTypeDisplay,
                        showChevron: true
                    )
                    DetailFieldRow(label: "Contract Value", value: formattedContractValue)
                    DetailFieldRow(label: "Location", value: project.location ?? "—")
                }
                .padding(.horizontal, 16)

                // RELATED section
                DetailSection(title: "RELATED") {
                    RelatedRecordRow(
                        label: "Contacts",
                        items: [],
                        onAdd: {}
                    )
                    RelatedRecordRow(
                        label: "Opportunities",
                        items: [],
                        onAdd: {}
                    )
                }
                .padding(.horizontal, 16)

                // NOTES section
                DetailSection(title: "NOTES") {
                    notesBlock(label: "Description", text: project.projectDescription)
                    notesBlock(label: "Key Milestones", text: project.keyMilestones)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .confirmationDialog(
            "Delete \(displayName)?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) { onDelete?() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Header Area

    private var headerArea: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Breadcrumb
            Text(displayName)
                .font(.caption)
                .foregroundStyle(.secondary)

            // Name + badge + actions row
            HStack(alignment: .center, spacing: 10) {
                Text(displayName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .lineLimit(2)

                if let status = project.status, !status.isEmpty {
                    StatusBadge(text: status, color: statusColor(status))
                }

                Spacer()

                // Edit button
                Button {
                    onEdit?()
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Edit project")

                // Delete button
                Button {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Delete project")
            }
        }
    }

    // MARK: - Notes Block

    private func notesBlock(label: String, text: String?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .foregroundStyle(.primary)
                Spacer()
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 36)

            Text(text?.isEmpty == false ? text! : "—")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.bottom, 10)
                .textSelection(.enabled)

            Divider()
        }
    }

    // MARK: - Status Color

    private func statusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("active") || lower.contains("in progress") { return .blue }
        if lower.contains("complete") || lower.contains("done") { return .green }
        if lower.contains("on hold") || lower.contains("paused") { return .orange }
        if lower.contains("cancel") { return .red }
        if lower.contains("planning") || lower.contains("planned") { return .purple }
        if lower.contains("discovery") { return .cyan }
        return .secondary
    }
}
