import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'company_name', label: 'Company Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'Basic Info',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other', 'Culture', 'Sports', 'Cruise', 'Hospitality/Casino', 'Consulting', 'Theme Parks', 'Entertainment', 'Marketing', 'Design', 'Education', 'Real Estate', 'Media'] },

  { key: 'website', label: 'Website', type: 'url', section: 'Contact' },
  { key: 'phone', label: 'Phone', type: 'phone', section: 'Contact' },
  { key: 'email', label: 'Email', type: 'email', section: 'Contact' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url', section: 'Contact' },

  { key: 'address_line', label: 'Address', type: 'text', section: 'Address' },
  { key: 'city', label: 'City', type: 'text', section: 'Address' },
  { key: 'state', label: 'State', type: 'text', section: 'Address' },
  { key: 'country', label: 'Country', type: 'text', section: 'Address' },

  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Wynn Entertainment'] },
  { key: 'size', label: 'Size', type: 'text', section: 'CRM' },

  { key: 'description', label: 'Description', type: 'textarea', section: 'Notes' },
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function CompanyForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.companies,
    basePath: '/companies',
  })

  if (loading || initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-[#FF453A] text-[13px]">{error}</div>
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
