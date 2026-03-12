import SwiftUI
import SwiftData

// MARK: - InteractionsView

/// Interactions list — mirrors src/components/interactions/InteractionListPage.tsx
///
/// Features:
/// - Search by subject, summary, next steps
/// - Type-specific SF Symbol icons (phone, email, meeting, video)
/// - Direction badge, formatted date
/// - Sheet detail on selection
struct InteractionsView: View {
    @Query(sort: \Interaction.date, order: .reverse) private var interactions: [Interaction]
    @State private var searchText = ""
    @State private var selectedInteraction: Interaction?

    // MARK: - Filtered Interactions

    private var filteredInteractions: [Interaction] {
        guard !searchText.isEmpty else { return interactions }
        return interactions.filter { interaction in
            let matchesSubject = interaction.subject?.localizedCaseInsensitiveContains(searchText) ?? false
            let matchesSummary = interaction.summary?.localizedCaseInsensitiveContains(searchText) ?? false
            let matchesNextSteps = interaction.nextSteps?.localizedCaseInsensitiveContains(searchText) ?? false
            let matchesType = interaction.type?.localizedCaseInsensitiveContains(searchText) ?? false
            return matchesSubject || matchesSummary || matchesNextSteps || matchesType
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if filteredInteractions.isEmpty {
                emptyState
            } else {
                interactionList
            }
        }
        .searchable(text: $searchText, prompt: "Search interactions...")
        .navigationTitle("Interactions")
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    // TODO: new interaction / log sheet
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(item: $selectedInteraction) { interaction in
            NavigationStack {
                InteractionDetailView(interaction: interaction)
                    .navigationTitle("Interaction")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedInteraction = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 450, minHeight: 500)
        }
    }

    // MARK: - Interaction List

    private var interactionList: some View {
        List(filteredInteractions, id: \.id, selection: $selectedInteraction) { interaction in
            InteractionRowView(interaction: interaction)
                .contentShape(Rectangle())
                .onTapGesture {
                    selectedInteraction = interaction
                }
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyState: some View {
        if searchText.isEmpty {
            EmptyStateView(
                title: "No Interactions",
                description: "No interactions yet. Log your first interaction.",
                systemImage: "bubble.left.and.bubble.right"
            )
        } else {
            EmptyStateView(
                title: "No Results",
                description: "No interactions match \"\(searchText)\".",
                systemImage: "magnifyingglass"
            )
        }
    }
}

// MARK: - Interaction Row

private struct InteractionRowView: View {
    let interaction: Interaction

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter
    }()

    var body: some View {
        HStack(spacing: 12) {
            // Type icon
            Image(systemName: iconName(for: interaction.type))
                .font(.system(size: 16))
                .foregroundStyle(iconColor(for: interaction.type))
                .frame(width: 28, height: 28)
                .background(iconColor(for: interaction.type).opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 6))

            // Subject and metadata
            VStack(alignment: .leading, spacing: 3) {
                Text(interaction.subject ?? "Untitled")
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let date = interaction.date {
                        Text(Self.dateFormatter.string(from: date))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let type = interaction.type, !type.isEmpty {
                        BadgeView(text: type, color: iconColor(for: type))
                    }
                }
            }

            Spacer()

            // Direction badge
            if let direction = interaction.direction, !direction.isEmpty {
                BadgeView(text: direction, color: directionColor(for: direction))
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Icon Helpers

    private func iconName(for type: String?) -> String {
        guard let type = type?.lowercased() else { return "bubble.left" }
        if type.contains("call") || type.contains("phone") { return "phone.fill" }
        if type.contains("email") || type.contains("mail") { return "envelope.fill" }
        if type.contains("meeting") || type.contains("in-person") || type.contains("in person") { return "person.2.fill" }
        if type.contains("video") || type.contains("zoom") || type.contains("teams") { return "video.fill" }
        if type.contains("text") || type.contains("sms") || type.contains("message") { return "message.fill" }
        if type.contains("linkedin") || type.contains("social") { return "network" }
        if type.contains("note") { return "note.text" }
        return "bubble.left"
    }

    private func iconColor(for type: String?) -> Color {
        guard let type = type?.lowercased() else { return .secondary }
        if type.contains("call") || type.contains("phone") { return .green }
        if type.contains("email") || type.contains("mail") { return .blue }
        if type.contains("meeting") || type.contains("in-person") || type.contains("in person") { return .purple }
        if type.contains("video") || type.contains("zoom") || type.contains("teams") { return .orange }
        if type.contains("text") || type.contains("sms") || type.contains("message") { return .teal }
        if type.contains("linkedin") || type.contains("social") { return .indigo }
        if type.contains("note") { return .yellow }
        return .secondary
    }

    private func directionColor(for direction: String) -> Color {
        let d = direction.lowercased()
        if d.contains("inbound") || d.contains("incoming") { return .green }
        if d.contains("outbound") || d.contains("outgoing") { return .blue }
        return .secondary
    }
}

// MARK: - Interaction Form (placeholder)

/// Mirrors src/components/interactions/InteractionForm.tsx
struct InteractionFormView: View {
    let interactionId: String?

    var body: some View {
        Form {
            Text("Interaction form — coming soon")
        }
        .navigationTitle(interactionId == nil ? "Log Interaction" : "Edit Interaction")
    }
}
