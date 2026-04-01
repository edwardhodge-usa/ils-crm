import Foundation
import os

// MARK: - Supporting Types

/// Parsed email header fields from a Gmail message.
struct EmailHeadersData: Sendable {
    let from: (name: String?, email: String)
    let to: [(name: String?, email: String)]
    let cc: [(name: String?, email: String)]
    let date: Date
    let subject: String
    let rawHeaders: [String: String]
}

/// A full Gmail message with headers and body.
struct EmailMessageData: Sendable {
    let id: String
    let threadId: String
    let headers: EmailHeadersData
    let bodyPlainText: String?
}

/// Gmail API errors with semantic cases for retry/UI logic.
enum GmailError: LocalizedError {
    case tokenExpired
    case historyExpired
    case rateLimited
    case apiError(Int, String)

    var errorDescription: String? {
        switch self {
        case .tokenExpired:
            return "Gmail access token expired"
        case .historyExpired:
            return "Gmail history ID expired — full resync required"
        case .rateLimited:
            return "Gmail API rate limited"
        case .apiError(let code, let message):
            return "Gmail API error \(code): \(message)"
        }
    }
}

// MARK: - Gmail API Client

/// Thread-safe Gmail REST API client.
///
/// Mirrors the pattern from AirtableService — actor isolation ensures
/// no concurrent mutation. Uses GmailOAuthService for token management
/// with automatic refresh on 401.
///
/// Key features:
/// - Exponential backoff on 429 (rate limited)
/// - Auto-retry on 401 (token refresh + single retry)
/// - MIME body extraction for plain text
/// - History-based incremental sync support
actor GmailAPIClient {

    private static let logger = Logger(subsystem: "com.ils-crm", category: "GmailAPI")

    private let oAuthService: GmailOAuthService
    private let session: URLSession
    private static let baseURL = "https://www.googleapis.com/gmail/v1/users/me"

    init(oAuthService: GmailOAuthService) {
        self.oAuthService = oAuthService
        self.session = URLSession(configuration: .default)
    }

    // MARK: - List Messages

    /// Lists message IDs from the user's mailbox.
    /// Returns message/thread ID pairs, next page token, and estimated total.
    func listMessages(
        pageToken: String? = nil,
        maxResults: Int = 100
    ) async throws -> (messages: [(id: String, threadId: String)], nextPageToken: String?, total: Int) {
        var components = URLComponents(string: "\(Self.baseURL)/messages")!
        var queryItems = [
            URLQueryItem(name: "maxResults", value: String(maxResults)),
        ]
        if let pageToken {
            queryItems.append(URLQueryItem(name: "pageToken", value: pageToken))
        }
        components.queryItems = queryItems

        let json = try await authenticatedRequest(url: components.url!)

        let messages = (json["messages"] as? [[String: Any]])?.compactMap { msg -> (id: String, threadId: String)? in
            guard let id = msg["id"] as? String,
                  let threadId = msg["threadId"] as? String else { return nil }
            return (id: id, threadId: threadId)
        } ?? []

        let nextPageToken = json["nextPageToken"] as? String
        let total = json["resultSizeEstimate"] as? Int ?? messages.count

        return (messages: messages, nextPageToken: nextPageToken, total: total)
    }

    // MARK: - Get Message Headers (metadata only)

    /// Fetches message headers only (From, To, CC, Subject, Date).
    /// Uses format=metadata to minimize data transfer.
    func getMessageHeaders(messageId: String) async throws -> EmailHeadersData {
        var components = URLComponents(string: "\(Self.baseURL)/messages/\(messageId)")!
        components.queryItems = [
            URLQueryItem(name: "format", value: "metadata"),
            URLQueryItem(name: "metadataHeaders", value: "From"),
            URLQueryItem(name: "metadataHeaders", value: "To"),
            URLQueryItem(name: "metadataHeaders", value: "Cc"),
            URLQueryItem(name: "metadataHeaders", value: "Subject"),
            URLQueryItem(name: "metadataHeaders", value: "Date"),
        ]

        let json = try await authenticatedRequest(url: components.url!)
        return try parseHeaders(from: json)
    }

    // MARK: - Get Full Message (headers + body)

    /// Fetches the full message including plain text body.
    /// Extracts text/plain from the MIME structure.
    func getMessageFull(messageId: String) async throws -> EmailMessageData {
        var components = URLComponents(string: "\(Self.baseURL)/messages/\(messageId)")!
        components.queryItems = [
            URLQueryItem(name: "format", value: "full"),
        ]

        let json = try await authenticatedRequest(url: components.url!)
        let headers = try parseHeaders(from: json)

        let id = json["id"] as? String ?? messageId
        let threadId = json["threadId"] as? String ?? ""

        // Extract plain text body from MIME payload
        let bodyPlainText: String?
        if let payload = json["payload"] as? [String: Any] {
            bodyPlainText = extractPlainText(from: payload)
        } else {
            bodyPlainText = nil
        }

        return EmailMessageData(
            id: id,
            threadId: threadId,
            headers: headers,
            bodyPlainText: bodyPlainText
        )
    }

    // MARK: - List History (incremental sync)

    /// Returns new message IDs since the given historyId.
    /// Throws `GmailError.historyExpired` on 404 (historyId too old).
    func listHistory(startHistoryId: String) async throws -> [String] {
        var components = URLComponents(string: "\(Self.baseURL)/history")!
        components.queryItems = [
            URLQueryItem(name: "startHistoryId", value: startHistoryId),
            URLQueryItem(name: "historyTypes", value: "messageAdded"),
        ]

        let json: [String: Any]
        do {
            json = try await authenticatedRequest(url: components.url!)
        } catch GmailError.apiError(404, _) {
            throw GmailError.historyExpired
        }

        let historyRecords = json["history"] as? [[String: Any]] ?? []

        var messageIds: [String] = []
        for record in historyRecords {
            if let messagesAdded = record["messagesAdded"] as? [[String: Any]] {
                for added in messagesAdded {
                    if let message = added["message"] as? [String: Any],
                       let id = message["id"] as? String {
                        messageIds.append(id)
                    }
                }
            }
        }

        return messageIds
    }

    // MARK: - Get Profile

    /// Returns the authenticated user's email address.
    func getProfile() async throws -> String {
        let url = URL(string: "\(Self.baseURL)/profile")!
        let json = try await authenticatedRequest(url: url)

        guard let email = json["emailAddress"] as? String else {
            throw GmailError.apiError(0, "Missing emailAddress in profile response")
        }

        return email
    }

    // MARK: - Search Messages

    /// Searches messages with a Gmail query string (e.g. "from:alice@example.com").
    func searchMessages(
        query: String,
        maxResults: Int = 100
    ) async throws -> [(id: String, threadId: String)] {
        var components = URLComponents(string: "\(Self.baseURL)/messages")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "maxResults", value: String(maxResults)),
        ]

        let json = try await authenticatedRequest(url: components.url!)

        return (json["messages"] as? [[String: Any]])?.compactMap { msg -> (id: String, threadId: String)? in
            guard let id = msg["id"] as? String,
                  let threadId = msg["threadId"] as? String else { return nil }
            return (id: id, threadId: threadId)
        } ?? []
    }

    // MARK: - Authenticated Request with Retry

    /// Performs a GET request with Bearer token authentication.
    /// Auto-refreshes on 401, exponential backoff on 429.
    private func authenticatedRequest(
        url: URL,
        maxRetries: Int = 3
    ) async throws -> [String: Any] {
        var lastError: Error?

        for attempt in 0..<(maxRetries + 1) {
            // Get token from OAuth service (MainActor-isolated).
            // Direct await hops to MainActor automatically via Swift concurrency.
            let accessToken = try await oAuthService.getAccessToken()

            var request = URLRequest(url: url)
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw GmailError.apiError(0, "Non-HTTP response")
            }

            switch http.statusCode {
            case 200...299:
                guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    throw GmailError.apiError(http.statusCode, "Invalid JSON response")
                }
                return json

            case 401:
                // Token expired — refresh and retry once
                if attempt == 0 {
                    Self.logger.warning("401 — refreshing token and retrying")
                    // Force refresh by clearing the cached access token
                    KeychainService.delete(key: GmailOAuthService.accessTokenKey)
                    continue
                }
                throw GmailError.tokenExpired

            case 429:
                guard attempt < maxRetries else {
                    throw GmailError.rateLimited
                }
                let retryAfter = Double(http.value(forHTTPHeaderField: "Retry-After") ?? "") ?? 1.0
                let backoff = retryAfter * pow(2.0, Double(attempt))
                Self.logger.warning("429 rate limited — retry \(attempt + 1)/\(maxRetries) after \(backoff, privacy: .public)s")
                try await Task.sleep(for: .seconds(backoff))
                lastError = GmailError.rateLimited
                continue

            default:
                let body = String(data: data, encoding: .utf8) ?? "(no body)"
                Self.logger.error("Gmail API \(http.statusCode, privacy: .public): \(body, privacy: .public)")
                throw GmailError.apiError(http.statusCode, body)
            }
        }

        throw lastError ?? GmailError.rateLimited
    }

    // MARK: - Header Parsing

    /// Parses Gmail message headers from the API response payload.
    private func parseHeaders(from json: [String: Any]) throws -> EmailHeadersData {
        guard let payload = json["payload"] as? [String: Any],
              let headers = payload["headers"] as? [[String: Any]] else {
            throw GmailError.apiError(0, "Missing payload/headers in message")
        }

        var rawHeaders: [String: String] = [:]
        for header in headers {
            if let name = header["name"] as? String,
               let value = header["value"] as? String {
                rawHeaders[name] = value
            }
        }

        let from = Self.parseEmailAddress(rawHeaders["From"] ?? "")
        let to = Self.parseEmailAddressList(rawHeaders["To"] ?? "")
        let cc = Self.parseEmailAddressList(rawHeaders["Cc"] ?? "")
        let subject = rawHeaders["Subject"] ?? "(no subject)"

        // Parse date — Gmail uses RFC 2822 format
        let date: Date
        if let dateString = rawHeaders["Date"] {
            date = Self.parseRFC2822Date(dateString) ?? Date()
        } else {
            date = Date()
        }

        return EmailHeadersData(
            from: from,
            to: to,
            cc: cc,
            date: date,
            subject: subject,
            rawHeaders: rawHeaders
        )
    }

    // MARK: - MIME Body Extraction

    /// Recursively extracts text/plain content from a MIME payload.
    private func extractPlainText(from payload: [String: Any]) -> String? {
        let mimeType = payload["mimeType"] as? String ?? ""

        // Direct text/plain part
        if mimeType == "text/plain" {
            if let body = payload["body"] as? [String: Any],
               let data = body["data"] as? String {
                return Self.decodeBase64URL(data)
            }
        }

        // Multipart — recurse into parts
        if mimeType.hasPrefix("multipart/"),
           let parts = payload["parts"] as? [[String: Any]] {
            for part in parts {
                if let text = extractPlainText(from: part) {
                    return text
                }
            }
        }

        return nil
    }

    // MARK: - Static Helpers

    /// Decodes base64url-encoded string (Gmail's encoding).
    private static func decodeBase64URL(_ base64url: String) -> String? {
        var base64 = base64url
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to multiple of 4
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }

        guard let data = Data(base64Encoded: base64) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Parses a single email address string like "Name <email@example.com>" or "email@example.com".
    private static func parseEmailAddress(_ raw: String) -> (name: String?, email: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)

        // Pattern: "Display Name <email@example.com>"
        if let angleBracketStart = trimmed.lastIndex(of: "<"),
           let angleBracketEnd = trimmed.lastIndex(of: ">"),
           angleBracketStart < angleBracketEnd {
            let email = String(trimmed[trimmed.index(after: angleBracketStart)..<angleBracketEnd])
                .trimmingCharacters(in: .whitespaces)
            let name = String(trimmed[trimmed.startIndex..<angleBracketStart])
                .trimmingCharacters(in: .whitespaces)
                .trimmingCharacters(in: CharacterSet(charactersIn: "\""))

            return (name: name.isEmpty ? nil : name, email: email)
        }

        // Plain email address
        return (name: nil, email: trimmed)
    }

    /// Parses a comma-separated list of email addresses.
    private static func parseEmailAddressList(_ raw: String) -> [(name: String?, email: String)] {
        guard !raw.isEmpty else { return [] }

        // Split on commas, but respect quoted strings and angle brackets
        var results: [(name: String?, email: String)] = []
        var current = ""
        var depth = 0 // Track angle bracket nesting
        var inQuote = false

        for char in raw {
            if char == "\"" { inQuote.toggle() }
            else if char == "<" && !inQuote { depth += 1 }
            else if char == ">" && !inQuote { depth -= 1 }

            if char == "," && depth == 0 && !inQuote {
                results.append(parseEmailAddress(current))
                current = ""
            } else {
                current.append(char)
            }
        }

        if !current.trimmingCharacters(in: .whitespaces).isEmpty {
            results.append(parseEmailAddress(current))
        }

        return results
    }

    /// Parses RFC 2822 date strings used in email headers.
    private static func parseRFC2822Date(_ string: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")

        // Try common RFC 2822 formats
        let formats = [
            "EEE, dd MMM yyyy HH:mm:ss Z",
            "EEE, dd MMM yyyy HH:mm:ss z",
            "dd MMM yyyy HH:mm:ss Z",
            "EEE, d MMM yyyy HH:mm:ss Z",
        ]

        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: string) {
                return date
            }
        }

        return nil
    }
}

