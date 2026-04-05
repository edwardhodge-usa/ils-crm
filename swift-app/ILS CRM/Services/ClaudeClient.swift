import Foundation
import os

// MARK: - Claude Classification Result

/// Codable struct representing Claude's classification response.
/// Port of `ClaudeClassification` from electron/gmail/claude-client.ts.
struct ClaudeClassification: Codable, Sendable {
    let firstName: String?
    let lastName: String?
    let jobTitle: String?
    let companyName: String?
    let phone: String?
    let relationshipType: String
    let confidence: Int
    let reasoning: String

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case jobTitle = "job_title"
        case companyName = "company_name"
        case phone
        case relationshipType = "relationship_type"
        case confidence
        case reasoning
    }
}

// MARK: - Candidate Metadata

/// Metadata about a candidate passed to Claude prompts.
struct CandidateMetadata: Sendable {
    let email: String
    let threadCount: Int
    let fromCount: Int
    let toCount: Int
    let ccCount: Int
    let firstSeen: String   // YYYY-MM-DD
    let lastSeen: String    // YYYY-MM-DD
}

// MARK: - Claude Client

/// Claude Haiku API client for email contact classification + extraction.
/// Port of electron/gmail/claude-client.ts to Swift.
enum ClaudeClient {

    private static let logger = Logger(subsystem: "com.ils-crm", category: "ClaudeClient")
    private static let apiURL = URL(string: "https://api.anthropic.com/v1/messages")!
    private static let model = "claude-haiku-4-5-20251001"

    static let validRelationshipTypes: Set<String> = [
        "Client", "Prospect", "Partner", "Consultant", "Vendor Contact",
        "Talent", "Employee", "Investor", "Advisor", "Industry Peer", "Other",
    ]

    // Keychain key for the Anthropic API key
    static let anthropicApiKeyAccount = "anthropic-api-key"

    // MARK: - Prompt Builders

    /// Builds a prompt that includes the email body for extraction.
    /// Identical prompt text to the Electron implementation.
    static func buildExtractionPrompt(strippedBody: String, meta: CandidateMetadata) -> String {
        """
        You are extracting contact information from an email. The email body below belongs to a single person. Extract their details.

        Email body:
        ---
        \(strippedBody)
        ---

        Candidate metadata:
        - Email: \(meta.email)
        - Thread count: \(meta.threadCount)
        - From/To/CC: \(meta.fromCount)/\(meta.toCount)/\(meta.ccCount)
        - Time span: \(meta.firstSeen) to \(meta.lastSeen)

        Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

        Example response:
        {"first_name": "Sarah", "last_name": "Chen", "job_title": "VP Marketing", "company_name": "Acme Corp", "phone": "+1-555-867-5309", "relationship_type": "Client", "confidence": 78, "reasoning": "Frequent direct correspondent over 6 months with professional signature."}

        Example with missing fields:
        {"first_name": "James", "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 35, "reasoning": "Appeared in 2 threads as CC, no signature data available."}

        relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
        confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
        reasoning is one sentence explaining your classification.
        """
    }

    /// Builds a metadata-only prompt when no email body is available.
    /// Identical prompt text to the Electron implementation.
    static func buildMetadataOnlyPrompt(meta: CandidateMetadata) -> String {
        """
        You are classifying an email contact for a CRM. No email body is available — classify based on email patterns only.

        Candidate metadata:
        - Email: \(meta.email)
        - Thread count: \(meta.threadCount)
        - From/To/CC: \(meta.fromCount)/\(meta.toCount)/\(meta.ccCount)
        - Time span: \(meta.firstSeen) to \(meta.lastSeen)

        Respond with ONLY a JSON object, no markdown fences, no explanation. Use JSON null for unknown fields.

        Example response:
        {"first_name": null, "last_name": null, "job_title": null, "company_name": null, "phone": null, "relationship_type": "Prospect", "confidence": 42, "reasoning": "Direct correspondent in 5 threads over 3 months, likely business contact."}

        relationship_type must be one of: Client, Prospect, Partner, Consultant, Vendor Contact, Talent, Employee, Investor, Advisor, Industry Peer, Other
        confidence is 0-100 reflecting how confident you are this person is a real business contact worth adding to a CRM.
        reasoning is one sentence explaining your classification.
        """
    }

    // MARK: - Response Parsing

    /// Parses Claude's raw text response into a `ClaudeClassification`.
    /// Strips JSON fences, validates confidence 0-100, validates relationship_type.
    static func parseClaudeResponse(_ raw: String) -> ClaudeClassification? {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }

        // Strip ```json or ``` fences
        var lines = text.components(separatedBy: "\n")
        if let first = lines.first, first.trimmingCharacters(in: .whitespaces).hasPrefix("```") {
            lines.removeFirst()
        }
        if let last = lines.last, last.trimmingCharacters(in: .whitespaces) == "```" {
            lines.removeLast()
        }
        text = lines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty, let data = text.data(using: .utf8) else { return nil }

        do {
            let classification = try JSONDecoder().decode(ClaudeClassification.self, from: data)

            // Validate confidence 0-100
            guard classification.confidence >= 0, classification.confidence <= 100 else { return nil }

            // Validate relationship_type
            guard validRelationshipTypes.contains(classification.relationshipType) else { return nil }

            // Validate reasoning exists
            guard !classification.reasoning.isEmpty else { return nil }

            return classification
        } catch {
            logger.warning("Failed to parse Claude response: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - API Call

    /// Sends a prompt to Claude and returns the classification result.
    /// Uses URLSession POST to the Anthropic Messages API.
    static func classifyWithClaude(prompt: String, apiKey: String) async -> ClaudeClassification? {
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 300,
            "messages": [
                ["role": "user", "content": prompt]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let http = response as? HTTPURLResponse else {
                logger.error("[Claude] Non-HTTP response")
                return nil
            }

            guard http.statusCode == 200 else {
                let errText = String(data: data, encoding: .utf8) ?? "(no body)"
                logger.error("[Claude] API error \(http.statusCode): \(errText, privacy: .public)")
                return nil
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let content = json["content"] as? [[String: Any]],
                  let text = content.first?["text"] as? String else {
                logger.error("[Claude] No text in response")
                return nil
            }

            return parseClaudeResponse(text)
        } catch {
            logger.error("[Claude] Request failed: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - API Key Validation

    /// Validates an Anthropic API key with a 1-token probe request.
    static func validateApiKey(_ key: String) async -> Bool {
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(key, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 1,
            "messages": [
                ["role": "user", "content": "hi"]
            ]
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return false }
            return http.statusCode == 200
        } catch {
            return false
        }
    }
}
