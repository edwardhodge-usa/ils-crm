import SwiftUI
import SwiftData

/// Imported Contact detail view — Email Intelligence detail pane.
///
/// Bento-style layout: hero with action buttons, AI reasoning card,
/// editable contact info grid, company pairing, email activity stats.
struct ImportedContactDetailView: View {
    let importedContact: ImportedContact
    var onShowReviewForm: (() -> Void)?

    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var syncEngine

    @Query private var companies: [Company]

    // MARK: - Computed

    private var displayName: String {
        if let name = importedContact.importedContactName, !name.isEmpty {
            return name
        }
        let first = importedContact.firstName ?? ""
        let last = importedContact.lastName ?? ""
        let combined = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return combined.isEmpty ? (importedContact.email ?? "Unknown") : combined
    }

    private var heroSubtitle: String? {
        let parts = [importedContact.jobTitle, importedContact.company]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
        guard !parts.isEmpty else { return nil }
        return parts.joined(separator: " \u{00B7} ")
    }

    private var linkedCompany: Company? {
        guard let firstId = importedContact.suggestedCompanyLink.first else { return nil }
        return companies.first(where: { $0.id == firstId })
    }

    private var timeSpanText: String {
        guard let first = importedContact.firstSeenDate,
              let last = importedContact.lastSeenDate else { return "\u{2014}" }
        let months = Calendar.current.dateComponents([.month], from: first, to: last).month ?? 0
        if months < 1 { return "< 1 month" }
        return "\(months) month\(months == 1 ? "" : "s")"
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d, yyyy"
        return f
    }()

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                heroSection
                aiReasoningCard
                contactInfoCard
                companyPairingCard
                emailActivityCard
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: displayName,
                avatarSize: .xlarge
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.system(size: 20, weight: .bold))
                    .lineLimit(1)

                if let subtitle = heroSubtitle {
                    Text(subtitle)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 8) {
                    // Dismiss button
                    Button {
                        dismissSuggestion()
                    } label: {
                        Text("Dismiss")
                            .font(.system(size: 12, weight: .semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Color(nsColor: .controlBackgroundColor))
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .overlay {
                                RoundedRectangle(cornerRadius: 6)
                                    .strokeBorder(Color.primary.opacity(0.15), lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)

                    // Add to CRM button
                    Button {
                        onShowReviewForm?()
                    } label: {
                        Text("Add to CRM")
                            .font(.system(size: 12, weight: .semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Color.green)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 2)
            }

            Spacer(minLength: 8)

            // Confidence badge
            if let confidence = importedContact.confidenceScore {
                confidenceCircle(confidence)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Confidence Circle

    private func confidenceCircle(_ score: Double) -> some View {
        let percentage = Int(score)
        let color: Color = {
            if percentage >= 80 { return .green }
            if percentage >= 50 { return .yellow }
            return Color(white: 0.55)
        }()

        return VStack(spacing: 2) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 4)
                    .frame(width: 48, height: 48)
                Circle()
                    .trim(from: 0, to: score / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 48, height: 48)
                    .rotationEffect(.degrees(-90))
                Text("\(percentage)%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(color)
            }
            Text("Confidence")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - AI Reasoning Card

    @ViewBuilder
    private var aiReasoningCard: some View {
        let hasReasoning = importedContact.aiReasoning?.isEmpty == false

        GroupBox {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "brain")
                        .font(.system(size: 12))
                        .foregroundStyle(.purple)
                    Text("AI REASONING")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(.purple)

                    Spacer()

                    // Classification source indicator
                    if let source = importedContact.classificationSource, !source.isEmpty {
                        let isAI = source.lowercased() == "ai"
                        HStack(spacing: 3) {
                            Circle()
                                .fill(isAI ? Color.green : Color.gray)
                                .frame(width: 6, height: 6)
                            Text(isAI ? "AI Classified" : "Heuristic")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(isAI ? .green : .secondary)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background((isAI ? Color.green : Color.gray).opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }

                if hasReasoning, let reasoning = importedContact.aiReasoning {
                    Text(reasoning)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary)
                        .textSelection(.enabled)
                } else {
                    Text(metadataSummary)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(4)
        }
        .backgroundStyle(.ultraThinMaterial)
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.purple.opacity(0.2), lineWidth: 1)
        }
    }

    private var metadataSummary: String {
        var parts: [String] = []

        if let threads = importedContact.emailThreadCount, threads > 0 {
            parts.append("Based on \(threads) thread\(threads == 1 ? "" : "s")")
        }

        if let first = importedContact.firstSeenDate,
           let last = importedContact.lastSeenDate {
            let months = Calendar.current.dateComponents([.month], from: first, to: last).month ?? 0
            if months > 0 {
                parts.append("over \(months) month\(months == 1 ? "" : "s")")
            }
        }

        if let via = importedContact.discoveredVia, !via.isEmpty {
            parts.append("discovered via \(via)")
        }

        return parts.isEmpty ? "No metadata available yet." : parts.joined(separator: ", ") + "."
    }

    // MARK: - Contact Info Card

    private var contactInfoCard: some View {
        BentoCell(title: "Extracted Contact Info") {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 10) {
                infoField(label: "First Name", value: importedContact.firstName)
                infoField(label: "Last Name", value: importedContact.lastName)
                infoField(label: "Email", value: importedContact.email)
                infoField(label: "Phone", value: importedContact.phone ?? importedContact.mobilePhone)
                infoField(label: "Title", value: importedContact.jobTitle)
                relationshipField
            }
        }
    }

    private func infoField(label: String, value: String?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
            Text(value?.isEmpty == false ? value! : "\u{2014}")
                .font(.system(size: 13))
                .foregroundStyle(value?.isEmpty == false ? .primary : .tertiary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var relationshipField: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("Relationship")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
            if let relType = importedContact.relationshipType, !relType.isEmpty {
                StatusBadge(text: relType, color: relationshipColor(relType))
            } else {
                Text("\u{2014}")
                    .font(.system(size: 13))
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Company Pairing Card

    @ViewBuilder
    private var companyPairingCard: some View {
        let hasSuggestedCompany = importedContact.suggestedCompanyName?.isEmpty == false
        let hasLinkedCompany = linkedCompany != nil

        if hasSuggestedCompany || hasLinkedCompany {
            GroupBox {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        Image(systemName: "building.2")
                            .font(.system(size: 12))
                            .foregroundStyle(hasLinkedCompany ? .blue : .orange)
                        Text("COMPANY PAIRING")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(0.5)
                            .foregroundStyle(hasLinkedCompany ? .blue : .orange)
                    }

                    if let company = linkedCompany {
                        HStack(spacing: 8) {
                            AvatarView(
                                name: company.companyName ?? "Company",
                                avatarSize: .small,
                                shape: .roundedRect
                            )
                            Text(company.companyName ?? "Unnamed Company")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(.blue)
                        }
                    } else if let name = importedContact.suggestedCompanyName {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(name)
                                .font(.system(size: 13, weight: .medium))
                            Text("New company will be created")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(4)
            }
            .backgroundStyle(hasLinkedCompany ? Color.blue.opacity(0.05) : Color.yellow.opacity(0.08))
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(
                        (hasLinkedCompany ? Color.blue : Color.orange).opacity(0.2),
                        lineWidth: 1
                    )
            }
        }
    }

    // MARK: - Email Activity Card

    private var emailActivityCard: some View {
        BentoCell(title: "Email Activity") {
            HStack(spacing: 0) {
                statBox(
                    value: importedContact.emailThreadCount.map { "\($0)" } ?? "\u{2014}",
                    label: "Threads"
                )
                Divider().frame(height: 36)
                statBox(value: timeSpanText, label: "Time Span")
                Divider().frame(height: 36)
                statBox(
                    value: importedContact.discoveredVia ?? "\u{2014}",
                    label: "First Seen Via"
                )
                Divider().frame(height: 36)
                statBox(
                    value: importedContact.lastSeenDate.map { Self.dateFormatter.string(from: $0) } ?? "\u{2014}",
                    label: "Last Seen"
                )
            }
        }
    }

    private func statBox(value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.primary)
                .lineLimit(1)
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
    }

    // MARK: - Actions

    private func dismissSuggestion() {
        importedContact.onboardingStatus = "Dismissed"
        importedContact.localModifiedAt = Date()
        importedContact.isPendingPush = true
    }

    // MARK: - Helpers

    private func relationshipColor(_ type: String) -> Color {
        let lower = type.lowercased()
        if lower.contains("client")     { return .blue }
        if lower.contains("vendor")     { return .purple }
        if lower.contains("employee")   { return .green }
        if lower.contains("contractor") { return .orange }
        if lower.contains("partner")    { return .teal }
        return .secondary
    }
}
