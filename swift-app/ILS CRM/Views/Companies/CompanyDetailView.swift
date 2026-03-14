import SwiftUI
import SwiftData

/// Company detail pane — mirrors src/components/companies/Company360Page.tsx
///
/// Displays:
/// - Breadcrumb (small company name)
/// - DetailHeader: avatar + name + location subtitle + Website button
/// - StatsRow: Contacts | Open Opps | Total Value
/// - COMPANY INFO section: Website (link), Address, Founded, Industry, Type, Size, Revenue, Lead Source, NAICS
/// - CONTACTS section: resolved contacts with avatar + name + title + chevron
/// - OPEN OPPORTUNITIES section: resolved opportunities or empty state
/// - PROJECTS section: linked project count (if any)
/// - PROPOSALS section: linked proposal count (if any)
/// - Edit / Delete actions
struct CompanyDetailView: View {
    let company: Company
    let allContacts: [Contact]
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @Environment(\.modelContext) private var modelContext

    @Query private var allOpportunities: [Opportunity]

    // MARK: - Derived data

    private var linkedContacts: [Contact] {
        allContacts.filter { company.contactsIds.contains($0.id) }
    }

    private var openOpportunities: [Opportunity] {
        allOpportunities.filter {
            $0.companyIds.contains(company.id) && isOpenStage($0.salesStage)
        }
    }

    private var locationSubtitle: String {
        let parts: [String] = [company.city, company.stateRegion, company.country]
            .compactMap { $0?.isEmpty == false ? $0 : nil }
        return parts.joined(separator: ", ")
    }

    private var websiteURL: String? {
        guard let w = company.website, !w.isEmpty else { return nil }
        return w.contains("://") ? w : "https://\(w)"
    }

    private var totalValue: String {
        let sum = openOpportunities.compactMap { $0.dealValue }.reduce(0, +)
        if sum == 0 { return "—" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: sum)) ?? "—"
    }

    private var fullAddress: String {
        let parts: [String] = [
            company.address,
            company.city,
            company.stateRegion,
            company.postalCode,
            company.country
        ].compactMap { $0?.isEmpty == false ? $0 : nil }
        return parts.joined(separator: ", ")
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {

                // Breadcrumb
                Text(company.companyName ?? "")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 4)

                // Edit / Delete toolbar row
                HStack {
                    Spacer()
                    Button {
                        showEdit = true
                    } label: {
                        Label("Edit", systemImage: "pencil")
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)

                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(.red.opacity(0.8))
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 8)

                // Header
                DetailHeader(
                    name: company.companyName ?? "Unknown",
                    subtitle: locationSubtitle.isEmpty ? nil : locationSubtitle,
                    actionLabel: websiteURL != nil ? "Website" : nil,
                    actionURL: websiteURL
                )
                .padding(.horizontal, 20)
                .padding(.bottom, 16)

                // Stats Row
                StatsRow(items: [
                    (label: "Contacts",    value: "\(linkedContacts.count)"),
                    (label: "Open Opps",   value: "\(openOpportunities.count)"),
                    (label: "Total Value", value: totalValue)
                ])
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

                // Company Info
                companyInfoSection
                    .padding(.horizontal, 20)

                // Contacts
                contactsSection
                    .padding(.horizontal, 20)

                // Open Opportunities
                opportunitiesSection
                    .padding(.horizontal, 20)

                // Projects
                projectsSection
                    .padding(.horizontal, 20)

                // Proposals
                proposalsSection
                    .padding(.horizontal, 20)

                Spacer(minLength: 32)
            }
        }
        .sheet(isPresented: $showEdit) {
            CompanyFormView(company: company)
                .frame(minWidth: 480, minHeight: 560)
        }
        .confirmationDialog(
            "Delete \"\(company.companyName ?? "company")\"?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                modelContext.delete(company)
                onDelete?()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }

    // MARK: - Company Info Section

    @ViewBuilder
    private var companyInfoSection: some View {
        let hasWebsite = websiteURL != nil
        let hasAddress = !fullAddress.isEmpty
        let hasYear    = company.foundingYear != nil
        let hasIndustry = !(company.industry ?? "").isEmpty
        let hasType = !(company.companyType ?? "").isEmpty
        let hasSize = !(company.companySize ?? "").isEmpty
        let hasRevenue = !(company.annualRevenue ?? "").isEmpty
        let hasLeadSource = !(company.leadSource ?? "").isEmpty
        let hasNaics = !(company.naicsCode ?? "").isEmpty

        if hasWebsite || hasAddress || hasYear || hasIndustry || hasType || hasSize || hasRevenue || hasLeadSource || hasNaics {
            DetailSection(title: "COMPANY INFO") {
                if let url = websiteURL, let displayWeb = company.website {
                    DetailFieldRow(
                        label: "Website",
                        value: displayWeb,
                        isLink: true,
                        linkURL: url
                    )
                }

                if !fullAddress.isEmpty {
                    DetailFieldRow(label: "Address", value: fullAddress)
                }

                if let year = company.foundingYear {
                    DetailFieldRow(label: "Founded", value: "\(year)")
                }

                if let industry = company.industry, !industry.isEmpty {
                    DetailFieldRow(label: "Industry", value: industry)
                }

                if let companyType = company.companyType, !companyType.isEmpty {
                    DetailFieldRow(label: "Type", value: companyType)
                }

                if let companySize = company.companySize, !companySize.isEmpty {
                    DetailFieldRow(label: "Size", value: companySize)
                }

                if let annualRevenue = company.annualRevenue, !annualRevenue.isEmpty {
                    DetailFieldRow(label: "Annual Revenue", value: annualRevenue)
                }

                if let leadSource = company.leadSource, !leadSource.isEmpty {
                    DetailFieldRow(label: "Lead Source", value: leadSource)
                }

                if let naicsCode = company.naicsCode, !naicsCode.isEmpty {
                    DetailFieldRow(label: "NAICS Code", value: naicsCode)
                }
            }
        }
    }

    // MARK: - Contacts Section

    private var contactsSection: some View {
        DetailSection(title: "CONTACTS") {
            if linkedContacts.isEmpty {
                Text("No contacts")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
            } else {
                VStack(spacing: 0) {
                    ForEach(linkedContacts, id: \.id) { contact in
                        contactRow(contact)
                        if contact.id != linkedContacts.last?.id {
                            Divider()
                                .padding(.leading, 52)
                        }
                    }
                }
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func contactRow(_ contact: Contact) -> some View {
        HStack(spacing: 10) {
            AvatarView(name: contact.contactName ?? "?", avatarSize: .small)

            VStack(alignment: .leading, spacing: 1) {
                Text(contact.contactName ?? "Unknown")
                    .font(.system(size: 13, weight: .medium))

                if let title = contact.jobTitle, !title.isEmpty {
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    // MARK: - Opportunities Section

    private var opportunitiesSection: some View {
        DetailSection(title: "OPEN OPPORTUNITIES") {
            if openOpportunities.isEmpty {
                Text("No open opportunities")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
            } else {
                VStack(spacing: 0) {
                    ForEach(openOpportunities, id: \.id) { opp in
                        opportunityRow(opp)
                        if opp.id != openOpportunities.last?.id {
                            Divider()
                                .padding(.leading, 12)
                        }
                    }
                }
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func opportunityRow(_ opp: Opportunity) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(opp.opportunityName ?? "Untitled")
                    .font(.system(size: 13, weight: .medium))

                if let stage = opp.salesStage, !stage.isEmpty {
                    Text(stage)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let value = opp.dealValue, value > 0 {
                Text(formattedCurrency(value))
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private func formattedCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$\(Int(value))"
    }

    // MARK: - Projects Section

    @ViewBuilder
    private var projectsSection: some View {
        if !company.projectsIds.isEmpty {
            DetailSection(title: "PROJECTS") {
                HStack {
                    Image(systemName: "folder")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Text("\(company.projectsIds.count) linked project\(company.projectsIds.count == 1 ? "" : "s")")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    // MARK: - Proposals Section

    @ViewBuilder
    private var proposalsSection: some View {
        if !company.proposalsIds.isEmpty {
            DetailSection(title: "PROPOSALS") {
                HStack {
                    Image(systemName: "doc.text")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Text("\(company.proposalsIds.count) linked proposal\(company.proposalsIds.count == 1 ? "" : "s")")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    // MARK: - Helpers

    /// Determines whether a sales stage should be counted as "open".
    /// Closed/won/lost stages are excluded.
    private func isOpenStage(_ stage: String?) -> Bool {
        guard let stage else { return true }
        let lower = stage.lowercased()
        return !lower.contains("closed") && !lower.contains("won") && !lower.contains("lost")
    }
}
