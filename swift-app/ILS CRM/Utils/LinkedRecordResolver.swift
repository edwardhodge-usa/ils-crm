import SwiftData
import Foundation

struct LinkedRecordResolver {
    let context: ModelContext

    func resolveContacts(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Contact>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { c in c.contactName.map { (c.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveCompanies(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Company>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { c in c.companyName.map { (c.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveOpportunities(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Opportunity>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { o in o.opportunityName.map { (o.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveProjects(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Project>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { p in p.projectName.map { (p.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveProposals(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Proposal>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { p in p.proposalName.map { (p.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveTasks(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<CRMTask>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { t in t.task.map { (t.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }

    func resolveInteractions(ids: [String]) -> [String] {
        guard !ids.isEmpty else { return [] }
        let all = (try? context.fetch(FetchDescriptor<Interaction>())) ?? []
        let lookup = Dictionary(uniqueKeysWithValues: all.compactMap { i in i.subject.map { (i.id, $0) } })
        return ids.compactMap { lookup[$0] }
    }
}
