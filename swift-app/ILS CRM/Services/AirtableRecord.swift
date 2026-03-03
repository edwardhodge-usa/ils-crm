import Foundation

/// Raw Airtable API record — wraps the JSON response shape.
///
/// Airtable API returns:
/// ```json
/// { "id": "recXXX", "createdTime": "...", "fields": { "fldXXX": value, ... } }
/// ```
///
/// When using `returnFieldsByFieldId=true`, field keys are IDs (e.g. "fldMkz6x5i8YaofZj").
/// This is more stable than field names which can change.
struct AirtableRecord {
    let id: String
    let fields: [String: Any]
    let createdTime: String?

    /// Parse from raw JSONSerialization dictionary
    static func from(dict: [String: Any]) -> AirtableRecord? {
        guard let id = dict["id"] as? String else { return nil }
        let fields = dict["fields"] as? [String: Any] ?? [:]
        let createdTime = dict["createdTime"] as? String
        return AirtableRecord(id: id, fields: fields, createdTime: createdTime)
    }

    /// Parse an array of records from an API response
    static func fromArray(dicts: [[String: Any]]) -> [AirtableRecord] {
        dicts.compactMap { from(dict: $0) }
    }
}

// MARK: - Safe Field Extraction

/// Extension on the fields dictionary for type-safe value extraction.
/// Handles the heterogeneous types Airtable returns without crashing.
///
/// Key patterns from Electron's converters.ts:
/// - Select options include emoji prefixes ("🔴 High") — store the full string
/// - Linked records come as [String] arrays of record IDs
/// - Checkboxes come as Bool (nil = false)
/// - Currency/number fields come as Double
/// - Dates come as ISO 8601 strings
extension Dictionary where Key == String, Value == Any {

    func string(for key: String) -> String? {
        self[key] as? String
    }

    func int(for key: String) -> Int? {
        if let i = self[key] as? Int { return i }
        if let d = self[key] as? Double { return Int(d) }
        return nil
    }

    func double(for key: String) -> Double? {
        if let d = self[key] as? Double { return d }
        if let i = self[key] as? Int { return Double(i) }
        return nil
    }

    func bool(for key: String) -> Bool {
        (self[key] as? Bool) ?? false
    }

    /// Parse ISO 8601 date string from Airtable.
    /// Handles both date-only ("2026-03-01") and full datetime ("2026-03-01T12:00:00.000Z").
    func date(for key: String) -> Date? {
        guard let str = self[key] as? String else { return nil }
        return AirtableDateFormatter.parse(str)
    }

    /// Safely extract linked record IDs as [String].
    /// Airtable returns linked records as arrays of record ID strings.
    /// If parsing fails, returns empty array (never crashes).
    /// Mirrors: safeParseArray() from Electron's sync-engine.ts
    func stringArray(for key: String) -> [String] {
        if let arr = self[key] as? [String] { return arr }
        // Airtable sometimes wraps single values
        if let single = self[key] as? String { return [single] }
        return []
    }
}

// MARK: - Push Payload Builder

/// Helper for building Airtable update/create payloads.
/// Only includes non-nil values. Excludes read-only fields.
struct AirtableFieldsBuilder {
    var fields: [String: Any] = [:]

    mutating func set(_ key: String, _ value: String?) {
        if let v = value { fields[key] = v }
    }

    mutating func set(_ key: String, _ value: Int?) {
        if let v = value { fields[key] = v }
    }

    mutating func set(_ key: String, _ value: Double?) {
        if let v = value { fields[key] = v }
    }

    mutating func setBool(_ key: String, _ value: Bool) {
        fields[key] = value
    }

    mutating func setDate(_ key: String, _ value: Date?) {
        if let v = value { fields[key] = AirtableDateFormatter.format(v) }
    }

    /// Set linked record IDs — only include if non-empty
    mutating func setLinkedIds(_ key: String, _ value: [String]) {
        if !value.isEmpty { fields[key] = value }
    }

    /// Set multi-select — store as array of strings (including emoji prefixes)
    mutating func setMultiSelect(_ key: String, _ value: [String]) {
        if !value.isEmpty { fields[key] = value }
    }
}

// MARK: - Date Formatting

enum AirtableDateFormatter {
    private static let isoFull: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoBasic: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static let dateOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    static func parse(_ string: String) -> Date? {
        isoFull.date(from: string)
            ?? isoBasic.date(from: string)
            ?? dateOnly.date(from: string)
    }

    static func format(_ date: Date) -> String {
        isoFull.string(from: date)
    }
}
