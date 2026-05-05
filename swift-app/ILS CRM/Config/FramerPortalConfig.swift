import Foundation

/// Configuration for the Framer-hosted client portal pages.
///
/// Default points at imaginelabstudios.com. Override via Settings → Portal
/// (writes `framer_portal_base_url` to UserDefaults).
enum FramerPortalConfig {
    /// UserDefaults key for the configured base URL.
    static let storageKey = "framer_portal_base_url"

    /// Default base URL when the user hasn't overridden.
    static let defaultBaseURL = "https://imaginelabstudios.com/ils-clients"

    /// Resolved base URL (no trailing slash).
    static var baseURL: String {
        let stored = UserDefaults.standard.string(forKey: storageKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let stored, !stored.isEmpty else { return defaultBaseURL }
        return stored.hasSuffix("/") ? String(stored.dropLast()) : stored
    }

    /// Build a portal page URL for the given page address slug.
    /// Returns nil if the page address is empty or the configured base URL is invalid.
    static func pageURL(for pageAddress: String) -> URL? {
        let trimmed = pageAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? trimmed
        return URL(string: "\(baseURL)/\(encoded)")
    }

    /// Display string (no scheme) for the given page address.
    static func displayURL(for pageAddress: String) -> String {
        let stripped = baseURL
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
        return "\(stripped)/\(pageAddress)"
    }

    /// The host portion of the configured base URL (used for URL validation).
    static var allowedHost: String? {
        URL(string: baseURL)?.host
    }
}
