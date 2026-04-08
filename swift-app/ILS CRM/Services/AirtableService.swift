import Foundation
import os.log

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
    private static let logger = Logger(subsystem: "com.ils-crm", category: "AirtableService")

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
            let baseURL = AirtableConfig.apiBaseURL
                .appendingPathComponent(baseId)
                .appendingPathComponent(tableId)

            var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
            // Return field IDs as keys (not field names) — converters use field IDs
            var queryItems = [URLQueryItem(name: "returnFieldsByFieldId", value: "true")]
            if let offset {
                queryItems.append(URLQueryItem(name: "offset", value: offset))
            }
            components.queryItems = queryItems
            let url = components.url!

            let (data, response) = try await performWithRetry(from: url)

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
        let baseURL = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)
            .appendingPathComponent(recordId)

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "returnFieldsByFieldId", value: "true")]
        let url = components.url!

        let (data, response) = try await performWithRetry(from: url)

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

            let (_, response) = try await performWithRetry(request)
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

        let (data, response) = try await performWithRetry(from: url)

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

    // MARK: - Attachment Upload (3-step content API)

    /// Uploads a local image to an Airtable attachment field.
    ///
    /// Strategy: upload image to tmpfiles.org (temporary host, auto-expires),
    /// then PATCH the Airtable record with the public URL.
    /// Airtable downloads and stores the image on its own CDN.
    func uploadAttachment(
        tableId: String,
        recordId: String,
        fieldId: String,
        imageData: Data,
        filename: String,
        contentType: String = "image/jpeg"
    ) async throws -> String {
        // Step 1: Upload to tmpfiles.org to get a public URL
        let boundary = "Boundary-\(UUID().uuidString)"
        let tmpURL = URL(string: "https://tmpfiles.org/api/v1/upload")!

        var uploadReq = URLRequest(url: tmpURL)
        uploadReq.httpMethod = "POST"
        uploadReq.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        uploadReq.httpBody = body

        let (uploadData, uploadResp) = try await URLSession.shared.data(for: uploadReq)
        guard let uploadHttp = uploadResp as? HTTPURLResponse, (200...299).contains(uploadHttp.statusCode),
              let uploadJson = try JSONSerialization.jsonObject(with: uploadData) as? [String: Any],
              let dataObj = uploadJson["data"] as? [String: Any],
              let rawUrl = dataObj["url"] as? String else {
            let errBody = String(data: uploadData, encoding: .utf8) ?? "no body"
            throw AirtableError.attachmentUploadFailed(reason: "Temp upload failed: \(errBody)")
        }

        // Convert to direct download URL: tmpfiles.org/123/file.jpg → tmpfiles.org/dl/123/file.jpg
        let directUrl = rawUrl.replacingOccurrences(of: "tmpfiles.org/", with: "tmpfiles.org/dl/")

        // Step 2: PATCH the Airtable record with the public URL
        _ = try await patchRequest(tableId: tableId, body: [
            "records": [
                [
                    "id": recordId,
                    "fields": [fieldId: [["url": directUrl]]]
                ]
            ]
        ])

        return "uploaded"
    }

    /// Clears an attachment field on a record.
    func removeAttachment(tableId: String, recordId: String, fieldId: String) async throws {
        _ = try await patchRequest(tableId: tableId, body: [
            "records": [
                [
                    "id": recordId,
                    "fields": [fieldId: [] as [Any]]
                ]
            ]
        ])
    }

    // MARK: - Retry with Exponential Backoff

    /// Executes a URLSession request with automatic 429 retry and exponential backoff.
    /// Reads Retry-After header (defaults to 30s if missing), retries up to maxRetries times
    /// with exponential backoff (wait × 1, wait × 2, wait × 4).
    private func performWithRetry(_ request: URLRequest, maxRetries: Int = 3) async throws -> (Data, URLResponse) {
        var lastError: Error?
        for attempt in 0..<(maxRetries + 1) {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return (data, response) }

            if http.statusCode == 429 {
                guard attempt < maxRetries else {
                    throw lastError ?? AirtableError.httpError(statusCode: 429, tableId: "unknown")
                }
                let retryAfter = Double(http.value(forHTTPHeaderField: "Retry-After") ?? "") ?? 30.0
                let backoff = retryAfter * pow(2.0, Double(attempt))
                Self.logger.warning("429 rate limited — retry \(attempt + 1)/\(maxRetries) after \(backoff, privacy: .public)s")
                try await Task.sleep(for: .seconds(backoff))
                lastError = AirtableError.httpError(statusCode: 429, tableId: "")
                continue
            }
            return (data, response)
        }
        throw lastError ?? AirtableError.httpError(statusCode: 429, tableId: "unknown")
    }

    /// Convenience: performs a GET request to a URL with retry, using the session's default Authorization header.
    private func performWithRetry(from url: URL) async throws -> (Data, URLResponse) {
        let request = URLRequest(url: url)
        return try await performWithRetry(request)
    }

    // MARK: - Private Helpers

    private func postRequest(tableId: String, body: [String: Any]) async throws -> [String: Any] {
        let baseURL = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)

        // Response must use field IDs (not names) to match converters
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "returnFieldsByFieldId", value: "true")]
        let url = components.url!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await performWithRetry(request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            let responseBody = String(data: data, encoding: .utf8) ?? "(no body)"
            Self.logger.error("POST \(statusCode, privacy: .public) for \(tableId, privacy: .public): \(responseBody, privacy: .public)")
            throw AirtableError.httpError(statusCode: statusCode, tableId: tableId)
        }

        return (try JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    private func patchRequest(tableId: String, body: [String: Any]) async throws -> [String: Any] {
        let baseURL = AirtableConfig.apiBaseURL
            .appendingPathComponent(baseId)
            .appendingPathComponent(tableId)

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "returnFieldsByFieldId", value: "true")]
        let url = components.url!

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await performWithRetry(request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            let responseBody = String(data: data, encoding: .utf8) ?? "(no body)"
            Self.logger.error("PATCH \(statusCode, privacy: .public) for \(tableId, privacy: .public): \(responseBody, privacy: .public)")
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
    case attachmentUploadFailed(reason: String)

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
        case .attachmentUploadFailed(let reason):
            return "Attachment upload failed: \(reason)"
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
