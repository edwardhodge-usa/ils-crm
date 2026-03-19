import SwiftUI
import SwiftData

/// Contact detail view — bento box layout matching the Electron Contact360Page.
///
/// Three-zone layout:
/// - Zone 1: Hero bar (avatar, name, action pills, stats) — fixed
/// - Zone 2: CRM grouped bento (categorization list, stat cells, events) — fixed
/// - Zone 3: Bottom split — left detail column + right timeline — both scroll independently
///
/// Uses shared DetailComponents (DetailHeader, StatsRow, DetailSection,
/// EditableFieldRow) — inline click-to-edit fields, auto-save on blur.
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

    /// Hero subtitle: "Title . Company" or just one
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

    /// All opportunities linked to this contact (for the timeline).
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
        // Try JSON array first
        if let data = raw.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String] {
            return parsed
        }
        // Fall back to comma-separated
        return raw.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            // Zone 1 + Zone 2: fixed top area (does NOT scroll)
            VStack(spacing: 10) {
                heroSection
                crmBentoSection
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            // Zone 3: bottom split (both sides scroll independently)
            HStack(spacing: 0) {
                ScrollView {
                    leftDetailColumn
                        .padding(12)
                }
                .frame(width: 280)
                .scrollIndicators(.automatic)

                Divider()

                ScrollView {
                    rightTimelineColumn
                        .padding(12)
                }
                .scrollIndicators(.automatic)
            }
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

    // MARK: - Zone 1: Hero Section

    private var heroSection: some View {
        HStack(spacing: 14) {
            // Avatar
            EditableAvatarView(
                name: contactName,
                size: 56,
                photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) },
                shape: .circle,
                isUploading: isUploadingPhoto,
                onPhotoSelected: { data in uploadContactPhoto(data) },
                onPhotoRemoved: { removeContactPhoto() }
            )
            .id(contact.contactPhotoUrl)

            // Identity + action pills
            VStack(alignment: .leading, spacing: 4) {
                Text(contactName)
                    .font(.system(size: 15, weight: .semibold))
                    .lineLimit(1)

                if let subtitle = heroSubtitle {
                    HStack(spacing: 0) {
                        if let title = contact.jobTitle, !title.isEmpty {
                            Text(title)
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                        if contact.jobTitle != nil && !contact.jobTitle!.isEmpty && resolvedCompanyName != nil {
                            Text(" \u{00B7} ")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                        if let company = resolvedCompanyName {
                            Text(company)
                                .font(.system(size: 12))
                                .foregroundStyle(Color.accentColor)
                        }
                    }
                }

                // Action pills
                HStack(spacing: 6) {
                    if let email = contact.email, !email.isEmpty {
                        Button {
                            if let url = URL(string: "mailto:\(email)") {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            Text("Email")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.accentColor)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Color.accentColor.opacity(0.10))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }

                    if let phone = contact.mobilePhone ?? contact.workPhone, !phone.isEmpty {
                        Button {
                            if let url = URL(string: "tel:\(phone)") {
                                NSWorkspace.shared.open(url)
                            }
                        } label: {
                            Text("Call")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.green)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.10))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
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
                            Text("LinkedIn")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color(red: 0.353, green: 0.784, blue: 0.980)) // #5ac8fa
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(Color(red: 0.353, green: 0.784, blue: 0.980).opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 0)

            // Stats — separated by vertical dividers
            HStack(spacing: 0) {
                Divider()
                    .frame(height: 40)
                    .padding(.trailing, 12)

                statCell(value: "\(openOpportunities.count)", label: "Open Opps", color: .accentColor)

                Divider()
                    .frame(height: 32)
                    .padding(.horizontal, 8)

                statCell(value: "\u{2014}", label: "Meetings", color: .green)

                Divider()
                    .frame(height: 32)
                    .padding(.horizontal, 8)

                statCell(value: daysSinceLastContact, label: "Days Since", color: .orange)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(Color(nsColor: .controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.15), radius: 2, y: 1)
    }

    private func statCell(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(color)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.secondary)
                .tracking(0.4)
        }
        .frame(minWidth: 50)
    }

    // MARK: - Zone 2: CRM Grouped Bento

    private var crmBentoSection: some View {
        HStack(alignment: .top, spacing: 10) {
            // Left card — grouped list: Category, Industry, Lead Source
            VStack(spacing: 0) {
                EditableFieldRow(label: "Category", key: "categorization",
                    type: .singleSelect(options: [
                        "Lead", "Customer", "Partner", "Vendor", "Talent", "Other", "Unknown",
                        "VIP", "Investor", "Speaker", "Press", "Influencer", "Board Member", "Advisor"
                    ]), value: contact.categorization.first, onSave: saveField)
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
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Right side — stat cells + events strip
            VStack(spacing: 8) {
                // Top: Qualification + Lead Score side by side
                HStack(spacing: 8) {
                    // Qualification stat cell
                    VStack(alignment: .leading, spacing: 4) {
                        Text("QUALIFICATION")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .tracking(0.4)
                        EditableFieldRow(label: "", key: "qualificationStatus",
                            type: .singleSelect(options: [
                                "New", "Contacted", "Qualified", "Unqualified", "Nurturing"
                            ]), value: contact.qualificationStatus, onSave: saveField)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                    // Lead Score stat cell
                    VStack(alignment: .leading, spacing: 4) {
                        Text("LEAD SCORE")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .tracking(0.4)
                        Text(contact.leadScore.map { "\($0)" } ?? "\u{2014}")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.primary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(nsColor: .controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                // Bottom: Events tag strip
                HStack(spacing: 4) {
                    Text("EVENTS")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)
                        .tracking(0.4)
                        .padding(.trailing, 4)

                    if eventTags.isEmpty {
                        Text("\u{2014}")
                            .font(.system(size: 11))
                            .foregroundStyle(.tertiary)
                    } else {
                        FlowLayout(spacing: 4) {
                            ForEach(eventTags, id: \.self) { tag in
                                Text(tag)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(Color.accentColor)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.accentColor.opacity(0.10))
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                            }
                        }
                    }

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity, minHeight: 32, alignment: .leading)
                .background(Color(nsColor: .controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Zone 3 Left: Detail Column

    private var leftDetailColumn: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Company
            sectionLabel("Company")
            VStack(spacing: 0) {
                HStack {
                    Text("Company")
                        .font(.system(size: 13))
                        .foregroundStyle(.primary)
                    Spacer()
                    if let name = resolvedCompanyName {
                        Text(name)
                            .font(.system(size: 13))
                            .foregroundStyle(Color.accentColor)
                    } else {
                        Text("\u{2014}")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                    }
                    Button {
                        showingCompaniesPicker = true
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 36)
                Divider()
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Details
            sectionLabel("Details")
            VStack(spacing: 0) {
                EditableFieldRow(label: "Title", key: "jobTitle", type: .text, value: contact.jobTitle, onSave: saveField)
                EditableFieldRow(label: "Office", key: "workPhone", type: .text, value: contact.workPhone, isLink: true, onSave: saveField)
                EditableFieldRow(label: "Website", key: "website", type: .text, value: contact.website, isLink: true, onSave: saveField)
                EditableFieldRow(label: "City", key: "city", type: .text, value: contact.city, onSave: saveField)
                EditableFieldRow(label: "State", key: "state", type: .text, value: contact.state, onSave: saveField)
                EditableFieldRow(label: "Country", key: "country", type: .text, value: contact.country, onSave: saveField)
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Contact (editable fields for hero action pill values)
            sectionLabel("Contact")
            VStack(spacing: 0) {
                EditableFieldRow(label: "Email", key: "email", type: .text, value: contact.email, isLink: true, onSave: saveField)
                EditableFieldRow(label: "Mobile", key: "mobilePhone", type: .text, value: contact.mobilePhone, isLink: true, onSave: saveField)
                EditableFieldRow(label: "LinkedIn", key: "linkedInUrl", type: .text, value: contact.linkedInUrl, isLink: true, onSave: saveField)
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // CRM (Last Contact Date + Events editable)
            sectionLabel("CRM")
            VStack(spacing: 0) {
                EditableFieldRow(label: "Last Contact", key: "lastContactDate",
                    type: .date,
                    value: contact.lastContactDate.map { Self.isoFormatter.string(from: $0) },
                    onSave: saveField)
                EditableFieldRow(label: "Event Tags", key: "eventTags", type: .text,
                    value: contact.eventTags, onSave: saveField)
                EditableFieldRow(label: "Lead Score", key: "leadScore",
                    type: .number(prefix: nil),
                    value: contact.leadScore.map { "\($0)" }, onSave: saveField)
                EditableFieldRow(label: "Address", key: "addressLine", type: .text, value: contact.addressLine, onSave: saveField)
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Partner / Vendor
            sectionLabel("Partner / Vendor")
            VStack(spacing: 0) {
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
                EditableFieldRow(label: "Quality", key: "qualityRating",
                    type: .singleSelect(options: ["\u{2B50}", "\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}\u{2B50}\u{2B50}"]),
                    value: contact.qualityRating, onSave: saveField)
                EditableFieldRow(label: "Reliability", key: "reliabilityRating",
                    type: .singleSelect(options: ["\u{2B50}", "\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}\u{2B50}", "\u{2B50}\u{2B50}\u{2B50}\u{2B50}\u{2B50}"]),
                    value: contact.reliabilityRating, onSave: saveField)
                EditableFieldRow(label: "Rate Info", key: "rateInfo", type: .text,
                    value: contact.rateInfo, onSave: saveField)
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Notes
            sectionLabel("Notes")
            VStack(spacing: 0) {
                EditableFieldRow(label: "", key: "notes", type: .textarea,
                    value: contact.notes, onSave: saveField)
            }
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Spacer(minLength: 24)
        }
    }

    // MARK: - Zone 3 Right: Timeline Column

    private var rightTimelineColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Timeline header
            HStack {
                Text("TIMELINE")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Spacer()

                // Link opportunities button
                Button {
                    showingOpportunitiesPicker = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.accentColor)
                }
                .buttonStyle(.plain)
                .help("Link Opportunities")

                // Filter pills (display only in v1)
                HStack(spacing: 6) {
                    Text("Deals")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color(red: 0.749, green: 0.353, blue: 0.949)) // #bf5af2
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.749, green: 0.353, blue: 0.949).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    Text("Activity")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color(red: 0.353, green: 0.784, blue: 0.980)) // #5ac8fa
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.353, green: 0.784, blue: 0.980).opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            .padding(.bottom, 10)

            // Timeline entries
            if linkedOpportunities.isEmpty {
                // Empty state
                VStack(spacing: 4) {
                    Spacer(minLength: 40)
                    Text("No activity yet")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.secondary)
                    Text("Opportunities and interactions will appear here")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                    Spacer(minLength: 40)
                }
                .frame(maxWidth: .infinity)
            } else {
                // Timeline with vertical connector line
                ZStack(alignment: .leading) {
                    // Vertical connector line
                    Rectangle()
                        .fill(Color(nsColor: .separatorColor))
                        .frame(width: 1)
                        .padding(.leading, 9)
                        .padding(.top, 18)
                        .padding(.bottom, 18)

                    VStack(spacing: 8) {
                        ForEach(linkedOpportunities.sorted(by: {
                            ($0.airtableModifiedAt ?? Date.distantPast) > ($1.airtableModifiedAt ?? Date.distantPast)
                        }).prefix(10), id: \.id) { opp in
                            opportunityTimelineEntry(opp)
                        }
                    }
                }
            }

            // Interactions empty state placeholder
            if linkedOpportunities.isEmpty {
                // Already shown in the combined empty state above
            } else {
                VStack(spacing: 4) {
                    Divider()
                        .padding(.vertical, 8)
                    Text("No interactions yet")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
            }

            // Delete Contact button — bottom of right column
            Spacer(minLength: 24)
            Button {
                showDeleteConfirm = true
            } label: {
                Text("Delete Contact")
                    .font(.system(size: 13))
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 16)
        }
    }

    // MARK: - Timeline Entry Views

    private func opportunityTimelineEntry(_ opp: Opportunity) -> some View {
        HStack(alignment: .top, spacing: 10) {
            // Purple dot indicator
            ZStack {
                RoundedRectangle(cornerRadius: 5)
                    .fill(Color.clear)
                    .frame(width: 18, height: 18)
                Circle()
                    .fill(Color(red: 0.749, green: 0.353, blue: 0.949)) // #bf5af2
                    .frame(width: 6, height: 6)
            }
            .padding(.top, 8)

            // Card
            VStack(alignment: .leading, spacing: 4) {
                // Row 1: Name + Value
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

                // Row 2: Stage badge + date
                HStack(spacing: 6) {
                    if let stage = opp.salesStage, !stage.isEmpty {
                        Text(stage)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(stageColor(for: opp.salesStage))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(stageColor(for: opp.salesStage).opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    if let date = opp.airtableModifiedAt {
                        Text(formatTimelineDate(date))
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Helper Views

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.secondary)
            .tracking(0.5)
            .padding(.top, 16)
            .padding(.bottom, 6)
    }

    // MARK: - Helper Functions

    private func stageColor(for stage: String?) -> Color {
        guard let stage else { return .gray }
        return stageColors[stage] ?? .gray
    }

    private func formatTimelineDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
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
                // Force a sync to pull back the Airtable-hosted URL
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
    contact.qualityRating = "High"
    contact.leadScore = 85
    contact.city = "New York"
    contact.state = "NY"
    contact.country = "USA"

    return ContactDetailView(contact: contact)
        .frame(width: 700, height: 800)
}
