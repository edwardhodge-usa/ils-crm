import SwiftUI
import SwiftData

/// Contact detail view — inline right-panel for the Contacts list+detail split.
///
/// Mirrors the Electron Contact360Page detail pane. Sections match the
/// Electron layout: header → stats → CONTACT INFO → CRM INFO →
/// PARTNER / VENDOR → NOTES → OPPORTUNITIES.
///
/// Uses shared DetailComponents (DetailHeader, StatsRow, DetailSection,
/// EditableFieldRow) — inline click-to-edit fields, auto-save on blur.
struct ContactDetailView: View {
    @Bindable var contact: Contact

    @Query private var opportunities: [Opportunity]
    @State private var showEditContact = false
    @State private var showDeleteConfirm = false

    @Environment(\.modelContext) private var context

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    // MARK: - Computed Stats

    /// Opportunities linked to this contact that are not in a closed/won/lost stage.
    private var openOpportunities: [Opportunity] {
        let closedStages: Set<String> = ["Won", "Lost", "Closed Won", "Closed Lost"]
        return opportunities.filter { opp in
            opp.associatedContactIds.contains(contact.id) &&
            !closedStages.contains(opp.salesStage ?? "")
        }
    }

    /// All opportunities linked to this contact (for the OPPORTUNITIES section).
    private var linkedOpportunities: [Opportunity] {
        opportunities.filter { $0.associatedContactIds.contains(contact.id) }
    }

    private var daysSinceLastContact: String {
        guard let lastDate = contact.lastContactDate else { return "—" }
        let days = Calendar.current.dateComponents([.day], from: lastDate, to: Date()).day ?? 0
        return "\(days)"
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // ── Header ──────────────────────────────────────────
                DetailHeader(
                    name: contact.contactName ?? "Unknown",
                    subtitle: contact.jobTitle,
                    actionLabel: contact.email != nil ? "Email" : nil,
                    actionURL: contact.email.map { "mailto:\($0)" }
                )
                .padding(.top, 24)
                .padding(.horizontal, 16)
                .padding(.bottom, 16)

                // ── Stats Row ────────────────────────────────────────
                StatsRow(items: [
                    (label: "Open Opps",  value: "\(openOpportunities.count)"),
                    (label: "Meetings",   value: "—"),
                    (label: "Days Since", value: daysSinceLastContact)
                ])
                .padding(.horizontal, 16)

                // ── CONTACT INFO ─────────────────────────────────────
                contactInfoSection

                // ── CRM INFO ─────────────────────────────────────────
                crmInfoSection

                // ── PARTNER / VENDOR ─────────────────────────────────
                partnerSection

                // ── NOTES ────────────────────────────────────────────
                notesSection

                // ── OPPORTUNITIES ─────────────────────────────────────
                opportunitiesSection

                Spacer(minLength: 24)
            }
            .padding(.horizontal, 16)
        }
        .scrollIndicators(.automatic)
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
                context.delete(contact)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - CONTACT INFO Section

    private var contactInfoSection: some View {
        DetailSection(title: "CONTACT INFO") {
            EditableFieldRow(label: "Title", key: "jobTitle", type: .text, value: contact.jobTitle, onSave: saveField)
            EditableFieldRow(label: "Email", key: "email", type: .text, value: contact.email, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Mobile", key: "mobilePhone", type: .text, value: contact.mobilePhone, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Office", key: "workPhone", type: .text, value: contact.workPhone, isLink: true, onSave: saveField)
            EditableFieldRow(label: "LinkedIn", key: "linkedInUrl", type: .text, value: contact.linkedInUrl, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Website", key: "website", type: .text, value: contact.website, isLink: true, onSave: saveField)
            EditableFieldRow(label: "Address", key: "addressLine", type: .text, value: contact.addressLine, onSave: saveField)
            EditableFieldRow(label: "City", key: "city", type: .text, value: contact.city, onSave: saveField)
            EditableFieldRow(label: "State", key: "state", type: .text, value: contact.state, onSave: saveField)
            EditableFieldRow(label: "Country", key: "country", type: .text, value: contact.country, onSave: saveField)
        }
    }

    // MARK: - CRM INFO Section

    private var crmInfoSection: some View {
        DetailSection(title: "CRM INFO") {
            EditableFieldRow(label: "Categorization", key: "categorization",
                type: .singleSelect(options: [
                    "Lead", "Customer", "Partner", "Vendor", "Talent", "Other", "Unknown",
                    "VIP", "Investor", "Speaker", "Press", "Influencer", "Board Member", "Advisor"
                ]), value: contact.categorization, onSave: saveField)
            EditableFieldRow(label: "Industry", key: "industry",
                type: .singleSelect(options: [
                    "Technology", "Healthcare", "Finance", "Education", "Manufacturing",
                    "Real Estate", "Consulting", "Other", "Hospitality", "Logistics",
                    "Fitness", "Legal", "Media", "Design", "Venture Capital", "Retail", "Entertainment"
                ]), value: contact.industry, onSave: saveField)
            EditableFieldRow(label: "Lead Source", key: "leadSource",
                type: .singleSelect(options: [
                    "Referral", "Website", "Inbound", "Outbound", "Event",
                    "Social Media", "Other", "LinkedIn", "Cold Call"
                ]), value: contact.leadSource, onSave: saveField)
            EditableFieldRow(label: "Qualification", key: "qualificationStatus",
                type: .singleSelect(options: [
                    "New", "Contacted", "Qualified", "Unqualified", "Nurturing"
                ]), value: contact.qualificationStatus, onSave: saveField)
            EditableFieldRow(label: "Event Tags", key: "eventTags", type: .text,
                value: contact.eventTags, onSave: saveField)
            EditableFieldRow(label: "Lead Score", key: "leadScore",
                type: .number(prefix: nil),
                value: contact.leadScore.map { "\($0)" }, onSave: saveField)
            EditableFieldRow(label: "Last Contact", key: "lastContactDate",
                type: .date,
                value: contact.lastContactDate.map { Self.isoFormatter.string(from: $0) },
                onSave: saveField)
        }
    }

    // MARK: - PARTNER / VENDOR Section

    private var partnerSection: some View {
        DetailSection(title: "PARTNER/VENDOR") {
            EditableFieldRow(label: "Partner Type", key: "partnerType",
                type: .singleSelect(options: [
                    "Fabricator", "AV/Lighting", "Scenic/Set Builder", "Architect",
                    "Interior Designer", "Graphic Designer", "F&B Consultant",
                    "Tech/Interactive", "Operations Consultant", "Production Company",
                    "Freelancer/Individual", "Other"
                ]), value: contact.partnerType, onSave: saveField)
            EditableFieldRow(label: "Partner Status", key: "partnerStatus",
                type: .singleSelect(options: [
                    "Active - Preferred", "Active", "Inactive", "Do Not Use"
                ]), value: contact.partnerStatus, onSave: saveField)
            EditableFieldRow(label: "Quality Rating", key: "qualityRating",
                type: .singleSelect(options: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]),
                value: contact.qualityRating, onSave: saveField)
            EditableFieldRow(label: "Reliability", key: "reliabilityRating",
                type: .singleSelect(options: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"]),
                value: contact.reliabilityRating, onSave: saveField)
            EditableFieldRow(label: "Rate Info", key: "rateInfo", type: .text,
                value: contact.rateInfo, onSave: saveField)
        }
    }

    // MARK: - NOTES Section

    private var notesSection: some View {
        DetailSection(title: "NOTES") {
            EditableFieldRow(label: "", key: "notes", type: .textarea,
                value: contact.notes, onSave: saveField)
        }
    }

    // MARK: - OPPORTUNITIES Section

    private var opportunitiesSection: some View {
        DetailSection(title: "OPPORTUNITIES") {
            if linkedOpportunities.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("No open opportunities")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    Divider()
                }
            } else {
                ForEach(linkedOpportunities, id: \.id) { opp in
                    VStack(spacing: 0) {
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(opp.opportunityName ?? "Untitled Opportunity")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(.primary)
                                if let stage = opp.salesStage, !stage.isEmpty {
                                    Text(stage)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            if let value = opp.dealValue, value > 0 {
                                Text(formattedCurrency(value))
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func saveField(_ key: String, _ value: Any?) {
        let str = value as? String
        switch key {
        case "jobTitle": contact.jobTitle = str
        case "email": contact.email = str
        case "phone": contact.phone = str
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
        case "categorization": contact.categorization = str
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
/// the available width. Used for tag/badge pills.
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
        contactName: "Jane Smith",
        tags: ["VIP", "Creative", "NYC"]
    )
    contact.firstName = "Jane"
    contact.lastName = "Smith"
    contact.jobTitle = "Creative Director"
    contact.email = "jane@example.com"
    contact.phone = "+1 555-0100"
    contact.mobilePhone = "+1 555-0101"
    contact.company = "Acme Studios"
    contact.industry = "Media & Entertainment"
    contact.categorization = "Client"
    contact.linkedInUrl = "https://linkedin.com/in/janesmith"
    contact.notes = "Met at SXSW 2025. Very interested in our platform capabilities."
    contact.lastContactDate = Calendar.current.date(byAdding: .day, value: -12, to: Date())
    contact.qualityRating = "High"
    contact.leadScore = 85
    contact.city = "New York"
    contact.state = "NY"
    contact.country = "USA"

    return ContactDetailView(contact: contact)
        .frame(width: 500, height: 800)
}
