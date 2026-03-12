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

/// Simple detail sheet for a portal log entry showing all available fields.
private struct PortalLogDetailSheet: View {
    let log: PortalLog

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 6) {
                    Image(systemName: "globe")
                        .font(.system(size: 28))
                        .foregroundStyle(.secondary)

                    Text(log.clientName ?? log.clientEmail ?? "Unknown visitor")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .multilineTextAlignment(.center)

                    if let timestamp = log.timestamp {
                        Text(timestamp.formatted(date: .abbreviated, time: .shortened))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 24)
                .padding(.bottom, 16)
                .frame(maxWidth: .infinity)

                Form {
                    visitorSection
                    locationSection
                    technicalSection
                    detailSection
                }
                .formStyle(.grouped)
            }
        }
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }
            }
        }
    }

    @ViewBuilder
    private var visitorSection: some View {
        let hasName = log.clientName?.isEmpty == false
        let hasEmail = log.clientEmail?.isEmpty == false
        let hasCompany = log.company?.isEmpty == false
        let hasPage = log.pageUrl?.isEmpty == false

        if hasName || hasEmail || hasCompany || hasPage {
            Section("Visitor") {
                if let name = log.clientName, !name.isEmpty {
                    FieldRow(label: "Name", value: name)
                }
                if let email = log.clientEmail, !email.isEmpty {
                    FieldRow(label: "Email", value: email)
                }
                if let company = log.company, !company.isEmpty {
                    FieldRow(label: "Company", value: company)
                }
                if let page = log.pageUrl, !page.isEmpty {
                    FieldRow(label: "Page URL", value: page)
                }
            }
        }
    }

    @ViewBuilder
    private var locationSection: some View {
        let hasCity = log.city?.isEmpty == false
        let hasRegion = log.region?.isEmpty == false
        let hasCountry = log.country?.isEmpty == false
        let hasIP = log.ipAddress?.isEmpty == false

        if hasCity || hasRegion || hasCountry || hasIP {
            Section("Location") {
                if hasCity || hasRegion || hasCountry {
                    let location = [log.city, log.region, log.country]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: ", ")
                    if !location.isEmpty {
                        FieldRow(label: "Location", value: location)
                    }
                }
                if let ip = log.ipAddress, !ip.isEmpty {
                    FieldRow(label: "IP Address", value: ip)
                }
            }
        }
    }

    @ViewBuilder
    private var technicalSection: some View {
        let hasUserAgent = log.userAgent?.isEmpty == false
        let hasClarity = log.claritySession?.isEmpty == false

        if hasUserAgent || hasClarity {
            Section("Technical") {
                if let ua = log.userAgent, !ua.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("User Agent")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(ua)
                            .font(.caption2)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                if let clarity = log.claritySession, !clarity.isEmpty {
                    FieldRow(label: "Clarity Session", value: clarity)
                }
            }
        }
    }

    @ViewBuilder
    private var detailSection: some View {
        Section("Details") {
            if let autoId = log.autoId {
                FieldRow(label: "Log #", value: "\(autoId)")
            }
            if let ts = log.timestamp {
                FieldRow(label: "Timestamp", value: ts.formatted(date: .complete, time: .complete))
            }
            Text(log.id)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
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
