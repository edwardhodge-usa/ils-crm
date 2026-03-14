import Foundation
import SwiftData

/// ClientPage model — mirrors schema/ClientPages.json (12 Airtable fields)
/// Airtable table: tblo5TQos1VUGfuaQ
///
/// Stores client portal page configuration: content fields + video section toggles.
@Model
final class ClientPage {
    @Attribute(.unique) var id: String

    // Content fields
    var pageAddress: String?       // fldEEarorxnI0ixpI — URL slug
    var clientName: String?        // fldqvhzAh1w7gwSEb
    var pageTitle: String?         // fldkeQe0ThceEA6OG
    var pageSubtitle: String?      // fldhJNUqqtBQsyYgI
    var deckUrl: String?           // fldYedTCbI633i0fe
    var preparedFor: String?       // fldmWFQ498rXhcb1X
    var thankYou: String?          // fld7YcLBFE9f8zDmT

    // Section toggles (checkboxes)
    var head: Bool                 // fldkHW1Ki7IuK2UaK — Header section
    var vPrMagic: Bool             // fldmvy3Ta6q4okTee — Practical Magic video
    var vHighLight: Bool           // fldtPccbFBs9N4KZ5 — Highlights video
    var v360: Bool                 // fldNE04teEKWxFlZC — 360 Video
    var vFullL: Bool               // fldcOCTCLvx36MV5L — Full Length video

    // Sync metadata
    var airtableModifiedAt: Date?
    var localModifiedAt: Date?
    var isPendingPush: Bool

    init(id: String = UUID().uuidString) {
        self.id = id
        self.head = false
        self.vPrMagic = false
        self.vHighLight = false
        self.v360 = false
        self.vFullL = false
        self.isPendingPush = false
    }
}
