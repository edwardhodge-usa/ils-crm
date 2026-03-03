import SwiftUI
import SwiftData

/// Interactions list — mirrors src/components/interactions/InteractionListPage.tsx
///
/// Features to implement:
/// - List with subject, date, type, direction
/// - Table view toggle (InteractionsPage.tsx)
/// - Detail view with linked contacts and opportunities
/// - Log interaction quick sheet (LogInteractionSheet.tsx)
struct InteractionsView: View {
    @Query(sort: \Interaction.date, order: .reverse) private var interactions: [Interaction]

    var body: some View {
        List(interactions, id: \.id) { interaction in
            VStack(alignment: .leading) {
                Text(interaction.subject ?? "—")
                    .fontWeight(.medium)
                HStack {
                    if let type = interaction.type {
                        Text(type)
                            .font(.caption)
                    }
                    if let date = interaction.date {
                        Text(date, style: .date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Interactions")
        .toolbar {
            Button { /* TODO: new interaction / log sheet */ } label: {
                Image(systemName: "plus")
            }
        }
    }
}

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
