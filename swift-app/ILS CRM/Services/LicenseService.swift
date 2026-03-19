import Foundation
import os

/// License check service — validates app license against Airtable licensing base.
/// Port of electron/airtable/license-check.ts.
///
/// Uses a SEPARATE PAT + base from the main CRM sync. Same base as Electron:
/// Base: appMIBpSZpJ0vsiz1, Table: tblQhmjhL5WA8rP7S
actor LicenseService {
    static let shared = LicenseService()

    private let logger = Logger(subsystem: "com.ils-crm", category: "license")

    // Airtable licensing base config (same as Electron's license-config.ts)
    private let baseId = "appMIBpSZpJ0vsiz1"
    private let tableId = "tblQhmjhL5WA8rP7S"
    private let appName = "ILS CRM"

    // Field IDs from the licensing table
    private enum Fields {
        static let email = "fldUiOOTwFe9Y1IVa"
        static let name = "fldo5QoZgFoIDqPsH"
        static let status = "fld36VOJrlqKpeZpa"
        static let app = "fldOMjOAenJJ2Crls"
        static let airtableUserId = "fld6Gz62PhGy2hkpY"
        static let appVersion = "fldvS9VgXiyIHGcrU"
        static let lastCheckIn = "fldV7BeDhOwfme1eD"
        static let deviceInfo = "fldo0O2Je92GdVCzf"
    }

    // MARK: - Keychain Keys

    private let licensePATKey = "license-pat"

    // MARK: - License Status

    enum Status: Equatable {
        case active
        case revoked
        case suspended
        case notFound
        case error(String)

        var isValid: Bool { self == .active }
    }

    // MARK: - Check License

    func checkLicense(email: String) async -> Status {
        guard let pat = KeychainService.read(key: licensePATKey) else {
            logger.error("License PAT not found in Keychain")
            return .error("License PAT not configured")
        }

        // Validate email format before using in formula
        let emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
        guard email.wholeMatch(of: emailRegex) != nil else {
            return .error("Invalid email format")
        }

        let sanitizedEmail = email.replacingOccurrences(of: "'", with: "''")
        let formula = "AND({\(Fields.email)} = '\(sanitizedEmail)', {\(Fields.app)} = '\(appName)')"

        guard let encodedFormula = formula.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return .error("Failed to encode formula")
        }

        let urlString = "https://api.airtable.com/v0/\(baseId)/\(tableId)?filterByFormula=\(encodedFormula)&returnFieldsByFieldId=true"
        guard let url = URL(string: urlString) else {
            return .error("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                return .error("Not an HTTP response")
            }

            guard httpResponse.statusCode == 200 else {
                return .error("HTTP \(httpResponse.statusCode)")
            }

            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let records = json["records"] as? [[String: Any]],
                  let first = records.first,
                  let fields = first["fields"] as? [String: Any] else {
                return .notFound
            }

            let statusValue = fields[Fields.status] as? String ?? ""

            guard statusValue == "Active" else {
                let normalized = statusValue.lowercased()
                if normalized == "revoked" { return .revoked }
                if normalized == "suspended" { return .suspended }
                return .notFound
            }

            // Active — fire-and-forget check-in update
            if let recordId = first["id"] as? String {
                fireCheckIn(pat: pat, recordId: recordId)
            }

            return .active

        } catch {
            logger.error("License check failed: \(error.localizedDescription)")
            return .error(error.localizedDescription)
        }
    }

    // MARK: - Check-In (fire and forget)

    private nonisolated func fireCheckIn(pat: String, recordId: String) {
        // Capture actor properties as locals to avoid accessing self in detached task
        let baseId = "appMIBpSZpJ0vsiz1"
        let tableId = "tblQhmjhL5WA8rP7S"

        Task.detached {
            let url = URL(string: "https://api.airtable.com/v0/\(baseId)/\(tableId)/\(recordId)")!
            var request = URLRequest(url: url)
            request.httpMethod = "PATCH"
            request.setValue("Bearer \(pat)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
            let device = "\(ProcessInfo.processInfo.operatingSystemVersionString)"

            let body: [String: Any] = [
                "fields": [
                    "fldV7BeDhOwfme1eD": ISO8601DateFormatter().string(from: Date()),
                    "fldvS9VgXiyIHGcrU": version,
                    "fldo0O2Je92GdVCzf": "macOS \(device)",
                ]
            ]

            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
            _ = try? await URLSession.shared.data(for: request)
        }
    }

    // MARK: - Grace Period

    private let gracePeriodKey = "license_last_verified"
    private let graceDuration: TimeInterval = 24 * 60 * 60 // 24 hours

    func saveLastVerified() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: gracePeriodKey)
    }

    func isWithinGracePeriod() -> Bool {
        let lastVerified = UserDefaults.standard.double(forKey: gracePeriodKey)
        guard lastVerified > 0 else { return false }
        return Date().timeIntervalSince1970 - lastVerified < graceDuration
    }

    // MARK: - Revocation

    /// Deletes all SwiftData store files. Call before showing RevokedView.
    nonisolated func deleteLocalStore() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let storeDir = appSupport

        let extensions = [".store", ".store-shm", ".store-wal"]
        let fm = FileManager.default

        do {
            let contents = try fm.contentsOfDirectory(at: storeDir, includingPropertiesForKeys: nil)
            for file in contents {
                let name = file.lastPathComponent
                if extensions.contains(where: { name.hasSuffix($0) }) && name.contains("ILS_CRM") {
                    try fm.removeItem(at: file)
                }
            }
        } catch {
            // Directory might not exist on first launch — that's fine
        }
    }

    // MARK: - PAT Management

    func savePAT(_ pat: String) throws {
        try KeychainService.save(key: licensePATKey, value: pat)
    }

    func hasPAT() -> Bool {
        KeychainService.read(key: licensePATKey) != nil
    }
}
