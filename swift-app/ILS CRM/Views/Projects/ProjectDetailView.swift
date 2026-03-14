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
    @Bindable var project: Project
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    @State private var showDeleteConfirm = false

    // MARK: - Formatters

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

    // MARK: - Save Field

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "status": project.status = str
        case "engagementType":
            project.engagementType = str?.components(separatedBy: ",")
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty } ?? []
        case "contractValue":
            if let s = str, let d = Double(s) { project.contractValue = d }
            else { project.contractValue = nil }
        case "location": project.location = str
        case "startDate":
            if let s = str {
                let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
                project.startDate = f.date(from: s)
            } else { project.startDate = nil }
        case "targetCompletion":
            if let s = str {
                let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]
                project.targetCompletion = f.date(from: s)
            } else { project.targetCompletion = nil }
        case "projectDescription": project.projectDescription = str
        case "keyMilestones": project.keyMilestones = str
        default: break
        }
        project.localModifiedAt = Date()
        project.isPendingPush = true
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
                    EditableFieldRow(label: "Start Date", key: "startDate", type: .date,
                        value: project.startDate.map { ISO8601DateFormatter().string(from: $0) },
                        onSave: saveField)
                    EditableFieldRow(label: "End Date", key: "targetCompletion", type: .date,
                        value: project.targetCompletion.map { ISO8601DateFormatter().string(from: $0) },
                        onSave: saveField)
                    EditableFieldRow(label: "Status", key: "status",
                        type: .singleSelect(options: [
                            "Kickoff", "Discovery", "Concept Development", "Design Development",
                            "Production", "Installation", "Opening/Launch", "Closeout",
                            "Complete", "On Hold", "Cancelled", "Strategy"
                        ]), value: project.status, onSave: saveField)
                    EditableFieldRow(label: "Engagement", key: "engagementType",
                        type: .multiSelect(options: [
                            "Strategy/Consulting", "Design/Concept Development",
                            "Production/Fabrication Oversight", "Opening/Operations Support"
                        ]), value: project.engagementType.joined(separator: ", "), onSave: saveField)
                    EditableFieldRow(label: "Contract Value", key: "contractValue",
                        type: .number(prefix: "$"),
                        value: project.contractValue.map { String(format: "%.0f", $0) },
                        onSave: saveField)
                    EditableFieldRow(label: "Location", key: "location", type: .text,
                        value: project.location, onSave: saveField)
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

                // DESCRIPTION section
                DetailSection(title: "DESCRIPTION") {
                    EditableFieldRow(label: "", key: "projectDescription", type: .textarea,
                        value: project.projectDescription, onSave: saveField)
                }
                .padding(.horizontal, 16)

                // KEY MILESTONES section
                DetailSection(title: "KEY MILESTONES") {
                    EditableFieldRow(label: "", key: "keyMilestones", type: .textarea,
                        value: project.keyMilestones, onSave: saveField)
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
