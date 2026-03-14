import SwiftData
import Foundation

/// Resolves Airtable record IDs to display names using local SwiftData cache.
struct LinkedRecordResolver {
    let context: ModelContext

    func contactName(id: String) -> String? {
        let predicate = #Predicate<Contact> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.contactName
    }

    func companyName(id: String) -> String? {
        let predicate = #Predicate<Company> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.companyName
    }

    func opportunityName(id: String) -> String? {
        let predicate = #Predicate<Opportunity> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.opportunityName
    }

    func projectName(id: String) -> String? {
        let predicate = #Predicate<Project> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.projectName
    }

    func proposalName(id: String) -> String? {
        let predicate = #Predicate<Proposal> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.proposalName
    }

    func taskName(id: String) -> String? {
        let predicate = #Predicate<CRMTask> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.task
    }

    func interactionSubject(id: String) -> String? {
        let predicate = #Predicate<Interaction> { $0.id == id }
        let descriptor = FetchDescriptor(predicate: predicate)
        return (try? context.fetch(descriptor))?.first?.subject
    }
}
