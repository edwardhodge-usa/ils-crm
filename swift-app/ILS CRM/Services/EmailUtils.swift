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

    // MARK: - Quoted Content Stripping

    /// Strips HTML quote structures and returns plain text.
    private static func stripHtmlQuotes(_ html: String) -> String {
        var result = html
        // Remove gmail_quote divs and their content
        result = result.replacingOccurrences(
            of: #"<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?</div>"#,
            with: "", options: .regularExpression
        )
        // Remove yahoo_quoted divs
        result = result.replacingOccurrences(
            of: #"<div[^>]*class="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*?</div>"#,
            with: "", options: .regularExpression
        )
        // Remove blockquote elements
        result = result.replacingOccurrences(
            of: #"<blockquote[\s\S]*?</blockquote>"#,
            with: "", options: .regularExpression
        )
        // Strip remaining tags
        result = result.replacingOccurrences(
            of: #"<[^>]+>"#, with: " ", options: .regularExpression
        )
        // Decode entities
        result = result.replacingOccurrences(of: "&nbsp;", with: " ")
        result = result.replacingOccurrences(of: "&lt;", with: "<")
        result = result.replacingOccurrences(of: "&gt;", with: ">")
        result = result.replacingOccurrences(of: "&amp;", with: "&")
        // Clean whitespace
        result = result.replacingOccurrences(
            of: #"\n\s*\n\s*\n"#, with: "\n\n", options: .regularExpression
        )
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // swiftlint:disable:next force_try
    private static let outlookFromRegex = try! NSRegularExpression(pattern: #"^From:\s+.+"#)
    // swiftlint:disable:next force_try
    private static let outlookSentRegex = try! NSRegularExpression(pattern: #"^Sent:\s+"#)
    // swiftlint:disable:next force_try
    private static let onWroteRegex = try! NSRegularExpression(pattern: #"^On .+wrote:\s*$"#, options: .caseInsensitive)
    // swiftlint:disable:next force_try
    private static let onPartialRegex = try! NSRegularExpression(pattern: #"^On .+"#, options: .caseInsensitive)
    // swiftlint:disable:next force_try
    private static let wroteLineRegex = try! NSRegularExpression(pattern: #"^\s*wrote:\s*$"#, options: .caseInsensitive)
    // swiftlint:disable:next force_try
    private static let nameAngleWroteRegex = try! NSRegularExpression(pattern: #"^.+<[^>]+>\s*wrote:\s*$"#, options: .caseInsensitive)
    // swiftlint:disable:next force_try
    private static let originalMessageRegex = try! NSRegularExpression(pattern: #"^-----Original Message-----"#)
    // swiftlint:disable:next force_try
    private static let forwardedMessageRegex = try! NSRegularExpression(pattern: #"^-{10,}\s*Forwarded message\s*-{10,}"#)
    // swiftlint:disable:next force_try
    private static let underscoreDividerRegex = try! NSRegularExpression(pattern: #"^_{5,}"#)
    // swiftlint:disable:next force_try
    private static let sentFromIPhoneRegex = try! NSRegularExpression(pattern: #"^Sent from my iP(hone|ad)"#, options: .caseInsensitive)
    // swiftlint:disable:next force_try
    private static let getOutlookRegex = try! NSRegularExpression(pattern: #"^Get Outlook for"#, options: .caseInsensitive)

    /// Strips quoted thread content from an email body, returning only the
    /// sender's own message + signature. Returns nil if the remaining content
    /// is too short to contain a useful signature (< 3 non-empty lines).
    ///
    /// - Parameters:
    ///   - body: Raw email body text (plain text or HTML)
    ///   - isHtml: If true, strip HTML quotes before line-by-line processing
    static func stripQuotedContent(_ body: String, isHtml: Bool = false) -> String? {
        var text = body

        if isHtml {
            text = stripHtmlQuotes(text)
        }

        let lines = text.components(separatedBy: "\n")
        var cutIndex = lines.count

        for i in 0..<lines.count {
            let line = lines[i].trimmingCharacters(in: .whitespaces)
            let lineRange = NSRange(line.startIndex..., in: line)

            // 2+ consecutive > quoted lines
            if line.hasPrefix("> ") || line == ">" {
                if i + 1 < lines.count {
                    let nextLine = lines[i + 1].trimmingCharacters(in: .whitespaces)
                    if nextLine.hasPrefix("> ") || nextLine == ">" {
                        cutIndex = i
                        break
                    }
                }
                continue
            }

            // Outlook From: + Sent: lookahead
            if outlookFromRegex.firstMatch(in: line, range: lineRange) != nil {
                var foundSent = false
                for j in (i + 1)...min(i + 3, lines.count - 1) {
                    let nextLine = lines[j].trimmingCharacters(in: .whitespaces)
                    let nextRange = NSRange(nextLine.startIndex..., in: nextLine)
                    if outlookSentRegex.firstMatch(in: nextLine, range: nextRange) != nil {
                        foundSent = true
                        break
                    }
                }
                if foundSent {
                    cutIndex = i
                    break
                }
                continue
            }

            // "On ... wrote:" Gmail pattern (same line)
            if onWroteRegex.firstMatch(in: line, range: lineRange) != nil {
                cutIndex = i
                break
            }

            // "On ..." on this line, "wrote:" on the next
            if onPartialRegex.firstMatch(in: line, range: lineRange) != nil,
               i + 1 < lines.count {
                let nextLine = lines[i + 1].trimmingCharacters(in: .whitespaces)
                let nextRange = NSRange(nextLine.startIndex..., in: nextLine)
                if wroteLineRegex.firstMatch(in: nextLine, range: nextRange) != nil {
                    cutIndex = i
                    break
                }
            }

            // "{name} <email> wrote:" pattern
            if nameAngleWroteRegex.firstMatch(in: line, range: lineRange) != nil {
                cutIndex = i
                break
            }

            // Original message dividers
            if originalMessageRegex.firstMatch(in: line, range: lineRange) != nil { cutIndex = i; break }
            if forwardedMessageRegex.firstMatch(in: line, range: lineRange) != nil { cutIndex = i; break }
            if underscoreDividerRegex.firstMatch(in: line, range: lineRange) != nil { cutIndex = i; break }

            // Mobile footers
            if sentFromIPhoneRegex.firstMatch(in: line, range: lineRange) != nil { cutIndex = i; break }
            if getOutlookRegex.firstMatch(in: line, range: lineRange) != nil { cutIndex = i; break }
        }

        var result = Array(lines[0..<cutIndex])

        // Cap at 50 lines
        if result.count > 50 {
            result = Array(result[0..<50])
        }

        // Need at least 3 non-empty lines
        let nonEmpty = result.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        if nonEmpty.count < 3 { return nil }

        return result.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Message Selection Scoring

    // swiftlint:disable:next force_try
    private static let scoreTitleRegex = try! NSRegularExpression(
        pattern: #"\b(?:VP|Director|Manager|President|CEO|CFO|COO|CTO|Partner|Associate|Consultant|Producer|Designer|Engineer|Architect|Counsel|Attorney)\b"#,
        options: .caseInsensitive
    )

    // swiftlint:disable:next force_try
    private static let scoreUrlRegex = try! NSRegularExpression(
        pattern: #"https?://|www\.|\.com|\.org|\.net"#,
        options: .caseInsensitive
    )

    // swiftlint:disable:next force_try
    private static let scoreMobileFooterRegex = try! NSRegularExpression(
        pattern: #"^Sent from my iP(hone|ad)"#,
        options: [.caseInsensitive, .anchorsMatchLines]
    )

    /// Scores a stripped message body for signature richness.
    /// Higher score = better candidate for Claude extraction.
    /// - Parameters:
    ///   - strippedBody: Message body after `stripQuotedContent` (may be nil)
    ///   - recencyIndex: 0 = most recent, 1 = second, etc.
    static func scoreMessageForSignature(_ strippedBody: String?, recencyIndex: Int) -> Int {
        guard let strippedBody, !strippedBody.isEmpty else { return -10 }

        var score = 0
        let lines = strippedBody.components(separatedBy: "\n")
        let nonEmpty = lines.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        // Line count
        if nonEmpty.count >= 10 { score += 2 }
        if nonEmpty.count < 3 { score -= 10 }

        // Phone number pattern
        let bodyRange = NSRange(strippedBody.startIndex..., in: strippedBody)
        if phoneRegex.firstMatch(in: strippedBody, range: bodyRange) != nil { score += 3 }

        // Title keyword
        if scoreTitleRegex.firstMatch(in: strippedBody, range: bodyRange) != nil { score += 2 }

        // URL or domain
        if scoreUrlRegex.firstMatch(in: strippedBody, range: bodyRange) != nil { score += 1 }

        // Recency bonus
        if recencyIndex == 0 { score += 2 }
        else if recencyIndex == 1 { score += 1 }

        // Mobile-only footer detection
        if scoreMobileFooterRegex.firstMatch(in: strippedBody, range: bodyRange) != nil,
           nonEmpty.count <= 2 {
            score -= 5
        }

        return score
    }
}
