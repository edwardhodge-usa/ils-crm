import Foundation
import SwiftData

// Airtable field IDs from schema/Contacts.json — 57 fields
private enum F {
    // Text
    static let contactName = "fldMkz6x5i8YaofZj"
    static let firstName = "fldBzVPUdMy99vfvp"
    static let lastName = "fldq4VxEf0jJgi6O5"
    static let jobTitle = "fldvecarEW7fx90Ci"
    static let company = "fldTwuGnEhbQfZhP3"
    static let importedContactName = "fldnukky57mRgMpxv"
    static let addressLine = "fldxn8YVJ1pWGkaF8"
    static let city = "fldAoanFJ1Fmrzkx5"
    static let state = "fld1qq6PMLW6Ytbig"
    static let country = "fldnTdpTO4njtc4gZ"
    static let postalCode = "fldGgFJJ7XeLAR17a"
    // Multiline
    static let notes = "fldfbmMsacAKerGek"
    static let reviewNotes = "fldB5b9qTiIUkdiLk"
    static let reasonForRejection = "fldDwXhduziJxKyCx"
    static let rateInfo = "fldFX8WvENPPkN6g1"
    static let leadNote = "fldWtoMSWdFla3dII"
    static let eventTags = "fld1D4u2KbIk0aUPR"
    // Contact
    static let email = "fldBjSvbdd5WXmoIG"
    static let phone = "fldwF5NBjGVndCXNV"
    static let mobilePhone = "fldwULn4qSjwzSOTj"
    static let workPhone = "fldueNgIMN0Ui5MWw"
    static let linkedInUrl = "fldWrrBfD7aLxsXT4"
    static let website = "fldnWic86lLjcF9MR"
    // Numbers & Dates
    static let leadScore = "fldxNhfwoMf7UWVoT"
    static let lastContactDate = "fldoILwnnEloVrzLk"
    static let importDate = "fldoeYmeSZDrd7Y25"
    static let reviewCompletionDate = "fld6gBrJu9XCGAIll"
    // Single Selects (may have emoji prefixes)
    static let qualificationStatus = "fld5Ed1Gg51xRBIrm"
    static let leadSource = "fldxxbhPmFaJ7xZeK"
    static let clientType = "fldF8X4HZbybc1Yy6"
    static let industry = "fldHoIj9zCNB15avX"
    static let importSource = "fldZG5LYBnFcEwhyw"
    static let onboardingStatus = "fldbCsU8sEBNRm1kX"
    static let categorization = "fldofD9DQHfugTxsC"
    static let qualityRating = "fldz86orj3p0ynZGB"
    static let reliabilityRating = "fldgIuvazBCfLa7Wu"
    static let partnerStatus = "fldIEgv4HtZTr57AX"
    static let partnerType = "fldvehyP9Y3Ra2wUM"
    // Multi-select
    static let tags = "fldO7kfLDA9jZswPB"
    // Checkbox
    static let syncToContacts = "fldxbLMAKgqeawWkw"
    // Linked Records
    static let specialties = "fldPgiO2nKgcujeXz"
    static let proposals = "fldPxLDh74yCpYwuF"
    static let salesOpportunities = "fldYhB3vDq28worr9"
    static let importedContacts = "fldj08SdhFcsYpRva"
    static let interactions = "fldgWTSW7dKdCZPFl"
    static let tasks = "fldsWpetRKu2E4e9U"
    static let projects = "fldtExCKnttD4XsMe"
    static let companies = "fldYXDUc9YKKsGTBt"
    static let projectsPartnerVendor = "fldOOrElk4KRkSxcG"
    static let portalAccess = "fld0W66oRTQwvb9Nq"
    // Attachment (read-only)
    static let contactPhoto = "fldl1WOfz7vHNSOUd"
    // Read-only
    static let lastInteractionDate = "fldptkl81ex4SvQYN"  // rollup
    static let importedBy = "fldO7a9QFfKQ7tbkg"           // collaborator
    static let assignedAdmin = "fld5dsmbFIwgU5UHk"        // collaborator
    static let createdBy = "fld18NNjUH4xe7kSS"            // createdBy
}

extension Contact: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.contacts

    static func from(record: AirtableRecord, context: ModelContext) -> Contact {
        let f = record.fields
        let model = Contact(id: record.id)
        // Text
        model.contactName = f.string(for: F.contactName)
        model.firstName = f.string(for: F.firstName)
        model.lastName = f.string(for: F.lastName)
        model.jobTitle = f.string(for: F.jobTitle)
        model.company = f.string(for: F.company)
        model.importedContactName = f.string(for: F.importedContactName)
        model.addressLine = f.string(for: F.addressLine)
        model.city = f.string(for: F.city)
        model.state = f.string(for: F.state)
        model.country = f.string(for: F.country)
        model.postalCode = f.string(for: F.postalCode)
        // Multiline
        model.notes = f.string(for: F.notes)
        model.reviewNotes = f.string(for: F.reviewNotes)
        model.reasonForRejection = f.string(for: F.reasonForRejection)
        model.rateInfo = f.string(for: F.rateInfo)
        model.leadNote = f.string(for: F.leadNote)
        model.eventTags = f.string(for: F.eventTags)
        // Contact info
        model.email = f.string(for: F.email)
        model.phone = f.string(for: F.phone)
        model.mobilePhone = f.string(for: F.mobilePhone)
        model.workPhone = f.string(for: F.workPhone)
        model.linkedInUrl = f.string(for: F.linkedInUrl)
        model.website = f.string(for: F.website)
        // Numbers & Dates
        model.leadScore = f.int(for: F.leadScore)
        model.lastContactDate = f.date(for: F.lastContactDate)
        model.importDate = f.date(for: F.importDate)
        model.reviewCompletionDate = f.date(for: F.reviewCompletionDate)
        // Single Selects (stored with emoji prefixes — never strip them)
        model.qualificationStatus = f.string(for: F.qualificationStatus)
        model.leadSource = f.string(for: F.leadSource)
        model.clientType = f.string(for: F.clientType)
        model.industry = f.string(for: F.industry)
        model.importSource = f.string(for: F.importSource)
        model.onboardingStatus = f.string(for: F.onboardingStatus)
        model.categorization = f.string(for: F.categorization)
        model.qualityRating = f.string(for: F.qualityRating)
        model.reliabilityRating = f.string(for: F.reliabilityRating)
        model.partnerStatus = f.string(for: F.partnerStatus)
        model.partnerType = f.string(for: F.partnerType)
        // Multi-select & Checkbox
        model.tags = f.stringArray(for: F.tags)
        model.syncToContacts = f.bool(for: F.syncToContacts)
        // Linked Records
        model.specialtiesIds = f.stringArray(for: F.specialties)
        model.proposalsIds = f.stringArray(for: F.proposals)
        model.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        model.importedContactsIds = f.stringArray(for: F.importedContacts)
        model.interactionsIds = f.stringArray(for: F.interactions)
        model.tasksIds = f.stringArray(for: F.tasks)
        model.projectsIds = f.stringArray(for: F.projects)
        model.companiesIds = f.stringArray(for: F.companies)
        model.projectsAsPartnerVendorIds = f.stringArray(for: F.projectsPartnerVendor)
        model.portalAccessIds = f.stringArray(for: F.portalAccess)
        // Attachment (read-only — extract first URL from attachment array)
        model.contactPhotoUrl = f.attachmentUrl(for: F.contactPhoto)
        // Read-only (decoded but never pushed)
        model.lastInteractionDate = f.date(for: F.lastInteractionDate)
        return model
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        // Text
        b.set(F.contactName, contactName)
        b.set(F.firstName, firstName)
        b.set(F.lastName, lastName)
        b.set(F.jobTitle, jobTitle)
        b.set(F.company, company)
        b.set(F.importedContactName, importedContactName)
        b.set(F.addressLine, addressLine)
        b.set(F.city, city)
        b.set(F.state, state)
        b.set(F.country, country)
        b.set(F.postalCode, postalCode)
        // Multiline
        b.set(F.notes, notes)
        b.set(F.reviewNotes, reviewNotes)
        b.set(F.reasonForRejection, reasonForRejection)
        b.set(F.rateInfo, rateInfo)
        b.set(F.leadNote, leadNote)
        b.set(F.eventTags, eventTags)
        // Contact info
        b.set(F.email, email)
        b.set(F.phone, phone)
        b.set(F.mobilePhone, mobilePhone)
        b.set(F.workPhone, workPhone)
        b.set(F.linkedInUrl, linkedInUrl)
        b.set(F.website, website)
        // Numbers & Dates
        b.set(F.leadScore, leadScore)
        b.setDate(F.lastContactDate, lastContactDate)
        b.setDate(F.importDate, importDate)
        b.setDate(F.reviewCompletionDate, reviewCompletionDate)
        // Single Selects
        b.set(F.qualificationStatus, qualificationStatus)
        b.set(F.leadSource, leadSource)
        b.set(F.clientType, clientType)
        b.set(F.industry, industry)
        b.set(F.importSource, importSource)
        b.set(F.onboardingStatus, onboardingStatus)
        b.set(F.categorization, categorization)
        b.set(F.qualityRating, qualityRating)
        b.set(F.reliabilityRating, reliabilityRating)
        b.set(F.partnerStatus, partnerStatus)
        b.set(F.partnerType, partnerType)
        // Multi-select & Checkbox
        b.setMultiSelect(F.tags, tags)
        b.setBool(F.syncToContacts, syncToContacts)
        // Linked Records
        b.setLinkedIds(F.specialties, specialtiesIds)
        b.setLinkedIds(F.proposals, proposalsIds)
        b.setLinkedIds(F.salesOpportunities, salesOpportunitiesIds)
        b.setLinkedIds(F.importedContacts, importedContactsIds)
        b.setLinkedIds(F.interactions, interactionsIds)
        b.setLinkedIds(F.tasks, tasksIds)
        b.setLinkedIds(F.projects, projectsIds)
        b.setLinkedIds(F.companies, companiesIds)
        b.setLinkedIds(F.projectsPartnerVendor, projectsAsPartnerVendorIds)
        b.setLinkedIds(F.portalAccess, portalAccessIds)
        // EXCLUDED (read-only): lastInteractionDate (rollup), importedBy, assignedAdmin, createdBy
        return b.fields
    }
}
