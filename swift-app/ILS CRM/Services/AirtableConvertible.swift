import Foundation
import SwiftData

/// Protocol for bidirectional Airtable ↔ SwiftData conversion.
///
/// Every @Model class that syncs with Airtable implements this.
/// Mirrors the pattern from electron/airtable/converters.ts.
///
/// Rules:
/// - `from(record:)` handles ALL fields including read-only (formula/lookup/rollup)
/// - `toAirtableFields()` EXCLUDES read-only fields — they'd cause 422 errors
/// - Select option values are stored WITH emoji prefixes (e.g. "🔴 High")
/// - Linked record arrays default to [] on parse failure (never crash)
protocol AirtableConvertible {
    /// The Airtable table ID for this entity
    static var airtableTableId: String { get }

    /// Create/update a SwiftData model from an Airtable API record.
    /// Called during pull sync.
    static func from(record: AirtableRecord, context: ModelContext) -> Self

    /// Convert this model to an Airtable fields dictionary for push.
    /// MUST exclude read-only fields (formula, lookup, rollup, createdBy, autoNumber).
    func toAirtableFields() -> [String: Any]
}
