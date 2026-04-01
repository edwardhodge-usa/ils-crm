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

    /// All 15 table IDs
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
        static let clientPages = "tblo5TQos1VUGfuaQ"
        static let portalLogs = "tblj70XPHI7wnUmxO"
        // Email Intelligence (Phase 1)
        static let emailScanRules = "tblU4KmCS24s36r1L"
        static let emailScanState = "tblLxTKPq10pyu4Tc"
        static let enrichmentQueue = "tbliKcirq0FuQloJH"
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
        Tables.clientPages,
        Tables.portalLogs,
        Tables.emailScanRules,
        Tables.emailScanState,
        Tables.enrichmentQueue,
    ]

    /// Tables that are read-only (no push to Airtable)
    static let readOnlyTables: Set<String> = [
        Tables.specialties,
        Tables.portalLogs,
        Tables.emailScanRules,
        Tables.emailScanState,
    ]

    /// Default polling interval (matches Electron: 60 seconds)
    static let defaultSyncIntervalSeconds: TimeInterval = 60

    /// Stagger delay between table syncs to respect Airtable rate limits
    static let tableSyncStaggerMs: UInt64 = 300_000_000 // 300ms in nanoseconds

    /// Airtable REST API base URL
    static let apiBaseURL = URL(string: "https://api.airtable.com/v0")!

    /// Email Scan Rules field IDs
    struct EmailScanRulesFields {
        static let ruleName = "fldwaine7l24qIemY"         // primary
        static let ruleType = "fldhAEzf3IpTkpebu"
        static let ruleValue = "fldJJpQphiPXUIwhR"
        static let action = "fldCvZPjvVNBEOp0M"
        static let isActive = "fldlsq8iueIWhMOXd"
    }

    /// Email Scan State field IDs
    struct EmailScanStateFields {
        static let userEmail = "fldIwjUn6mD8MTCyg"        // primary
        static let gmailHistoryId = "fld4omaKICcnHqqon"
        static let lastScanDate = "fldCuCDhj1gL0iZ7s"
        static let scanStatus = "fldIpRB4NQXRcv7TP"
        static let totalProcessed = "fldljrn2FA8yLrrzb"
    }

    /// Enrichment Queue field IDs
    struct EnrichmentQueueFields {
        static let fieldName = "fldoUsfLV43KF0n0U"        // primary
        static let currentValue = "fld5p9Wdv3mIPbKGT"
        static let suggestedValue = "fldMpA7t7WhXTIUIK"
        static let sourceEmailDate = "fldZ7zeBrsRndA1SY"
        static let status = "fldybd6l0RMMV70qR"
        static let confidenceScore = "fldApRf3M38HZdf8D"
        static let contact = "fldw3AfIZ6WUbMnw0"          // link to Imported Contacts
    }

    /// Imported Contacts — Email Intelligence field IDs (added to existing table)
    struct ImportedContactsEmailFields {
        static let source = "fldvGMPt6P73gAVcX"
        static let relationshipType = "fldzYctwWVqOAOjOa"
        static let confidenceScore = "fldzB1hYo8JFK7KXL"
        static let aiReasoning = "flda0hjnGygmCl6L3"
        static let emailThreadCount = "fldhWoDXNTqOsXZ22"
        static let firstSeenDate = "fldA7MZYLyWEJNGVx"
        static let lastSeenDate = "fldS0wOkNWu8SQnSO"
        static let discoveredVia = "fldCUcYTkPATWE97N"
        static let suggestedCompanyName = "fldSCvoQayABYZqL5"
        static let suggestedCompanyLink = "fldLGvhdrydRxH5EU"  // link to Companies
    }

    /// Client Pages field IDs
    struct ClientPageFields {
        static let pageAddress = "fldEEarorxnI0ixpI"
        static let clientName = "fldqvhzAh1w7gwSEb"
        static let pageTitle = "fldkeQe0ThceEA6OG"
        static let pageSubtitle = "fldhJNUqqtBQsyYgI"
        static let deckUrl = "fldYedTCbI633i0fe"
        static let preparedFor = "fldmWFQ498rXhcb1X"
        static let head = "fldkHW1Ki7IuK2UaK"
        static let thankYou = "fld7YcLBFE9f8zDmT"
        static let vPrMagic = "fldmvy3Ta6q4okTee"
        static let vHighLight = "fldtPccbFBs9N4KZ5"
        static let v360 = "fldNE04teEKWxFlZC"
        static let vFullL = "fldcOCTCLvx36MV5L"
    }
}
