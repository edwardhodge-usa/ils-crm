import Foundation

/// Airtable base and table IDs — mirrors electron/airtable/field-maps.ts
///
/// ## Shared API Key (PAT)
/// Both Electron and Swift apps share the same Airtable Personal Access Token.
/// - **Electron** stores it in the SQLite settings table (key: `airtable_api_key`)
/// - **Swift** stores it in macOS Keychain (service: `ils-crm-airtable`, account: `airtable-pat`)
///   via `KeychainService.swift`
///
/// On first launch of the Swift app, the user enters the PAT in Settings.
/// The PAT is the same one already configured in the Electron app.
/// It can be found at: https://airtable.com/create/tokens
///
/// RULE: Never hardcode API keys. Base ID is configured here but API key
/// must come from user settings (Keychain).
enum AirtableConfig {
    static let baseId = "appYXbUdcmSwBoPFU"

    /// All 11 table IDs
    enum Tables {
        static let contacts = "tbl9Q8m06ivkTYyvR"
        static let companies = "tblEauAm0ZYuMbHUa"
        static let opportunities = "tblsalt5lmHlh4s7z"
        static let projects = "tbll416ZwFACYQSm4"
        static let proposals = "tblODEy2pLlfrz0lz"
        static let tasks = "tblwEt5YsYDP22qrr"
        static let interactions = "tblTUNClZpfFjhFVm"
        static let importedContacts = "tblribgEf5RENNDQW"
        static let specialties = "tblysTixdxGQQntHO"
        static let portalAccess = "tblN1jruT8VeucPKa"
        static let portalLogs = "tblj70XPHI7wnUmxO"
    }

    /// Sync order — matches Electron: push pending first, then pull in this order.
    /// 200ms stagger between tables to avoid Airtable rate limits (5 req/sec).
    static let syncOrder: [String] = [
        Tables.specialties,
        Tables.companies,
        Tables.contacts,
        Tables.opportunities,
        Tables.projects,
        Tables.proposals,
        Tables.tasks,
        Tables.interactions,
        Tables.importedContacts,
        Tables.portalAccess,
        Tables.portalLogs,
    ]

    /// Tables that are read-only (no push to Airtable)
    static let readOnlyTables: Set<String> = [
        Tables.specialties,
        Tables.portalLogs,
    ]

    /// Default polling interval (matches Electron: 60 seconds)
    static let defaultSyncIntervalSeconds: TimeInterval = 60

    /// Stagger delay between table syncs to respect Airtable rate limits
    static let tableSyncStaggerMs: UInt64 = 200_000_000 // 200ms in nanoseconds

    /// Airtable REST API base URL
    static let apiBaseURL = URL(string: "https://api.airtable.com/v0")!
}
