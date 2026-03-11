import type { FormFieldDef } from '../components/shared/EntityForm'

/** Curated fields shown in the quick-create modal for each entity type.
 *  These are a subset of the full form fields — enough to create a useful record
 *  without overwhelming the user in a modal context. */

export const CONTACT_CREATE_FIELDS: FormFieldDef[] = [
  // Basic Info
  { key: 'first_name', label: 'First Name', type: 'text', section: 'Basic Info' },
  { key: 'last_name', label: 'Last Name', type: 'text', section: 'Basic Info' },
  { key: 'job_title', label: 'Job Title', type: 'text', section: 'Basic Info' },
  { key: 'categorization', label: 'Categorization', type: 'singleSelect', section: 'Basic Info',
    options: ['Lead', 'Customer', 'Partner', 'Other', 'Unknown', 'Vendor', 'Talent'] },

  // Contact Details
  { key: 'email', label: 'Email', type: 'email', section: 'Contact Details' },
  { key: 'mobile_phone', label: 'Mobile Phone', type: 'phone', section: 'Contact Details' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url', section: 'Contact Details' },

  // CRM
  { key: 'companies_ids', label: 'Company', type: 'linkedRecord', section: 'CRM',
    entityName: 'companies', labelField: 'company_name' },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Website', 'Inbound', 'Outbound', 'Event', 'Social Media', 'Other', 'LinkedIn', 'Cold Call'] },
]

export const COMPANY_CREATE_FIELDS: FormFieldDef[] = [
  // Basic Info
  { key: 'company_name', label: 'Company Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'Basic Info',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other', 'Culture', 'Sports', 'Cruise', 'Hospitality/Casino', 'Consulting', 'Theme Parks', 'Entertainment', 'Marketing', 'Design', 'Education', 'Real Estate', 'Media'] },

  // Contact
  { key: 'website', label: 'Website', type: 'url', section: 'Contact' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url', section: 'Contact' },

  // CRM
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Wynn Entertainment'] },
  { key: 'company_size', label: 'Size', type: 'singleSelect', section: 'CRM',
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'] },
]

export const PROJECT_CREATE_FIELDS: FormFieldDef[] = [
  // Details
  { key: 'project_name', label: 'Project Name', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },

  // Financials
  { key: 'contract_value', label: 'Contract Value', type: 'currency', section: 'Financials' },
  { key: 'start_date', label: 'Start Date', type: 'date', section: 'Financials' },
  { key: 'target_completion', label: 'Target Completion', type: 'date', section: 'Financials' },

  // Location
  { key: 'location', label: 'Location', type: 'text', section: 'Location' },

  // Linked Records
  { key: 'contacts_ids', label: 'Contacts', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
  { key: 'client_ids', label: 'Client', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
  { key: 'sales_opportunities_ids', label: 'Opportunities', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'opportunities', labelField: 'opportunity_name' },
]

export const PROPOSAL_CREATE_FIELDS: FormFieldDef[] = [
  // Details
  { key: 'proposal_name', label: 'Proposal Name', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['Draft', 'Pending Approval', 'Approved', 'Sent to Client', 'Closed Won', 'Closed Lost', 'Submitted', 'In Review', 'Rejected'] },
  { key: 'template_used', label: 'Template Used', type: 'singleSelect', section: 'Details',
    options: ['Basic', 'Detailed', 'Custom', 'Standard Template', 'Custom Template', 'Marketing Template', 'IT Template', 'Service Template', 'Design Template', 'Security Template', 'Strategy Template', 'HR Template', 'Event Template'] },
  { key: 'approval_status', label: 'Approval Status', type: 'singleSelect', section: 'Details',
    options: ['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Pending', 'Under Review'] },
  { key: 'version', label: 'Version', type: 'text', section: 'Details' },

  // Linked Records
  { key: 'client_ids', label: 'Client (Contact)', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
  { key: 'company_ids', label: 'Company', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'companies', labelField: 'company_name' },
  { key: 'related_opportunity_ids', label: 'Opportunity', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'opportunities', labelField: 'opportunity_name' },
]

export const OPPORTUNITY_CREATE_FIELDS: FormFieldDef[] = [
  // Basic Info
  { key: 'opportunity_name', label: 'Opportunity Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'sales_stage', label: 'Sales Stage', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospecting', 'Qualified', 'Business Development', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] },
  { key: 'probability', label: 'Probability', type: 'singleSelect', section: 'Basic Info',
    options: ['Cold', 'Low', '02 Medium', '01 High', '04 FUTURE ROADMAP'] },

  // Financials
  { key: 'deal_value', label: 'Deal Value', type: 'currency', section: 'Financials' },
  { key: 'expected_close_date', label: 'Expected Close Date', type: 'date', section: 'Financials' },

  // Details
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support', 'Executive Producing'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'Details',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Partnership'] },

  // Linked Records
  { key: 'company_ids', label: 'Company', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'companies', labelField: 'company_name' },
  { key: 'associated_contact_ids', label: 'Contacts', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
]

/** Registry: look up create fields and display name by entity API name */
export const CREATE_FIELD_REGISTRY: Record<string, { fields: FormFieldDef[]; title: string; labelField: string }> = {
  contacts:      { fields: CONTACT_CREATE_FIELDS,     title: 'New Contact',     labelField: 'contact_name' },
  companies:     { fields: COMPANY_CREATE_FIELDS,     title: 'New Company',     labelField: 'company_name' },
  projects:      { fields: PROJECT_CREATE_FIELDS,     title: 'New Project',     labelField: 'project_name' },
  proposals:     { fields: PROPOSAL_CREATE_FIELDS,    title: 'New Proposal',    labelField: 'proposal_name' },
  opportunities: { fields: OPPORTUNITY_CREATE_FIELDS, title: 'New Opportunity', labelField: 'opportunity_name' },
}
