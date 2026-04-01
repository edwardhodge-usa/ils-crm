import Foundation

// MARK: - Email Normalization

/// Utility functions for parsing and normalizing email addresses.
/// Port of electron/gmail/email-utils.ts to Swift.
enum EmailUtils {

    private static let gmailDomains: Set<String> = ["gmail.com", "googlemail.com"]

    /// Normalizes an email address by lowercasing, stripping + aliases,
    /// and removing dots for Gmail domains.
    static func normalizeEmail(_ email: String) -> String {
        let lower = email.lowercased().trimmingCharacters(in: .whitespaces)
        let parts = lower.split(separator: "@", maxSplits: 1)
        guard parts.count == 2 else { return lower }

        let localPart = String(parts[0])
        let domain = String(parts[1])

        // Strip + alias
        let base = localPart.split(separator: "+", maxSplits: 1).first.map(String.init) ?? localPart

        // Strip dots for Gmail
        let normalized = gmailDomains.contains(domain)
            ? base.replacingOccurrences(of: ".", with: "")
            : base

        return "\(normalized)@\(domain)"
    }

    // MARK: - From Header Parsing

    /// Parses a "From" header string like `"Name" <email>` or `Name <email>` or `email`.
    /// Returns the display name (if present) and the email address.
    static func parseFromHeader(_ header: String) -> (name: String?, email: String) {
        let trimmed = header.trimmingCharacters(in: .whitespaces)

        // Pattern: "Display Name" <email@example.com> or Display Name <email@example.com>
        if let angleBracketStart = trimmed.lastIndex(of: "<"),
           let angleBracketEnd = trimmed.lastIndex(of: ">"),
           angleBracketStart < angleBracketEnd {
            let email = String(trimmed[trimmed.index(after: angleBracketStart)..<angleBracketEnd])
                .trimmingCharacters(in: .whitespaces)
            let namePart = String(trimmed[trimmed.startIndex..<angleBracketStart])
                .trimmingCharacters(in: .whitespaces)
                .trimmingCharacters(in: CharacterSet(charactersIn: "\""))

            return (name: namePart.isEmpty ? nil : namePart, email: email)
        }

        // Bare email: email@example.com or <email@example.com>
        let stripped = trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "<>"))
        return (name: nil, email: stripped)
    }

    // MARK: - Display Name Parsing

    /// Splits a display name into first and last name components.
    /// If the name looks like an email address, extracts the username part.
    static func parseDisplayName(_ name: String) -> (first: String, last: String) {
        if name.isEmpty || name.contains("@") {
            // Email used as display name -- extract username
            let username = name.split(separator: "@", maxSplits: 1).first.map(String.init) ?? name
            return (first: username, last: "")
        }

        let parts = name.trimmingCharacters(in: .whitespaces)
            .split(separator: " ", omittingEmptySubsequences: true)
            .map(String.init)

        guard parts.count > 1 else {
            return (first: parts.first ?? "", last: "")
        }

        // First word is first name, rest is last name
        return (first: parts[0], last: parts.dropFirst().joined(separator: " "))
    }

    // MARK: - Signature Extraction (Heuristic)

    /// Data extracted from an email signature block.
    struct SignatureData {
        var phone: String?
        var title: String?
        var company: String?
    }

    // swiftlint:disable:next force_try
    private static let phoneRegex = try! NSRegularExpression(
        pattern: #"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"#
    )

    // swiftlint:disable:next force_try
    private static let titleRegex = try! NSRegularExpression(
        pattern: #"\b(?:VP|Director|Manager|President|CEO|CFO|COO|CTO|Partner|Associate|Consultant|Producer|Designer|Engineer|Architect|Counsel|Attorney)\b"#,
        options: .caseInsensitive
    )

    // swiftlint:disable:next force_try
    private static let sigDelimiterRegex = try! NSRegularExpression(
        pattern: #"^(?:--|__|─{2,}|={2,}|\s*—\s*$)"#
    )

    /// Extracts phone, title, and company from the signature block of an email body.
    /// Uses heuristic: looks for a delimiter in the last 30 lines, then scans for patterns.
    static func extractSignature(from bodyText: String?) -> SignatureData {
        guard let bodyText, !bodyText.isEmpty else {
            return SignatureData()
        }

        let lines = bodyText.components(separatedBy: "\n")

        // Find signature block -- look for delimiter in last 30 lines
        var sigStart = -1
        let searchStart = max(0, lines.count - 30)
        for i in searchStart..<lines.count {
            let trimmedLine = lines[i].trimmingCharacters(in: .whitespaces)
            let range = NSRange(trimmedLine.startIndex..., in: trimmedLine)
            if sigDelimiterRegex.firstMatch(in: trimmedLine, range: range) != nil {
                sigStart = i + 1
                break
            }
        }

        // If no delimiter, take last 20 lines
        let sigLines: [String]
        if sigStart >= 0 {
            sigLines = Array(lines[sigStart..<min(sigStart + 15, lines.count)])
        } else {
            sigLines = Array(lines.suffix(20))
        }

        let sigText = sigLines.joined(separator: "\n")

        // Extract phone
        var phone: String?
        let sigRange = NSRange(sigText.startIndex..., in: sigText)
        if let match = phoneRegex.firstMatch(in: sigText, range: sigRange),
           let swiftRange = Range(match.range, in: sigText) {
            phone = String(sigText[swiftRange]).trimmingCharacters(in: .whitespaces)
        }

        // Extract title
        var title: String?
        for line in sigLines {
            let trimmedLine = line.trimmingCharacters(in: .whitespaces)
            let lineRange = NSRange(trimmedLine.startIndex..., in: trimmedLine)
            if titleRegex.firstMatch(in: trimmedLine, range: lineRange) != nil,
               trimmedLine.count < 80 {
                // Clean up: strip leading/trailing delimiters
                var cleaned = trimmedLine
                    .replacingOccurrences(of: #"^[|,\-\u2013\u2014]\s*"#, with: "", options: .regularExpression)
                    .replacingOccurrences(of: #"\s*[|,\-\u2013\u2014]$"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
                if cleaned.count > 60 {
                    cleaned = String(cleaned.prefix(60))
                }
                title = cleaned
                break
            }
        }

        // Extract company -- second non-empty sig line (first is often the name)
        var company: String?
        let nonEmptySigLines = sigLines.filter { line in
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            return !trimmed.isEmpty && trimmed.count < 60
        }
        if nonEmptySigLines.count >= 2 {
            let candidate = nonEmptySigLines[1]
                .trimmingCharacters(in: .whitespaces)
                .replacingOccurrences(of: #"^[|,\-\u2013\u2014]\s*"#, with: "", options: .regularExpression)
            let candidateRange = NSRange(candidate.startIndex..., in: candidate)
            if !candidate.isEmpty
                && phoneRegex.firstMatch(in: candidate, range: candidateRange) == nil
                && !candidate.contains("@") {
                company = candidate
            }
        }

        return SignatureData(phone: phone, title: title, company: company)
    }
}
