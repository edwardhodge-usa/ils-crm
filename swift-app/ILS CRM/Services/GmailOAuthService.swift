import AuthenticationServices
import Foundation
import Observation
import os

/// Gmail OAuth 2.0 authentication service.
///
/// Uses ASWebAuthenticationSession for Google consent flow, stores tokens
/// securely in Keychain. Handles automatic token refresh when expired.
///
/// OAuth flow:
/// 1. User calls connect() → opens browser-based Google consent
/// 2. Authorization code exchanged for access + refresh tokens
/// 3. Tokens stored in Keychain via KeychainService
/// 4. getAccessToken() auto-refreshes when token is expired
@Observable
@MainActor
final class GmailOAuthService: NSObject {

    // MARK: - Published State

    /// The authenticated Gmail address, or nil if not connected.
    private(set) var connectedEmail: String?

    /// Whether an OAuth session is currently in progress.
    private(set) var isAuthenticating = false

    /// Last error message for UI display.
    private(set) var lastError: String?

    /// Whether valid tokens exist in the Keychain.
    var isConnected: Bool {
        KeychainService.read(key: Self.refreshTokenKey) != nil
    }

    // MARK: - Constants

    private static let logger = Logger(subsystem: "com.ils-crm", category: "GmailOAuth")

    // Keychain keys — stored under the same service as other app secrets.
    // nonisolated(unsafe) so these constants can be read from any actor context.
    nonisolated(unsafe) static let accessTokenKey = "gmail-access-token"
    nonisolated(unsafe) static let refreshTokenKey = "gmail-refresh-token"
    nonisolated(unsafe) static let tokenExpiryKey = "gmail-token-expiry"
    nonisolated(unsafe) static let emailKey = "gmail-email"
    nonisolated(unsafe) static let clientIdKey = "gmail-client-id"
    nonisolated(unsafe) static let clientSecretKey = "gmail-client-secret"

    private static let scope = "https://www.googleapis.com/auth/gmail.readonly"
    private static let authEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
    private static let tokenEndpoint = "https://oauth2.googleapis.com/token"
    private static let profileEndpoint = "https://www.googleapis.com/gmail/v1/users/me/profile"

    /// iOS OAuth client ID — registered in Google Cloud Console as iOS type
    /// with bundle ID com.imaginelabstudios.ils-crm and Team ID 8RHA62T6FQ.
    /// iOS clients don't require a client secret for token exchange.
    private static let iosClientId = "614505184101-45565nqdbiijtuehcp7rno3k1aqmnmhe.apps.googleusercontent.com"

    /// Callback scheme is the reversed iOS client ID (Google's standard for iOS OAuth).
    private static let callbackScheme = "com.googleusercontent.apps.614505184101-45565nqdbiijtuehcp7rno3k1aqmnmhe"

    // MARK: - Init

    override init() {
        super.init()
        // Restore cached email from Keychain
        connectedEmail = KeychainService.read(key: Self.emailKey)
    }

    // MARK: - Connect (OAuth Consent Flow)

    /// Launches the Google OAuth consent screen via ASWebAuthenticationSession.
    /// On success, exchanges the authorization code for tokens and stores them.
    func connect() async throws {
        guard !isAuthenticating else { return }

        isAuthenticating = true
        lastError = nil
        defer { isAuthenticating = false }

        // Build authorization URL — uses hardcoded iOS client ID (no secret needed)
        var components = URLComponents(string: Self.authEndpoint)!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: Self.iosClientId),
            URLQueryItem(name: "redirect_uri", value: "\(Self.callbackScheme):/oauth/callback"),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: Self.scope),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
        ]

        guard let authURL = components.url else {
            throw GmailOAuthError.invalidURL
        }

        // Launch browser-based auth session
        let callbackURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: Self.callbackScheme
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: GmailOAuthError.authSessionFailed(error.localizedDescription))
                } else if let callbackURL {
                    continuation.resume(returning: callbackURL)
                } else {
                    continuation.resume(throwing: GmailOAuthError.authSessionFailed("No callback URL received"))
                }
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            session.start()
        }

        // Extract authorization code from callback
        guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            throw GmailOAuthError.noAuthorizationCode
        }

        // Exchange code for tokens
        try await exchangeCodeForTokens(code: code)

        // Fetch and store the user's email
        let email = try await fetchProfile()
        try KeychainService.save(key: Self.emailKey, value: email)
        connectedEmail = email

        Self.logger.info("Gmail connected for \(email, privacy: .public)")
    }

    // MARK: - Disconnect

    /// Removes all stored tokens and email from Keychain.
    func disconnect() {
        KeychainService.delete(key: Self.accessTokenKey)
        KeychainService.delete(key: Self.refreshTokenKey)
        KeychainService.delete(key: Self.tokenExpiryKey)
        KeychainService.delete(key: Self.emailKey)
        connectedEmail = nil
        lastError = nil
        Self.logger.info("Gmail disconnected")
    }

    // MARK: - Get Access Token (auto-refresh)

    /// Returns a valid access token, refreshing automatically if expired.
    /// Call this before every Gmail API request.
    func getAccessToken() async throws -> String {
        guard let refreshToken = KeychainService.read(key: Self.refreshTokenKey) else {
            throw GmailOAuthError.notConnected
        }

        // Check if current access token is still valid
        if let accessToken = KeychainService.read(key: Self.accessTokenKey),
           let expiryString = KeychainService.read(key: Self.tokenExpiryKey),
           let expiryInterval = TimeInterval(expiryString) {
            let expiryDate = Date(timeIntervalSince1970: expiryInterval)
            // Refresh 60s before actual expiry to avoid edge-case failures
            if Date.now.addingTimeInterval(60) < expiryDate {
                return accessToken
            }
        }

        // Token expired or missing — refresh it
        return try await refreshAccessToken(refreshToken: refreshToken)
    }

    // MARK: - Client Credentials

    /// Reads the Google OAuth Client ID from Keychain (set via Settings).
    func getClientId() -> String? {
        KeychainService.read(key: Self.clientIdKey)
    }

    /// Reads the Google OAuth Client Secret from Keychain (set via Settings).
    func getClientSecret() -> String? {
        KeychainService.read(key: Self.clientSecretKey)
    }

    /// Saves OAuth client credentials to Keychain.
    func saveClientCredentials(clientId: String, clientSecret: String) throws {
        try KeychainService.save(key: Self.clientIdKey, value: clientId)
        try KeychainService.save(key: Self.clientSecretKey, value: clientSecret)
        Self.logger.info("Gmail OAuth client credentials saved")
    }

    // MARK: - Private: Token Exchange

    /// Exchanges an authorization code for access + refresh tokens.
    /// iOS OAuth clients don't require client_secret.
    private func exchangeCodeForTokens(code: String) async throws {
        let url = URL(string: Self.tokenEndpoint)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "code": code,
            "client_id": Self.iosClientId,
            "redirect_uri": "\(Self.callbackScheme):/oauth/callback",
            "grant_type": "authorization_code",
        ]
        request.httpBody = body
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }
            .joined(separator: "&")
            .data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            let responseBody = String(data: data, encoding: .utf8) ?? "(no body)"
            Self.logger.error("Token exchange failed: HTTP \(statusCode, privacy: .public) — \(responseBody, privacy: .public)")
            throw GmailOAuthError.tokenExchangeFailed(statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accessToken = json["access_token"] as? String,
              let expiresIn = json["expires_in"] as? Int else {
            throw GmailOAuthError.invalidTokenResponse
        }

        // Store tokens
        try KeychainService.save(key: Self.accessTokenKey, value: accessToken)

        let expiryDate = Date.now.addingTimeInterval(TimeInterval(expiresIn))
        try KeychainService.save(key: Self.tokenExpiryKey, value: String(expiryDate.timeIntervalSince1970))

        // Refresh token is only returned on initial consent (access_type=offline, prompt=consent)
        if let refreshToken = json["refresh_token"] as? String {
            try KeychainService.save(key: Self.refreshTokenKey, value: refreshToken)
        }
    }

    // MARK: - Private: Token Refresh

    /// Refreshes the access token using the stored refresh token.
    /// iOS OAuth clients don't require client_secret.
    private func refreshAccessToken(refreshToken: String) async throws -> String {
        let url = URL(string: Self.tokenEndpoint)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "refresh_token": refreshToken,
            "client_id": Self.iosClientId,
            "grant_type": "refresh_token",
        ]
        request.httpBody = body
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }
            .joined(separator: "&")
            .data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            Self.logger.error("Token refresh failed: HTTP \(statusCode, privacy: .public)")
            // If refresh fails with 400/401, the refresh token is invalid — disconnect
            if statusCode == 400 || statusCode == 401 {
                disconnect()
                throw GmailOAuthError.notConnected
            }
            throw GmailOAuthError.tokenRefreshFailed(statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accessToken = json["access_token"] as? String,
              let expiresIn = json["expires_in"] as? Int else {
            throw GmailOAuthError.invalidTokenResponse
        }

        try KeychainService.save(key: Self.accessTokenKey, value: accessToken)

        let expiryDate = Date.now.addingTimeInterval(TimeInterval(expiresIn))
        try KeychainService.save(key: Self.tokenExpiryKey, value: String(expiryDate.timeIntervalSince1970))

        Self.logger.debug("Gmail access token refreshed, expires in \(expiresIn)s")
        return accessToken
    }

    // MARK: - Private: Profile Fetch

    /// Fetches the authenticated user's Gmail address.
    private func fetchProfile() async throws -> String {
        let accessToken = try await getAccessToken()
        let url = URL(string: Self.profileEndpoint)!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw GmailOAuthError.profileFetchFailed(statusCode)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let email = json["emailAddress"] as? String else {
            throw GmailOAuthError.invalidProfileResponse
        }

        return email
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension GmailOAuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the key window for macOS presentation
        #if os(macOS)
        return NSApplication.shared.keyWindow ?? ASPresentationAnchor()
        #else
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow }) ?? ASPresentationAnchor()
        #endif
    }
}

// MARK: - Errors

enum GmailOAuthError: LocalizedError {
    case missingCredentials(String)
    case invalidURL
    case authSessionFailed(String)
    case noAuthorizationCode
    case tokenExchangeFailed(Int)
    case tokenRefreshFailed(Int)
    case invalidTokenResponse
    case notConnected
    case profileFetchFailed(Int)
    case invalidProfileResponse

    var errorDescription: String? {
        switch self {
        case .missingCredentials(let detail):
            return "Gmail credentials missing: \(detail)"
        case .invalidURL:
            return "Failed to construct OAuth URL"
        case .authSessionFailed(let detail):
            return "Gmail authentication failed: \(detail)"
        case .noAuthorizationCode:
            return "No authorization code in callback"
        case .tokenExchangeFailed(let code):
            return "Token exchange failed (HTTP \(code))"
        case .tokenRefreshFailed(let code):
            return "Token refresh failed (HTTP \(code))"
        case .invalidTokenResponse:
            return "Invalid token response from Google"
        case .notConnected:
            return "Gmail not connected — please sign in"
        case .profileFetchFailed(let code):
            return "Failed to fetch Gmail profile (HTTP \(code))"
        case .invalidProfileResponse:
            return "Invalid profile response from Gmail"
        }
    }
}
