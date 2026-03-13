import SwiftUI
import SwiftData
import Combine

// MARK: - ProposalSortMode

enum ProposalSortMode: String, CaseIterable, CustomStringConvertible {
    case nameAZ    = "Name A–Z"
    case nameZA    = "Name Z–A"
    case newest    = "Newest First"
    case oldest    = "Oldest First"

    var description: String { rawValue }
}

// MARK: - ProposalsView

/// Proposals list + inline detail — mirrors src/components/proposals/ProposalListPage.tsx
///
/// Layout: fixed 380pt list panel | Divider | flex detail panel
struct ProposalsView: View {
    @Query(sort: \Proposal.proposalName) private var proposals: [Proposal]

    @State private var searchText = ""
    @State private var selectedProposal: Proposal?
    @State private var sortMode: ProposalSortMode = .nameAZ
    @State private var showNewProposal = false

    // MARK: - Filtered Data

    private var filteredProposals: [Proposal] {
        let base: [Proposal]
        if searchText.isEmpty {
            base = proposals
        } else {
            let query = searchText.lowercased()
            base = proposals.filter { proposal in
                (proposal.proposalName?.lowercased().contains(query) ?? false)
                    || (proposal.notes?.lowercased().contains(query) ?? false)
            }
        }

        switch sortMode {
        case .nameAZ:
            return base.sorted { ($0.proposalName ?? "") < ($1.proposalName ?? "") }
        case .nameZA:
            return base.sorted { ($0.proposalName ?? "") > ($1.proposalName ?? "") }
        case .newest:
            return base.sorted { ($0.dateSent ?? .distantPast) > ($1.dateSent ?? .distantPast) }
        case .oldest:
            return base.sorted { ($0.dateSent ?? .distantPast) < ($1.dateSent ?? .distantPast) }
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: 0) {
            // ── Left: List Panel ──────────────────────────────────────
            VStack(spacing: 0) {
                ListHeader(
                    title: "Proposals",
                    count: proposals.count,
                    buttonLabel: "+ New Proposal",
                    onButton: { showNewProposal = true }
                )

                Divider()

                // Search bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.tertiary)
                        .font(.system(size: 13))
                    TextField("Search proposals…", text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.tertiary)
                                .font(.system(size: 13))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.controlBackgroundColor))

                Divider()

                // Sort control bar
                HStack(spacing: 6) {
                    Text("\(filteredProposals.count) proposals")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    SortDropdown(
                        options: ProposalSortMode.allCases,
                        selection: $sortMode
                    )
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)

                Divider()

                // Proposal list
                if proposals.isEmpty {
                    EmptyStateView(
                        title: "No proposals yet",
                        description: "Proposals will appear here once synced from Airtable.",
                        systemImage: "doc.text"
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredProposals.isEmpty {
                    EmptyStateView(
                        title: "No results",
                        description: "No proposals match \"\(searchText)\".",
                        systemImage: "magnifyingglass"
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    proposalList
                }
            }
            .frame(width: 380)
            .background(Color(.controlBackgroundColor))

            Divider()

            // ── Right: Detail Panel ───────────────────────────────────
            Group {
                if let proposal = selectedProposal {
                    ProposalDetailView(proposal: proposal)
                        .id(proposal.id) // Force re-render when selection changes
                } else {
                    EmptyStateView(
                        title: "Select a proposal",
                        description: "Choose a proposal to view details.",
                        systemImage: "doc.text"
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .sheet(isPresented: $showNewProposal) {
            NavigationStack {
                ProposalFormView(proposal: nil)
            }
            .frame(minWidth: 480, minHeight: 560)
        }
        .onReceive(NotificationCenter.default.publisher(for: .createNewRecord)) { _ in
            showNewProposal = true
        }
    }

    // MARK: - Proposal List

    private var proposalList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(filteredProposals, id: \.id) { proposal in
                    proposalRow(proposal)
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Proposal Row

    private func proposalRow(_ proposal: Proposal) -> some View {
        let isSelected = selectedProposal?.id == proposal.id

        return Button {
            selectedProposal = proposal
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(proposal.proposalName ?? "Untitled")
                    .font(.system(size: 13))
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                if let status = proposal.status, !status.isEmpty {
                    StatusBadge(text: status, color: statusColor(for: status))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? Color.accentColor : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            if !isSelected {
                Divider()
                    .padding(.leading, 12)
            }
        }
    }

    // MARK: - Status Color

    private func statusColor(for status: String) -> Color {
        switch status {
        case "Draft":    return .gray
        case "Sent":     return .blue
        case "Accepted": return .green
        case "Rejected": return .red
        case "Revised":  return .orange
        default:         return .secondary
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
