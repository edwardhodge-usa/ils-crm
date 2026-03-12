import SwiftUI
import SwiftData

/// Pipeline / Kanban — mirrors src/components/pipeline/PipelinePage.tsx
///
/// Kanban board with 7 stage columns. Each column shows opportunity cards
/// with name, deal value, and expected close date. Tap a card to open detail sheet.
struct PipelineView: View {
    @Query private var opportunities: [Opportunity]
    @State private var selectedOpportunity: Opportunity?

    private let stages = [
        "Prospecting", "Qualified", "Business Development",
        "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"
    ]

    private let stageColors: [String: Color] = [
        "Prospecting": .yellow,
        "Qualified": .orange,
        "Business Development": .purple,
        "Proposal Sent": .indigo,
        "Negotiation": .teal,
        "Closed Won": .green,
        "Closed Lost": .red
    ]

    var body: some View {
        Group {
            if opportunities.isEmpty {
                EmptyStateView(
                    title: "No Opportunities",
                    description: "Opportunities will appear here once synced from Airtable.",
                    systemImage: "chart.bar.xaxis"
                )
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(stages, id: \.self) { stage in
                            stageColumn(stage)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Pipeline")
        .sheet(item: $selectedOpportunity) { opp in
            NavigationStack {
                OpportunityDetailView(opportunity: opp)
                    .navigationTitle("Opportunity")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedOpportunity = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 500, minHeight: 600)
        }
    }

    // MARK: - Stage Column

    private func stageColumn(_ stage: String) -> some View {
        let stageOpps = opportunities.filter { $0.salesStage == stage }
        let color = stageColors[stage] ?? .gray

        return VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Circle()
                    .fill(color)
                    .frame(width: 8, height: 8)
                Text(stage)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                Spacer()
                BadgeView(text: "\(stageOpps.count)", color: color)
            }
            .padding(.horizontal, 10)
            .padding(.top, 10)

            // Cards
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 8) {
                    ForEach(stageOpps, id: \.id) { opp in
                        KanbanCard(opportunity: opp)
                            .onTapGesture {
                                selectedOpportunity = opp
                            }
                    }
                }
                .padding(.horizontal, 10)
                .padding(.bottom, 10)
            }
        }
        .frame(width: 220)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Color(.controlBackgroundColor).opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Kanban Card

private struct KanbanCard: View {
    let opportunity: Opportunity

    private var formattedValue: String? {
        guard let value = opportunity.dealValue, value > 0 else { return nil }
        return String(format: "$%,.0f", value)
    }

    private var formattedDate: String? {
        guard let date = opportunity.expectedCloseDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(opportunity.opportunityName ?? "Untitled")
                .font(.body)
                .fontWeight(.medium)
                .lineLimit(2)

            if let value = formattedValue {
                Text(value)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let date = formattedDate {
                Text(date)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Deal Detail (Wave 2 placeholder)

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

// MARK: - Opportunity Form (Wave 2 placeholder)

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
