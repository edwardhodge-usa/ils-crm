import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EntityForm, { type FormFieldDef } from '../shared/EntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'opportunity_name', label: 'Opportunity Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'sales_stage', label: 'Sales Stage', type: 'singleSelect', section: 'Basic Info',
    options: ['Qualification', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'Initial Contact', 'Contract Sent', 'Development', 'Investment', 'Future Client'] },
  { key: 'probability', label: 'Probability', type: 'singleSelect', section: 'Basic Info',
    options: ['Cold', 'Low', '02 Medium', '01 High', '04 FUTURE ROADMAP'] },

  { key: 'deal_value', label: 'Deal Value', type: 'currency', section: 'Financials' },
  { key: 'expected_close_date', label: 'Expected Close Date', type: 'date', section: 'Financials' },

  { key: 'engagement_type', label: 'Engagement Type', type: 'singleSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support', 'Executive Producing'] },
  { key: 'quals_type', label: 'Quals Type', type: 'singleSelect', section: 'Details',
    options: ['Standard Capabilities Deck', 'Customized Quals', 'Both'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'Details',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Partnership'] },
  { key: 'win_loss_reason', label: 'Win/Loss Reason', type: 'singleSelect', section: 'Details',
    options: ['Won - Best Fit', 'Won - Relationship', 'Won - Price', 'Lost - Budget', 'Lost - Competitor', 'Lost - Timing', 'Lost - No Decision', 'Lost - Scope Mismatch'] },

  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
  { key: 'next_step', label: 'Next Step', type: 'textarea', section: 'Notes' },
]

export default function OpportunityForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(id ? null : {})

  useEffect(() => {
    if (id) {
      window.electronAPI.opportunities.getById(id).then(result => {
        if (result.success && result.data) setInitialValues(result.data as Record<string, unknown>)
      })
    }
  }, [id])

  if (initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      await window.electronAPI.opportunities.update(id, values)
    } else {
      await window.electronAPI.opportunities.create(values)
    }
    navigate('/pipeline')
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={() => navigate('/pipeline')}
      title="Opportunity"
      isNew={!id}
    />
  )
}
