import Foundation
import Security

/// Keychain wrapper for storing the Airtable API key securely.
///
/// Uses a shared Keychain access group + iCloud Keychain sync so the API key
/// entered on macOS is automatically available on iPhone (same Team ID).
enum KeychainService {
    static let service = "ils-crm-airtable"
    static let apiKeyAccount = "airtable-pat"
    #if os(macOS)
    static let accessGroup = "8RHA62T6FQ.com.imaginelabstudios.shared"
    #endif

    // MARK: - Base Query

    /// Builds a base Keychain query with platform-appropriate attributes.
    /// macOS: uses shared access group + iCloud sync for cross-device sharing.
    /// iOS: uses app's default keychain group (no shared group or sync).
    private static func baseQuery(for key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        #if os(macOS)
        query[kSecAttrAccessGroup as String] = accessGroup
        query[kSecAttrSynchronizable as String] = kSecAttrSynchronizableAny
        #endif
        return query
    }

    // MARK: - Save

    static func save(key: String = apiKeyAccount, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }

        SecItemDelete(baseQuery(for: key) as CFDictionary)

        var addQuery = baseQuery(for: key)
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlocked
        #if os(macOS)
        addQuery[kSecAttrSynchronizable as String] = true
        #endif

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status: status)
        }
    }

    // MARK: - Read

    static func read(key: String = apiKeyAccount) -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    // MARK: - Delete

    static func delete(key: String = apiKeyAccount) {
        SecItemDelete(baseQuery(for: key) as CFDictionary)
    }

    // MARK: - Migration

    static func migrateToSharedGroupIfNeeded() {
        if read() != nil { return }

        let oldQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: apiKeyAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(oldQuery as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return
        }

        do {
            try save(value: value)
            let deleteOld: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: apiKeyAccount,
            ]
            SecItemDelete(deleteOld as CFDictionary)
            print("[Keychain] Migrated API key to shared access group")
        } catch {
            print("[Keychain] Migration failed: \(error)")
        }
    }
}

enum KeychainError: LocalizedError {
    case encodingFailed
    case saveFailed(status: OSStatus)

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Failed to encode value for Keychain storage"
        case .saveFailed(let status):
            return "Keychain save failed with status \(status)"
        }
    }
}
