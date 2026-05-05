import SwiftUI
import SwiftData

/// Detail view for enrichment queue items — shows current vs suggested value diff
/// with Accept/Dismiss actions.
struct EnrichmentDetailView: View {
    let item: EnrichmentQueueItem
    let modelContext: ModelContext

    // MARK: - Computed

    private var linkedContact: Contact? {
        guard let firstId = item.contactIds.first else { return nil }
        let predicate = #Predicate<Contact> { contact in
            contact.id == firstId
        }
        var descriptor = FetchDescriptor<Contact>(predicate: predicate)
        descriptor.fetchLimit = 1

        return try? modelContext.fetch(descriptor).first
    }

    private var confidenceColor: Color {
        let score = Int(item.confidenceScore ?? 0)
        if score >= 80 { return .green }
        if score >= 50 { return .yellow }
        return Color(white: 0.55)
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
                headerSection
                diffCard
                detailsCard

                if hasSourceEmailContext {
                    sourceEmailCard
                }

                if let contact = linkedContact {
                    linkedContactCard(contact)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 14) {
            // Green sparkle icon
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.green.opacity(0.12))
                    .frame(width: 52, height: 52)
                Image(systemName: "sparkle")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.green)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Field Update")
                    .font(.system(size: 20, weight: .bold))

                Text("Enrichment suggestion from email scan")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)

                // Action buttons
                HStack(spacing: 8) {
                    Button {
                        dismissItem()
                    } label: {
                        Text("Dismiss")
                            .font(.system(size: 12, weight: .semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Color.platformControlBackground)
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            .overlay {
                                RoundedRectangle(cornerRadius: 6)
                                    .strokeBorder(Color.primary.opacity(0.15), lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)

                    Button {
                        acceptItem()
                    } label: {
                        Text("Accept Update")
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
            if let confidence = item.confidenceScore {
                confidenceCircle(confidence)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Confidence Circle

    private func confidenceCircle(_ score: Double) -> some View {
        let percentage = Int(score)

        return VStack(spacing: 2) {
            ZStack {
                Circle()
                    .stroke(confidenceColor.opacity(0.2), lineWidth: 4)
                    .frame(width: 48, height: 48)
                Circle()
                    .trim(from: 0, to: score / 100)
                    .stroke(confidenceColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 48, height: 48)
                    .rotationEffect(.degrees(-90))
                Text("\(percentage)%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(confidenceColor)
            }
            Text("Confidence")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Diff Card

    private var diffCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12))
                        .foregroundStyle(.green)
                    Text("PROPOSED CHANGE")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(.green)
                }

                // Field name
                Text(item.fieldName ?? "Unknown Field")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                // Current value (dimmed, strikethrough)
                VStack(alignment: .leading, spacing: 3) {
                    Text("CURRENT VALUE")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)

                    Text(item.currentValue?.isEmpty == false ? item.currentValue! : "(empty)")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                        .strikethrough(true, color: .red.opacity(0.5))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                // Arrow
                HStack {
                    Spacer()
                    Image(systemName: "arrow.down")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                // Suggested value (highlighted)
                VStack(alignment: .leading, spacing: 3) {
                    Text("SUGGESTED VALUE")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.green)

                    Text(item.suggestedValue?.isEmpty == false ? item.suggestedValue! : "(empty)")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.green.opacity(0.08))
                        .overlay {
                            RoundedRectangle(cornerRadius: 6)
                                .strokeBorder(Color.green.opacity(0.25), lineWidth: 1)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(4)
        }
        .backgroundStyle(Color.green.opacity(0.04))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.green.opacity(0.2), lineWidth: 1)
        }
    }

    // MARK: - Details Card

    private var detailsCard: some View {
        BentoCell(title: "Details") {
            HStack(spacing: 0) {
                statBox(
                    value: item.status ?? "Pending",
                    label: "Status"
                )
                Divider().frame(height: 36)
                statBox(
                    value: item.sourceEmailDate.map { Self.dateFormatter.string(from: $0) } ?? "\u{2014}",
                    label: "Source Date"
                )
                Divider().frame(height: 36)
                statBox(
                    value: item.confidenceScore.map { "\(Int($0))%" } ?? "\u{2014}",
                    label: "Confidence"
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

    // MARK: - Source Email Card

    private var hasSourceEmailContext: Bool {
        let parts: [String?] = [item.sourceEmailFrom, item.sourceEmailSubject, item.sourceEmailSnippet, item.discoveredBy]
        return parts.contains { ($0?.isEmpty == false) }
    }

    private var sourceEmailCard: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "envelope")
                        .font(.system(size: 12))
                        .foregroundStyle(.orange)
                    Text("SOURCE EMAIL")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(.orange)
                    Spacer()
                    if let by = item.discoveredBy, !by.isEmpty {
                        Text("via \(by)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }

                if let from = item.sourceEmailFrom, !from.isEmpty {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("From:")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text(from)
                            .font(.system(size: 12))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                    }
                }

                if let subject = item.sourceEmailSubject, !subject.isEmpty {
                    Text(subject)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                }

                if let snippet = item.sourceEmailSnippet, !snippet.isEmpty {
                    Text(snippet)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(6)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(4)
        }
        .backgroundStyle(Color.orange.opacity(0.04))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.orange.opacity(0.2), lineWidth: 1)
        }
    }

    // MARK: - Linked Contact Card

    private func linkedContactCard(_ contact: Contact) -> some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "person.circle")
                        .font(.system(size: 12))
                        .foregroundStyle(.blue)
                    Text("LINKED CONTACT")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.5)
                        .foregroundStyle(.blue)
                }

                HStack(spacing: 8) {
                    AvatarView(
                        name: contact.contactName ?? "Contact",
                        avatarSize: .small
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(contact.contactName ?? "Unnamed Contact")
                            .font(.system(size: 13, weight: .medium))
                        if let email = contact.email, !email.isEmpty {
                            Text(email)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(4)
        }
        .backgroundStyle(Color.blue.opacity(0.04))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.blue.opacity(0.2), lineWidth: 1)
        }
    }

    // MARK: - Actions

    private func acceptItem() {
        // Apply the suggested value to the linked CRM contact
        if let contact = linkedContact,
           let fieldName = item.fieldName,
           let suggestedValue = item.suggestedValue {
            // Map enrichment field names to Contact properties
            applyFieldUpdate(to: contact, fieldName: fieldName, value: suggestedValue)
            contact.localModifiedAt = Date()
            contact.isPendingPush = true
        }

        // Mark as approved
        item.status = "Approved"
        item.localModifiedAt = Date()
        item.isPendingPush = true
    }

    private func dismissItem() {
        item.status = "Dismissed"
        item.localModifiedAt = Date()
        item.isPendingPush = true
    }

    /// Apply a field update from the enrichment queue to a Contact model.
    private func applyFieldUpdate(to contact: Contact, fieldName: String, value: String) {
        let lower = fieldName.lowercased()
        switch lower {
        case "email":
            contact.email = value
        case "phone", "mobile_phone", "mobile phone":
            contact.mobilePhone = value
        case "work_phone", "work phone":
            contact.workPhone = value
        case "job_title", "job title", "title":
            contact.jobTitle = value
        case "first_name", "first name":
            contact.firstName = value
        case "last_name", "last name":
            contact.lastName = value
        case "linkedin_url", "linkedin url", "linkedin":
            contact.linkedInUrl = value
        case "address", "address_line":
            contact.addressLine = value
        case "city":
            contact.city = value
        case "state":
            contact.state = value
        case "country":
            contact.country = value
        case "postal_code", "postal code", "zip":
            contact.postalCode = value
        default:
            // Unknown field — store in notes as a fallback
            let note = "Enrichment update (\(fieldName)): \(value)"
            if let existing = contact.notes, !existing.isEmpty {
                contact.notes = existing + "\n" + note
            } else {
                contact.notes = note
            }
        }
    }
}
