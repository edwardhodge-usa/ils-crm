import SwiftUI
import SwiftData

/// Contact detail view rendered as a bento-style dashboard.
struct ContactDetailView: View {
    @Bindable var contact: Contact

    @Query private var opportunities: [Opportunity]
    @Query private var companies: [Company]
    @Query private var contacts: [Contact]
    @Query private var personRates: [PersonRate]
    @Query private var rateCards: [RateCard]

    @State private var showEditContact = false
    @State private var showDeleteConfirm = false
    @State private var isUploadingPhoto = false
    @State private var showingOpportunitiesPicker = false
    @State private var showingCompaniesPicker = false
    @State private var selectedLinkedCompany: Company?
    @State private var selectedLinkedOpportunity: Opportunity?

    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var syncEngine

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter
    }()

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

    private var contactName: String {
        if let name = contact.contactName, !name.isEmpty {
            return name
        }

        let parts = [contact.firstName, contact.lastName]
            .compactMap { $0 }
            .filter { !$0.isEmpty }

        if !parts.isEmpty {
            return parts.joined(separator: " ")
        }

        return "Unnamed Contact"
    }

    private var linkedCompanies: [Company] {
        companies.filter { contact.companiesIds.contains($0.id) }
    }

    private var resolvedCompanyNames: [String] {
        linkedCompanies.compactMap { company in
            guard let name = company.companyName, !name.isEmpty else { return nil }
            return name
        }
    }

    private var primaryCompanyName: String? {
        resolvedCompanyNames.first
    }

    private var heroSubtitle: String? {
        let parts = [contact.jobTitle, primaryCompanyName]
            .compactMap { $0 }
            .filter { !$0.isEmpty }

        guard !parts.isEmpty else { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    private var linkedOpportunities: [Opportunity] {
        opportunities.filter { $0.associatedContactIds.contains(contact.id) }
    }

    private var openOpportunities: [Opportunity] {
        let closedStages: Set<String> = ["Won", "Lost", "Closed Won", "Closed Lost"]
        return linkedOpportunities.filter { opportunity in
            !closedStages.contains(opportunity.salesStage ?? "")
        }
    }

    private var daysSinceLastContact: String {
        guard let lastDate = contact.lastContactDate else { return "—" }
        let days = Calendar.current.dateComponents([.day], from: lastDate, to: Date()).day ?? 0
        return "\(days)"
    }

    private var locationText: String {
        let parts = [contact.city, contact.state, contact.country]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
        return parts.isEmpty ? "—" : parts.joined(separator: ", ")
    }

    private var eventTags: [String] {
        guard let raw = contact.eventTags, !raw.isEmpty else { return [] }

        if let data = raw.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [String] {
            return parsed
        }

        return raw
            .components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private var hasPartnerData: Bool {
        let partnerType = contact.partnerType ?? ""
        let partnerStatus = contact.partnerStatus ?? ""
        let rateInfo = contact.rateInfo ?? ""
        let qualityRating = contact.qualityRating ?? ""
        let reliabilityRating = contact.reliabilityRating ?? ""

        return !partnerType.isEmpty ||
            !partnerStatus.isEmpty ||
            !rateInfo.isEmpty ||
            !qualityRating.isEmpty ||
            !reliabilityRating.isEmpty
    }

    private var contactPersonRates: [PersonRate] {
        personRates.filter { $0.contactIds.contains(contact.id) }
    }

    private func rateCard(for personRate: PersonRate) -> RateCard? {
        guard let roleId = personRate.roleIds.first else { return nil }
        return rateCards.first { $0.id == roleId }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                heroSection

                detailRow(overviewCell, communicationCell)
                detailRow(timelineCell, linkedRecordsCell)
                detailRow(opportunitiesCell, notesCell)

                if hasPartnerData {
                    partnerVendorCell
                }

                if !contactPersonRates.isEmpty {
                    preferredRatesCell
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
        .sheet(item: $selectedLinkedCompany) { company in
            NavigationStack {
                CompanyDetailView(
                    company: company,
                    allContacts: contacts,
                    onEdit: nil,
                    onDelete: nil
                )
                .navigationTitle(company.companyName ?? "Company")
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            selectedLinkedCompany = nil
                        }
                    }
                }
            }
            .frame(minWidth: 780, minHeight: 620)
        }
        .sheet(item: $selectedLinkedOpportunity) { opportunity in
            NavigationStack {
                OpportunityDetailView(opportunity: opportunity)
                    .navigationTitle(opportunity.opportunityName ?? "Opportunity")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") {
                                selectedLinkedOpportunity = nil
                            }
                        }
                    }
            }
            .frame(minWidth: 720, minHeight: 620)
        }
    }

    private var heroSection: some View {
        HStack(spacing: 14) {
            #if os(macOS)
            EditableAvatarView(
                name: contactName,
                size: 56,
                photoURL: contact.contactPhotoUrl.flatMap(URL.init(string:)),
                shape: .circle,
                isUploading: isUploadingPhoto,
                onPhotoSelected: { data in uploadContactPhoto(data) },
                onPhotoRemoved: { removeContactPhoto() }
            )
            .id(contact.contactPhotoUrl)
            #else
            AvatarView(name: contactName, size: 56, photoURL: contact.contactPhotoUrl.flatMap(URL.init(string:)), shape: .circle)
            #endif

            VStack(alignment: .leading, spacing: 3) {
                Text(contactName)
                    .font(.system(size: 16, weight: .semibold))
                    .lineLimit(1)

                if let heroSubtitle, !heroSubtitle.isEmpty {
                    Text(heroSubtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 6) {
                    if let email = contact.email, !email.isEmpty {
                        Button {
                            openEmail(email)
                        } label: {
                            BentoPill(text: "Email", color: .accentColor)
                        }
                        .buttonStyle(.plain)
                    }

                    if let phone = contact.mobilePhone ?? contact.workPhone, !phone.isEmpty {
                        Button {
                            openPhone(phone)
                        } label: {
                            BentoPill(text: "Call", color: .green)
                        }
                        .buttonStyle(.plain)
                    }

                    if let linkedIn = contact.linkedInUrl, !linkedIn.isEmpty {
                        Button {
                            openRawURL(linkedIn)
                        } label: {
                            BentoPill(text: "LinkedIn", color: Color(red: 0.0, green: 0.47, blue: 0.71))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 8)

            HStack(spacing: 16) {
                BentoHeroStat(value: "\(resolvedCompanyNames.count)", label: "Companies")
                BentoHeroStat(value: "\(openOpportunities.count)", label: "Open Opps")
                BentoHeroStat(value: contact.leadScore.map(String.init) ?? "—", label: "Lead Score")
                BentoHeroStat(value: daysSinceLastContact, label: "Days Since")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var overviewCell: some View {
        BentoCell(title: "Overview") {
            VStack(alignment: .leading, spacing: 10) {
                if !contact.categorization.isEmpty {
                    FlowLayout(spacing: 6) {
                        ForEach(contact.categorization, id: \.self) { tag in
                            BentoPill(text: tag, color: .accentColor)
                        }
                    }
                }

                if let qualification = contact.qualificationStatus, !qualification.isEmpty {
                    BentoPill(text: qualification, color: .orange)
                }

                VStack(spacing: 0) {
                    EditableFieldRow(label: "Industry", key: "industry", type: .text, value: contact.industry, onSave: saveField)
                    EditableFieldRow(label: "Lead Source", key: "leadSource", type: .text, value: contact.leadSource, onSave: saveField)
                    EditableFieldRow(label: "Title", key: "jobTitle", type: .text, value: contact.jobTitle, onSave: saveField)
                    readOnlyLinkRow(label: "Website", value: contact.website, prefix: nil)
                }

                if !eventTags.isEmpty {
                    FlowLayout(spacing: 6) {
                        ForEach(eventTags, id: \.self) { tag in
                            BentoChip(text: tag)
                        }
                    }
                }
            }
        }
    }

    private var communicationCell: some View {
        BentoCell(title: "Contact Channels") {
            VStack(spacing: 0) {
                contactLinkRow(label: "Email", value: contact.email, prefix: "mailto:")
                contactLinkRow(label: "Mobile", value: contact.mobilePhone, prefix: "tel:")
                contactLinkRow(label: "Office", value: contact.workPhone, prefix: "tel:")
                contactLinkRow(label: "LinkedIn", value: contact.linkedInUrl, prefix: nil)
                contactLinkRow(label: "Website", value: contact.website, prefix: nil)
            }
        }
    }

    private var timelineCell: some View {
        BentoCell(title: "Timeline & Location") {
            VStack(spacing: 0) {
                EditableFieldRow(
                    label: "Last Contact",
                    key: "lastContactDate",
                    type: .date,
                    value: isoDateString(contact.lastContactDate),
                    onSave: saveField
                )
                readOnlyRow(label: "Last Interaction", value: formattedDate(contact.lastInteractionDate))
                readOnlyRow(label: "Imported", value: formattedDate(contact.importDate))
                readOnlyRow(label: "Review Done", value: formattedDate(contact.reviewCompletionDate))
                readOnlyRow(label: "Location", value: locationText)
                EditableFieldRow(label: "Address", key: "addressLine", type: .text, value: contact.addressLine, onSave: saveField)
            }
        }
    }

    private var linkedRecordsCell: some View {
        BentoCell(title: "Linked Records") {
            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Companies")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                        Spacer()
                        sectionActionButton(
                            title: resolvedCompanyNames.isEmpty ? "Link Company" : "Manage",
                            systemImage: "plus.circle"
                        ) {
                            showingCompaniesPicker = true
                        }
                    }

                    if resolvedCompanyNames.isEmpty {
                        emptyLinkedState(
                            message: "No linked companies",
                            actionTitle: "Link Company"
                        ) {
                            showingCompaniesPicker = true
                        }
                    } else {
                        FlowLayout(spacing: 6) {
                            ForEach(linkedCompanies, id: \.id) { company in
                                BentoChip(
                                    text: company.companyName ?? "Unnamed Company",
                                    onTap: { selectedLinkedCompany = company }
                                )
                            }
                        }
                    }
                }

                Divider()

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Opportunities")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                        Spacer()
                        sectionActionButton(
                            title: linkedOpportunities.isEmpty ? "Link Opportunity" : "Manage",
                            systemImage: "plus.circle"
                        ) {
                            showingOpportunitiesPicker = true
                        }
                    }

                    if linkedOpportunities.isEmpty {
                        emptyLinkedState(
                            message: "No linked opportunities",
                            actionTitle: "Link Opportunity"
                        ) {
                            showingOpportunitiesPicker = true
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(linkedOpportunities.prefix(4), id: \.id) { opportunity in
                                Button {
                                    selectedLinkedOpportunity = opportunity
                                } label: {
                                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                                        Text(opportunity.opportunityName ?? "Untitled Opportunity")
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundStyle(.primary)
                                            .lineLimit(1)

                                        Spacer()

                                        if let stage = opportunity.salesStage, !stage.isEmpty {
                                            BentoPill(text: stage, color: stageColor(for: opportunity.salesStage))
                                        }
                                    }
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }

                            if linkedOpportunities.count > 4 {
                                Text("+\(linkedOpportunities.count - 4) more")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }

    private var opportunitiesCell: some View {
        BentoCell(title: "Open Deals") {
            VStack(alignment: .leading, spacing: 0) {
                if openOpportunities.isEmpty {
                    Text("No open deals")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                } else {
                    ForEach(openOpportunities, id: \.id) { opportunity in
                        Button {
                            selectedLinkedOpportunity = opportunity
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(alignment: .firstTextBaseline) {
                                    Text(opportunity.opportunityName ?? "Untitled Opportunity")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(.primary)
                                        .lineLimit(1)

                                    Spacer()

                                    if let dealValue = opportunity.dealValue, dealValue > 0 {
                                        Text(formattedCurrency(dealValue))
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(stageColor(for: opportunity.salesStage))
                                    }
                                }

                                HStack {
                                    if let stage = opportunity.salesStage, !stage.isEmpty {
                                        BentoPill(text: stage, color: stageColor(for: opportunity.salesStage))
                                    }

                                    Spacer()

                                    if let closeDate = opportunity.expectedCloseDate {
                                        Text(formattedDate(closeDate))
                                            .font(.system(size: 12))
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if opportunity.id != openOpportunities.last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
    }

    private var notesCell: some View {
        BentoCell(title: "Notes & Context") {
            VStack(alignment: .leading, spacing: 10) {
                contextTextBlock(title: "Notes", text: contact.notes, key: "notes")

                if let leadNote = contact.leadNote, !leadNote.isEmpty {
                    Divider()
                    contextTextBlock(title: "Lead Note", text: leadNote)
                }

                if let reviewNotes = contact.reviewNotes, !reviewNotes.isEmpty {
                    Divider()
                    contextTextBlock(title: "Review Notes", text: reviewNotes)
                }

                if let rejectionReason = contact.reasonForRejection, !rejectionReason.isEmpty {
                    Divider()
                    contextTextBlock(title: "Reason for Rejection", text: rejectionReason)
                }
            }
        }
    }

    private var preferredRatesCell: some View {
        BentoCell(title: "Preferred Rates") {
            if contactPersonRates.isEmpty {
                Text("No preferred rates on file")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(spacing: 8) {
                    ForEach(contactPersonRates, id: \.id) { rate in
                        preferredRateRow(rate)
                    }
                }
            }
        }
    }

    private func preferredRateRow(_ rate: PersonRate) -> some View {
        let card = rateCard(for: rate)
        let roleName = card?.role ?? rate.label ?? "Unknown Role"
        let hourly = rate.agreedHourly
        let dayRate = rate.agreedDayRate

        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(roleName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)

                HStack(spacing: 8) {
                    if let hourly {
                        Text(formatCurrency(hourly) + "/hr")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    if let dayRate {
                        Text(formatCurrency(dayRate) + "/day")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    if hourly == nil && dayRate == nil {
                        Text("No rates set")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let status = rate.status, !status.isEmpty {
                Text(status)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(statusColor(status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(status).opacity(0.12))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "active": return .green
        case "expired": return .red
        case "pending": return .orange
        default: return .secondary
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }

    private var partnerVendorCell: some View {
        BentoCell(title: "Partner / Vendor") {
            VStack(spacing: 0) {
                EditableFieldRow(label: "Partner Type", key: "partnerType", type: .text, value: contact.partnerType, onSave: saveField)
                EditableFieldRow(label: "Partner Status", key: "partnerStatus", type: .text, value: contact.partnerStatus, onSave: saveField)
                EditableFieldRow(label: "Rate Info", key: "rateInfo", type: .text, value: contact.rateInfo, onSave: saveField)
                EditableFieldRow(label: "Quality", key: "qualityRating", type: .text, value: contact.qualityRating, onSave: saveField)
                EditableFieldRow(label: "Reliability", key: "reliabilityRating", type: .text, value: contact.reliabilityRating, onSave: saveField)
            }
        }
    }

    private func detailRow<Leading: View, Trailing: View>(
        _ leading: Leading,
        _ trailing: Trailing
    ) -> some View {
        HStack(alignment: .top, spacing: 10) {
            leading
                .frame(maxWidth: .infinity, alignment: .topLeading)
            trailing
                .frame(maxWidth: .infinity, alignment: .topLeading)
        }
    }

    private func sectionActionButton(
        title: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.system(size: 12, weight: .semibold))
        }
        .buttonStyle(.borderless)
        .labelStyle(.titleAndIcon)
    }

    private func emptyLinkedState(
        message: String,
        actionTitle: String,
        action: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)

            Button(actionTitle, action: action)
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func readOnlyRow(label: String, value: String) -> some View {
        DetailFieldRow(label: label, value: value)
    }

    private func readOnlyLinkRow(label: String, value: String?, prefix: String?) -> some View {
        DetailFieldRow(
            label: label,
            value: value.map { displayValue(for: label, value: $0) } ?? "—",
            isLink: value?.isEmpty == false,
            linkURL: value.map { resolvedURL(value: $0, prefix: prefix) }
        )
    }

    @ViewBuilder
    private func contactLinkRow(label: String, value: String?, prefix: String?) -> some View {
        if let value, !value.isEmpty {
            DetailFieldRow(
                label: label,
                value: displayValue(for: label, value: value),
                isLink: true,
                linkURL: resolvedURL(value: value, prefix: prefix),
                showChevron: false
            )
        } else {
            BentoFieldRow(label: label, value: "")
        }
    }

    private func contextTextBlock(title: String, text: String?, key: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)

            if let key {
                EditableFieldRow(
                    label: "",
                    key: key,
                    type: .textarea,
                    value: text,
                    onSave: saveField
                )
            } else {
                Text((text?.isEmpty == false ? text : "—") ?? "—")
                    .font(.system(size: 13))
                    .foregroundStyle(text?.isEmpty == false ? .primary : .secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func displayValue(for label: String, value: String) -> String {
        if label == "LinkedIn" || label == "Website" {
            return value.replacingOccurrences(of: "https://", with: "")
                .replacingOccurrences(of: "http://", with: "")
                .replacingOccurrences(of: "mailto:", with: "")
                .replacingOccurrences(of: "tel:", with: "")
        }

        return value
    }

    private func resolvedURL(value: String, prefix: String?) -> String {
        if let prefix {
            if prefix == "tel:" {
                let digits = value.filter { $0.isNumber || $0 == "+" }
                return "\(prefix)\(digits)"
            }
            return "\(prefix)\(value)"
        }

        if value.hasPrefix("http://") || value.hasPrefix("https://") || value.hasPrefix("mailto:") || value.hasPrefix("tel:") {
            return value
        }

        return "https://\(value)"
    }

    private func formattedDate(_ date: Date?) -> String {
        guard let date else { return "—" }
        return Self.dateFormatter.string(from: date)
    }

    private func isoDateString(_ date: Date?) -> String? {
        guard let date else { return nil }
        return Self.isoFormatter.string(from: date)
    }

    private func stageColor(for stage: String?) -> Color {
        guard let stage else { return .gray }
        return stageColors[stage] ?? .gray
    }

    private func saveField(_ key: String, _ value: Any?) {
        let stringValue = value as? String

        switch key {
        case "jobTitle": contact.jobTitle = stringValue
        case "email": contact.email = stringValue
        case "mobilePhone": contact.mobilePhone = stringValue
        case "workPhone": contact.workPhone = stringValue
        case "linkedInUrl": contact.linkedInUrl = stringValue
        case "website": contact.website = stringValue
        case "addressLine": contact.addressLine = stringValue
        case "city": contact.city = stringValue
        case "state": contact.state = stringValue
        case "country": contact.country = stringValue
        case "industry": contact.industry = stringValue
        case "leadSource": contact.leadSource = stringValue
        case "categorization": contact.categorization = stringValue.map { [$0] } ?? []
        case "qualificationStatus": contact.qualificationStatus = stringValue
        case "eventTags": contact.eventTags = stringValue
        case "notes": contact.notes = stringValue
        case "partnerType": contact.partnerType = stringValue
        case "partnerStatus": contact.partnerStatus = stringValue
        case "rateInfo": contact.rateInfo = stringValue
        case "qualityRating": contact.qualityRating = stringValue
        case "reliabilityRating": contact.reliabilityRating = stringValue
        case "leadScore":
            if let stringValue {
                contact.leadScore = Int(stringValue)
            } else {
                contact.leadScore = nil
            }
        case "lastContactDate":
            if let stringValue {
                contact.lastContactDate = Self.isoFormatter.date(from: stringValue)
            } else {
                contact.lastContactDate = nil
            }
        default:
            break
        }

        contact.localModifiedAt = Date()
        contact.isPendingPush = true
    }

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

    private func openEmail(_ email: String) {
        guard let url = URL(string: "mailto:\(email)") else { return }
        openURL(url)
    }

    private func openPhone(_ phone: String) {
        let digits = phone.filter { $0.isNumber || $0 == "+" }
        guard let url = URL(string: "tel:\(digits)") else { return }
        openURL(url)
    }

    private func openRawURL(_ rawValue: String) {
        let value = resolvedURL(value: rawValue, prefix: nil)
        guard let url = URL(string: value) else { return }
        openURL(url)
    }

    private func formattedCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }
}

/// Wraps pills and chips to the next line when width is exhausted.
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

#Preview {
    let contact = Contact(
        id: "recABC123",
        contactName: "Jane Smith",
        categorization: ["Client", "VIP"]
    )
    contact.firstName = "Jane"
    contact.lastName = "Smith"
    contact.jobTitle = "Creative Director"
    contact.email = "jane@example.com"
    contact.mobilePhone = "+1 555-0101"
    contact.workPhone = "+1 555-0102"
    contact.industry = "Media & Entertainment"
    contact.leadSource = "Referral"
    contact.linkedInUrl = "https://linkedin.com/in/janesmith"
    contact.notes = "Met at SXSW 2025. Very interested in our platform capabilities."
    contact.leadNote = "Warm intro from an existing client."
    contact.lastContactDate = Calendar.current.date(byAdding: .day, value: -12, to: Date())
    contact.lastInteractionDate = Calendar.current.date(byAdding: .day, value: -4, to: Date())
    contact.leadScore = 85
    contact.city = "New York"
    contact.state = "NY"
    contact.country = "USA"
    contact.eventTags = "VIP, Speaker, Follow Up"
    contact.qualificationStatus = "Qualified"

    return NavigationStack {
        ContactDetailView(contact: contact)
            .frame(width: 760, height: 640)
    }
}
