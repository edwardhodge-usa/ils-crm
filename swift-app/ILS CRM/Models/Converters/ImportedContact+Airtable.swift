import Foundation
import SwiftData

// Airtable field IDs from schema/ImportedContacts.json — 48 fields
private enum F {
    // Text
    static let importedContactName = "fldKc8P6eYXjMpAJ6"
    static let company = "fld31Zl7X7DBZdL9K"
    static let firstName = "fld7c1acCh17aOi0p"
    static let lastName = "fldICvkgNbRG9dpqm"
    static let jobTitle = "fldTHA6J24XaECMsz"
    static let email = "fld9ejqJy5wjBqvrx"
    static let eventTags = "fldwI75ClzRJ7lli0"
    static let addressLine = "fld1Zpkm1Kms9XvRv"
    static let city = "fldfS2EeVb5l3ic5h"
    static let state = "fldIoe4TldH0WJUZj"
    static let country = "fldljgJjsqMkpMbkc"
    static let companyFoundingYear = "fldCgacbjwFoRlHIp"
    static let companyNaicsCode = "fldehmtkMRlb4M5Zi"
    static let companyType = "fldiB3195PfAK7Wfg"
    static let companySize = "fldsJURWi2VvrvN2v"
    static let companyIndustry = "fldiFajpEd7M14YBF"
    static let companyAnnualRevenue = "fldLJr6gTu9zTeo0r"
    static let companyStreetAddress = "fldwAf4k6bsI922O4"
    static let companyStreetAddress2 = "fldXhL0dxuxXxDnti"
    static let companyCity = "fld4tMsuM8QhnhuZm"
    static let companyState = "fldv9qnkGC3pnZQnv"
    static let companyCountry = "fld4YLilZ2HdhmCse"
    static let companyPostalCode = "fldamMPu4kkZGugZn"
    static let postalCode = "fldIsJaEWbMOb2juI"
    // Multiline
    static let companyDescription = "fldc5Aj4hRRZ4tIgE"
    static let note = "fldMsJukGZt02TYVu"
    static let reasonForRejection = "fld1A8rCPjuXYSGp1"
    static let reviewNotes = "fldKYaclj13Bmut7D"
    // Phone
    static let phone = "fldZfFoFsOrIW2wQZ"
    static let mobilePhone = "fldm8LaalVz7l38PS"
    static let otherPhone = "fld9wvepdWiVG4i70"
    static let workPhone = "fld8MuOecNSVON5rD"
    static let officePhone = "fldUkm871jdjXQloI"
    static let fax = "fldBl4gTpGGFVEJOB"
    // URL
    static let linkedInUrl = "fldzikDES0UdCd4FQ"
    static let website = "fld57XgOQ9sFJOfof"
    static let contactPhotoUrl = "fldNdNyWMAGEOfOyH"
    static let businessCardImageUrl = "flduCN8BdOUkZeTTJ"
    // Date
    static let importDate = "fldNa8uThfClQFB79"
    // Selects
    static let categorization = "fldrYKTLd2HnL7GSe"
    static let onboardingStatus = "fldncdRP37p6BB9UX"
    static let importSource = "fld1fDiNE3vhoyi3P"
    // Multi-select
    static let tags = "fldn2bUb5Khf7iumL"
    // Checkbox
    static let syncToContacts = "fldjm5mEIT25nlWjT"
    // Linked Records
    static let specialties = "fldlkF1wlCbxBQ3KJ"
    static let relatedCrmContact = "fldDq3cetx5nrVqGo"
    // Collaborator (read-only)
    static let importedBy = "fldWK7U0Qj1dk8Ume"
    static let assignedAdmin = "flds9MpvnwGkYX9Gi"
}

extension ImportedContact: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.importedContacts

    static func from(record: AirtableRecord, context: ModelContext) -> ImportedContact {
        let f = record.fields
        let model = ImportedContact(id: record.id)
        model.importedContactName = f.string(for: F.importedContactName)
        model.company = f.string(for: F.company)
        model.firstName = f.string(for: F.firstName)
        model.lastName = f.string(for: F.lastName)
        model.jobTitle = f.string(for: F.jobTitle)
        model.email = f.string(for: F.email)
        model.eventTags = f.string(for: F.eventTags)
        model.addressLine = f.string(for: F.addressLine)
        model.city = f.string(for: F.city)
        model.state = f.string(for: F.state)
        model.country = f.string(for: F.country)
        model.companyFoundingYear = f.string(for: F.companyFoundingYear)
        model.companyNaicsCode = f.string(for: F.companyNaicsCode)
        model.companyType = f.string(for: F.companyType)
        model.companySize = f.string(for: F.companySize)
        model.companyIndustry = f.string(for: F.companyIndustry)
        model.companyAnnualRevenue = f.string(for: F.companyAnnualRevenue)
        model.companyStreetAddress = f.string(for: F.companyStreetAddress)
        model.companyStreetAddress2 = f.string(for: F.companyStreetAddress2)
        model.companyCity = f.string(for: F.companyCity)
        model.companyState = f.string(for: F.companyState)
        model.companyCountry = f.string(for: F.companyCountry)
        model.companyPostalCode = f.string(for: F.companyPostalCode)
        model.postalCode = f.string(for: F.postalCode)
        model.companyDescription = f.string(for: F.companyDescription)
        model.note = f.string(for: F.note)
        model.reasonForRejection = f.string(for: F.reasonForRejection)
        model.reviewNotes = f.string(for: F.reviewNotes)
        model.phone = f.string(for: F.phone)
        model.mobilePhone = f.string(for: F.mobilePhone)
        model.otherPhone = f.string(for: F.otherPhone)
        model.workPhone = f.string(for: F.workPhone)
        model.officePhone = f.string(for: F.officePhone)
        model.fax = f.string(for: F.fax)
        model.linkedInUrl = f.string(for: F.linkedInUrl)
        model.website = f.string(for: F.website)
        model.contactPhotoUrl = f.string(for: F.contactPhotoUrl)
        model.businessCardImageUrl = f.string(for: F.businessCardImageUrl)
        model.importDate = f.date(for: F.importDate)
        model.categorization = f.string(for: F.categorization)
        model.onboardingStatus = f.string(for: F.onboardingStatus)
        model.importSource = f.string(for: F.importSource)
        model.tags = f.stringArray(for: F.tags)
        model.syncToContacts = f.bool(for: F.syncToContacts)
        model.specialtiesIds = f.stringArray(for: F.specialties)
        model.relatedCrmContactIds = f.stringArray(for: F.relatedCrmContact)
        return model
    }

    /// ImportedContacts uses approve/reject workflow, not general CRUD push.
    /// Only onboardingStatus and reasonForRejection are pushed.
    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.onboardingStatus, onboardingStatus)
        b.set(F.reasonForRejection, reasonForRejection)
        return b.fields
    }
}
