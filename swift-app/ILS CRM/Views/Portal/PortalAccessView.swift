import SwiftUI
import SwiftData

/// Portal Access view — mirrors src/components/portal/PortalAccessPage.tsx
///
/// Features to implement:
/// - List of portal access records with name, email, company, stage
/// - Lookup field resolution (known Electron bug: Name/Email/Company empty)
/// - In Swift build, store resolved lookup values from Airtable API response
struct PortalAccessView: View {
    @Query(sort: \PortalAccessRecord.name) private var records: [PortalAccessRecord]

    var body: some View {
        List(records, id: \.id) { record in
            VStack(alignment: .leading) {
                Text(record.name ?? "—")
                    .fontWeight(.medium)
                HStack {
                    if let stage = record.stage {
                        Text(stage)
                            .font(.caption)
                    }
                    if let company = record.company {
                        Text(company)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Portal Access")
    }
}
