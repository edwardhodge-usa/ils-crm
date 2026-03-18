import Foundation
import SwiftData

// MARK: - AirtableRecord

/// Represents a raw Airtable API record response.
/// Used by AirtableConvertible.from(record:context:) to build SwiftData models.
struct AirtableRecord {
    let id: String
    let fields: AirtableFields

    /// Initializes from a raw JSON dictionary (Airtable API response format).
    init(id: String, fields: [String: Any]) {
        self.id = id
        self.fields = AirtableFields(raw: fields)
    }

    /// Initializes from a full Airtable record dictionary containing "id" and "fields" keys.
    init?(json: [String: Any]) {
        guard let id = json["id"] as? String,
              let fields = json["fields"] as? [String: Any] else {
            return nil
        }
        self.id = id
        self.fields = AirtableFields(raw: fields)
    }
}

// MARK: - AirtableFields

/// Type-safe accessor for Airtable field values by field ID.
///
/// Handles all Airtable field types: text, number, date (ISO 8601), boolean,
/// single select, multi-select, linked records, formula, lookup, rollup.
///
/// Lesson from Electron: JSON.parse failures on linked record arrays must not
/// crash the whole sync. All accessors return nil/empty on type mismatch.
struct AirtableFields {
    let raw: [String: Any]

    /// String fields: singleLineText, multilineText, email, url, phone, singleSelect, formula, richText.
    func string(for fieldId: String) -> String? {
        // Airtable lookup fields may return an array of strings — take the first.
        if let array = raw[fieldId] as? [String] {
            return array.first
        }
        return raw[fieldId] as? String
    }

    /// Integer fields: number (whole), autoNumber, count, rating.
    func int(for fieldId: String) -> Int? {
        if let value = raw[fieldId] as? Int {
            return value
        }
        if let value = raw[fieldId] as? Double {
            return Int(value)
        }
        return nil
    }

    /// Double fields: number, currency, percent, formula (numeric result).
    func double(for fieldId: String) -> Double? {
        if let value = raw[fieldId] as? Double {
            return value
        }
        if let value = raw[fieldId] as? Int {
            return Double(value)
        }
        return nil
    }

    /// Date fields: date, dateTime, createdTime, lastModifiedTime.
    /// Airtable sends ISO 8601 strings: "2026-02-28T00:00:00.000Z" (datetime)
    /// or bare date strings: "2026-02-28" (date-only fields).
    func date(for fieldId: String) -> Date? {
        guard let string = raw[fieldId] as? String else { return nil }
        return Self.iso8601Formatter.date(from: string)
            ?? Self.iso8601DateOnlyFormatter.date(from: string)
            ?? Self.dateOnlyFallbackFormatter.date(from: string)
    }

    /// Boolean fields: checkbox.
    func bool(for fieldId: String) -> Bool {
        (raw[fieldId] as? Bool) ?? false
    }

    /// Array of strings: multipleSelects, linked record IDs.
    /// Airtable linked record fields return arrays of record IDs.
    /// Multi-select fields return arrays of option names.
    func stringArray(for fieldId: String) -> [String] {
        if let array = raw[fieldId] as? [String] {
            return array
        }
        // Linked records may come as array of dicts with "id" keys
        if let array = raw[fieldId] as? [[String: Any]] {
            return array.compactMap { $0["id"] as? String }
        }
        return []
    }

    /// Attachment fields: extracts the URL of the first attachment.
    /// Airtable attachments come as `[{url: "...", ...}]`.
    func attachmentUrl(for fieldId: String) -> String? {
        guard let array = raw[fieldId] as? [[String: Any]],
              let first = array.first,
              let url = first["url"] as? String else { return nil }
        return url
    }

    /// Collaborator fields: returns the `.name` string from `{id, email, name}` object.
    /// Collaborator fields are read-only — never included in push payloads.
    func collaboratorName(for fieldId: String) -> String? {
        guard let dict = raw[fieldId] as? [String: Any] else { return nil }
        return dict["name"] as? String
    }

    // MARK: - Date Formatters (static, reused)

    private static let iso8601Formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let iso8601DateOnlyFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate, .withDashSeparatorInDate]
        return f
    }()

    /// DateFormatter fallback for bare "yyyy-MM-dd" strings, in case ISO8601DateFormatter
    /// with .withFullDate does not match Airtable's exact date-only format.
    private static let dateOnlyFallbackFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}

// MARK: - AirtableConvertible Protocol

/// Protocol for SwiftData models that can be converted to/from Airtable records.
///
/// Each @Model class conforms via an extension in its Converters file
/// (e.g. Contact+Airtable.swift). The protocol provides:
/// - Table identity (airtableTableId)
/// - Airtable → SwiftData (from(record:context:))
/// - SwiftData → Airtable (toAirtableFields())
protocol AirtableConvertible: PersistentModel {
    /// Airtable record ID — every @Model has `@Attribute(.unique) var id: String`.
    var id: String { get }

    /// Whether this record has local changes not yet pushed to Airtable.
    var isPendingPush: Bool { get set }

    /// The Airtable table ID (e.g. "tbl9Q8m06ivkTYyvR").
    static var airtableTableId: String { get }

    /// Creates a SwiftData model from an Airtable record.
    /// The ModelContext is provided for querying related models if needed.
    static func from(record: AirtableRecord, context: ModelContext) -> Self

    /// Converts the model's writable fields to an Airtable-compatible dictionary.
    /// Read-only fields (formula, lookup, rollup, collaborator, autoNumber)
    /// must be excluded. Returns empty dict for read-only tables.
    func toAirtableFields() -> [String: Any]
}

// MARK: - AirtableFieldsBuilder

/// Builds a [String: Any] dictionary for Airtable API create/update payloads.
///
/// Always includes every field — sends NSNull() for cleared values so Airtable
/// removes the old data instead of silently preserving it.
/// Handles all writable field types: text, number, date, boolean, multi-select, linked records.
struct AirtableFieldsBuilder {
    var fields: [String: Any] = [:]

    /// Sets a string field (text, singleSelect, email, url, phone).
    /// Sends NSNull() when nil or empty so cleared fields propagate to Airtable.
    /// Empty strings must be sent as null — Airtable singleSelect rejects "".
    mutating func set(_ fieldId: String, _ value: String?) {
        if let value, !value.isEmpty {
            fields[fieldId] = value
        } else {
            fields[fieldId] = NSNull()
        }
    }

    /// Sets an integer field.
    /// Sends NSNull() when nil so cleared fields propagate to Airtable.
    mutating func set(_ fieldId: String, _ value: Int?) {
        fields[fieldId] = value as Any? ?? NSNull()
    }

    /// Sets a double/currency field.
    /// Sends NSNull() when nil so cleared fields propagate to Airtable.
    mutating func set(_ fieldId: String, _ value: Double?) {
        fields[fieldId] = value as Any? ?? NSNull()
    }

    /// Sets a date field as YYYY-MM-DD string (all CRM date fields are date-only, no time).
    /// Sends NSNull() when nil so cleared fields propagate to Airtable.
    mutating func setDate(_ fieldId: String, _ value: Date?) {
        if let value {
            fields[fieldId] = Self.dateOnlyFormatter.string(from: value)
        } else {
            fields[fieldId] = NSNull()
        }
    }

    /// Sets a boolean/checkbox field. Always includes (false = unchecked).
    mutating func setBool(_ fieldId: String, _ value: Bool) {
        fields[fieldId] = value
    }

    /// Sets a multi-select field (array of option name strings).
    /// Sends NSNull() when empty so cleared selections propagate to Airtable.
    mutating func setMultiSelect(_ fieldId: String, _ value: [String]) {
        fields[fieldId] = value.isEmpty ? NSNull() : value as Any
    }

    /// Sets a linked record field (array of record ID strings).
    /// Sends NSNull() when empty so cleared links propagate to Airtable.
    mutating func setLinkedIds(_ fieldId: String, _ value: [String]) {
        fields[fieldId] = value.isEmpty ? NSNull() : value as Any
    }

    // MARK: - Date Formatters

    private static let dateOnlyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()
}
