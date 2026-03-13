import SwiftUI
import SwiftData

/// Contact detail view — inline right-panel for the Contacts list+detail split.
///
/// Mirrors the Electron Contact360Page detail pane. Sections match the
/// Electron layout: header → stats → CONTACT INFO → CRM INFO →
/// PARTNER / VENDOR → NOTES → OPPORTUNITIES.
///
/// Uses shared DetailComponents (DetailHeader, StatsRow, DetailSection,
/// DetailFieldRow) — no inline equivalents.
struct ContactDetailView: View {
    let contact: Contact

    @Query private var opportunities: [Opportunity]
    @State private var showEditContact = false
    @State private var showDeleteConfirm = false

    @Environment(\.modelContext) private var context

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
            // Company (resolved from linked records or free-text)
            DetailFieldRow(label: "Company", value: contact.company ?? "—")

            DetailFieldRow(label: "Title", value: contact.jobTitle ?? "—")

            if let email = contact.email, !email.isEmpty {
                DetailFieldRow(
                    label: "Email",
                    value: email,
                    isLink: true,
                    linkURL: "mailto:\(email)"
                )
            } else {
                DetailFieldRow(label: "Email", value: "—")
            }

            if let mobile = contact.mobilePhone, !mobile.isEmpty {
                DetailFieldRow(
                    label: "Mobile",
                    value: mobile,
                    isLink: true,
                    linkURL: "tel:\(mobile.filter { $0.isNumber || $0 == "+" })"
                )
            } else if let phone = contact.phone, !phone.isEmpty {
                DetailFieldRow(
                    label: "Mobile",
                    value: phone,
                    isLink: true,
                    linkURL: "tel:\(phone.filter { $0.isNumber || $0 == "+" })"
                )
            } else {
                DetailFieldRow(label: "Mobile", value: "—")
            }

            if let work = contact.workPhone, !work.isEmpty,
               work != contact.mobilePhone, work != contact.phone {
                DetailFieldRow(
                    label: "Office",
                    value: work,
                    isLink: true,
                    linkURL: "tel:\(work.filter { $0.isNumber || $0 == "+" })"
                )
            } else {
                DetailFieldRow(label: "Office", value: "—")
            }

            if let linkedin = contact.linkedInUrl, !linkedin.isEmpty {
                let url = linkedin.hasPrefix("http") ? linkedin : "https://\(linkedin)"
                DetailFieldRow(
                    label: "LinkedIn",
                    value: linkedin,
                    isLink: true,
                    linkURL: url
                )
            } else {
                DetailFieldRow(label: "LinkedIn", value: "—")
            }

            if let website = contact.website, !website.isEmpty {
                let url = website.hasPrefix("http") ? website : "https://\(website)"
                DetailFieldRow(
                    label: "Website",
                    value: website,
                    isLink: true,
                    linkURL: url
                )
            } else {
                DetailFieldRow(label: "Website", value: "—")
            }

            // Location
            let city = contact.city ?? ""
            let state = contact.state ?? ""
            let country = contact.country ?? ""
            DetailFieldRow(label: "City",    value: city.isEmpty    ? "—" : city)
            DetailFieldRow(label: "State",   value: state.isEmpty   ? "—" : state)
            DetailFieldRow(label: "Country", value: country.isEmpty ? "—" : country)
        }
    }

    // MARK: - CRM INFO Section

    private var crmInfoSection: some View {
        DetailSection(title: "CRM INFO") {
            DetailFieldRow(
                label: "Categorization",
                value: contact.categorization ?? "—",
                showChevron: contact.categorization != nil
            )
            DetailFieldRow(
                label: "Industry",
                value: contact.industry ?? "—",
                showChevron: contact.industry != nil
            )
            DetailFieldRow(
                label: "Lead Source",
                value: contact.leadSource ?? "—",
                showChevron: contact.leadSource != nil
            )
            DetailFieldRow(
                label: "Qualification",
                value: contact.qualificationStatus ?? "—"
            )
            DetailFieldRow(
                label: "Event Tags",
                value: contact.eventTags ?? "—"
            )
            DetailFieldRow(
                label: "Lead Score",
                value: contact.leadScore.map { "\($0)" } ?? "—"
            )
            if let lastContact = contact.lastContactDate {
                DetailFieldRow(
                    label: "Last Contact",
                    value: lastContact.formatted(date: .abbreviated, time: .omitted)
                )
            } else {
                DetailFieldRow(label: "Last Contact", value: "—")
            }
        }
    }

    // MARK: - PARTNER / VENDOR Section

    @ViewBuilder
    private var partnerSection: some View {
        let hasPartner = (contact.partnerType != nil) ||
                         (contact.partnerStatus != nil) ||
                         (contact.qualityRating != nil) ||
                         (contact.reliabilityRating != nil) ||
                         (contact.rateInfo != nil)

        if hasPartner {
            DetailSection(title: "PARTNER / VENDOR") {
                DetailFieldRow(
                    label: "Partner Type",
                    value: contact.partnerType ?? "—"
                )
                DetailFieldRow(
                    label: "Partner Status",
                    value: contact.partnerStatus ?? "—"
                )
                DetailFieldRow(
                    label: "Quality",
                    value: contact.qualityRating ?? "—"
                )
                DetailFieldRow(
                    label: "Reliability",
                    value: contact.reliabilityRating ?? "—"
                )
                DetailFieldRow(
                    label: "Rate Info",
                    value: contact.rateInfo ?? "—"
                )
            }
        }
    }

    // MARK: - NOTES Section

    @ViewBuilder
    private var notesSection: some View {
        DetailSection(title: "NOTES") {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Spacer()
                }
                if let notes = contact.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                } else {
                    Text("—")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }
                Divider()
            }
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
