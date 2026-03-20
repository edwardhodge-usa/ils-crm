import SwiftUI
import SwiftData

/// Contact detail view — bento box layout.
///
/// Single ScrollView wrapping:
/// - BentoHeroCard (avatar, name, subtitle, action pills, stats)
/// - BentoGrid row 1: CRM Status + Contact & Location
/// - BentoGrid row 2: Open Deals + Notes
/// - Conditional: Partner / Vendor cell
struct ContactDetailView: View {
    @Bindable var contact: Contact

    @Query private var opportunities: [Opportunity]
    @Query private var companies: [Company]
    @State private var showEditContact = false
    @State private var showDeleteConfirm = false
    @State private var isUploadingPhoto = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingCompaniesPicker = false

    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var syncEngine

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    // MARK: - Stage Colors (mirrors PipelineView)

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

    /// Display name with fallback chain: contactName -> firstName+lastName -> "Unnamed Contact"
    private var contactName: String {
        if let name = contact.contactName, !name.isEmpty { return name }
        let parts = [contact.firstName, contact.lastName].compactMap { $0 }.filter { !$0.isEmpty }
        if !parts.isEmpty { return parts.joined(separator: " ") }
        return "Unnamed Contact"
    }

    /// Resolved company name from companiesIds linked record
    private var resolvedCompanyName: String? {
        guard let firstId = contact.companiesIds.first else { return nil }
        return companies.first { $0.id == firstId }?.companyName
    }

    /// Hero subtitle: "Title · Company" or just one
    private var heroSubtitle: String? {
        let parts = [contact.jobTitle, resolvedCompanyName].compactMap { $0 }.filter { !$0.isEmpty }
        if parts.isEmpty { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    /// Opportunities linked to this contact that are not in a closed/won/lost stage.
    private var openOpportunities: [Opportunity] {
        let closedStages: Set<String> = ["Won", "Lost", "Closed Won", "Closed Lost"]
        return opportunities.filter { opp in
            opp.associatedContactIds.contains(contact.id) &&
            !closedStages.contains(opp.salesStage ?? "")
        }
    }

    /// All opportunities linked to this contact.
    private var linkedOpportunities: [Opportunity] {
        opportunities.filter { $0.associatedContactIds.contains(contact.id) }
    }

    private var daysSinceLastContact: String {
        guard let lastDate = contact.lastContactDate else { return "\u{2014}" }
        let days = Calendar.current.dateComponents([.day], from: lastDate, to: Date()).day ?? 0
        return "\(days)"
    }

    /// Parse event tags from the comma-separated or JSON string
    private var eventTags: [String] {
        guard let raw = contact.eventTags, !raw.isEmpty else { return [] }
        if let data = raw.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String] {
            return parsed
        }
        return raw.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    /// Whether the partner/vendor cell should be shown
    private var hasPartnerData: Bool {
        let pt = contact.partnerType ?? ""
        let ps = contact.partnerStatus ?? ""
        return !pt.isEmpty || !ps.isEmpty
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // MARK: Hero Card
                BentoHeroCard(
                    name: contactName,
                    subtitle: heroSubtitle,
                    photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) },
                    avatarSize: 56,
                    avatarShape: .circle
                ) {
                    // Action pills
                    if let email = contact.email, !email.isEmpty {
                        Button {
                            if let url = URL(string: "mailto:\(email)") {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            BentoPill(text: "Email", color: .accentColor)
                        }
                        .buttonStyle(.plain)
                    }

                    if let phone = contact.mobilePhone ?? contact.workPhone, !phone.isEmpty {
                        Button {
                            if let url = URL(string: "tel:\(phone)") {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            BentoPill(text: "Call", color: .green)
                        }
                        .buttonStyle(.plain)
                    }

                    if let linkedin = contact.linkedInUrl, !linkedin.isEmpty {
                        Button {
                            let urlStr = linkedin.hasPrefix("http") ? linkedin : "https://\(linkedin)"
                            if let url = URL(string: urlStr) {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            BentoPill(text: "LinkedIn", color: Color(red: 0.353, green: 0.784, blue: 0.980))
                        }
                        .buttonStyle(.plain)
                    }
                } stats: {
                    BentoHeroStat(value: "\(openOpportunities.count)", label: "Open Opps")
                    BentoHeroStat(value: daysSinceLastContact, label: "Days Since")
                    BentoHeroStat(
                        value: contact.leadScore.map { "\($0)" } ?? "\u{2014}",
                        label: "Lead Score"
                    )
                }

                // MARK: Grid Row 1 — CRM Status + Contact & Location
                BentoGrid(columns: 2) {

                    // CRM STATUS
                    BentoCell(title: "CRM Status") {
                        VStack(alignment: .leading, spacing: 8) {

                            // Categorization pills
                            if !contact.categorization.isEmpty {
                                FlowLayout(spacing: 4) {
                                    ForEach(contact.categorization, id: \.self) { tag in
                                        BentoPill(text: tag, color: .accentColor)
                                    }
                                }
                            }

                            // Qualification pill
                            if let qual = contact.qualificationStatus, !qual.isEmpty {
                                BentoPill(text: qual, color: .orange)
                            }

                            Divider()

                            VStack(spacing: 0) {
                                BentoFieldRow(label: "Industry", value: contact.industry ?? "")
                                BentoFieldRow(label: "Lead Source", value: contact.leadSource ?? "")
                            }

                            // Event tags
                            if !eventTags.isEmpty {
                                Divider()
                                FlowLayout(spacing: 4) {
                                    ForEach(eventTags, id: \.self) { tag in
                                        BentoChip(text: tag)
                                    }
                                }
                            }
                        }
                    }

                    // CONTACT & LOCATION
                    BentoCell(title: "Contact & Location") {
                        VStack(spacing: 0) {
                            BentoFieldRow(label: "Email", value: contact.email ?? "")
                            BentoFieldRow(label: "Mobile", value: contact.mobilePhone ?? "")
                            BentoFieldRow(label: "Office", value: contact.workPhone ?? "")
                            BentoFieldRow(label: "Title", value: contact.jobTitle ?? "")
                            BentoFieldRow(
                                label: "Location",
                                value: {
                                    let parts = [contact.city, contact.state].compactMap { $0 }.filter { !$0.isEmpty }
                                    return parts.isEmpty ? "" : parts.joined(separator: ", ")
                                }()
                            )
                        }
                    }
                }

                // MARK: Grid Row 2 — Open Deals + Notes
                BentoGrid(columns: 2) {

                    // OPEN DEALS
                    BentoCell(title: "Open Deals") {
                        VStack(spacing: 0) {
                            if openOpportunities.isEmpty {
                                Text("No open deals")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 8)
                            } else {
                                ForEach(openOpportunities, id: \.id) { opp in
                                    VStack(spacing: 4) {
                                        HStack {
                                            Text(opp.opportunityName ?? "\u{2014}")
                                                .font(.system(size: 13, weight: .medium))
                                                .lineLimit(1)
                                            Spacer()
                                            if let value = opp.dealValue, value > 0 {
                                                Text(formattedCurrency(value))
                                                    .font(.system(size: 12, weight: .semibold))
                                                    .foregroundStyle(stageColor(for: opp.salesStage))
                                            }
                                        }
                                        HStack {
                                            if let stage = opp.salesStage, !stage.isEmpty {
                                                BentoPill(text: stage, color: stageColor(for: opp.salesStage))
                                            }
                                            Spacer()
                                        }
                                        Divider()
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                        }
                    }

                    // NOTES
                    BentoCell(title: "Notes") {
                        VStack(alignment: .leading, spacing: 8) {
                            EditableFieldRow(
                                label: "",
                                key: "notes",
                                type: .textarea,
                                value: contact.notes,
                                onSave: saveField
                            )

                            if resolvedCompanyName != nil || !contact.companiesIds.isEmpty {
                                Divider()
                                BentoChip(
                                    text: resolvedCompanyName ?? "Linked Company",
                                    onTap: { showingCompaniesPicker = true }
                                )
                            }
                        }
                    }
                }

                // MARK: Conditional — Partner / Vendor
                if hasPartnerData {
                    BentoCell(title: "Partner / Vendor") {
                        VStack(spacing: 0) {
                            if let pt = contact.partnerType, !pt.isEmpty {
                                BentoFieldRow(label: "Partner Type", value: pt)
                            }
                            if let ps = contact.partnerStatus, !ps.isEmpty {
                                BentoFieldRow(label: "Partner Status", value: ps)
                            }
                        }
                    }
                }

            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .toolbar {
            ToolbarItem(placement: .automatic) {
                Button {
                    showEditContact = true
                } label: {
                    Image(systemName: "pencil")
                }
                .help("Edit Contact")
            }
            ToolbarItem(placement: .automatic) {
                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "trash")
                }
                .help("Delete Contact")
            }
        }
        .sheet(isPresented: $showEditContact) {
            ContactFormView(contact: contact)
                .frame(minWidth: 480, minHeight: 560)
        }
        .confirmationDialog(
            "Delete \(contact.contactName ?? "this contact")?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                syncEngine.trackDeletion(tableId: Contact.airtableTableId, recordId: contact.id)
                context.delete(contact)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingOpportunitiesPicker) {
            LinkedRecordPicker(
                title: "Link Opportunities",
                entityType: .opportunities,
                currentIds: Set(contact.salesOpportunitiesIds),
                onSave: { ids in
                    contact.salesOpportunitiesIds = Array(ids)
                    contact.localModifiedAt = Date()
                    contact.isPendingPush = true
                }
            )
        }
        .sheet(isPresented: $showingCompaniesPicker) {
            LinkedRecordPicker(
                title: "Link Company",
                entityType: .companies,
                currentIds: Set(contact.companiesIds),
                onSave: { ids in
                    contact.companiesIds = Array(ids)
                    contact.localModifiedAt = Date()
                    contact.isPendingPush = true
                }
            )
        }
    }

    // MARK: - Helper Functions

    private func stageColor(for stage: String?) -> Color {
        guard let stage else { return .gray }
        return stageColors[stage] ?? .gray
    }

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "jobTitle": contact.jobTitle = str
        case "email": contact.email = str
        case "mobilePhone": contact.mobilePhone = str
        case "workPhone": contact.workPhone = str
        case "linkedInUrl": contact.linkedInUrl = str
        case "website": contact.website = str
        case "addressLine": contact.addressLine = str
        case "city": contact.city = str
        case "state": contact.state = str
        case "country": contact.country = str
        case "industry": contact.industry = str
        case "leadSource": contact.leadSource = str
        case "categorization": contact.categorization = str.map { [$0] } ?? []
        case "qualificationStatus": contact.qualificationStatus = str
        case "eventTags": contact.eventTags = str
        case "notes": contact.notes = str
        case "partnerType": contact.partnerType = str
        case "partnerStatus": contact.partnerStatus = str
        case "rateInfo": contact.rateInfo = str
        case "qualityRating": contact.qualityRating = str
        case "reliabilityRating": contact.reliabilityRating = str
        case "leadScore":
            if let s = str { contact.leadScore = Int(s) }
            else { contact.leadScore = nil }
        case "lastContactDate":
            if let s = str {
                contact.lastContactDate = Self.isoFormatter.date(from: s)
            } else { contact.lastContactDate = nil }
        default: break
        }
        contact.localModifiedAt = Date()
        contact.isPendingPush = true
    }

    // MARK: - Photo Upload/Remove

    private func uploadContactPhoto(_ data: Data) {
        isUploadingPhoto = true
        Task {
            defer { isUploadingPhoto = false }
            do {
                _ = try await syncEngine.uploadAttachment(
                    tableId: AirtableConfig.Tables.contacts,
                    recordId: contact.id,
                    fieldId: "fldl1WOfz7vHNSOUd",
                    imageData: data,
                    filename: "\(contact.contactName ?? "contact").jpg"
                )
                await syncEngine.forceSync()
            } catch {
                print("[ContactDetail] Photo upload failed: \(error.localizedDescription)")
            }
        }
    }

    private func removeContactPhoto() {
        isUploadingPhoto = true
        Task {
            defer { isUploadingPhoto = false }
            do {
                try await syncEngine.removeAttachment(
                    tableId: AirtableConfig.Tables.contacts,
                    recordId: contact.id,
                    fieldId: "fldl1WOfz7vHNSOUd"
                )
                contact.contactPhotoUrl = nil
                await syncEngine.forceSync()
            } catch {
                print("[ContactDetail] Photo remove failed: \(error.localizedDescription)")
            }
        }
    }

    private func formattedCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }
}

// MARK: - FlowLayout

/// A simple flow layout that wraps children to the next line when they exceed
/// the available width. Used for tag/badge pills across detail views.
/// NOTE: TaskDetailView.swift also defines FlowLayout — that duplicate must be removed.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(in: proposal.width ?? 0, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(in: bounds.width, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private struct LayoutResult {
        var positions: [CGPoint]
        var size: CGSize
    }

    private func layout(in width: CGFloat, subviews: Subviews) -> LayoutResult {
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var maxWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > width, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            maxWidth = max(maxWidth, currentX - spacing)
        }

        return LayoutResult(
            positions: positions,
            size: CGSize(width: maxWidth, height: currentY + lineHeight)
        )
    }
}

// MARK: - Preview

#Preview {
    let contact = Contact(
        id: "recABC123",
        contactName: "Jane Smith"
    )
    contact.firstName = "Jane"
    contact.lastName = "Smith"
    contact.jobTitle = "Creative Director"
    contact.email = "jane@example.com"
    contact.mobilePhone = "+1 555-0101"
    contact.industry = "Media & Entertainment"
    contact.categorization = ["Client"]
    contact.linkedInUrl = "https://linkedin.com/in/janesmith"
    contact.notes = "Met at SXSW 2025. Very interested in our platform capabilities."
    contact.lastContactDate = Calendar.current.date(byAdding: .day, value: -12, to: Date())
    contact.leadScore = 85
    contact.city = "New York"
    contact.state = "NY"
    contact.country = "USA"

    return NavigationStack {
        ContactDetailView(contact: contact)
            .frame(width: 720, height: 600)
    }
}
