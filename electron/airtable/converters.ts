// Convert between Airtable records and local SQLite format
// Handles: linked records → JSON ID arrays, multi-select → JSON arrays,
// single-select → plain strings, checkbox → 0/1, formula/rollup/lookup → read-only, attachments → skip

import {
  CONTACTS, OPPORTUNITIES, TASKS, PROPOSALS, PROJECTS,
  INTERACTIONS, IMPORTED_CONTACTS, COMPANIES, SPECIALTIES,
  PORTAL_ACCESS, PORTAL_LOGS,
} from './field-maps'
import type { AirtableRecord } from './client'

type FieldMap = Record<string, string>

// ─── Helpers ─────────────────────────────────────────────────

function jsonArray(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return JSON.stringify(value)
  return null
}

function checkbox(value: unknown): number {
  return value ? 1 : 0
}

function str(value: unknown): string | null {
  if (value == null || value === '') return null
  return String(value)
}

function num(value: unknown): number | null {
  if (value == null) return null
  const n = Number(value)
  return isNaN(n) ? null : n
}

function safeParseArray(value: unknown): unknown[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Strip wrapping double-quotes from a string value (fixes double-serialization) */
function cleanSelectValue(value: unknown): string | null {
  if (value == null || value === '') return null
  // Handle object format from API (e.g., { id: "...", name: "Medium" })
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return (value as { name: string }).name || null
  }
  let s = String(value)
  // Strip all wrapping quotes from double/triple-stringified values (e.g. '""Conference""' → 'Conference')
  while (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1)
  }
  return s || null
}

// ─── Generic converter builder ───────────────────────────────

interface FieldMapping {
  local: string
  airtable: string
  type: 'text' | 'number' | 'linked' | 'multiSelect' | 'singleSelect' | 'checkbox' | 'readonly' | 'collaborator' | 'attachment'
}

function airtableToLocal(
  record: AirtableRecord,
  mappings: FieldMapping[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: record.id }
  const f = record.fields

  for (const m of mappings) {
    const val = f[m.airtable]
    switch (m.type) {
      case 'text':
        result[m.local] = str(val)
        break
      case 'number':
        result[m.local] = num(val)
        break
      case 'linked':
        result[m.local] = jsonArray(val)
        break
      case 'multiSelect':
        result[m.local] = jsonArray(val)
        break
      case 'singleSelect':
        result[m.local] = cleanSelectValue(val)
        break
      case 'checkbox':
        result[m.local] = checkbox(val)
        break
      case 'readonly':
        result[m.local] = val != null ? (typeof val === 'number' ? val : str(val)) : null
        break
      case 'collaborator':
        if (val && typeof val === 'object' && 'id' in (val as Record<string, unknown>)) {
          const collab = val as Record<string, string>
          result[m.local] = JSON.stringify({ id: collab.id, email: collab.email || '', name: collab.name || '' })
        } else {
          result[m.local] = null
        }
        break
      case 'attachment':
        // Extract the first attachment's large thumbnail URL (or direct URL as fallback)
        if (Array.isArray(val) && val.length > 0) {
          const att = val[0] as Record<string, unknown>
          const thumbs = att.thumbnails as Record<string, Record<string, unknown>> | undefined
          result[m.local] = (thumbs?.large?.url as string) || (att.url as string) || null
        } else {
          result[m.local] = null
        }
        break
    }
  }

  return result
}

function localToAirtable(
  record: Record<string, unknown>,
  mappings: FieldMapping[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  for (const m of mappings) {
    if (m.type === 'readonly' || m.type === 'attachment') continue // Skip formula/rollup/lookup/attachment
    if (m.type === 'collaborator') {
      // Collaborator fields: parse stored JSON to get the Airtable user ID for writes
      const collabVal = record[m.local]
      if (collabVal && typeof collabVal === 'string') {
        try {
          const parsed = JSON.parse(collabVal)
          if (parsed && typeof parsed === 'object' && parsed.id) {
            fields[m.airtable] = { id: parsed.id }
          }
        } catch {
          // Legacy plain-string name — can't write without an ID, skip
        }
      } else if (collabVal === null) {
        fields[m.airtable] = null
      }
      continue
    }
    const val = record[m.local]
    if (val === undefined) continue

    switch (m.type) {
      case 'text':
        fields[m.airtable] = val || null
        break
      case 'number':
        fields[m.airtable] = val != null ? Number(val) : null
        break
      case 'linked':
        fields[m.airtable] = safeParseArray(val)
        break
      case 'multiSelect':
        fields[m.airtable] = safeParseArray(val)
        break
      case 'singleSelect':
        fields[m.airtable] = cleanSelectValue(val)
        break
      case 'checkbox':
        fields[m.airtable] = val === 1 || val === true
        break
    }
  }

  return fields
}

// ─── Contacts ────────────────────────────────────────────────

const CONTACT_MAPPINGS: FieldMapping[] = [
  { local: 'contact_name', airtable: CONTACTS.contactName, type: 'text' },
  { local: 'first_name', airtable: CONTACTS.firstName, type: 'text' },
  { local: 'last_name', airtable: CONTACTS.lastName, type: 'text' },
  { local: 'job_title', airtable: CONTACTS.jobTitle, type: 'text' },
  { local: 'company', airtable: CONTACTS.company, type: 'text' },
  { local: 'imported_contact_name', airtable: CONTACTS.importedContactName, type: 'text' },
  { local: 'address_line', airtable: CONTACTS.addressLine, type: 'text' },
  { local: 'city', airtable: CONTACTS.city, type: 'text' },
  { local: 'state', airtable: CONTACTS.state, type: 'text' },
  { local: 'country', airtable: CONTACTS.country, type: 'text' },
  { local: 'postal_code', airtable: CONTACTS.postalCode, type: 'text' },
  { local: 'notes', airtable: CONTACTS.notes, type: 'text' },
  { local: 'review_notes', airtable: CONTACTS.reviewNotes, type: 'text' },
  { local: 'reason_for_rejection', airtable: CONTACTS.reasonForRejection, type: 'text' },
  { local: 'rate_info', airtable: CONTACTS.rateInfo, type: 'text' },
  { local: 'lead_note', airtable: CONTACTS.leadNote, type: 'text' },
  { local: 'event_tags', airtable: CONTACTS.eventTags, type: 'text' },
  { local: 'email', airtable: CONTACTS.email, type: 'text' },
  { local: 'mobile_phone', airtable: CONTACTS.mobilePhone, type: 'text' },
  { local: 'office_phone', airtable: CONTACTS.officePhone, type: 'text' },
  { local: 'linkedin_url', airtable: CONTACTS.linkedInUrl, type: 'text' },
  { local: 'website', airtable: CONTACTS.website, type: 'text' },
  { local: 'lead_score', airtable: CONTACTS.leadScore, type: 'number' },
  { local: 'last_contact_date', airtable: CONTACTS.lastContactDate, type: 'text' },
  { local: 'import_date', airtable: CONTACTS.importDate, type: 'text' },
  { local: 'review_completion_date', airtable: CONTACTS.reviewCompletionDate, type: 'text' },
  { local: 'qualification_status', airtable: CONTACTS.qualificationStatus, type: 'singleSelect' },
  { local: 'lead_source', airtable: CONTACTS.leadSource, type: 'singleSelect' },
  { local: 'client_type', airtable: CONTACTS.clientType, type: 'singleSelect' },
  { local: 'industry', airtable: CONTACTS.industry, type: 'singleSelect' },
  { local: 'import_source', airtable: CONTACTS.importSource, type: 'singleSelect' },
  { local: 'onboarding_status', airtable: CONTACTS.onboardingStatus, type: 'singleSelect' },
  { local: 'categorization', airtable: CONTACTS.categorization, type: 'singleSelect' },
  { local: 'quality_rating', airtable: CONTACTS.qualityRating, type: 'singleSelect' },
  { local: 'reliability_rating', airtable: CONTACTS.reliabilityRating, type: 'singleSelect' },
  { local: 'partner_status', airtable: CONTACTS.partnerStatus, type: 'singleSelect' },
  { local: 'partner_type', airtable: CONTACTS.partnerType, type: 'singleSelect' },
  { local: 'tags', airtable: CONTACTS.tags, type: 'multiSelect' },
  { local: 'sync_to_contacts', airtable: CONTACTS.syncToContacts, type: 'checkbox' },
  { local: 'specialties_ids', airtable: CONTACTS.specialties, type: 'linked' },
  { local: 'proposals_ids', airtable: CONTACTS.proposals, type: 'linked' },
  { local: 'sales_opportunities_ids', airtable: CONTACTS.salesOpportunities, type: 'linked' },
  { local: 'imported_contacts_ids', airtable: CONTACTS.importedContacts, type: 'linked' },
  { local: 'interactions_ids', airtable: CONTACTS.interactions, type: 'linked' },
  { local: 'tasks_ids', airtable: CONTACTS.tasks, type: 'linked' },
  { local: 'projects_ids', airtable: CONTACTS.projects, type: 'linked' },
  { local: 'companies_ids', airtable: CONTACTS.companies, type: 'linked' },
  { local: 'projects_partner_vendor_ids', airtable: CONTACTS.projectsAsPartnerVendor, type: 'linked' },
  { local: 'portal_access_ids', airtable: CONTACTS.portalAccess, type: 'linked' },
  { local: 'last_interaction_date', airtable: CONTACTS.lastInteractionDate, type: 'readonly' },
  { local: 'contact_photo_url', airtable: CONTACTS.contactPhoto, type: 'attachment' },
]

// ─── Companies ───────────────────────────────────────────────

const COMPANY_MAPPINGS: FieldMapping[] = [
  { local: 'company_name', airtable: COMPANIES.companyName, type: 'text' },
  { local: 'address', airtable: COMPANIES.address, type: 'text' },
  { local: 'city', airtable: COMPANIES.city, type: 'text' },
  { local: 'state_region', airtable: COMPANIES.stateRegion, type: 'text' },
  { local: 'country', airtable: COMPANIES.country, type: 'text' },
  { local: 'referred_by', airtable: COMPANIES.referredBy, type: 'text' },
  { local: 'naics_code', airtable: COMPANIES.naicsCode, type: 'text' },
  { local: 'company_type', airtable: COMPANIES.companyType, type: 'singleSelect' },
  { local: 'company_size', airtable: COMPANIES.companySize, type: 'singleSelect' },
  { local: 'annual_revenue', airtable: COMPANIES.annualRevenue, type: 'text' },
  { local: 'postal_code', airtable: COMPANIES.postalCode, type: 'text' },
  { local: 'notes', airtable: COMPANIES.notes, type: 'text' },
  { local: 'company_description', airtable: COMPANIES.companyDescription, type: 'text' },
  { local: 'website', airtable: COMPANIES.website, type: 'text' },
  { local: 'founding_year', airtable: COMPANIES.foundingYear, type: 'number' },
  { local: 'created_date', airtable: COMPANIES.createdDate, type: 'text' },
  { local: 'type', airtable: COMPANIES.type, type: 'singleSelect' },
  { local: 'industry', airtable: COMPANIES.industry, type: 'singleSelect' },
  { local: 'lead_source', airtable: COMPANIES.leadSource, type: 'singleSelect' },
  { local: 'sales_opportunities_ids', airtable: COMPANIES.salesOpportunities, type: 'linked' },
  { local: 'projects_ids', airtable: COMPANIES.projects, type: 'linked' },
  { local: 'contacts_ids', airtable: COMPANIES.contacts, type: 'linked' },
  { local: 'proposals_ids', airtable: COMPANIES.proposals, type: 'linked' },
  { local: 'logo_url', airtable: COMPANIES.logo, type: 'attachment' },
  { local: 'linkedin_url', airtable: COMPANIES.linkedInUrl, type: 'text' },
]

// ─── Opportunities ───────────────────────────────────────────

const OPPORTUNITY_MAPPINGS: FieldMapping[] = [
  { local: 'opportunity_name', airtable: OPPORTUNITIES.opportunityName, type: 'text' },
  { local: 'referred_by', airtable: OPPORTUNITIES.referredBy, type: 'text' },
  { local: 'notes_about', airtable: OPPORTUNITIES.notesAbout, type: 'text' },
  { local: 'contract_milestones', airtable: OPPORTUNITIES.contractMilestones, type: 'text' },
  { local: 'loss_notes', airtable: OPPORTUNITIES.lossNotes, type: 'text' },
  { local: 'deal_value', airtable: OPPORTUNITIES.dealValue, type: 'number' },
  { local: 'expected_close_date', airtable: OPPORTUNITIES.expectedCloseDate, type: 'text' },
  { local: 'next_meeting_date', airtable: OPPORTUNITIES.nextMeetingDate, type: 'text' },
  { local: 'sales_stage', airtable: OPPORTUNITIES.salesStage, type: 'singleSelect' },
  { local: 'probability', airtable: OPPORTUNITIES.probability, type: 'singleSelect' },
  { local: 'quals_type', airtable: OPPORTUNITIES.qualsType, type: 'singleSelect' },
  { local: 'lead_source', airtable: OPPORTUNITIES.leadSource, type: 'singleSelect' },
  { local: 'win_loss_reason', airtable: OPPORTUNITIES.winLossReason, type: 'singleSelect' },
  { local: 'engagement_type', airtable: OPPORTUNITIES.engagementType, type: 'multiSelect' },
  { local: 'qualifications_sent', airtable: OPPORTUNITIES.qualificationsSent, type: 'checkbox' },
  { local: 'company_ids', airtable: OPPORTUNITIES.company, type: 'linked' },
  { local: 'associated_contact_ids', airtable: OPPORTUNITIES.associatedContact, type: 'linked' },
  { local: 'tasks_ids', airtable: OPPORTUNITIES.tasks, type: 'linked' },
  { local: 'interactions_ids', airtable: OPPORTUNITIES.interactions, type: 'linked' },
  { local: 'project_ids', airtable: OPPORTUNITIES.project, type: 'linked' },
  { local: 'proposals_ids', airtable: OPPORTUNITIES.proposals, type: 'linked' },
  { local: 'probability_value', airtable: OPPORTUNITIES.probabilityValue, type: 'readonly' },
]

// ─── Tasks ───────────────────────────────────────────────────

const TASK_MAPPINGS: FieldMapping[] = [
  { local: 'task', airtable: TASKS.task, type: 'text' },
  { local: 'notes', airtable: TASKS.notes, type: 'text' },
  { local: 'due_date', airtable: TASKS.dueDate, type: 'text' },
  { local: 'completed_date', airtable: TASKS.completedDate, type: 'text' },
  { local: 'status', airtable: TASKS.status, type: 'singleSelect' },
  { local: 'type', airtable: TASKS.type, type: 'singleSelect' },
  { local: 'priority', airtable: TASKS.priority, type: 'singleSelect' },
  { local: 'sales_opportunities_ids', airtable: TASKS.salesOpportunities, type: 'linked' },
  { local: 'contacts_ids', airtable: TASKS.contacts, type: 'linked' },
  { local: 'projects_ids', airtable: TASKS.projects, type: 'linked' },
  { local: 'proposal_ids', airtable: TASKS.proposal, type: 'linked' },
  { local: 'assigned_to', airtable: TASKS.assignedTo, type: 'collaborator' },
]

// ─── Proposals ───────────────────────────────────────────────

const PROPOSAL_MAPPINGS: FieldMapping[] = [
  { local: 'proposal_name', airtable: PROPOSALS.proposalName, type: 'text' },
  { local: 'version', airtable: PROPOSALS.version, type: 'text' },
  { local: 'client_feedback', airtable: PROPOSALS.clientFeedback, type: 'text' },
  { local: 'performance_metrics', airtable: PROPOSALS.performanceMetrics, type: 'text' },
  { local: 'notes', airtable: PROPOSALS.notes, type: 'text' },
  { local: 'status', airtable: PROPOSALS.status, type: 'singleSelect' },
  { local: 'template_used', airtable: PROPOSALS.templateUsed, type: 'singleSelect' },
  { local: 'approval_status', airtable: PROPOSALS.approvalStatus, type: 'singleSelect' },
  { local: 'client_ids', airtable: PROPOSALS.client, type: 'linked' },
  { local: 'company_ids', airtable: PROPOSALS.company, type: 'linked' },
  { local: 'related_opportunity_ids', airtable: PROPOSALS.relatedOpportunity, type: 'linked' },
  { local: 'tasks_ids', airtable: PROPOSALS.tasks, type: 'linked' },
]

// ─── Projects ────────────────────────────────────────────────

const PROJECT_MAPPINGS: FieldMapping[] = [
  { local: 'project_name', airtable: PROJECTS.projectName, type: 'text' },
  { local: 'location', airtable: PROJECTS.location, type: 'text' },
  { local: 'description', airtable: PROJECTS.description, type: 'text' },
  { local: 'key_milestones', airtable: PROJECTS.keyMilestones, type: 'text' },
  { local: 'lessons_learned', airtable: PROJECTS.lessonsLearned, type: 'text' },
  { local: 'contract_value', airtable: PROJECTS.contractValue, type: 'number' },
  { local: 'start_date', airtable: PROJECTS.startDate, type: 'text' },
  { local: 'target_completion', airtable: PROJECTS.targetCompletion, type: 'text' },
  { local: 'actual_completion', airtable: PROJECTS.actualCompletion, type: 'text' },
  { local: 'status', airtable: PROJECTS.status, type: 'singleSelect' },
  { local: 'engagement_type', airtable: PROJECTS.engagementType, type: 'multiSelect' },
  { local: 'sales_opportunities_ids', airtable: PROJECTS.salesOpportunities, type: 'linked' },
  { local: 'client_ids', airtable: PROJECTS.client, type: 'linked' },
  { local: 'tasks_ids', airtable: PROJECTS.tasks, type: 'linked' },
  { local: 'primary_contact_ids', airtable: PROJECTS.primaryContact, type: 'linked' },
  { local: 'contacts_ids', airtable: PROJECTS.contacts, type: 'linked' },
  { local: 'project_lead', airtable: PROJECTS.projectLead, type: 'collaborator' },
]

// ─── Interactions ────────────────────────────────────────────

const INTERACTION_MAPPINGS: FieldMapping[] = [
  { local: 'subject', airtable: INTERACTIONS.subject, type: 'text' },
  { local: 'summary', airtable: INTERACTIONS.summary, type: 'text' },
  { local: 'next_steps', airtable: INTERACTIONS.nextSteps, type: 'text' },
  { local: 'date', airtable: INTERACTIONS.date, type: 'text' },
  { local: 'type', airtable: INTERACTIONS.type, type: 'singleSelect' },
  { local: 'direction', airtable: INTERACTIONS.direction, type: 'singleSelect' },
  { local: 'contacts_ids', airtable: INTERACTIONS.contacts, type: 'linked' },
  { local: 'sales_opportunities_ids', airtable: INTERACTIONS.salesOpportunities, type: 'linked' },
  { local: 'logged_by', airtable: INTERACTIONS.loggedBy, type: 'collaborator' },
]

// ─── Imported Contacts ───────────────────────────────────────

const IMPORTED_CONTACT_MAPPINGS: FieldMapping[] = [
  { local: 'imported_contact_name', airtable: IMPORTED_CONTACTS.importedContactName, type: 'text' },
  { local: 'company', airtable: IMPORTED_CONTACTS.company, type: 'text' },
  { local: 'first_name', airtable: IMPORTED_CONTACTS.firstName, type: 'text' },
  { local: 'last_name', airtable: IMPORTED_CONTACTS.lastName, type: 'text' },
  { local: 'job_title', airtable: IMPORTED_CONTACTS.jobTitle, type: 'text' },
  { local: 'email', airtable: IMPORTED_CONTACTS.email, type: 'text' },
  { local: 'event_tags', airtable: IMPORTED_CONTACTS.eventTags, type: 'text' },
  { local: 'address_line', airtable: IMPORTED_CONTACTS.addressLine, type: 'text' },
  { local: 'city', airtable: IMPORTED_CONTACTS.city, type: 'text' },
  { local: 'state', airtable: IMPORTED_CONTACTS.state, type: 'text' },
  { local: 'country', airtable: IMPORTED_CONTACTS.country, type: 'text' },
  { local: 'company_founding_year', airtable: IMPORTED_CONTACTS.companyFoundingYear, type: 'text' },
  { local: 'company_naics_code', airtable: IMPORTED_CONTACTS.companyNaicsCode, type: 'text' },
  { local: 'company_type', airtable: IMPORTED_CONTACTS.companyType, type: 'text' },
  { local: 'company_size', airtable: IMPORTED_CONTACTS.companySize, type: 'text' },
  { local: 'company_industry', airtable: IMPORTED_CONTACTS.companyIndustry, type: 'text' },
  { local: 'company_annual_revenue', airtable: IMPORTED_CONTACTS.companyAnnualRevenue, type: 'text' },
  { local: 'company_street_address', airtable: IMPORTED_CONTACTS.companyStreetAddress, type: 'text' },
  { local: 'company_street_address_2', airtable: IMPORTED_CONTACTS.companyStreetAddress2, type: 'text' },
  { local: 'company_city', airtable: IMPORTED_CONTACTS.companyCity, type: 'text' },
  { local: 'company_state', airtable: IMPORTED_CONTACTS.companyState, type: 'text' },
  { local: 'company_country', airtable: IMPORTED_CONTACTS.companyCountry, type: 'text' },
  { local: 'company_postal_code', airtable: IMPORTED_CONTACTS.companyPostalCode, type: 'text' },
  { local: 'postal_code', airtable: IMPORTED_CONTACTS.postalCode, type: 'text' },
  { local: 'company_description', airtable: IMPORTED_CONTACTS.companyDescription, type: 'text' },
  { local: 'note', airtable: IMPORTED_CONTACTS.note, type: 'text' },
  { local: 'reason_for_rejection', airtable: IMPORTED_CONTACTS.reasonForRejection, type: 'text' },
  { local: 'review_notes', airtable: IMPORTED_CONTACTS.reviewNotes, type: 'text' },
  { local: 'phone', airtable: IMPORTED_CONTACTS.phone, type: 'text' },
  { local: 'mobile_phone', airtable: IMPORTED_CONTACTS.mobilePhone, type: 'text' },
  { local: 'other_phone', airtable: IMPORTED_CONTACTS.otherPhone, type: 'text' },
  { local: 'work_phone', airtable: IMPORTED_CONTACTS.workPhone, type: 'text' },
  { local: 'office_phone', airtable: IMPORTED_CONTACTS.officePhone, type: 'text' },
  { local: 'fax', airtable: IMPORTED_CONTACTS.fax, type: 'text' },
  { local: 'linkedin_url', airtable: IMPORTED_CONTACTS.linkedInUrl, type: 'text' },
  { local: 'website', airtable: IMPORTED_CONTACTS.website, type: 'text' },
  { local: 'contact_photo_url', airtable: IMPORTED_CONTACTS.contactPhotoUrl, type: 'text' },
  { local: 'business_card_image_url', airtable: IMPORTED_CONTACTS.businessCardImageUrl, type: 'text' },
  { local: 'import_date', airtable: IMPORTED_CONTACTS.importDate, type: 'text' },
  { local: 'categorization', airtable: IMPORTED_CONTACTS.categorization, type: 'singleSelect' },
  { local: 'onboarding_status', airtable: IMPORTED_CONTACTS.onboardingStatus, type: 'singleSelect' },
  { local: 'import_source', airtable: IMPORTED_CONTACTS.importSource, type: 'singleSelect' },
  { local: 'tags', airtable: IMPORTED_CONTACTS.tags, type: 'multiSelect' },
  { local: 'sync_to_contacts', airtable: IMPORTED_CONTACTS.syncToContacts, type: 'checkbox' },
  { local: 'specialties_ids', airtable: IMPORTED_CONTACTS.specialties, type: 'linked' },
  { local: 'related_crm_contact_ids', airtable: IMPORTED_CONTACTS.relatedCrmContact, type: 'linked' },
  { local: 'imported_by', airtable: IMPORTED_CONTACTS.importedBy, type: 'collaborator' },
  { local: 'assigned_admin', airtable: IMPORTED_CONTACTS.assignedAdmin, type: 'collaborator' },
]

// ─── Specialties ─────────────────────────────────────────────

const SPECIALTY_MAPPINGS: FieldMapping[] = [
  { local: 'specialty', airtable: SPECIALTIES.specialty, type: 'text' },
  { local: 'imported_contacts_ids', airtable: SPECIALTIES.importedContacts, type: 'linked' },
  { local: 'contacts_ids', airtable: SPECIALTIES.contacts, type: 'linked' },
]

// ─── Portal Access ───────────────────────────────────────────

const PORTAL_ACCESS_MAPPINGS: FieldMapping[] = [
  { local: 'name', airtable: PORTAL_ACCESS.name, type: 'text' },
  { local: 'email', airtable: PORTAL_ACCESS.email, type: 'text' },
  { local: 'page_address', airtable: PORTAL_ACCESS.pageAddress, type: 'text' },
  { local: 'decision_maker', airtable: PORTAL_ACCESS.decisionMaker, type: 'text' },
  // company field deleted from Airtable (replaced by Contact → Company linked record chain)
  { local: 'address', airtable: PORTAL_ACCESS.address, type: 'text' },
  { local: 'primary_contact', airtable: PORTAL_ACCESS.primaryContact, type: 'text' },
  { local: 'position_title', airtable: PORTAL_ACCESS.positionTitle, type: 'text' },
  { local: 'industry', airtable: PORTAL_ACCESS.industry, type: 'text' },
  { local: 'notes', airtable: PORTAL_ACCESS.notes, type: 'text' },
  { local: 'phone_number', airtable: PORTAL_ACCESS.phoneNumber, type: 'text' },
  { local: 'website', airtable: PORTAL_ACCESS.website, type: 'text' },
  { local: 'project_budget', airtable: PORTAL_ACCESS.projectBudget, type: 'number' },
  { local: 'date_added', airtable: PORTAL_ACCESS.dateAdded, type: 'text' },
  { local: 'expected_project_start_date', airtable: PORTAL_ACCESS.expectedProjectStartDate, type: 'text' },
  { local: 'follow_up_date', airtable: PORTAL_ACCESS.followUpDate, type: 'text' },
  { local: 'status', airtable: PORTAL_ACCESS.status, type: 'singleSelect' },
  { local: 'lead_source', airtable: PORTAL_ACCESS.leadSource, type: 'singleSelect' },
  { local: 'stage', airtable: PORTAL_ACCESS.stage, type: 'singleSelect' },
  { local: 'services_interested_in', airtable: PORTAL_ACCESS.servicesInterestedIn, type: 'multiSelect' },
  { local: 'contact_ids', airtable: PORTAL_ACCESS.contact, type: 'linked' },
  { local: 'framer_page_url', airtable: PORTAL_ACCESS.framerPageUrl, type: 'readonly' },
  { local: 'contact_name_lookup', airtable: PORTAL_ACCESS.contactName, type: 'readonly' },
  { local: 'contact_company_lookup', airtable: PORTAL_ACCESS.contactCompany, type: 'readonly' },
  { local: 'contact_email_lookup', airtable: PORTAL_ACCESS.contactEmail, type: 'readonly' },
  { local: 'contact_phone_lookup', airtable: PORTAL_ACCESS.contactPhone, type: 'readonly' },
  { local: 'contact_job_title_lookup', airtable: PORTAL_ACCESS.contactJobTitle, type: 'readonly' },
  { local: 'assignee', airtable: PORTAL_ACCESS.assignee, type: 'collaborator' },
  { local: 'contact_industry_lookup', airtable: PORTAL_ACCESS.contactIndustry, type: 'readonly' },
  { local: 'contact_tags_lookup', airtable: PORTAL_ACCESS.contactTags, type: 'readonly' },
  { local: 'contact_website_lookup', airtable: PORTAL_ACCESS.contactWebsite, type: 'readonly' },
  { local: 'contact_address_line_lookup', airtable: PORTAL_ACCESS.contactAddressLine, type: 'readonly' },
  { local: 'contact_city_lookup', airtable: PORTAL_ACCESS.contactCity, type: 'readonly' },
  { local: 'contact_state_lookup', airtable: PORTAL_ACCESS.contactState, type: 'readonly' },
  { local: 'contact_country_lookup', airtable: PORTAL_ACCESS.contactCountry, type: 'readonly' },
]

// ─── Portal Logs ─────────────────────────────────────────────

const PORTAL_LOG_MAPPINGS: FieldMapping[] = [
  { local: 'auto_id', airtable: PORTAL_LOGS.id, type: 'number' },
  { local: 'client_email', airtable: PORTAL_LOGS.clientEmail, type: 'readonly' },
  { local: 'client_name', airtable: PORTAL_LOGS.clientName, type: 'readonly' },
  { local: 'company', airtable: PORTAL_LOGS.company, type: 'readonly' },
  { local: 'ip_address', airtable: PORTAL_LOGS.ipAddress, type: 'text' },
  { local: 'city', airtable: PORTAL_LOGS.city, type: 'text' },
  { local: 'region', airtable: PORTAL_LOGS.region, type: 'text' },
  { local: 'country', airtable: PORTAL_LOGS.country, type: 'text' },
  { local: 'user_agent', airtable: PORTAL_LOGS.userAgent, type: 'text' },
  { local: 'clarity_session', airtable: PORTAL_LOGS.claritySession, type: 'text' },
  { local: 'page_url', airtable: PORTAL_LOGS.pageUrl, type: 'text' },
  { local: 'timestamp', airtable: PORTAL_LOGS.timestamp, type: 'text' },
]

// ─── Exported converter map ──────────────────────────────────

export const TABLE_CONVERTERS: Record<string, {
  mappings: FieldMapping[]
  fromAirtable: (record: AirtableRecord) => Record<string, unknown>
  toAirtable: (record: Record<string, unknown>) => Record<string, unknown>
}> = {}

const allTables: Array<[string, FieldMapping[]]> = [
  ['contacts', CONTACT_MAPPINGS],
  ['companies', COMPANY_MAPPINGS],
  ['opportunities', OPPORTUNITY_MAPPINGS],
  ['tasks', TASK_MAPPINGS],
  ['proposals', PROPOSAL_MAPPINGS],
  ['projects', PROJECT_MAPPINGS],
  ['interactions', INTERACTION_MAPPINGS],
  ['imported_contacts', IMPORTED_CONTACT_MAPPINGS],
  ['specialties', SPECIALTY_MAPPINGS],
  ['portal_access', PORTAL_ACCESS_MAPPINGS],
  ['portal_logs', PORTAL_LOG_MAPPINGS],
]

for (const [name, mappings] of allTables) {
  TABLE_CONVERTERS[name] = {
    mappings,
    fromAirtable: (record) => airtableToLocal(record, mappings),
    toAirtable: (record) => localToAirtable(record, mappings),
  }
}

/**
 * Parse a collaborator field value to extract the display name.
 * Handles both new JSON format ({"id":"usrXXX","name":"John"}) and legacy plain strings.
 */
export function parseCollaboratorDisplayName(val: unknown): string | null {
  if (!val || typeof val !== 'string') return null
  try {
    const parsed = JSON.parse(val)
    if (parsed && typeof parsed === 'object' && parsed.name) return parsed.name
  } catch {
    // Legacy plain string — return as-is
    return val || null
  }
  return val
}
