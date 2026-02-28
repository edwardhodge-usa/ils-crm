import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EntityForm, { type FormFieldDef } from '../shared/EntityForm'

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
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(id ? null : {})

  useEffect(() => {
    if (id) {
      window.electronAPI.companies.getById(id).then(result => {
        if (result.success && result.data) setInitialValues(result.data as Record<string, unknown>)
      })
    }
  }, [id])

  if (initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      await window.electronAPI.companies.update(id, values)
    } else {
      await window.electronAPI.companies.create(values)
    }
    navigate(id ? `/companies/${id}` : '/companies')
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={() => navigate(id ? `/companies/${id}` : '/companies')}
      title="Company"
      isNew={!id}
    />
  )
}
