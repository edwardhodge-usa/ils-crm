import SwiftUI
import SwiftData

/// Dashboard — mirrors src/components/dashboard/DashboardPage.tsx
///
/// Features to implement:
/// - Stat cards (total contacts, companies, active deals, tasks due today)
/// - Pipeline summary widget (deals by stage with value bars)
/// - Follow-up alerts (contacts overdue for follow-up)
/// - Tasks due today list
///
/// Electron queries: dashboard:getStats, dashboard:getTasksDueToday,
/// dashboard:getFollowUpAlerts, dashboard:getPipelineSnapshot
struct DashboardView: View {
    @Query private var contacts: [Contact]
    @Query private var companies: [Company]
    @Query private var opportunities: [Opportunity]
    @Query private var tasks: [CRMTask]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Dashboard")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                // TODO: Stat cards grid
                // TODO: Pipeline summary widget
                // TODO: Follow-up alerts
                // TODO: Tasks due today

                Text("Stats will appear here after first sync.")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Dashboard")
    }
}
