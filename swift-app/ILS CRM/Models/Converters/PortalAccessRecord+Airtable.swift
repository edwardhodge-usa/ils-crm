import Foundation
import SwiftData

// Airtable field IDs from schema/PortalAccess.json — 37 fields
private enum F {
    // Direct (writable)
    static let name = "fldqnVE5ppj8ACyf3"
    static let email = "fldU70JpJQ1GpbRNQ"
    static let pageAddress = "fldkAjPIMUMlHNT2A"
    static let decisionMaker = "fldn0nMxnqpHkLykk"
    static let address = "fldvaQB8wzgaLLn2Y"
    static let primaryContact = "fldqESjieqvuj1k4P"
    static let positionTitle = "fld2UX68BMEk768Ao"
    static let industry = "fld8JNk7r3mQvco7V"
    static let notes = "fldiOyYVt4QN8Yon4"
    static let phoneNumber = "fldHVA9pJd2j2bJNi"
    static let website = "fldJhqz0wngVDNxwt"
    static let projectBudget = "fldQisibz3rZaC4mi"
    static let dateAdded = "fld8m3xt2QOi2EF3b"
    static let expectedProjectStartDate = "flduKP6vlsDlxZuGW"
    static let followUpDate = "fldvhmfQXneMvWXD1"
    static let status = "fldqbzNiTFt7jpdyW"
    static let leadSource = "fldnIkdS9MSewsUqy"
    static let stage = "fldYrwOrTeimfHC5c"
    static let servicesInterestedIn = "fldcBIAHs2jpNkQbD"
    static let contact = "fld1tMK48dxrLU9R4"
    // Formula (read-only)
    static let framerPageUrl = "fldzVcWNLBnNQjwQ6"
    // Lookups (all read-only)
    static let contactNameLookup = "fldwGCWvBs8GCz5ka"
    static let contactCompanyLookup = "fldbeA6Zdgcf6k4Si"
    static let contactEmailLookup = "fldtZJw7XdUeVGNcA"
    static let contactPhoneLookup = "fldH8ZDUC4l0vKXpV"
    static let contactJobTitleLookup = "fldQbVqtuSO4KXgg9"
    static let contactIndustryLookup = "fldqTLSogKYG6wIwI"
    static let contactTagsLookup = "fldM8HUiHkQy7tOFx"
    static let contactWebsiteLookup = "fldX1QmphBEEZX7hr"
    static let contactAddressLineLookup = "fld55H7Qh189M9nTc"
    static let contactCityLookup = "fldocH6IhXiWnS1O9"
    static let contactStateLookup = "fld95YpyLfDuEtgHQ"
    static let contactCountryLookup = "fldb9Nsoynf3zrZGr"
    // Collaborator
    static let assignee = "fldQ0KnWXkFlInBu1"
}

extension PortalAccessRecord: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.portalAccess

    static func from(record: AirtableRecord, context: ModelContext) -> PortalAccessRecord {
        let f = record.fields
        let model = PortalAccessRecord(id: record.id)
        // Direct fields
        model.name = f.string(for: F.name)
        model.email = f.string(for: F.email)
        model.pageAddress = f.string(for: F.pageAddress)
        model.decisionMaker = f.string(for: F.decisionMaker)
        model.address = f.string(for: F.address)
        model.primaryContact = f.string(for: F.primaryContact)
        model.positionTitle = f.string(for: F.positionTitle)
        model.industry = f.string(for: F.industry)
        model.notes = f.string(for: F.notes)
        model.phoneNumber = f.string(for: F.phoneNumber)
        model.website = f.string(for: F.website)
        model.projectBudget = f.double(for: F.projectBudget)
        model.dateAdded = f.date(for: F.dateAdded)
        model.expectedProjectStartDate = f.date(for: F.expectedProjectStartDate)
        model.followUpDate = f.date(for: F.followUpDate)
        model.status = f.string(for: F.status)
        model.leadSource = f.string(for: F.leadSource)
        model.stage = f.string(for: F.stage)
        model.servicesInterestedIn = f.stringArray(for: F.servicesInterestedIn)
        model.contactIds = f.stringArray(for: F.contact)
        // Formula (read-only — decoded but never pushed)
        model.framerPageUrl = f.string(for: F.framerPageUrl)
        // Lookups (all read-only — decoded for display)
        model.contactNameLookup = f.string(for: F.contactNameLookup)
        model.contactCompanyLookup = f.string(for: F.contactCompanyLookup)
        model.contactEmailLookup = f.string(for: F.contactEmailLookup)
        model.contactPhoneLookup = f.string(for: F.contactPhoneLookup)
        model.contactJobTitleLookup = f.string(for: F.contactJobTitleLookup)
        model.contactIndustryLookup = f.string(for: F.contactIndustryLookup)
        model.contactTagsLookup = f.string(for: F.contactTagsLookup)
        model.contactWebsiteLookup = f.string(for: F.contactWebsiteLookup)
        model.contactAddressLineLookup = f.string(for: F.contactAddressLineLookup)
        model.contactCityLookup = f.string(for: F.contactCityLookup)
        model.contactStateLookup = f.string(for: F.contactStateLookup)
        model.contactCountryLookup = f.string(for: F.contactCountryLookup)
        return model
    }

    static func updateFields(of existing: PortalAccessRecord, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        // Direct fields
        existing.name = f.string(for: F.name)
        existing.email = f.string(for: F.email)
        existing.pageAddress = f.string(for: F.pageAddress)
        existing.decisionMaker = f.string(for: F.decisionMaker)
        existing.address = f.string(for: F.address)
        existing.primaryContact = f.string(for: F.primaryContact)
        existing.positionTitle = f.string(for: F.positionTitle)
        existing.industry = f.string(for: F.industry)
        existing.notes = f.string(for: F.notes)
        existing.phoneNumber = f.string(for: F.phoneNumber)
        existing.website = f.string(for: F.website)
        existing.projectBudget = f.double(for: F.projectBudget)
        existing.dateAdded = f.date(for: F.dateAdded)
        existing.expectedProjectStartDate = f.date(for: F.expectedProjectStartDate)
        existing.followUpDate = f.date(for: F.followUpDate)
        existing.status = f.string(for: F.status)
        existing.leadSource = f.string(for: F.leadSource)
        existing.stage = f.string(for: F.stage)
        existing.servicesInterestedIn = f.stringArray(for: F.servicesInterestedIn)
        existing.contactIds = f.stringArray(for: F.contact)
        // Formula (read-only — decoded but never pushed)
        existing.framerPageUrl = f.string(for: F.framerPageUrl)
        // Lookups (all read-only — decoded for display)
        existing.contactNameLookup = f.string(for: F.contactNameLookup)
        existing.contactCompanyLookup = f.string(for: F.contactCompanyLookup)
        existing.contactEmailLookup = f.string(for: F.contactEmailLookup)
        existing.contactPhoneLookup = f.string(for: F.contactPhoneLookup)
        existing.contactJobTitleLookup = f.string(for: F.contactJobTitleLookup)
        existing.contactIndustryLookup = f.string(for: F.contactIndustryLookup)
        existing.contactTagsLookup = f.string(for: F.contactTagsLookup)
        existing.contactWebsiteLookup = f.string(for: F.contactWebsiteLookup)
        existing.contactAddressLineLookup = f.string(for: F.contactAddressLineLookup)
        existing.contactCityLookup = f.string(for: F.contactCityLookup)
        existing.contactStateLookup = f.string(for: F.contactStateLookup)
        existing.contactCountryLookup = f.string(for: F.contactCountryLookup)
        existing.isPendingPush = false
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.name, name)
        b.set(F.email, email)
        b.set(F.pageAddress, pageAddress)
        b.set(F.decisionMaker, decisionMaker)
        b.set(F.address, address)
        b.set(F.primaryContact, primaryContact)
        b.set(F.positionTitle, positionTitle)
        b.set(F.industry, industry)
        b.set(F.notes, notes)
        b.set(F.phoneNumber, phoneNumber)
        b.set(F.website, website)
        b.set(F.projectBudget, projectBudget)
        b.setDate(F.dateAdded, dateAdded)
        b.setDate(F.expectedProjectStartDate, expectedProjectStartDate)
        b.setDate(F.followUpDate, followUpDate)
        b.set(F.status, status)
        b.set(F.leadSource, leadSource)
        b.set(F.stage, stage)
        b.setMultiSelect(F.servicesInterestedIn, servicesInterestedIn)
        b.setLinkedIds(F.contact, contactIds)
        // EXCLUDED: framerPageUrl (formula), all 12 lookup fields, assignee (collaborator), attachments
        return b.fields
    }
}
