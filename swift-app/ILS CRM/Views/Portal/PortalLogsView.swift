import SwiftUI
import SwiftData

/// Portal Logs view — mirrors src/components/portal/PortalLogsPage.tsx
///
/// Features to implement:
/// - Table of portal activity logs
/// - Filter by client, date range
/// - Known Electron bug: blank records + sync frequency
struct PortalLogsView: View {
    @Query(sort: \PortalLog.timestamp, order: .reverse) private var logs: [PortalLog]

    var body: some View {
        List(logs, id: \.id) { log in
            VStack(alignment: .leading) {
                Text(log.clientName ?? log.clientEmail ?? "Unknown")
                    .fontWeight(.medium)
                HStack {
                    if let page = log.pageUrl {
                        Text(page)
                            .font(.caption)
                            .lineLimit(1)
                    }
                    if let ts = log.timestamp {
                        Text(ts, style: .date)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Portal Logs")
    }
}
