import SwiftUI
import SwiftData

/// Dashboard — mirrors src/components/dashboard/DashboardPage.tsx
///
/// Shows greeting, 6 stat cards with live SwiftData counts,
/// and a tasks-due-today section.
struct DashboardView: View {
    @AppStorage("userName") private var userName: String = ""

    @Query private var contacts: [Contact]
    @Query private var companies: [Company]
    @Query private var opportunities: [Opportunity]
    @Query private var tasks: [CRMTask]
    @Query private var projects: [Project]
    @Query private var proposals: [Proposal]

    // MARK: - Computed Properties

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5...11:
            return "Good morning"
        case 12...16:
            return "Good afternoon"
        default:
            return "Good evening"
        }
    }

    private var firstName: String {
        let name = userName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return "" }
        return String(name.split(separator: " ").first ?? "")
    }

    private var greetingText: String {
        if firstName.isEmpty {
            return greeting
        }
        return "\(greeting), \(firstName)"
    }

    private var tasksDueToday: [CRMTask] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return tasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return calendar.isDate(dueDate, inSameDayAs: today)
        }
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Greeting header
                Text(greetingText)
                    .font(.title)
                    .fontWeight(.bold)

                // Stat cards grid
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160))], spacing: 12) {
                    StatCard(
                        title: "Contacts",
                        value: contacts.count,
                        icon: "person.2",
                        color: .blue
                    )
                    StatCard(
                        title: "Companies",
                        value: companies.count,
                        icon: "building.2",
                        color: .purple
                    )
                    StatCard(
                        title: "Opportunities",
                        value: opportunities.count,
                        icon: "chart.bar",
                        color: .green
                    )
                    StatCard(
                        title: "Tasks",
                        value: tasks.count,
                        icon: "checklist",
                        color: .orange
                    )
                    StatCard(
                        title: "Projects",
                        value: projects.count,
                        icon: "folder",
                        color: .teal
                    )
                    StatCard(
                        title: "Proposals",
                        value: proposals.count,
                        icon: "doc.text",
                        color: .indigo
                    )
                }

                // Tasks due today
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeader(title: "Tasks Due Today", count: tasksDueToday.count)

                    if tasksDueToday.isEmpty {
                        Text("No tasks due today")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                    } else {
                        ForEach(tasksDueToday, id: \.id) { task in
                            HStack(spacing: 10) {
                                Image(systemName: "circle")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.orange)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(task.task ?? "Untitled Task")
                                        .font(.body)
                                        .foregroundStyle(.primary)
                                    if let priority = task.priority, !priority.isEmpty {
                                        StatusBadge(text: priority, color: priorityColor(priority))
                                    }
                                }
                                Spacer()
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Dashboard")
    }

    // MARK: - Helpers

    /// Map priority text (with possible emoji prefix) to a color.
    private func priorityColor(_ priority: String) -> Color {
        let lowered = priority.lowercased()
        if lowered.contains("high") { return .red }
        if lowered.contains("medium") { return .orange }
        if lowered.contains("low") { return .blue }
        return .secondary
    }
}
