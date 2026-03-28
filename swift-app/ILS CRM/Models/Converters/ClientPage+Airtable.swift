import Foundation
import SwiftData

private enum F {
    static let pageAddress = AirtableConfig.ClientPageFields.pageAddress
    static let clientName = AirtableConfig.ClientPageFields.clientName
    static let pageTitle = AirtableConfig.ClientPageFields.pageTitle
    static let pageSubtitle = AirtableConfig.ClientPageFields.pageSubtitle
    static let deckUrl = AirtableConfig.ClientPageFields.deckUrl
    static let preparedFor = AirtableConfig.ClientPageFields.preparedFor
    static let thankYou = AirtableConfig.ClientPageFields.thankYou
    static let head = AirtableConfig.ClientPageFields.head
    static let vPrMagic = AirtableConfig.ClientPageFields.vPrMagic
    static let vHighLight = AirtableConfig.ClientPageFields.vHighLight
    static let v360 = AirtableConfig.ClientPageFields.v360
    static let vFullL = AirtableConfig.ClientPageFields.vFullL
}

extension ClientPage: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.clientPages

    static func from(record: AirtableRecord, context: ModelContext) -> ClientPage {
        let f = record.fields
        let model = ClientPage(id: record.id)
        model.pageAddress = f.string(for: F.pageAddress)
        model.clientName = f.string(for: F.clientName)
        model.pageTitle = f.string(for: F.pageTitle)
        model.pageSubtitle = f.string(for: F.pageSubtitle)
        model.deckUrl = f.string(for: F.deckUrl)
        model.preparedFor = f.string(for: F.preparedFor)
        model.thankYou = f.string(for: F.thankYou)
        model.head = f.bool(for: F.head)
        model.vPrMagic = f.bool(for: F.vPrMagic)
        model.vHighLight = f.bool(for: F.vHighLight)
        model.v360 = f.bool(for: F.v360)
        model.vFullL = f.bool(for: F.vFullL)
        return model
    }

    static func updateFields(of existing: ClientPage, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.pageAddress = f.string(for: F.pageAddress)
        existing.clientName = f.string(for: F.clientName)
        existing.pageTitle = f.string(for: F.pageTitle)
        existing.pageSubtitle = f.string(for: F.pageSubtitle)
        existing.deckUrl = f.string(for: F.deckUrl)
        existing.preparedFor = f.string(for: F.preparedFor)
        existing.thankYou = f.string(for: F.thankYou)
        existing.head = f.bool(for: F.head)
        existing.vPrMagic = f.bool(for: F.vPrMagic)
        existing.vHighLight = f.bool(for: F.vHighLight)
        existing.v360 = f.bool(for: F.v360)
        existing.vFullL = f.bool(for: F.vFullL)
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.pageAddress, pageAddress)
        b.set(F.clientName, clientName)
        b.set(F.pageTitle, pageTitle)
        b.set(F.pageSubtitle, pageSubtitle)
        b.set(F.deckUrl, deckUrl)
        b.set(F.preparedFor, preparedFor)
        b.set(F.thankYou, thankYou)
        b.setBool(F.head, head)
        b.setBool(F.vPrMagic, vPrMagic)
        b.setBool(F.vHighLight, vHighLight)
        b.setBool(F.v360, v360)
        b.setBool(F.vFullL, vFullL)
        return b.fields
    }
}
