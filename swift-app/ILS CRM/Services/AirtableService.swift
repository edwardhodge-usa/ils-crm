import Foundation

/// Airtable REST API client — mirrors electron/airtable/client.ts
///
/// Handles all HTTP communication with the Airtable API.
/// Does NOT manage sync state — that's SyncEngine's job.
///
/// Key Electron lessons applied:
/// - Stagger API calls 200ms apart to avoid rate limits (5 req/sec)
/// - Select option values have emoji prefixes (e.g. "🔴 High" not "High")
/// - Formula/lookup/rollup fields are read-only — never include in create/update
/// - JSON.parse failures on linked record arrays must not crash the whole sync
/// - URL scheme validation: only allow https://, http://, mailto:, tel:// for openExternal
actor AirtableService {
    private let apiKey: String
    private let baseId: String
    private let session: URLSession

    init(apiKey: String, baseId: String = AirtableConfig.baseId) {
        self.apiKey = apiKey
        self.baseId = baseId

        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = [
            "Authorization": "Bearer \(apiKey)",
            "Content-Type": "application/json",
        ]
        self.session = URLSession(configuration: config)
    }

    // MARK: - Fetch All Records (with pagination)

    /// Fetches all records from a table, handling Airtable's 100-record pagination.
    /// Mirrors: client.ts → fetchAllRecords()
    func fetchAllRecords(tableId: String) async throws -> [[String: Any]] {
        var allRecords: [[String: Any]] = []
        var offset: String? = nil

        repeat {
            var url = AirtableConfig.apiBaseURL
                .appendingPathComponent(baseId)
                .appendingPathComponent(tableId)

            if let offset {
                var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
                components.queryItems = [URLQueryItem(name: "offset", value: offset)]
                url = components.url!
            }

            let (data, response) = try await session.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let records = json["records"] as? [[String: Any]] else {
                throw AirtableError.invalidResponse(tableId: tableId)
            }

            allRecords.append(contentsOf: records)
            offset = json["offset"] as? String
        } while offset != nil

        return allRecords
    }

    // MARK: - Fetch Single Record

    func fetchRecord(tableId: String, recordId: String) async throws -> [String: Any] {
        let url = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)
            .appendingPathComponent(recordId)

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AirtableError.invalidResponse(tableId: tableId)
        }

        return json
    }

    // MARK: - Batch Create (max 10 per request — Airtable limit)

    func batchCreate(tableId: String, records: [[String: Any]]) async throws -> [[String: Any]] {
        var created: [[String: Any]] = []

        for chunk in records.chunked(into: 10) {
            let body: [String: Any] = ["records": chunk.map { ["fields": $0] }]
            let result = try await postRequest(tableId: tableId, body: body)
            if let records = result["records"] as? [[String: Any]] {
                created.append(contentsOf: records)
            }
        }

        return created
    }

    // MARK: - Batch Update (max 10 per request)

    func batchUpdate(tableId: String, records: [(id: String, fields: [String: Any])]) async throws {
        for chunk in records.chunked(into: 10) {
            let body: [String: Any] = [
                "records": chunk.map { ["id": $0.id, "fields": $0.fields] }
            ]
            _ = try await patchRequest(tableId: tableId, body: body)
        }
    }

    // MARK: - Batch Delete (max 10 per request)

    func batchDelete(tableId: String, recordIds: [String]) async throws {
        for chunk in recordIds.chunked(into: 10) {
            var components = URLComponents(
                url: AirtableConfig.apiBaseURL
                    .appendingPathComponent(baseId)
                    .appendingPathComponent(tableId),
                resolvingAgainstBaseURL: false
            )!
            components.queryItems = chunk.map { URLQueryItem(name: "records[]", value: $0) }

            var request = URLRequest(url: components.url!)
            request.httpMethod = "DELETE"

            let (_, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
            }
        }
    }

    // MARK: - Fetch Field Metadata

    /// Fetches table metadata to get exact select option names (including emoji prefixes).
    /// CRITICAL: Airtable returns 422 INVALID_MULTIPLE_CHOICE_OPTIONS if you send
    /// "High" when the actual option is "🔴 High". Always use this to get exact names.
    func fetchFieldMetadata(tableId: String) async throws -> [String: Any] {
        let url = URL(string: "https://api.airtable.com/v0/meta/bases/\(baseId)/tables")!

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AirtableError.metadataFetchFailed(tableId: tableId)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let tables = json["tables"] as? [[String: Any]] else {
            throw AirtableError.invalidResponse(tableId: tableId)
        }

        guard let table = tables.first(where: { $0["id"] as? String == tableId }) else {
            throw AirtableError.tableNotFound(tableId: tableId)
        }

        return table
    }

    // MARK: - Private Helpers

    private func postRequest(tableId: String, body: [String: Any]) async throws -> [String: Any] {
        let url = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
        }

        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    private func patchRequest(tableId: String, body: [String: Any]) async throws -> [String: Any] {
        let url = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
        }

        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }
}

// MARK: - Errors

enum AirtableError: LocalizedError {
    case httpError(statusCode: Int, tableId: String)
    case invalidResponse(tableId: String)
    case metadataFetchFailed(tableId: String)
    case tableNotFound(tableId: String)

    var errorDescription: String? {
        switch self {
        case .httpError(let code, let table):
            return "Airtable HTTP \(code) for table \(table)"
        case .invalidResponse(let table):
            return "Invalid response from Airtable for table \(table)"
        case .metadataFetchFailed(let table):
            return "Failed to fetch metadata for table \(table)"
        case .tableNotFound(let table):
            return "Table \(table) not found in base metadata"
        }
    }
}

// MARK: - Array chunking utility

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}
