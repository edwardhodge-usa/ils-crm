import SwiftUI
import SwiftData

/// Portal Logs view — read-only list of portal activity logs.
///
/// Mirrors the Electron Portal Logs page. Shows login/visit events
/// sorted newest-first with search by client name, email, or company.
///
/// This table is READ-ONLY — written by imaginelab-portal (Next.js),
/// consumed here for visibility only.
struct PortalLogsView: View {
    @Query(sort: \PortalLog.timestamp, order: .reverse) private var logs: [PortalLog]
    @State private var searchText = ""
    @State private var selectedLog: PortalLog?

    // MARK: - Filtered Data

    private var filteredLogs: [PortalLog] {
        if searchText.isEmpty { return logs }
        let query = searchText
        return logs.filter { log in
            (log.clientName?.localizedCaseInsensitiveContains(query) ?? false) ||
            (log.clientEmail?.localizedCaseInsensitiveContains(query) ?? false) ||
            (log.company?.localizedCaseInsensitiveContains(query) ?? false) ||
            (log.pageUrl?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if logs.isEmpty {
                EmptyStateView(
                    title: "No portal logs",
                    description: "Portal activity logs will appear here once synced from Airtable.",
                    systemImage: "clock.arrow.circlepath"
                )
            } else if filteredLogs.isEmpty {
                EmptyStateView(
                    title: "No results",
                    description: "No portal logs match \"\(searchText)\".",
                    systemImage: "magnifyingglass"
                )
            } else {
                logList
            }
        }
        .searchable(text: $searchText, prompt: "Search portal logs...")
        .navigationTitle("Portal Logs")
        .sheet(item: $selectedLog) { log in
            PortalLogDetailSheet(log: log)
                .frame(minWidth: 400, minHeight: 350)
        }
    }

    // MARK: - Log List

    private var logList: some View {
        List(filteredLogs, id: \.id) { log in
            Button {
                selectedLog = log
            } label: {
                logRow(log)
            }
            .buttonStyle(.plain)
        }
        .listStyle(.inset)
    }

    // MARK: - Log Row

    private func logRow(_ log: PortalLog) -> some View {
        HStack(spacing: 12) {
            // Activity icon
            Image(systemName: "globe")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(log.clientName ?? log.clientEmail ?? "Unknown visitor")
                    .font(.body)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let company = log.company, !company.isEmpty {
                        Text(company)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    if let page = log.pageUrl, !page.isEmpty {
                        Text(page)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            if let timestamp = log.timestamp {
                Text(timestamp, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Log Detail Sheet

/// Bento-layout detail sheet for a portal log entry showing all available fields.
private struct PortalLogDetailSheet: View {
    let log: PortalLog

    @Environment(\.dismiss) private var dismiss

    // MARK: - Computed Properties

    private var displayName: String {
        log.clientName ?? log.clientEmail ?? "Unknown visitor"
    }

    private var heroSubtitle: String? {
        guard let timestamp = log.timestamp else { return nil }
        return timestamp.formatted(date: .abbreviated, time: .shortened)
    }

    private var locationString: String {
        [log.city, log.region, log.country]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                // MARK: Hero Card
                BentoHeroCard(
                    name: displayName,
                    subtitle: heroSubtitle,
                    avatarSize: 56,
                    avatarShape: .circle
                ) {
                    EmptyView()
                } stats: {
                    EmptyView()
                }

                // MARK: Grid — Visitor + Location
                BentoGrid(columns: 2) {
                    BentoCell(title: "Visitor") {
                        VStack(spacing: 0) {
                            BentoFieldRow(label: "Name", value: log.clientName ?? "")
                            BentoFieldRow(label: "Email", value: log.clientEmail ?? "")
                            BentoFieldRow(label: "Company", value: log.company ?? "")
                            BentoFieldRow(label: "Page URL", value: log.pageUrl ?? "")
                        }
                    }

                    BentoCell(title: "Location") {
                        VStack(spacing: 0) {
                            BentoFieldRow(label: "Location", value: locationString)
                            BentoFieldRow(label: "IP Address", value: log.ipAddress ?? "")
                        }
                    }
                }

                // MARK: Technical
                BentoCell(title: "Technical") {
                    VStack(alignment: .leading, spacing: 0) {
                        BentoFieldRow(label: "Clarity Session", value: log.claritySession ?? "")

                        if let ua = log.userAgent, !ua.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("User Agent")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.secondary)
                                Text(ua)
                                    .font(.caption2)
                                    .foregroundStyle(.primary)
                                    .textSelection(.enabled)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .padding(.top, 8)
                        }
                    }
                }

                // MARK: Details
                BentoCell(title: "Details") {
                    VStack(alignment: .leading, spacing: 0) {
                        BentoFieldRow(
                            label: "Log #",
                            value: log.autoId.map { "\($0)" } ?? ""
                        )
                        BentoFieldRow(
                            label: "Timestamp",
                            value: log.timestamp?.formatted(date: .complete, time: .complete) ?? ""
                        )

                        Text(log.id)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)
                    }
                }

            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    let log = PortalLog(id: "recLog1")
    log.clientName = "John Smith"
    log.clientEmail = "john@example.com"
    log.company = "Acme Corp"
    log.pageUrl = "https://portal.imaginelabstudios.com/acme"
    log.timestamp = Date()
    log.city = "New York"
    log.region = "NY"
    log.country = "US"
    log.autoId = 42

    return NavigationStack {
        PortalLogsView()
    }
    .modelContainer(for: PortalLog.self, inMemory: true)
}
