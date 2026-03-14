import SwiftUI
import SwiftData

/// Interaction detail view — mirrors src/components/interactions/InteractionDetailPage.tsx
///
/// Shows all interaction fields with inline editing:
/// - Header with type icon + subject + badges
/// - Interaction Info: subject, type, direction, date (editable)
/// - Summary + Next Steps (editable textarea)
/// - Linked Records (contacts, opportunities)
/// - Details: timestamps, record ID
struct InteractionDetailView: View {
    @Bindable var interaction: Interaction

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

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

    // MARK: - Save Field

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "subject": interaction.subject = str
        case "type": interaction.type = str
        case "direction": interaction.direction = str
        case "date":
            if let s = str {
                interaction.date = Self.isoFormatter.date(from: s)
            } else { interaction.date = nil }
        case "summary": interaction.summary = str
        case "nextSteps": interaction.nextSteps = str
        default: break
        }
        interaction.localModifiedAt = Date()
        interaction.isPendingPush = true
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Hero Header
                header
                    .padding(.horizontal)
                    .padding(.top)

                // Editable Fields
                VStack(alignment: .leading, spacing: 0) {
                    DetailSection(title: "INTERACTION INFO") {
                        EditableFieldRow(label: "Subject", key: "subject", type: .text,
                            value: interaction.subject, onSave: saveField)
                        EditableFieldRow(label: "Type", key: "type",
                            type: .singleSelect(options: [
                                "📧 Email", "📞 Phone Call", "🤝 Meeting (In-Person)",
                                "💻 Meeting (Virtual)", "🍽️ Lunch/Dinner",
                                "🎪 Conference/Event", "📝 Note"
                            ]), value: interaction.type, onSave: saveField)
                        EditableFieldRow(label: "Direction", key: "direction",
                            type: .singleSelect(options: [
                                "Outbound (we initiated)", "Inbound (they initiated)"
                            ]), value: interaction.direction, onSave: saveField)
                        EditableFieldRow(label: "Date", key: "date", type: .date,
                            value: interaction.date.map {
                                Self.isoFormatter.string(from: $0)
                            },
                            onSave: saveField)
                    }

                    DetailSection(title: "SUMMARY") {
                        EditableFieldRow(label: "", key: "summary", type: .textarea,
                            value: interaction.summary, onSave: saveField)
                    }

                    DetailSection(title: "NEXT STEPS") {
                        EditableFieldRow(label: "", key: "nextSteps", type: .textarea,
                            value: interaction.nextSteps, onSave: saveField)
                    }

                    if hasLinkedRecords {
                        DetailSection(title: "LINKED RECORDS") {
                            if linkedContacts > 0 {
                                DetailFieldRow(label: "Contacts", value: "\(linkedContacts)")
                            }
                            if linkedOpportunities > 0 {
                                DetailFieldRow(label: "Opportunities", value: "\(linkedOpportunities)")
                            }
                        }
                    }

                    DetailSection(title: "DETAILS") {
                        if let modified = formattedDateTime(interaction.airtableModifiedAt) {
                            DetailFieldRow(label: "Last Modified", value: modified)
                        }
                        if let localMod = formattedDateTime(interaction.localModifiedAt) {
                            DetailFieldRow(label: "Local Modified", value: localMod)
                        }
                        DetailFieldRow(label: "Record ID", value: interaction.id)
                    }
                }
                .padding(.horizontal, 16)
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
}
