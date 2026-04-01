import Foundation

// MARK: - Candidate Data

/// Data collected about an email address during scanning.
/// Port of `EmailCandidate` from electron/gmail/types.ts.
struct EmailCandidateData {
    var email: String
    var normalizedEmail: String
    var displayName: String?
    var firstName: String?
    var lastName: String?
    var threadCount: Int
    var firstSeenDate: Date
    var lastSeenDate: Date
    var discoveredVia: String       // "From", "To", "CC", "Reply Chain"
    var fromCount: Int
    var toCount: Int
    var ccCount: Int
}

// MARK: - Classifier

/// Heuristic classifier that scores email candidates based on interaction patterns.
/// Port of electron/gmail/classifier.ts to Swift.
///
/// Scoring breakdown (max 60):
/// - Thread frequency: 0-20 points
/// - From/CC ratio: 0-15 points
/// - Time span: 0-10 points
/// - Discovery method: 0-5 points
/// - Display name present: 0-5 points
enum EmailClassifier {

    /// Classifies a candidate and returns a relationship type hint and confidence score.
    static func classifyCandidate(_ candidate: EmailCandidateData) -> (relationshipType: String, confidence: Int) {
        var score = 0

        // Thread frequency (0-20 points)
        score += min(candidate.threadCount * 3, 20)

        // From vs CC ratio (0-15 points) -- direct correspondents score higher
        let total = candidate.fromCount + candidate.toCount + candidate.ccCount
        if total > 0 {
            let directRatio = Double(candidate.fromCount + candidate.toCount) / Double(total)
            score += Int((directRatio * 15).rounded())
        }

        // Time span (0-10 points) -- longer relationships score higher
        let daySpan = candidate.lastSeenDate.timeIntervalSince(candidate.firstSeenDate) / (60 * 60 * 24)
        score += min(Int((daySpan / 10).rounded()), 10)

        // Discovery method bonus (0-5 points)
        switch candidate.discoveredVia {
        case "From":
            score += 5
        case "To":
            score += 3
        case "CC":
            score += 1
        default:
            break
        }

        // Has display name (0-5 points)
        if let name = candidate.displayName, !name.isEmpty {
            score += 5
        }

        // Cap at 60
        let confidence = min(score, 60)

        // Relationship type -- heuristic placeholder (Phase 2 upgrades with AI)
        let relationshipType = "Unknown"

        return (relationshipType: relationshipType, confidence: confidence)
    }
}
