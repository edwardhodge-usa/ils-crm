import SwiftUI
import SwiftData

/// Pipeline / Kanban — mirrors src/components/pipeline/PipelinePage.tsx
///
/// Kanban board with 7 stage columns. Each column shows opportunity cards
/// with name, deal value, and expected close date. Tap a card to open detail sheet.
struct PipelineView: View {
    @Query private var opportunities: [Opportunity]
    @Environment(\.modelContext) private var modelContext
    @State private var selectedOpportunity: Opportunity?
    @State private var showNewOpportunity = false
    @State private var dropTargetedStage: String?

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
        .toolbar {
            Button { showNewOpportunity = true } label: {
                Image(systemName: "plus")
            }
        }
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
        .sheet(isPresented: $showNewOpportunity) {
            NavigationStack {
                OpportunityFormView(opportunity: nil)
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
                            .draggable(opp.id)
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
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    dropTargetedStage == stage ? color : .clear,
                    lineWidth: 2
                )
        )
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(dropTargetedStage == stage ? color.opacity(0.1) : .clear)
        )
        .dropDestination(for: String.self) { droppedItems, _ in
            guard let opportunityId = droppedItems.first else { return false }
            return moveOpportunity(id: opportunityId, toStage: stage)
        } isTargeted: { isTargeted in
            dropTargetedStage = isTargeted ? stage : nil
        }
    }

    /// Fetches an Opportunity by ID and moves it to the given stage.
    /// Returns `true` if the move succeeded.
    @discardableResult
    private func moveOpportunity(id: String, toStage stage: String) -> Bool {
        var descriptor = FetchDescriptor<Opportunity>(
            predicate: #Predicate { $0.id == id }
        )
        descriptor.fetchLimit = 1

        guard let opportunity = try? modelContext.fetch(descriptor).first else {
            return false
        }

        // No-op if already in the target stage
        guard opportunity.salesStage != stage else { return false }

        opportunity.salesStage = stage
        opportunity.isPendingPush = true
        opportunity.localModifiedAt = Date()
        return true
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

// MARK: - Opportunity Form

/// Mirrors src/components/pipeline/OpportunityForm.tsx
///
/// Create / Edit form for opportunities.
/// - Pass `opportunity: nil` for create mode (inserts a new record).
/// - Pass an existing `Opportunity` for edit mode (mutates in place).
/// Uses `@Environment(\.modelContext)` for insert and `@Environment(\.dismiss)` for closing.
struct OpportunityFormView: View {
    /// nil = create new, non-nil = edit existing
    let opportunity: Opportunity?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    // MARK: - Form State

    @State private var opportunityName: String = ""
    @State private var salesStage: String = "Prospecting"
    @State private var dealValueText: String = ""
    @State private var probability: String = ""
    @State private var expectedCloseDate: Date = Date()
    @State private var hasExpectedCloseDate: Bool = false
    @State private var leadSource: String = ""
    @State private var qualsType: String = ""
    @State private var notesAbout: String = ""
    @State private var contractMilestones: String = ""

    private var isEditing: Bool { opportunity != nil }

    private let salesStages = [
        "Prospecting", "Qualified", "Business Development",
        "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"
    ]

    // MARK: - Body

    var body: some View {
        Form {
            // Opportunity section
            Section("Opportunity") {
                TextField("Opportunity Name", text: $opportunityName)
            }

            // Deal Info section
            Section("Deal Info") {
                Picker("Sales Stage", selection: $salesStage) {
                    ForEach(salesStages, id: \.self) { stage in
                        Text(stage).tag(stage)
                    }
                }

                TextField("Deal Value", text: $dealValueText)
                #if os(iOS)
                    .keyboardType(.decimalPad)
                #endif

                TextField("Probability", text: $probability)

                Toggle("Set Expected Close Date", isOn: $hasExpectedCloseDate)
                if hasExpectedCloseDate {
                    DatePicker(
                        "Expected Close Date",
                        selection: $expectedCloseDate,
                        displayedComponents: .date
                    )
                }
            }

            // Source section
            Section("Source") {
                TextField("Lead Source", text: $leadSource)
                TextField("Quals Type", text: $qualsType)
            }

            // Notes section
            Section("Notes") {
                VStack(alignment: .leading) {
                    Text("Notes About")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextEditor(text: $notesAbout)
                        .frame(minHeight: 80)
                }

                VStack(alignment: .leading) {
                    Text("Contract Milestones")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextEditor(text: $contractMilestones)
                        .frame(minHeight: 80)
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isEditing ? "Edit Opportunity" : "New Opportunity")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(opportunityName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .onAppear { loadExisting() }
    }

    // MARK: - Load Existing

    /// Populates form state from an existing opportunity (edit mode).
    private func loadExisting() {
        guard let opp = opportunity else { return }
        opportunityName = opp.opportunityName ?? ""
        salesStage = opp.salesStage ?? "Prospecting"
        if let value = opp.dealValue, value > 0 {
            dealValueText = String(format: "%.0f", value)
        }
        probability = opp.probability ?? ""
        if let date = opp.expectedCloseDate {
            expectedCloseDate = date
            hasExpectedCloseDate = true
        }
        leadSource = opp.leadSource ?? ""
        qualsType = opp.qualsType ?? ""
        notesAbout = opp.notesAbout ?? ""
        contractMilestones = opp.contractMilestones ?? ""
    }

    // MARK: - Save

    private func save() {
        let trimmedName = opportunityName.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        let opp: Opportunity
        if let existing = opportunity {
            // Edit mode — mutate in place
            opp = existing
        } else {
            // Create mode — new record with local ID
            opp = Opportunity(
                id: "local_\(UUID().uuidString)",
                opportunityName: trimmedName,
                isPendingPush: true
            )
        }

        opp.opportunityName = trimmedName
        opp.salesStage = salesStage
        opp.dealValue = Double(dealValueText)
        opp.probability = probability.isEmpty ? nil : probability
        opp.expectedCloseDate = hasExpectedCloseDate ? expectedCloseDate : nil
        opp.leadSource = leadSource.isEmpty ? nil : leadSource
        opp.qualsType = qualsType.isEmpty ? nil : qualsType
        opp.notesAbout = notesAbout.isEmpty ? nil : notesAbout
        opp.contractMilestones = contractMilestones.isEmpty ? nil : contractMilestones
        opp.localModifiedAt = Date()
        opp.isPendingPush = true

        if opportunity == nil {
            // Insert new record
            modelContext.insert(opp)
        }

        dismiss()
    }
}
