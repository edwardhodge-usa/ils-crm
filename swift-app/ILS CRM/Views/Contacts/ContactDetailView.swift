import SwiftUI
import SwiftData

/// Contact detail view — displays all key fields organized in sections.
///
/// Mirrors the Electron Contact360Page detail pane. Takes a non-optional
/// Contact (parent view resolves selection before presenting this view).
///
/// Sections shown only when they contain non-nil, non-empty data.
struct ContactDetailView: View {
    let contact: Contact

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // MARK: - Header
                headerSection
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                // MARK: - Form Sections
                Form {
                    contactInfoSection
                    classificationSection
                    businessSection
                    notesSection
                    detailsSection
                }
                .formStyle(.grouped)
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 8) {
            AvatarView(name: contact.contactName ?? "Unknown", size: 64)

            Text(contact.contactName ?? "Unknown")
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            if let jobTitle = contact.jobTitle, !jobTitle.isEmpty {
                Text(jobTitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Contact Info

    @ViewBuilder
    private var contactInfoSection: some View {
        let hasEmail = contact.email?.isEmpty == false
        let hasPhone = contact.phone?.isEmpty == false
        let hasMobile = contact.mobilePhone?.isEmpty == false
            && contact.mobilePhone != contact.phone
        let hasWorkPhone = contact.workPhone?.isEmpty == false
            && contact.workPhone != contact.phone
        let hasLinkedIn = contact.linkedInUrl?.isEmpty == false
        let hasWebsite = contact.website?.isEmpty == false

        if hasEmail || hasPhone || hasMobile || hasWorkPhone || hasLinkedIn || hasWebsite {
            Section("Contact Info") {
                if let email = contact.email, !email.isEmpty {
                    linkRow(label: "Email", value: email, urlString: "mailto:\(email)")
                }

                if let phone = contact.phone, !phone.isEmpty {
                    linkRow(label: "Phone", value: phone, urlString: "tel:\(phone)")
                }

                if let mobile = contact.mobilePhone, !mobile.isEmpty,
                   mobile != contact.phone {
                    linkRow(label: "Mobile", value: mobile, urlString: "tel:\(mobile)")
                }

                if let workPhone = contact.workPhone, !workPhone.isEmpty,
                   workPhone != contact.phone {
                    linkRow(label: "Work Phone", value: workPhone, urlString: "tel:\(workPhone)")
                }

                if let linkedin = contact.linkedInUrl, !linkedin.isEmpty {
                    let url = linkedin.hasPrefix("http") ? linkedin : "https://\(linkedin)"
                    linkRow(label: "LinkedIn", value: linkedin, urlString: url)
                }

                if let website = contact.website, !website.isEmpty {
                    let url = website.hasPrefix("http") ? website : "https://\(website)"
                    linkRow(label: "Website", value: website, urlString: url)
                }
            }
        }
    }

    // MARK: - Classification

    @ViewBuilder
    private var classificationSection: some View {
        let hasCategorization = contact.categorization?.isEmpty == false
        let hasTags = !contact.tags.isEmpty
        let hasQuality = contact.qualityRating?.isEmpty == false
        let hasReliability = contact.reliabilityRating?.isEmpty == false
        let hasQualification = contact.qualificationStatus?.isEmpty == false
        let hasLeadScore = contact.leadScore != nil
        let hasLeadSource = contact.leadSource?.isEmpty == false
        let hasPartnerStatus = contact.partnerStatus?.isEmpty == false

        if hasCategorization || hasTags || hasQuality || hasReliability
            || hasQualification || hasLeadScore || hasLeadSource || hasPartnerStatus {
            Section("Classification") {
                if let categorization = contact.categorization, !categorization.isEmpty {
                    HStack {
                        Text("Categorization")
                            .foregroundStyle(.secondary)
                        Spacer()
                        BadgeView(
                            text: categorization,
                            color: categorizationColor(categorization)
                        )
                    }
                    .frame(minHeight: 28)
                }

                if !contact.tags.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Tags")
                            .foregroundStyle(.secondary)
                        FlowLayout(spacing: 6) {
                            ForEach(contact.tags, id: \.self) { tag in
                                BadgeView(text: tag, color: .teal)
                            }
                        }
                    }
                    .frame(minHeight: 28)
                }

                if let status = contact.qualificationStatus, !status.isEmpty {
                    FieldRow(label: "Qualification", value: status)
                }

                if let score = contact.leadScore {
                    FieldRow(label: "Lead Score", value: "\(score)")
                }

                if let source = contact.leadSource, !source.isEmpty {
                    FieldRow(label: "Lead Source", value: source)
                }

                if let quality = contact.qualityRating, !quality.isEmpty {
                    FieldRow(label: "Quality Rating", value: quality)
                }

                if let reliability = contact.reliabilityRating, !reliability.isEmpty {
                    FieldRow(label: "Reliability Rating", value: reliability)
                }

                if let partner = contact.partnerStatus, !partner.isEmpty {
                    HStack {
                        Text("Partner Status")
                            .foregroundStyle(.secondary)
                        Spacer()
                        StatusBadge(text: partner, color: .purple)
                    }
                    .frame(minHeight: 28)
                }
            }
        }
    }

    // MARK: - Business

    @ViewBuilder
    private var businessSection: some View {
        let hasCompany = contact.company?.isEmpty == false
        let hasIndustry = contact.industry?.isEmpty == false
        let hasPartnerType = contact.partnerType?.isEmpty == false
        let hasOnboarding = contact.onboardingStatus?.isEmpty == false
        let hasAddress = hasAddressFields

        if hasCompany || hasIndustry || hasPartnerType || hasOnboarding || hasAddress {
            Section("Business") {
                if let company = contact.company, !company.isEmpty {
                    FieldRow(label: "Company", value: company)
                }

                if let industry = contact.industry, !industry.isEmpty {
                    FieldRow(label: "Industry", value: industry)
                }

                if let partnerType = contact.partnerType, !partnerType.isEmpty {
                    FieldRow(label: "Partner Type", value: partnerType)
                }

                if let onboarding = contact.onboardingStatus, !onboarding.isEmpty {
                    FieldRow(label: "Onboarding Status", value: onboarding)
                }

                if hasAddressFields {
                    FieldRow(label: "Address", value: formattedAddress)
                }
            }
        }
    }

    // MARK: - Notes

    @ViewBuilder
    private var notesSection: some View {
        let hasNotes = contact.notes?.isEmpty == false
        let hasLeadNote = contact.leadNote?.isEmpty == false
        let hasReviewNotes = contact.reviewNotes?.isEmpty == false
        let hasRejection = contact.reasonForRejection?.isEmpty == false

        if hasNotes || hasLeadNote || hasReviewNotes || hasRejection {
            Section("Notes") {
                if let notes = contact.notes, !notes.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(notes)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let leadNote = contact.leadNote, !leadNote.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Lead Note")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(leadNote)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let reviewNotes = contact.reviewNotes, !reviewNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Review Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(reviewNotes)
                            .font(.body)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let reason = contact.reasonForRejection, !reason.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Reason for Rejection")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(reason)
                            .font(.body)
                            .foregroundStyle(.red)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailsSection: some View {
        Section("Details") {
            if let lastContact = contact.lastContactDate {
                FieldRow(label: "Last Contact", value: lastContact.formatted(date: .abbreviated, time: .omitted))
            }

            if let lastInteraction = contact.lastInteractionDate {
                FieldRow(label: "Last Interaction", value: lastInteraction.formatted(date: .abbreviated, time: .omitted))
            }

            if let importDate = contact.importDate {
                FieldRow(label: "Imported", value: importDate.formatted(date: .abbreviated, time: .omitted))
            }

            if let reviewDate = contact.reviewCompletionDate {
                FieldRow(label: "Review Completed", value: reviewDate.formatted(date: .abbreviated, time: .omitted))
            }

            if let modified = contact.airtableModifiedAt {
                FieldRow(label: "Last Modified", value: modified.formatted(date: .abbreviated, time: .shortened))
            }

            if let daysSince = daysSinceLastContact {
                FieldRow(label: "Days Since Contact", value: "\(daysSince)")
            }

            if contact.syncToContacts {
                HStack {
                    Text("Synced to Apple Contacts")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
                .frame(minHeight: 28)
            }

            // Airtable record ID — small, for debugging
            Text(contact.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Helpers

    /// Opens a URL after validating the scheme is safe.
    private func openURL(_ urlString: String) {
        guard let url = URL(string: urlString),
              let scheme = url.scheme,
              ["https", "http", "mailto", "tel"].contains(scheme) else { return }
        NSWorkspace.shared.open(url)
    }

    /// Builds a tappable link row for contact info fields.
    private func linkRow(label: String, value: String, urlString: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            if let url = URL(string: urlString),
               let scheme = url.scheme,
               ["https", "http", "mailto", "tel"].contains(scheme) {
                Link(value, destination: url)
                    .foregroundStyle(Color.accentColor)
            } else {
                Text(value)
                    .foregroundStyle(.primary)
            }
        }
        .frame(minHeight: 28)
    }

    /// Determines color for categorization badge based on common values.
    private func categorizationColor(_ value: String) -> Color {
        let lower = value.lowercased()
        if lower.contains("client") { return .blue }
        if lower.contains("lead") { return .orange }
        if lower.contains("partner") { return .purple }
        if lower.contains("vendor") { return .green }
        if lower.contains("prospect") { return .yellow }
        return .gray
    }

    /// Whether any address field is populated.
    private var hasAddressFields: Bool {
        let fields: [String?] = [
            contact.addressLine, contact.city,
            contact.state, contact.country, contact.postalCode
        ]
        return fields.contains { $0?.isEmpty == false }
    }

    /// Formats address from available components.
    private var formattedAddress: String {
        var parts: [String] = []

        if let line = contact.addressLine, !line.isEmpty {
            parts.append(line)
        }

        var cityStateParts: [String] = []
        if let city = contact.city, !city.isEmpty {
            cityStateParts.append(city)
        }
        if let state = contact.state, !state.isEmpty {
            cityStateParts.append(state)
        }
        if !cityStateParts.isEmpty {
            var cityState = cityStateParts.joined(separator: ", ")
            if let postal = contact.postalCode, !postal.isEmpty {
                cityState += " \(postal)"
            }
            parts.append(cityState)
        } else if let postal = contact.postalCode, !postal.isEmpty {
            parts.append(postal)
        }

        if let country = contact.country, !country.isEmpty {
            parts.append(country)
        }

        return parts.joined(separator: "\n")
    }

    /// Days since the last contact date, if available.
    private var daysSinceLastContact: Int? {
        guard let lastDate = contact.lastContactDate else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: lastDate, to: Date())
        return components.day
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
    contact.postalCode = "10001"

    return ContactDetailView(contact: contact)
        .frame(width: 500, height: 800)
}
