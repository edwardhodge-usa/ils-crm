import SwiftUI
import SwiftData

/// Project detail view — mirrors src/components/projects/Project360Page.tsx
///
/// Displays all project fields organized into Form sections:
/// - Header with avatar, name, status
/// - Project Info (location, contract value, engagement type, dates)
/// - Description
/// - Key Milestones
/// - Lessons Learned
/// - Linked Records (opportunities, clients, contacts, tasks)
/// - Details (modified date, record ID)
///
/// Only shows sections/rows where data is non-nil and non-empty.
struct ProjectDetailView: View {
    let project: Project

    private var displayName: String {
        project.projectName ?? "Unknown"
    }

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

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                headerSection
                    .padding(.bottom, 16)

                Form {
                    projectInfoSection
                    descriptionSection
                    milestonesSection
                    lessonsLearnedSection
                    linkedRecordsSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
        .navigationTitle(displayName)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(name: displayName, size: 64)

            Text(displayName)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let location = project.location, !location.isEmpty {
                Text(location)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let status = project.status, !status.isEmpty {
                StatusBadge(text: status, color: statusColor(status))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 20)
    }

    // MARK: - Project Info

    @ViewBuilder
    private var projectInfoSection: some View {
        let hasLocation = project.location?.isEmpty == false
        let hasContractValue = project.contractValue != nil
        let hasEngagement = !project.engagementType.isEmpty
        let hasStartDate = project.startDate != nil
        let hasTargetCompletion = project.targetCompletion != nil
        let hasActualCompletion = project.actualCompletion != nil
        let hasStatus = project.status?.isEmpty == false

        let hasAny = hasLocation || hasContractValue || hasEngagement ||
                     hasStartDate || hasTargetCompletion || hasActualCompletion || hasStatus

        if hasAny {
            Section("Project Info") {
                if let status = project.status, !status.isEmpty {
                    FieldRow(label: "Status", value: status)
                }

                if let location = project.location, !location.isEmpty {
                    FieldRow(label: "Location", value: location)
                }

                if let contractValue = project.contractValue {
                    FieldRow(
                        label: "Contract Value",
                        value: Self.currencyFormatter.string(from: NSNumber(value: contractValue)) ?? "$\(Int(contractValue))"
                    )
                }

                if !project.engagementType.isEmpty {
                    FieldRow(label: "Engagement Type", value: project.engagementType.joined(separator: ", "))
                }

                if let startDate = project.startDate {
                    FieldRow(label: "Start Date", value: Self.dateFormatter.string(from: startDate))
                }

                if let targetCompletion = project.targetCompletion {
                    FieldRow(label: "Target Completion", value: Self.dateFormatter.string(from: targetCompletion))
                }

                if let actualCompletion = project.actualCompletion {
                    FieldRow(label: "Actual Completion", value: Self.dateFormatter.string(from: actualCompletion))
                }
            }
        }
    }

    // MARK: - Description

    @ViewBuilder
    private var descriptionSection: some View {
        if let description = project.projectDescription, !description.isEmpty {
            Section("Description") {
                Text(description)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Key Milestones

    @ViewBuilder
    private var milestonesSection: some View {
        if let milestones = project.keyMilestones, !milestones.isEmpty {
            Section("Key Milestones") {
                Text(milestones)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Lessons Learned

    @ViewBuilder
    private var lessonsLearnedSection: some View {
        if let lessons = project.lessonsLearned, !lessons.isEmpty {
            Section("Lessons Learned") {
                Text(lessons)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Linked Records

    @ViewBuilder
    private var linkedRecordsSection: some View {
        let hasOpportunities = !project.salesOpportunitiesIds.isEmpty
        let hasClients = !project.clientIds.isEmpty
        let hasPrimaryContacts = !project.primaryContactIds.isEmpty
        let hasContacts = !project.contactsIds.isEmpty
        let hasTasks = !project.tasksIds.isEmpty

        let hasAny = hasOpportunities || hasClients || hasPrimaryContacts || hasContacts || hasTasks

        if hasAny {
            Section("Linked Records") {
                if hasOpportunities {
                    FieldRow(label: "Opportunities", value: "\(project.salesOpportunitiesIds.count)")
                }

                if hasClients {
                    FieldRow(label: "Clients", value: "\(project.clientIds.count)")
                }

                if hasPrimaryContacts {
                    FieldRow(label: "Primary Contacts", value: "\(project.primaryContactIds.count)")
                }

                if hasContacts {
                    FieldRow(label: "Contacts", value: "\(project.contactsIds.count)")
                }

                if hasTasks {
                    FieldRow(label: "Tasks", value: "\(project.tasksIds.count)")
                }
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let modified = project.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            if let localModified = project.localModifiedAt {
                FieldRow(label: "Local Modified", value: localModified.formatted(date: .abbreviated, time: .shortened))
            }

            HStack {
                Text("Record ID")
                    .foregroundStyle(.secondary)
                Spacer()
                Text(project.id)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .textSelection(.enabled)
            }
            .frame(minHeight: 28)
        }
    }

    // MARK: - Helpers

    private func statusColor(_ status: String) -> Color {
        let lower = status.lowercased()
        if lower.contains("active") || lower.contains("in progress") { return .blue }
        if lower.contains("complete") || lower.contains("done") { return .green }
        if lower.contains("on hold") || lower.contains("paused") { return .orange }
        if lower.contains("cancel") { return .red }
        if lower.contains("planning") || lower.contains("planned") { return .purple }
        if lower.contains("proposal") { return .teal }
        return .secondary
    }
}
