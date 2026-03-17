import SwiftUI
import SwiftData
import Combine

/// Pipeline / Kanban — mirrors src/components/pipeline/PipelinePage.tsx
///
/// Kanban board with 11 stage columns. Each column shows opportunity cards
/// with company name, deal name, value, stage badge, and probability.
/// Summary header shows active total, won total, and deal count.
struct PipelineView: View {
    @Query private var opportunities: [Opportunity]
    @Query private var companies: [Company]
    @Environment(\.modelContext) private var modelContext
    @State private var selectedOpportunity: Opportunity?
    @State private var showNewOpportunity = false
    @State private var dropTargetedStage: String?

    private let stages = [
        "Initial Contact", "Qualification", "Meeting Scheduled",
        "Proposal Sent", "Negotiation", "Contract Sent",
        "Development", "Investment", "Closed Won", "Closed Lost",
        "Future Client"
    ]

    private let stageColors: [String: Color] = [
        "Initial Contact": .blue,
        "Qualification": .cyan,
        "Meeting Scheduled": .orange,
        "Proposal Sent": .indigo,
        "Negotiation": .teal,
        "Contract Sent": .mint,
        "Development": .purple,
        "Investment": .pink,
        "Closed Won": .green,
        "Closed Lost": .red,
        "Future Client": .yellow
    ]

    // MARK: - Computed Properties

    /// Dictionary from Airtable record ID → company name for fast lookup
    private var companyNameById: [String: String] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { company in
            guard let name = company.companyName else { return nil }
            return (company.id, name)
        })
    }

    /// Dictionary from Airtable record ID → company logo URL for fast lookup
    private var companyLogoUrlById: [String: URL] {
        Dictionary(uniqueKeysWithValues: companies.compactMap { company in
            guard let urlString = company.logoUrl, let url = URL(string: urlString) else { return nil }
            return (company.id, url)
        })
    }

    /// Total deal value for non-closed stages (active pipeline)
    private var activeTotalValue: Double {
        let closedStages: Set<String> = ["Closed Won", "Closed Lost"]
        return opportunities
            .filter { opp in
                guard let stage = opp.salesStage else { return true }
                return !closedStages.contains(stage)
            }
            .compactMap { $0.dealValue }
            .reduce(0, +)
    }

    /// Total deal value for Closed Won stage
    private var wonTotalValue: Double {
        opportunities
            .filter { $0.salesStage == "Closed Won" }
            .compactMap { $0.dealValue }
            .reduce(0, +)
    }

    /// Currency formatter — no decimal places (e.g. "$1,065,000")
    private var currencyFormatter: NumberFormatter {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.maximumFractionDigits = 0
        return f
    }

    private func formatCurrency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "$0"
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Summary header bar
            summaryHeader

            Divider()

            // Kanban board
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
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewOpportunity = true
        }
    }

    // MARK: - Summary Header

    private var summaryHeader: some View {
        HStack(spacing: 16) {
            Text("Pipeline")
                .font(.system(size: 15, weight: .bold))

            Spacer()

            // Active total
            HStack(spacing: 4) {
                Text("Active")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text(formatCurrency(activeTotalValue))
                    .font(.system(size: 13))
                    .fontWeight(.semibold)
            }

            Divider()
                .frame(height: 16)

            // Won total
            HStack(spacing: 4) {
                Text("Won")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text(formatCurrency(wonTotalValue))
                    .font(.system(size: 13))
                    .fontWeight(.semibold)
                    .foregroundStyle(.green)
            }

            Divider()
                .frame(height: 16)

            // Deal count
            HStack(spacing: 4) {
                Text("Deals")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Text("\(opportunities.count)")
                    .font(.system(size: 13))
                    .fontWeight(.semibold)
            }

            // New Deal button
            Button {
                showNewOpportunity = true
            } label: {
                Text("+ New Deal")
                    .font(.system(size: 13))
                    .fontWeight(.medium)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(.windowBackgroundColor))
    }

    // MARK: - Stage Column

    private func stageColumn(_ stage: String) -> some View {
        let stageOpps = opportunities.filter { $0.salesStage == stage }
        let color = stageColors[stage] ?? .gray
        let stageTotalValue = stageOpps.compactMap { $0.dealValue }.reduce(0, +)

        return VStack(alignment: .leading, spacing: 8) {
            // Column header
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Circle()
                        .fill(color)
                        .frame(width: 8, height: 8)
                    Text(stage)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(1)
                    Spacer()
                    // Count badge in gray
                    Text("\(stageOpps.count)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color.secondary.opacity(0.2))
                        .foregroundStyle(.secondary)
                        .clipShape(Capsule())
                }
                // Dollar total below stage name
                if stageTotalValue > 0 {
                    Text(formatCurrency(stageTotalValue))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.leading, 16) // indent to align under stage name (past dot)
                }
            }
            .padding(.horizontal, 10)
            .padding(.top, 10)

            // Cards
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 8) {
                    if stageOpps.isEmpty {
                        Text("No deals")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    } else {
                        ForEach(stageOpps, id: \.id) { opp in
                            Button {
                                selectedOpportunity = opp
                            } label: {
                                KanbanCard(
                                    opportunity: opp,
                                    companyName: opp.companyIds.first.flatMap { companyNameById[$0] },
                                    companyLogoUrl: opp.companyIds.first.flatMap { companyLogoUrlById[$0] },
                                    stageColor: color,
                                    formatCurrency: formatCurrency
                                )
                            }
                            .buttonStyle(.plain)
                            .draggable(opp.id)
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
        // Fetch all + filter — avoids SwiftData #Predicate crash on macOS 26.4 beta
        guard let opportunity = try? modelContext.fetch(FetchDescriptor<Opportunity>()).first(where: { $0.id == id }) else {
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
    let companyName: String?
    let companyLogoUrl: URL?
    let stageColor: Color
    let formatCurrency: (Double) -> String

    private var formattedValue: String {
        guard let value = opportunity.dealValue, value > 0 else { return "—" }
        return formatCurrency(value)
    }

    /// Display probability string — strips numeric prefix (e.g. "01 High" → "01 High").
    /// If probability is a raw number string (legacy), shows as-is.
    private var probabilityDisplay: String? {
        guard let prob = opportunity.probability, !prob.isEmpty else { return nil }
        return prob
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Company logo + name (above deal name)
            if let company = companyName {
                HStack(spacing: 6) {
                    AvatarView(name: company, avatarSize: .small, photoURL: companyLogoUrl, shape: .roundedRect)
                    Text(company)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            // Deal name
            Text(opportunity.opportunityName ?? "Untitled")
                .font(.system(size: 14, weight: .semibold))
                .lineLimit(2)

            // Dollar value
            Text(formattedValue)
                .font(.system(size: 13))
                .fontWeight(.medium)

            // Bottom row: stage badge + probability
            HStack {
                StatusBadge(
                    text: opportunity.salesStage ?? "—",
                    color: stageColor
                )
                Spacer()
                if let prob = probabilityDisplay {
                    Text(prob)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        )
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
    @State private var salesStage: String = "Initial Contact"
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
        "Initial Contact", "Qualification", "Meeting Scheduled",
        "Proposal Sent", "Negotiation", "Contract Sent",
        "Development", "Investment", "Closed Won", "Closed Lost",
        "Future Client"
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
        salesStage = opp.salesStage ?? "Initial Contact"
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
