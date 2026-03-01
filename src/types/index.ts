// TypeScript interfaces for all 11 ILS CRM entities

export interface Contact {
  id: string
  contact_name: string | null
  first_name: string | null
  last_name: string | null
  job_title: string | null
  company: string | null
  imported_contact_name: string | null
  address_line: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  notes: string | null
  review_notes: string | null
  reason_for_rejection: string | null
  rate_info: string | null
  lead_note: string | null
  event_tags: string | null
  email: string | null
  phone: string | null
  mobile_phone: string | null
  work_phone: string | null
  linkedin_url: string | null
  website: string | null
  lead_score: number | null
  last_contact_date: string | null
  import_date: string | null
  review_completion_date: string | null
  qualification_status: string | null
  lead_source: string | null
  client_type: string | null
  industry: string | null
  import_source: string | null
  onboarding_status: string | null
  categorization: string | null
  quality_rating: string | null
  reliability_rating: string | null
  partner_status: string | null
  partner_type: string | null
  tags: string | null // JSON array of strings
  sync_to_contacts: boolean
  specialties_ids: string | null // JSON array of record IDs
  proposals_ids: string | null
  sales_opportunities_ids: string | null
  imported_contacts_ids: string | null
  interactions_ids: string | null
  tasks_ids: string | null
  projects_ids: string | null
  companies_ids: string | null
  projects_partner_vendor_ids: string | null
  portal_access_ids: string | null
  last_interaction_date: string | null
}

export interface Company {
  id: string
  company_name: string | null
  address: string | null
  city: string | null
  state_region: string | null
  country: string | null
  referred_by: string | null
  naics_code: string | null
  company_type: string | null
  company_size: string | null
  annual_revenue: string | null
  postal_code: string | null
  notes: string | null
  company_description: string | null
  website: string | null
  founding_year: number | null
  created_date: string | null
  type: string | null
  industry: string | null
  lead_source: string | null
  sales_opportunities_ids: string | null
  projects_ids: string | null
  contacts_ids: string | null
  proposals_ids: string | null
}

export interface Opportunity {
  id: string
  opportunity_name: string | null
  referred_by: string | null
  notes_about: string | null
  contract_milestones: string | null
  loss_notes: string | null
  deal_value: number | null
  expected_close_date: string | null
  next_meeting_date: string | null
  sales_stage: string | null
  probability: string | null
  quals_type: string | null
  lead_source: string | null
  win_loss_reason: string | null
  engagement_type: string | null // JSON array for multi-select
  qualifications_sent: boolean
  company_ids: string | null
  associated_contact_ids: string | null
  tasks_ids: string | null
  interactions_ids: string | null
  project_ids: string | null
  proposals_ids: string | null
  probability_value: number | null // formula (read-only)
}

export interface Task {
  id: string
  task: string | null
  notes: string | null
  due_date: string | null
  completed_date: string | null
  status: string | null
  type: string | null
  priority: string | null
  sales_opportunities_ids: string | null
  contacts_ids: string | null
  projects_ids: string | null
  proposal_ids: string | null
}

export interface Proposal {
  id: string
  proposal_name: string | null
  version: string | null
  client_feedback: string | null
  performance_metrics: string | null
  notes: string | null
  status: string | null
  template_used: string | null
  approval_status: string | null
  client_ids: string | null
  company_ids: string | null
  related_opportunity_ids: string | null
  tasks_ids: string | null
}

export interface Project {
  id: string
  project_name: string | null
  location: string | null
  description: string | null
  key_milestones: string | null
  lessons_learned: string | null
  contract_value: number | null
  start_date: string | null
  target_completion: string | null
  actual_completion: string | null
  status: string | null
  engagement_type: string | null // JSON array for multi-select
  sales_opportunities_ids: string | null
  client_ids: string | null
  tasks_ids: string | null
  primary_contact_ids: string | null
  contacts_ids: string | null
}

export interface Interaction {
  id: string
  subject: string | null
  summary: string | null
  next_steps: string | null
  date: string | null
  type: string | null
  direction: string | null
  contacts_ids: string | null
  sales_opportunities_ids: string | null
}

export interface ImportedContact {
  id: string
  imported_contact_name: string | null
  company: string | null
  first_name: string | null
  last_name: string | null
  job_title: string | null
  email: string | null
  event_tags: string | null
  address_line: string | null
  city: string | null
  state: string | null
  country: string | null
  company_founding_year: string | null
  company_naics_code: string | null
  company_type: string | null
  company_size: string | null
  company_industry: string | null
  company_annual_revenue: string | null
  company_street_address: string | null
  company_street_address_2: string | null
  company_city: string | null
  company_state: string | null
  company_country: string | null
  company_postal_code: string | null
  postal_code: string | null
  company_description: string | null
  note: string | null
  reason_for_rejection: string | null
  review_notes: string | null
  phone: string | null
  mobile_phone: string | null
  other_phone: string | null
  work_phone: string | null
  office_phone: string | null
  fax: string | null
  linkedin_url: string | null
  website: string | null
  contact_photo_url: string | null
  business_card_image_url: string | null
  import_date: string | null
  categorization: string | null
  onboarding_status: string | null
  import_source: string | null
  tags: string | null // JSON array
  sync_to_contacts: boolean
  specialties_ids: string | null
  related_crm_contact_ids: string | null
}

export interface Specialty {
  id: string
  specialty: string | null
  imported_contacts_ids: string | null
  contacts_ids: string | null
}

export interface PortalAccess {
  id: string
  name: string | null
  email: string | null
  page_address: string | null
  decision_maker: string | null
  company: string | null
  address: string | null
  primary_contact: string | null
  position_title: string | null
  industry: string | null
  notes: string | null
  phone_number: string | null
  website: string | null
  project_budget: number | null
  date_added: string | null
  expected_project_start_date: string | null
  follow_up_date: string | null
  status: string | null
  lead_source: string | null
  stage: string | null
  services_interested_in: string | null // JSON array
  contact_ids: string | null
  framer_page_url: string | null // formula (read-only)
}

export interface PortalLog {
  id: string
  auto_id: number | null
  client_email: string | null
  client_name: string | null
  company: string | null
  ip_address: string | null
  city: string | null
  region: string | null
  country: string | null
  user_agent: string | null
  clarity_session: string | null
  page_url: string | null
  timestamp: string | null
}

// ─── View/List Types ─────────────────────────────────────────

export interface ContactListItem {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  companyName: string | null
  qualityRating: number          // 1-5, maps to 5-dot rating
  specialtyNames: string[]       // display names from linked Specialties
  specialtyColors: string[]      // one color per specialty (same length)
  daysSinceContact: number | null
}

// ─── Sync Types ──────────────────────────────────────────────

export interface SyncStatus {
  table_name: string
  last_sync_at: string | null
  record_count: number
  status: 'idle' | 'syncing' | 'error'
  error: string | null
}

// ─── UI Types ────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'singleSelect'
  | 'multiSelect'
  | 'checkbox'
  | 'linkedRecord'
  | 'readonly'
  | 'attachment'
  | 'collaborator'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  airtableFieldId: string
  options?: string[]
  linkedTable?: string
  readOnly?: boolean
  section?: string
}
