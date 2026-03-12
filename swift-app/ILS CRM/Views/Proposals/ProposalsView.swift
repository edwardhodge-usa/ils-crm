import SwiftUI
import SwiftData

/// Proposals list — mirrors src/components/proposals/ProposalListPage.tsx
///
/// Features:
/// - Searchable list with proposal name, status badges, approval status
/// - Color-coded status/approval badges
/// - Proposed value, version, and date sent metadata
/// - Detail sheet on selection
struct ProposalsView: View {
    @Query(sort: \Proposal.proposalName) private var proposals: [Proposal]

    @State private var searchText = ""
    @State private var selectedProposal: Proposal?
    @State private var showNewProposal = false

    private var filteredProposals: [Proposal] {
        guard !searchText.isEmpty else { return proposals }
        let query = searchText.lowercased()
        return proposals.filter { proposal in
            (proposal.proposalName?.lowercased().contains(query) ?? false)
                || (proposal.notes?.lowercased().contains(query) ?? false)
        }
    }

    var body: some View {
        Group {
            if proposals.isEmpty {
                EmptyStateView(
                    title: "No Proposals",
                    description: "Proposals will appear here once synced from Airtable.",
                    systemImage: "doc.text"
                )
            } else if filteredProposals.isEmpty {
                EmptyStateView(
                    title: "No Results",
                    description: "No proposals match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                List(filteredProposals, id: \.id) { proposal in
                    ProposalRow(proposal: proposal)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            selectedProposal = proposal
                        }
                }
            }
        }
        .searchable(text: $searchText, prompt: "Search proposals...")
        .navigationTitle("Proposals")
        .toolbar {
            Button { showNewProposal = true } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showNewProposal) {
            NavigationStack {
                ProposalFormView(proposal: nil)
            }
            .frame(minWidth: 480, minHeight: 560)
        }
        .sheet(item: $selectedProposal) { proposal in
            NavigationStack {
                ProposalDetailView(proposal: proposal)
                    .navigationTitle("Proposal")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedProposal = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 500, minHeight: 600)
        }
    }
}

// MARK: - Proposal Row

private struct ProposalRow: View {
    let proposal: Proposal

    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = 0
        return f
    }()

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Proposal name
            Text(proposal.proposalName ?? "Untitled")
                .font(.body)
                .fontWeight(.medium)

            // Status + Approval badges
            let hasStatus = proposal.status != nil
            let hasApproval = proposal.approvalStatus != nil
            if hasStatus || hasApproval {
                HStack(spacing: 8) {
                    if let status = proposal.status {
                        BadgeView(text: status, color: statusColor(for: status))
                    }
                    if let approval = proposal.approvalStatus {
                        BadgeView(text: approval, color: approvalColor(for: approval))
                    }
                }
            }

            // Metadata row: version, value, date sent
            let hasVersion = proposal.version != nil
            let hasValue = (proposal.proposedValue ?? 0) > 0
            let hasDate = proposal.dateSent != nil
            if hasVersion || hasValue || hasDate {
                HStack(spacing: 8) {
                    if let version = proposal.version {
                        Text("v\(version)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let value = proposal.proposedValue, value > 0 {
                        Text(Self.currencyFormatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let dateSent = proposal.dateSent {
                        Text("Sent \(Self.dateFormatter.string(from: dateSent))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Color Mappings

    private func statusColor(for status: String) -> Color {
        switch status {
        case "Draft": return .gray
        case "Sent": return .blue
        case "Accepted": return .green
        case "Rejected": return .red
        case "Revised": return .orange
        default: return .secondary
        }
    }

    private func approvalColor(for approval: String) -> Color {
        switch approval {
        case "Approved": return .green
        case "Pending": return .orange
        case "Rejected": return .red
        default: return .secondary
        }
    }
}

// MARK: - Proposal Form

/// Full create/edit form — mirrors src/components/proposals/ProposalForm.tsx
///
/// - `proposal: nil` → create mode (inserts new Proposal with local_ prefix ID)
/// - `proposal: existing` → edit mode (updates in place)
struct ProposalFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let proposal: Proposal?  // nil = create, non-nil = edit

    // MARK: - Form State

    @State private var proposalName: String = ""
    @State private var status: String = "Draft"
    @State private var approvalStatus: String = "Pending"
    @State private var proposedValueText: String = ""
    @State private var version: String = ""
    @State private var dateSent: Date = Date()
    @State private var hasDateSent: Bool = false
    @State private var validUntil: Date = Date()
    @State private var hasValidUntil: Bool = false
    @State private var notes: String = ""

    // MARK: - Options

    private let statusOptions = ["Draft", "Sent", "Accepted", "Rejected", "Expired"]
    private let approvalOptions = ["Pending", "Approved", "Rejected", "Revision Requested"]

    private var isCreate: Bool { proposal == nil }

    // MARK: - Body

    var body: some View {
        Form {
            Section("Proposal") {
                TextField("Proposal Name", text: $proposalName)
            }

            Section("Status") {
                Picker("Status", selection: $status) {
                    ForEach(statusOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
                Picker("Approval Status", selection: $approvalStatus) {
                    ForEach(approvalOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }
            }

            Section("Value") {
                TextField("Proposed Value", text: $proposedValueText)
                #if os(iOS)
                    .keyboardType(.decimalPad)
                #endif
                TextField("Version", text: $version)
            }

            Section("Dates") {
                Toggle("Date Sent", isOn: $hasDateSent)
                if hasDateSent {
                    DatePicker("Sent", selection: $dateSent, displayedComponents: .date)
                }

                Toggle("Valid Until", isOn: $hasValidUntil)
                if hasValidUntil {
                    DatePicker("Valid Until", selection: $validUntil, displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextEditor(text: $notes)
                    .frame(minHeight: 100)
            }
        }
        .formStyle(.grouped)
        .navigationTitle(isCreate ? "New Proposal" : "Edit Proposal")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(proposalName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .onAppear { loadExisting() }
    }

    // MARK: - Load Existing (edit mode)

    private func loadExisting() {
        guard let proposal else { return }
        proposalName = proposal.proposalName ?? ""
        status = proposal.status ?? "Draft"
        approvalStatus = proposal.approvalStatus ?? "Pending"
        if let value = proposal.proposedValue {
            proposedValueText = String(value)
        }
        version = proposal.version ?? ""
        notes = proposal.notes ?? ""

        if let sent = proposal.dateSent {
            dateSent = sent
            hasDateSent = true
        }
        if let until = proposal.validUntil {
            validUntil = until
            hasValidUntil = true
        }
    }

    // MARK: - Save

    private func save() {
        let trimmedName = proposalName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        let proposedValue = Double(proposedValueText)

        if let proposal {
            // Edit mode — update existing
            proposal.proposalName = trimmedName
            proposal.status = status.nilIfEmpty
            proposal.approvalStatus = approvalStatus.nilIfEmpty
            proposal.proposedValue = proposedValue
            proposal.version = version.nilIfEmpty
            proposal.dateSent = hasDateSent ? dateSent : nil
            proposal.validUntil = hasValidUntil ? validUntil : nil
            proposal.notes = notes.nilIfEmpty
            proposal.localModifiedAt = Date()
            proposal.isPendingPush = true
        } else {
            // Create mode — insert new
            let newProposal = Proposal(
                id: "local_\(UUID().uuidString)",
                proposalName: trimmedName,
                isPendingPush: true
            )
            newProposal.status = status.nilIfEmpty
            newProposal.approvalStatus = approvalStatus.nilIfEmpty
            newProposal.proposedValue = proposedValue
            newProposal.version = version.nilIfEmpty
            newProposal.dateSent = hasDateSent ? dateSent : nil
            newProposal.validUntil = hasValidUntil ? validUntil : nil
            newProposal.notes = notes.nilIfEmpty
            newProposal.localModifiedAt = Date()
            modelContext.insert(newProposal)
        }

        dismiss()
    }
}

// MARK: - String Extension

private extension String {
    /// Returns nil if the string is empty, otherwise returns self.
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
