import Foundation
import Security

/// Keychain service for secure credential storage.
///
/// DECISION 2: The Swift app shares the same Airtable PAT as the Electron app.
/// - Electron stores the PAT in SQLite settings table (key: 'airtable_api_key')
/// - Swift stores the PAT in macOS/iOS Keychain (service: "ils-crm-airtable")
///
/// MIGRATION NOTE: On first launch, if Keychain is empty, prompt the user to
/// re-enter their existing PAT. The Electron app's SQLite database is not
/// directly readable from the Swift app (different process, different sandbox).
enum KeychainService {
    /// Keychain service identifier — shared across the ILS CRM app family
    static let serviceName = "ils-crm-airtable"

    /// Account key for the Airtable Personal Access Token
    static let apiKeyAccount = "airtable-pat"

    // MARK: - Save

    static func save(key: String, value: String, account: String = apiKeyAccount) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }

        // Delete any existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked,
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status: status)
        }
    }

    // MARK: - Read

    static func read(account: String = apiKeyAccount) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    // MARK: - Delete

    static func delete(account: String = apiKeyAccount) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Check if key exists

    static var hasApiKey: Bool {
        read() != nil
    }
}

enum KeychainError: LocalizedError {
    case encodingFailed
    case saveFailed(status: OSStatus)

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode value for Keychain"
        case .saveFailed(let status):
            return "Keychain save failed with status: \(status)"
        }
    }
}
