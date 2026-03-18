import SwiftUI
import SwiftData

/// Dashboard — mirrors src/components/dashboard/DashboardPage.tsx
///
/// Shows greeting, 4 stat cards, tasks due today, follow-up alerts, and pipeline summary.
struct DashboardView: View {
    @AppStorage("userName") private var userName: String = ""

    @Query private var tasks: [CRMTask]
    @Query private var contacts: [Contact]
    @Query private var opportunities: [Opportunity]
    @Query private var projects: [Project]
    @Query private var proposals: [Proposal]
    @Query private var companies: [Company]

    // MARK: - Computed Properties

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        else if hour < 17 { return "Good afternoon" }
        else { return "Good evening" }
    }

    private var firstName: String {
        let name = userName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return "Edward" }
        return String(name.split(separator: " ").first ?? "Edward")
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: Date())
    }

    // MARK: - Stat Card Data

    private var tasksDueToday: [CRMTask] {
        let calendar = Calendar.current
        return tasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            let notCompleted = !(task.status?.lowercased().contains("complete") ?? false)
            return calendar.isDateInToday(dueDate) && notCompleted
        }
    }

    private var followUpDueCount: Int {
        contacts.filter { contact in
            guard let lastContact = contact.lastContactDate else { return true }
            let days = Calendar.current.dateComponents([.day], from: lastContact, to: Date()).day ?? 0
            return days > 14
        }.count
    }

    private var followUpDueContacts: [Contact] {
        contacts.filter { contact in
            guard let lastContact = contact.lastContactDate else { return true }
            let days = Calendar.current.dateComponents([.day], from: lastContact, to: Date()).day ?? 0
            return days > 14
        }.sorted { a, b in
            let daysA = a.lastContactDate.map { Calendar.current.dateComponents([.day], from: $0, to: Date()).day ?? Int.max } ?? Int.max
            let daysB = b.lastContactDate.map { Calendar.current.dateComponents([.day], from: $0, to: Date()).day ?? Int.max } ?? Int.max
            return daysA > daysB
        }
    }

    private var activeContractsValue: Double {
        projects.filter { project in
            project.status?.lowercased().contains("active") ?? false
        }.compactMap { $0.contractValue }.reduce(0, +)
    }

    private var openProposalsCount: Int {
        proposals.filter { proposal in
            let status = proposal.status ?? ""
            return !status.lowercased().contains("accept") && !status.lowercased().contains("reject")
        }.count
    }

    // MARK: - Pipeline Data

    private struct PipelineRow {
        let stage: String
        let count: Int
        let total: Double
    }

    private var pipelineRows: [PipelineRow] {
        var stageMap: [String: (count: Int, total: Double)] = [:]
        for opp in opportunities {
            let stage = opp.salesStage ?? "Unknown"
            let value = opp.dealValue ?? 0
            let existing = stageMap[stage] ?? (count: 0, total: 0)
            stageMap[stage] = (count: existing.count + 1, total: existing.total + value)
        }
        return stageMap
            .map { PipelineRow(stage: $0.key, count: $0.value.count, total: $0.value.total) }
            .sorted { $0.count > $1.count }
    }

    private var pipelineMaxCount: Int {
        pipelineRows.map { $0.count }.max() ?? 1
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                greetingSection
                statCardsRow
                middleColumns
                pipelineSection
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Dashboard")
    }

    // MARK: - Greeting

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(greeting), \(firstName)")
                .font(.title)
                .fontWeight(.bold)
            Text(formattedDate)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Stat Cards Row

    private var statCardsRow: some View {
        HStack(spacing: 12) {
            DashStatCard(
                icon: "clock.badge.exclamationmark",
                color: .red,
                value: "\(tasksDueToday.count)",
                label: "Tasks Due Today"
            )
            DashStatCard(
                icon: "phone.arrow.up.right",
                color: .orange,
                value: "\(followUpDueCount)",
                label: "Follow-ups Due",
                subtitle: ">14 days silent"
            )
            DashStatCard(
                icon: "briefcase.fill",
                color: .blue,
                value: formatCurrency(activeContractsValue),
                label: "Active Contracts"
            )
            DashStatCard(
                icon: "doc.text.fill",
                color: .yellow,
                value: "\(openProposalsCount)",
                label: "Open Proposals"
            )
        }
    }

    // MARK: - Middle Two-Column Section

    private var middleColumns: some View {
        HStack(alignment: .top, spacing: 12) {
            tasksDueTodayPanel
            followUpAlertsPanel
        }
    }

    private var tasksDueTodayPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Panel header
            HStack {
                Text("TASKS DUE TODAY")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
                Spacer()
                Button("View all") {}
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
                    .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)

            Divider()

            if tasksDueToday.isEmpty {
                Text("No tasks due today")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                ForEach(tasksDueToday, id: \.id) { task in
                    TaskDueRow(task: task)
                    if task.id != tasksDueToday.last?.id {
                        Divider().padding(.leading, 36)
                    }
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .frame(maxWidth: .infinity)
    }

    private var followUpAlertsPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Panel header
            HStack {
                Text("FOLLOW-UP ALERTS")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
                Spacer()
                Button("View all") {}
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
                    .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)

            Divider()

            if followUpDueContacts.isEmpty {
                Text("All contacts up to date")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                ForEach(followUpDueContacts.prefix(8), id: \.id) { contact in
                    FollowUpRow(contact: contact, companies: companies)
                    if contact.id != followUpDueContacts.prefix(8).last?.id {
                        Divider().padding(.leading, 52)
                    }
                }
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .frame(maxWidth: .infinity)
    }

    // MARK: - Pipeline Section

    private var pipelineSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("PIPELINE")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
                Spacer()
                Button("Open Pipeline") {}
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
                    .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)

            Divider()

            if pipelineRows.isEmpty {
                Text("No pipeline data")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(pipelineRows.enumerated()), id: \.offset) { index, row in
                        PipelineBarRow(
                            stage: row.stage,
                            count: row.count,
                            total: row.total,
                            maxCount: pipelineMaxCount
                        )
                        if index < pipelineRows.count - 1 {
                            Divider().padding(.leading, 160)
                        }
                    }
                }
                .padding(.bottom, 4)
            }
        }
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Helpers

    private func formatCurrency(_ value: Double) -> String {
        if value >= 1_000_000 {
            let formatted = value / 1_000_000
            return "$\(formatted.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(formatted)) : String(format: "%.1f", formatted))M"
        } else if value >= 1_000 {
            let formatted = value / 1_000
            return "$\(formatted.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(formatted)) : String(format: "%.0f", formatted))K"
        } else if value == 0 {
            return "$0"
        } else {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.maximumFractionDigits = 0
            return formatter.string(from: NSNumber(value: value)) ?? "$0"
        }
    }
}

// MARK: - DashStatCard

private struct DashStatCard: View {
    let icon: String
    let color: Color
    let value: String
    let label: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Icon in colored circle
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 28, height: 28)
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(color)
            }

            Text(value)
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(color)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - TaskDueRow

private struct TaskDueRow: View {
    let task: CRMTask

    private var priorityColor: Color {
        let p = task.priority?.lowercased() ?? ""
        if p.contains("high") { return .red }
        if p.contains("medium") { return .orange }
        if p.contains("low") { return .blue }
        return .secondary
    }

    private var dueDateText: String {
        guard let date = task.dueDate else { return "" }
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(priorityColor)
                .frame(width: 8, height: 8)
                .padding(.leading, 12)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.task ?? "Untitled Task")
                    .font(.body)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                if !dueDateText.isEmpty {
                    Text(dueDateText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let type = task.type, !type.isEmpty {
                StatusBadge(text: type, color: .blue)
            }
        }
        .padding(.vertical, 8)
        .padding(.trailing, 12)
    }
}

// MARK: - FollowUpRow

private struct FollowUpRow: View {
    let contact: Contact
    let companies: [Company]

    private var companyName: String {
        guard let firstId = contact.companiesIds.first else { return "" }
        return companies.first(where: { $0.id == firstId })?.companyName ?? ""
    }

    private var daysSinceContact: Int {
        guard let lastContact = contact.lastContactDate else {
            return 999
        }
        return Calendar.current.dateComponents([.day], from: lastContact, to: Date()).day ?? 0
    }

    private var categorizationColor: Color {
        let cat = contact.categorization.first?.lowercased() ?? ""
        if cat.contains("client") { return .green }
        if cat.contains("lead") { return .blue }
        if cat.contains("partner") { return .purple }
        if cat.contains("vendor") { return .orange }
        return .secondary
    }

    var body: some View {
        HStack(spacing: 10) {
            AvatarView(name: contact.contactName ?? "?", avatarSize: .medium, photoURL: contact.contactPhotoUrl.flatMap { URL(string: $0) })
                .padding(.leading, 12)

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.contactName ?? "Unknown")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                if !companyName.isEmpty {
                    Text(companyName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            HStack(spacing: 6) {
                if !contact.categorization.isEmpty {
                    StatusBadge(text: contact.categorization.joined(separator: ", "), color: categorizationColor)
                }

                // Days since contact badge
                Text("\(daysSinceContact)d")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.15))
                    .foregroundStyle(.red)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 8)
        .padding(.trailing, 12)
    }
}

// MARK: - PipelineBarRow

private struct PipelineBarRow: View {
    let stage: String
    let count: Int
    let total: Double
    let maxCount: Int

    private var barColor: Color {
        switch stage {
        case "Future Client":         return .purple
        case "Development":           return .blue
        case "Initial Contact":       return .cyan
        case "Qualification":         return .teal
        case "Business Development":  return .green
        case "Investment":            return .orange
        case "Meeting Scheduled":     return .indigo
        case "Qualified":             return .mint
        case "Proposal Sent":         return .yellow
        case "Negotiation":           return .red
        default:                      return .secondary
        }
    }

    private var formattedValue: String {
        if total >= 1_000_000 {
            return "$\(Int(total / 1_000_000))M"
        } else if total >= 1_000 {
            return "$\(Int(total / 1_000))K"
        } else if total == 0 {
            return "$0"
        } else {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.maximumFractionDigits = 0
            return formatter.string(from: NSNumber(value: total)) ?? "$0"
        }
    }

    var body: some View {
        HStack(spacing: 10) {
            Text(stage)
                .font(.body)
                .foregroundStyle(.primary)
                .lineLimit(1)
                .frame(width: 150, alignment: .leading)
                .padding(.leading, 12)

            GeometryReader { geo in
                let fraction = maxCount > 0 ? CGFloat(count) / CGFloat(maxCount) : 0
                let barWidth = max(fraction * geo.size.width, 4)
                HStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(barColor)
                        .frame(width: barWidth, height: 8)
                    Spacer(minLength: 0)
                }
                .frame(maxHeight: .infinity)
            }
            .frame(height: 16)

            Text("\(count)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 28, alignment: .trailing)

            Text(formattedValue)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 72, alignment: .trailing)
                .padding(.trailing, 12)
        }
        .padding(.vertical, 8)
    }
}
