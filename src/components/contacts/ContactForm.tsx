import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  // Basic Info
  { key: 'first_name', label: 'First Name', type: 'text', section: 'Basic Info' },
  { key: 'last_name', label: 'Last Name', type: 'text', section: 'Basic Info' },
  { key: 'job_title', label: 'Job Title', type: 'text', section: 'Basic Info' },
  { key: 'categorization', label: 'Categorization', type: 'singleSelect', section: 'Basic Info',
    options: ['Lead', 'Customer', 'Partner', 'Other', 'Unknown', 'Vendor', 'Talent'] },

  // Contact Details
  { key: 'email', label: 'Email', type: 'email', section: 'Contact Details' },
  { key: 'phone', label: 'Phone', type: 'phone', section: 'Contact Details' },
  { key: 'mobile_phone', label: 'Mobile Phone', type: 'phone', section: 'Contact Details' },
  { key: 'work_phone', label: 'Work Phone', type: 'phone', section: 'Contact Details' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url', section: 'Contact Details' },
  { key: 'website', label: 'Website', type: 'url', section: 'Contact Details' },

  // Address
  { key: 'address_line', label: 'Address', type: 'text', section: 'Address' },
  { key: 'city', label: 'City', type: 'text', section: 'Address' },
  { key: 'state', label: 'State', type: 'text', section: 'Address' },
  { key: 'country', label: 'Country', type: 'text', section: 'Address' },
  { key: 'postal_code', label: 'Postal Code', type: 'text', section: 'Address' },

  // CRM
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Website', 'Inbound', 'Outbound', 'Event', 'Social Media', 'Other', 'LinkedIn', 'Cold Call'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'CRM',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Real Estate', 'Consulting', 'Other', 'Hospitality', 'Logistics', 'Fitness', 'Legal', 'Media', 'Design', 'Venture Capital', 'Retail', 'Entertainment'] },
  { key: 'lead_score', label: 'Lead Score', type: 'number', section: 'CRM' },
  { key: 'last_contact_date', label: 'Last Contact Date', type: 'date', section: 'CRM' },

  // Partner/Vendor
  { key: 'partner_type', label: 'Partner Type', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['Fabricator', 'AV/Lighting', 'Scenic/Set Builder', 'Architect', 'Interior Designer', 'Graphic Designer', 'F&B Consultant', 'Tech/Interactive', 'Operations Consultant', 'Production Company', 'Freelancer/Individual', 'Other', 'Client'] },
  { key: 'partner_status', label: 'Partner Status', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['Active - Preferred', 'Active', 'Inactive', 'Do Not Use'] },
  { key: 'quality_rating', label: 'Quality Rating', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['5-star Excellent', '4-star Good', '3-star Average', '2-star Below Average', '1-star Poor'] },
  { key: 'reliability_rating', label: 'Reliability Rating', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['5-star Excellent', '4-star Good', '3-star Average', '2-star Below Average', '1-star Poor'] },

  // Notes
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
  { key: 'rate_info', label: 'Rate Info', type: 'textarea', section: 'Notes' },
  { key: 'lead_note', label: 'Lead Note', type: 'textarea', section: 'Notes' },
]

export default function ContactForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.contacts,
    basePath: '/contacts',
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
      title="Contact"
      isNew={isNew}
    />
  )
}
