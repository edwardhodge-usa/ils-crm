import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'company_name', label: 'Company Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'Basic Info',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other', 'Culture', 'Sports', 'Cruise', 'Hospitality/Casino', 'Consulting', 'Theme Parks', 'Entertainment', 'Marketing', 'Design', 'Education', 'Real Estate', 'Media'] },

  { key: 'website', label: 'Website', type: 'url', section: 'Contact' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url', section: 'Contact' },

  { key: 'address', label: 'Address', type: 'text', section: 'Address' },
  { key: 'city', label: 'City', type: 'text', section: 'Address' },
  { key: 'state_region', label: 'State/Region', type: 'text', section: 'Address' },
  { key: 'country', label: 'Country', type: 'text', section: 'Address' },
  { key: 'postal_code', label: 'Postal Code', type: 'text', section: 'Address' },

  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Wynn Entertainment'] },
  { key: 'company_size', label: 'Size', type: 'singleSelect', section: 'CRM',
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'] },
  { key: 'annual_revenue', label: 'Annual Revenue', type: 'text', section: 'CRM' },
  { key: 'referred_by', label: 'Referred By', type: 'text', section: 'CRM' },

  { key: 'naics_code', label: 'NAICS Code', type: 'text', section: 'CRM' },
  { key: 'founding_year', label: 'Founding Year', type: 'number', section: 'CRM' },

  // Linked Records
  { key: 'contacts_ids', label: 'Contacts', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
  { key: 'projects_ids', label: 'Projects', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'projects', labelField: 'project_name' },
  { key: 'sales_opportunities_ids', label: 'Opportunities', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'opportunities', labelField: 'opportunity_name' },
  { key: 'proposals_ids', label: 'Proposals', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'proposals', labelField: 'proposal_name' },

  { key: 'company_description', label: 'Description', type: 'textarea', section: 'Notes' },
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function CompanyForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.companies,
    basePath: '/companies',
  })

  if (loading || initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={handleCancel}
      title="Company"
      isNew={isNew}
    />
  )
}
