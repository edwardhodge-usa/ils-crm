import SwiftUI

/// Interaction detail view — mirrors src/components/interactions/InteractionDetailPage.tsx
///
/// Shows all interaction fields in grouped form:
/// - Header with type icon + subject
/// - Interaction Info: type, date, direction
/// - Summary + Next Steps (if present)
/// - Linked Records (contacts, opportunities)
/// - Details: timestamps, record ID
struct InteractionDetailView: View {
    let interaction: Interaction

    // MARK: - Date Formatting

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    private static let dateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return f
    }()

    private func formatted(_ date: Date?) -> String? {
        guard let date else { return nil }
        return Self.dateFormatter.string(from: date)
    }

    private func formattedDateTime(_ date: Date?) -> String? {
        guard let date else { return nil }
        return Self.dateTimeFormatter.string(from: date)
    }

    // MARK: - Icon Helpers

    private var typeIcon: String {
        guard let type = interaction.type?.lowercased() else { return "bubble.left" }
        if type.contains("call") || type.contains("phone") { return "phone.fill" }
        if type.contains("email") || type.contains("mail") { return "envelope.fill" }
        if type.contains("meeting") || type.contains("in-person") || type.contains("in person") { return "person.2.fill" }
        if type.contains("video") || type.contains("zoom") || type.contains("teams") { return "video.fill" }
        if type.contains("text") || type.contains("sms") || type.contains("message") { return "message.fill" }
        if type.contains("linkedin") || type.contains("social") { return "network" }
        if type.contains("note") { return "note.text" }
        return "bubble.left"
    }

    private var typeColor: Color {
        guard let type = interaction.type?.lowercased() else { return .secondary }
        if type.contains("call") || type.contains("phone") { return .green }
        if type.contains("email") || type.contains("mail") { return .blue }
        if type.contains("meeting") || type.contains("in-person") || type.contains("in person") { return .purple }
        if type.contains("video") || type.contains("zoom") || type.contains("teams") { return .orange }
        if type.contains("text") || type.contains("sms") || type.contains("message") { return .teal }
        if type.contains("linkedin") || type.contains("social") { return .indigo }
        if type.contains("note") { return .yellow }
        return .secondary
    }

    // MARK: - Linked Records

    private var linkedContacts: Int { interaction.contactsIds.count }
    private var linkedOpportunities: Int { interaction.salesOpportunitiesIds.count }
    private var hasLinkedRecords: Bool {
        linkedContacts > 0 || linkedOpportunities > 0
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                header
                    .padding(.horizontal)
                    .padding(.top)

                // Form Content
                Form {
                    interactionInfoSection

                    if let summary = interaction.summary, !summary.isEmpty {
                        summarySection(summary)
                    }

                    if let nextSteps = interaction.nextSteps, !nextSteps.isEmpty {
                        nextStepsSection(nextSteps)
                    }

                    if hasLinkedRecords {
                        linkedRecordsSection
                    }

                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: typeIcon)
                .font(.system(size: 20))
                .foregroundStyle(typeColor)
                .frame(width: 36, height: 36)
                .background(typeColor.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(interaction.subject ?? "Untitled Interaction")
                    .font(.title2)
                    .fontWeight(.bold)

                HStack(spacing: 8) {
                    if let type = interaction.type, !type.isEmpty {
                        BadgeView(text: type, color: typeColor)
                    }
                    if let direction = interaction.direction, !direction.isEmpty {
                        BadgeView(
                            text: direction,
                            color: direction.lowercased().contains("inbound") ? .green : .blue
                        )
                    }
                }
            }
        }
    }

    // MARK: - Interaction Info Section

    private var interactionInfoSection: some View {
        Section("Interaction Info") {
            if let type = interaction.type, !type.isEmpty {
                HStack {
                    Text("Type")
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 6) {
                        Image(systemName: typeIcon)
                            .font(.caption)
                            .foregroundStyle(typeColor)
                        Text(type)
                    }
                }
                .frame(minHeight: 28)
            }

            if let date = interaction.date, let formatted = formatted(date) {
                FieldRow(label: "Date", value: formatted)
            }

            if let direction = interaction.direction, !direction.isEmpty {
                HStack {
                    Text("Direction")
                        .foregroundStyle(.secondary)
                    Spacer()
                    BadgeView(
                        text: direction,
                        color: direction.lowercased().contains("inbound") ? .green : .blue
                    )
                }
                .frame(minHeight: 28)
            }
        }
    }

    // MARK: - Summary Section

    private func summarySection(_ summary: String) -> some View {
        Section("Summary") {
            Text(summary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Next Steps Section

    private func nextStepsSection(_ nextSteps: String) -> some View {
        Section("Next Steps") {
            Text(nextSteps)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Linked Records Section

    private var linkedRecordsSection: some View {
        Section("Linked Records") {
            if linkedContacts > 0 {
                FieldRow(label: "Contacts", value: "\(linkedContacts)")
            }
            if linkedOpportunities > 0 {
                FieldRow(label: "Opportunities", value: "\(linkedOpportunities)")
            }
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        Section("Details") {
            if let modified = formattedDateTime(interaction.airtableModifiedAt) {
                FieldRow(label: "Last Modified", value: modified)
            }

            if let localMod = formattedDateTime(interaction.localModifiedAt) {
                FieldRow(label: "Local Modified", value: localMod)
            }

            Text(interaction.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
        }
    }
}
