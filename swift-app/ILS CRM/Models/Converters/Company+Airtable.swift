import Foundation
import SwiftData

private enum F {
    static let companyName = "fldVYiMOLq3LJgbZ3"
    static let address = "fldyd3pnfJ5PCwwQD"
    static let city = "fldJGkGiCoxduD4sg"
    static let stateRegion = "fldNekCaGCR56MLcJ"
    static let country = "fldjvoxUo8iuKITjB"
    static let referredBy = "fldLLGU72wwf7LxEf"
    static let naicsCode = "fldL93N86XiMu5sUn"
    static let companyType = "fldSgiy8i2QUTmZbX"
    static let companySize = "fld0FFqLVasuvG9Uf"
    static let annualRevenue = "fldMaVs106qf6Gmqp"
    static let postalCode = "fldqa7L8FPSeSQ9xG"
    static let notes = "flddUZDFk4l9f377V"
    static let companyDescription = "fldIDywGKU18pEndd"
    static let website = "fldVBnFiEeyDf9oCg"
    static let linkedInUrl = "fldVt6tIj1DrT85cd"
    static let foundingYear = "fldZaxAXqeImQcuzW"
    static let createdDate = "fldxQpzFGadejLLVp"
    static let type = "fldtLJxxK5oT6Nzjn"
    static let industry = "fldPz4rknFpmEXZAD"
    static let leadSource = "fldSPGKJKbHclLzoD"
    static let salesOpportunities = "fldbvXQ26UDd3SHAB"
    static let projects = "fldtgQEptCxvaaAzk"
    static let contacts = "fldQ2RK3PeAPMzkJB"
    static let proposals = "fld8pQnDzVmyonJ45"
    static let attachments = "fldhCu5ooToK84g4G"   // read-only for push
}

extension Company: AirtableConvertible {
    static let airtableTableId = AirtableConfig.Tables.companies

    static func from(record: AirtableRecord, context: ModelContext) -> Company {
        let f = record.fields
        let model = Company(id: record.id)
        model.companyName = f.string(for: F.companyName)
        model.address = f.string(for: F.address)
        model.city = f.string(for: F.city)
        model.stateRegion = f.string(for: F.stateRegion)
        model.country = f.string(for: F.country)
        model.referredBy = f.string(for: F.referredBy)
        model.naicsCode = f.string(for: F.naicsCode)
        model.companyType = f.string(for: F.companyType)
        model.companySize = f.string(for: F.companySize)
        model.annualRevenue = f.string(for: F.annualRevenue)
        model.postalCode = f.string(for: F.postalCode)
        model.notes = f.string(for: F.notes)
        model.companyDescription = f.string(for: F.companyDescription)
        model.website = f.string(for: F.website)
        model.linkedInUrl = f.string(for: F.linkedInUrl)
        model.foundingYear = f.int(for: F.foundingYear)
        model.createdDate = f.date(for: F.createdDate)
        model.type = f.string(for: F.type)
        model.industry = f.string(for: F.industry)
        model.leadSource = f.string(for: F.leadSource)
        model.salesOpportunitiesIds = f.stringArray(for: F.salesOpportunities)
        model.projectsIds = f.stringArray(for: F.projects)
        model.contactsIds = f.stringArray(for: F.contacts)
        model.proposalsIds = f.stringArray(for: F.proposals)
        // Attachment (read-only — extract first URL from attachment array)
        model.logoUrl = f.attachmentUrl(for: F.attachments)
        return model
    }

    func toAirtableFields() -> [String: Any] {
        var b = AirtableFieldsBuilder()
        b.set(F.companyName, companyName)
        b.set(F.address, address)
        b.set(F.city, city)
        b.set(F.stateRegion, stateRegion)
        b.set(F.country, country)
        b.set(F.referredBy, referredBy)
        b.set(F.naicsCode, naicsCode)
        b.set(F.companyType, companyType)
        b.set(F.companySize, companySize)
        b.set(F.annualRevenue, annualRevenue)
        b.set(F.postalCode, postalCode)
        b.set(F.notes, notes)
        b.set(F.companyDescription, companyDescription)
        b.set(F.website, website)
        b.set(F.linkedInUrl, linkedInUrl)
        b.set(F.foundingYear, foundingYear)
        b.setDate(F.createdDate, createdDate)
        b.set(F.type, type)
        b.set(F.industry, industry)
        b.set(F.leadSource, leadSource)
        b.setLinkedIds(F.salesOpportunities, salesOpportunitiesIds)
        b.setLinkedIds(F.projects, projectsIds)
        b.setLinkedIds(F.contacts, contactsIds)
        b.setLinkedIds(F.proposals, proposalsIds)
        // attachments excluded
        return b.fields
    }
}
