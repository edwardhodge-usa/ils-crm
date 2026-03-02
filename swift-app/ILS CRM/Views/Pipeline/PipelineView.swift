import SwiftUI
import SwiftData

/// Pipeline / Kanban — mirrors src/components/pipeline/PipelinePage.tsx
///
/// Features to implement:
/// - Kanban board with columns per salesStage (drag-and-drop)
/// - List view toggle
/// - Deal cards showing opportunity name, value, company
/// - Stage progress bar
/// - Click to open deal detail (Electron bug: click vs drag not differentiated)
///
/// SwiftUI approach: LazyHStack of columns, each a LazyVStack of cards.
/// Drag-and-drop via .draggable() / .dropDestination() (iOS 16+/macOS 13+).
///
/// Electron uses @dnd-kit for Kanban — Swift has native DnD support.
struct PipelineView: View {
    @Query private var opportunities: [Opportunity]
    @State private var showListView = false

    var body: some View {
        VStack {
            // TODO: Kanban board with stage columns
            // TODO: List view toggle
            // TODO: Deal cards with drag-and-drop stage changes

            if showListView {
                List(opportunities, id: \.id) { opp in
                    VStack(alignment: .leading) {
                        Text(opp.opportunityName ?? "—")
                            .fontWeight(.medium)
                        if let stage = opp.salesStage {
                            Text(stage)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } else {
                Text("Kanban board — coming soon")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Pipeline")
        .toolbar {
            Toggle("List", isOn: $showListView)
                .toggleStyle(.switch)
            Button { /* TODO: new opportunity */ } label: {
                Image(systemName: "plus")
            }
        }
    }
}

/// Mirrors src/components/pipeline/DealDetail.tsx
struct DealDetailView: View {
    let opportunityId: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading) {
                Text("Deal detail — coming soon")
            }
            .padding()
        }
        .navigationTitle("Opportunity")
    }
}

/// Mirrors src/components/pipeline/OpportunityForm.tsx
struct OpportunityFormView: View {
    let opportunityId: String?

    var body: some View {
        Form {
            Text("Opportunity form — coming soon")
        }
        .navigationTitle(opportunityId == nil ? "New Opportunity" : "Edit Opportunity")
    }
}
