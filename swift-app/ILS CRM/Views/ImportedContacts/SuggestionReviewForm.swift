import SwiftUI
import SwiftData

/// Sheet form for reviewing and approving an email-discovered contact suggestion.
///
/// Opens when "Add to CRM" is clicked in ImportedContactDetailView.
/// Pre-populated with extracted fields (all editable). On save:
/// - Creates a Contact record in SwiftData
/// - Creates a Company record if suggestedCompanyName is set and no existing link
/// - Updates the ImportedContact status to "Approved"
struct SuggestionReviewForm: View {
    let importedContact: ImportedContact

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Environment(SyncEngine.self) private var syncEngine

    @Query private var companies: [Company]

    // MARK: - Form State

    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var jobTitle: String = ""
    @State private var relationshipType: String = "Client"
    @State private var companyName: String = ""
    @State private var isSaving = false

    private static let relationshipOptions = [
        "Client", "Vendor", "Employee", "Contractor", "Partner", "Consultant",
        "Talent", "Industry Peer", "Investor", "Advisor", "Press", "Other"
    ]

    private var linkedCompany: Company? {
        guard let firstId = importedContact.suggestedCompanyLink.first else { return nil }
        return companies.first(where: { $0.id == firstId })
    }

    private var willCreateCompany: Bool {
        linkedCompany == nil && !companyName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var contactDisplayName: String {
        let parts = [firstName, lastName].filter { !$0.isEmpty }
        return parts.isEmpty ? "New Contact" : parts.joined(separator: " ")
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                contactSection
                companySection
                relationshipSection
            }
            .formStyle(.grouped)
            .navigationTitle("Review & Add to CRM")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save to CRM") { saveToCRM() }
                        .disabled(isSaving || (firstName.isEmpty && lastName.isEmpty))
                        .buttonStyle(.borderedProminent)
                }
            }
            .onAppear { loadFromImported() }
        }
    }

    // MARK: - Sections

    private var contactSection: some View {
        Section("Contact Info") {
            TextField("First Name", text: $firstName)
            TextField("Last Name", text: $lastName)
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
            TextField("Phone", text: $phone)
                .textContentType(.telephoneNumber)
            TextField("Job Title", text: $jobTitle)
        }
    }

    private var companySection: some View {
        Section("Company") {
            if let company = linkedCompany {
                HStack(spacing: 8) {
                    AvatarView(
                        name: company.companyName ?? "Company",
                        avatarSize: .small,
                        shape: .roundedRect
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(company.companyName ?? "Unnamed Company")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.blue)
                        Text("Existing company in CRM")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
            } else {
                TextField("Company Name", text: $companyName)

                if willCreateCompany {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(.orange)
                        Text("Will create new company: \"\(companyName.trimmingCharacters(in: .whitespaces))\"")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var relationshipSection: some View {
        Section("Classification") {
            Picker("Relationship Type", selection: $relationshipType) {
                ForEach(Self.relationshipOptions, id: \.self) { option in
                    Text(option).tag(option)
                }
            }
        }
    }

    // MARK: - Load

    private func loadFromImported() {
        firstName = importedContact.firstName ?? ""
        lastName = importedContact.lastName ?? ""
        email = importedContact.email ?? ""
        phone = importedContact.phone ?? importedContact.mobilePhone ?? ""
        jobTitle = importedContact.jobTitle ?? ""
        relationshipType = importedContact.relationshipType ?? "Client"
        companyName = importedContact.suggestedCompanyName ?? importedContact.company ?? ""
    }

    // MARK: - Save

    private func saveToCRM() {
        isSaving = true

        // Determine company ID
        var companyId: String?

        if let existing = linkedCompany {
            companyId = existing.id
        } else if willCreateCompany {
            // Create new Company
            let newCompany = Company(
                id: "local_\(UUID().uuidString)",
                companyName: companyName.trimmingCharacters(in: .whitespaces)
            )
            newCompany.localModifiedAt = Date()
            newCompany.isPendingPush = true

            // Copy over company metadata from the imported contact
            if let industry = importedContact.companyIndustry, !industry.isEmpty {
                newCompany.industry = industry
            }

            modelContext.insert(newCompany)
            companyId = newCompany.id
        }

        // Create Contact record
        let displayName = [firstName, lastName]
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        let newContact = Contact(
            id: "local_\(UUID().uuidString)",
            contactName: displayName.isEmpty ? nil : displayName,
            categorization: [relationshipType]
        )
        newContact.firstName = firstName.isEmpty ? nil : firstName
        newContact.lastName = lastName.isEmpty ? nil : lastName
        newContact.email = email.isEmpty ? nil : email
        newContact.mobilePhone = phone.isEmpty ? nil : phone
        newContact.jobTitle = jobTitle.isEmpty ? nil : jobTitle
        newContact.leadSource = "Email Intelligence"
        newContact.localModifiedAt = Date()
        newContact.isPendingPush = true

        if let companyId {
            newContact.companiesIds = [companyId]
        }

        modelContext.insert(newContact)

        // Update ImportedContact status
        importedContact.onboardingStatus = "Approved"
        importedContact.relatedCrmContactIds = [newContact.id]
        importedContact.localModifiedAt = Date()
        importedContact.isPendingPush = true

        isSaving = false
        dismiss()
    }
}
