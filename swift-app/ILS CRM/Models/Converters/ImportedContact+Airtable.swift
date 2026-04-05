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
    // Email Intelligence
    static let source = "fldvGMPt6P73gAVcX"
    static let relationshipType = "fldzYctwWVqOAOjOa"
    static let confidenceScore = "fldzB1hYo8JFK7KXL"
    static let aiReasoning = "flda0hjnGygmCl6L3"
    static let emailThreadCount = "fldhWoDXNTqOsXZ22"
    static let firstSeenDate = "fldA7MZYLyWEJNGVx"
    static let lastSeenDate = "fldS0wOkNWu8SQnSO"
    static let discoveredVia = "fldCUcYTkPATWE97N"
    static let suggestedCompanyName = "fldSCvoQayABYZqL5"
    static let suggestedCompanyLink = "fldLGvhdrydRxH5EU"
    static let classificationSource = "fldohpW9JHMjYeTS5"
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
        // Email Intelligence
        model.source = f.string(for: F.source)
        model.relationshipType = f.string(for: F.relationshipType)
        model.confidenceScore = f.double(for: F.confidenceScore)
        model.aiReasoning = f.string(for: F.aiReasoning)
        model.emailThreadCount = f.int(for: F.emailThreadCount)
        model.firstSeenDate = f.date(for: F.firstSeenDate)
        model.lastSeenDate = f.date(for: F.lastSeenDate)
        model.discoveredVia = f.string(for: F.discoveredVia)
        model.suggestedCompanyName = f.string(for: F.suggestedCompanyName)
        model.suggestedCompanyLink = f.stringArray(for: F.suggestedCompanyLink)
        model.classificationSource = f.string(for: F.classificationSource)
        return model
    }

    static func updateFields(of existing: ImportedContact, from record: AirtableRecord, context: ModelContext) {
        let f = record.fields
        existing.importedContactName = f.string(for: F.importedContactName)
        existing.company = f.string(for: F.company)
        existing.firstName = f.string(for: F.firstName)
        existing.lastName = f.string(for: F.lastName)
        existing.jobTitle = f.string(for: F.jobTitle)
        existing.email = f.string(for: F.email)
        existing.eventTags = f.string(for: F.eventTags)
        existing.addressLine = f.string(for: F.addressLine)
        existing.city = f.string(for: F.city)
        existing.state = f.string(for: F.state)
        existing.country = f.string(for: F.country)
        existing.companyFoundingYear = f.string(for: F.companyFoundingYear)
        existing.companyNaicsCode = f.string(for: F.companyNaicsCode)
        existing.companyType = f.string(for: F.companyType)
        existing.companySize = f.string(for: F.companySize)
        existing.companyIndustry = f.string(for: F.companyIndustry)
        existing.companyAnnualRevenue = f.string(for: F.companyAnnualRevenue)
        existing.companyStreetAddress = f.string(for: F.companyStreetAddress)
        existing.companyStreetAddress2 = f.string(for: F.companyStreetAddress2)
        existing.companyCity = f.string(for: F.companyCity)
        existing.companyState = f.string(for: F.companyState)
        existing.companyCountry = f.string(for: F.companyCountry)
        existing.companyPostalCode = f.string(for: F.companyPostalCode)
        existing.postalCode = f.string(for: F.postalCode)
        existing.companyDescription = f.string(for: F.companyDescription)
        existing.note = f.string(for: F.note)
        existing.reasonForRejection = f.string(for: F.reasonForRejection)
        existing.reviewNotes = f.string(for: F.reviewNotes)
        existing.phone = f.string(for: F.phone)
        existing.mobilePhone = f.string(for: F.mobilePhone)
        existing.otherPhone = f.string(for: F.otherPhone)
        existing.workPhone = f.string(for: F.workPhone)
        existing.officePhone = f.string(for: F.officePhone)
        existing.fax = f.string(for: F.fax)
        existing.linkedInUrl = f.string(for: F.linkedInUrl)
        existing.website = f.string(for: F.website)
        existing.contactPhotoUrl = f.string(for: F.contactPhotoUrl)
        existing.businessCardImageUrl = f.string(for: F.businessCardImageUrl)
        existing.importDate = f.date(for: F.importDate)
        existing.categorization = f.string(for: F.categorization)
        existing.onboardingStatus = f.string(for: F.onboardingStatus)
        existing.importSource = f.string(for: F.importSource)
        existing.tags = f.stringArray(for: F.tags)
        existing.syncToContacts = f.bool(for: F.syncToContacts)
        existing.specialtiesIds = f.stringArray(for: F.specialties)
        existing.relatedCrmContactIds = f.stringArray(for: F.relatedCrmContact)
        // Email Intelligence
        existing.source = f.string(for: F.source)
        existing.relationshipType = f.string(for: F.relationshipType)
        existing.confidenceScore = f.double(for: F.confidenceScore)
        existing.aiReasoning = f.string(for: F.aiReasoning)
        existing.emailThreadCount = f.int(for: F.emailThreadCount)
        existing.firstSeenDate = f.date(for: F.firstSeenDate)
        existing.lastSeenDate = f.date(for: F.lastSeenDate)
        existing.discoveredVia = f.string(for: F.discoveredVia)
        existing.suggestedCompanyName = f.string(for: F.suggestedCompanyName)
        existing.suggestedCompanyLink = f.stringArray(for: F.suggestedCompanyLink)
        existing.classificationSource = f.string(for: F.classificationSource)
        existing.isPendingPush = false
    }

    /// Push fields to Airtable. Includes approve/reject fields + Email Intelligence
    /// fields for new records created by the email scan engine.
    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.importedContactName, importedContactName)
        b.set(F.firstName, firstName)
        b.set(F.lastName, lastName)
        b.set(F.email, email)
        b.set(F.jobTitle, jobTitle)
        b.set(F.phone, phone)
        b.set(F.onboardingStatus, onboardingStatus)
        b.set(F.importSource, importSource)
        b.set(F.reasonForRejection, reasonForRejection)
        // Email Intelligence
        b.set(F.source, source)
        b.set(F.relationshipType, relationshipType)
        b.set(F.confidenceScore, confidenceScore)
        b.set(F.aiReasoning, aiReasoning)
        b.set(F.emailThreadCount, emailThreadCount.map { Double($0) })
        b.setDate(F.firstSeenDate, firstSeenDate)
        b.setDate(F.lastSeenDate, lastSeenDate)
        b.set(F.discoveredVia, discoveredVia)
        b.set(F.suggestedCompanyName, suggestedCompanyName)
        b.set(F.classificationSource, classificationSource)
        b.setDate(F.importDate, importDate)
        return b.fields
    }
}
