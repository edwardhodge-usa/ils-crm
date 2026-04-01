import Foundation

// MARK: - Rule Types

/// Action a rule can take when matched.
enum RuleAction: String {
    case reject
    case flag
    case require
    case enrich
}

/// Result of evaluating all rules against a candidate.
enum RuleResult: String {
    case pass
    case reject
    case enrich
}

/// A scan rule with associated configuration.
/// Port of the discriminated union `Rule` from electron/gmail/types.ts.
enum ScanRule {
    case domainBlocklist(domains: String, action: RuleAction)
    case minExchanges(count: Int)
    case headerMatch(header: String, action: RuleAction)
    case senderPattern(patterns: String, action: RuleAction)
    case crmDedup
}

// MARK: - Rules Engine

/// Evaluates email scan rules against candidates to determine pass/reject/enrich.
/// Port of electron/gmail/rules-engine.ts to Swift.
enum EmailRulesEngine {

    // MARK: - Default Patterns

    private static let noreplyPatterns = [
        "noreply@", "no-reply@", "donotreply@", "do-not-reply@", "mailer-daemon@",
    ]

    private static let groupPrefixes = [
        "info@", "sales@", "support@", "hello@", "team@", "admin@",
        "billing@", "accounts@", "contact@", "help@", "feedback@",
    ]

    private static let bulkDomains = [
        "mailchimp.com", "sendgrid.net", "constantcontact.com", "hubspot.com",
        "mailgun.com", "amazonaws.com", "mandrillapp.com",
    ]

    private static let socialDomains = [
        "linkedin.com", "facebookmail.com", "twitter.com", "github.com",
        "slack.com", "notion.so",
    ]

    // MARK: - Default Rules

    /// The 6 default rules matching the Electron implementation.
    static let defaultRules: [ScanRule] = [
        .senderPattern(patterns: noreplyPatterns.joined(separator: ","), action: .reject),
        .senderPattern(patterns: groupPrefixes.joined(separator: ","), action: .reject),
        .domainBlocklist(domains: bulkDomains.joined(separator: ","), action: .reject),
        .headerMatch(header: "List-Unsubscribe", action: .reject),
        .domainBlocklist(domains: socialDomains.joined(separator: ","), action: .reject),
        .minExchanges(count: 2),
    ]

    // MARK: - Evaluation

    /// Evaluates all rules against a candidate email address.
    /// Returns `.reject` if any reject rule matches, `.pass` if the candidate passes all rules.
    static func evaluateRules(
        candidate: EmailCandidateData,
        rules: [ScanRule],
        ownEmail: String
    ) -> RuleResult {
        let emailLower = candidate.email.lowercased()
        let domain = emailLower.split(separator: "@", maxSplits: 1).last.map(String.init) ?? ""

        // Always reject own email
        if candidate.normalizedEmail == EmailUtils.normalizeEmail(ownEmail) {
            return .reject
        }

        for rule in rules {
            switch rule {
            case .senderPattern(let patterns, let action):
                let patternList = patterns.split(separator: ",")
                    .map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
                if patternList.contains(where: { emailLower.hasPrefix($0) || emailLower.contains($0) }) {
                    return action == .reject ? .reject : .pass
                }

            case .domainBlocklist(let domains, let action):
                let domainList = domains.split(separator: ",")
                    .map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
                if domainList.contains(where: { domain == $0 || domain.hasSuffix(".\($0)") }) {
                    return action == .reject ? .reject : .pass
                }

            case .headerMatch:
                // Header-match rules are applied during message parsing, not here
                break

            case .minExchanges(let count):
                if candidate.threadCount < count {
                    return .reject
                }

            case .crmDedup:
                // CRM dedup handled separately by the scanner
                break
            }
        }

        return .pass
    }

    // MARK: - Parse from Airtable

    /// Converts an Airtable `EmailScanRule` model into a `ScanRule` enum case.
    /// Returns nil if the rule is inactive or has an unknown type.
    static func parseAirtableRule(from record: EmailScanRule) -> ScanRule? {
        guard record.isActive else { return nil }

        guard let ruleType = record.ruleType else { return nil }

        switch ruleType {
        case "domain-blocklist":
            let action = RuleAction(rawValue: record.action ?? "reject") ?? .reject
            return .domainBlocklist(domains: record.ruleValue ?? "", action: action)

        case "min-exchanges":
            let count = Int(record.ruleValue ?? "") ?? 2
            return .minExchanges(count: count)

        case "header-match":
            let action = RuleAction(rawValue: record.action ?? "reject") ?? .reject
            return .headerMatch(header: record.ruleValue ?? "", action: action)

        case "sender-pattern":
            return .senderPattern(patterns: record.ruleValue ?? "", action: .reject)

        case "crm-dedup":
            return .crmDedup

        default:
            return nil
        }
    }
}
