import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'opportunity_name', label: 'Opportunity Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'sales_stage', label: 'Sales Stage', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospecting', 'Qualified', 'Business Development', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] },
  { key: 'probability', label: 'Probability', type: 'singleSelect', section: 'Basic Info',
    options: ['Cold', 'Low', '02 Medium', '01 High', '04 FUTURE ROADMAP'] },

  { key: 'deal_value', label: 'Deal Value', type: 'currency', section: 'Financials' },
  { key: 'expected_close_date', label: 'Expected Close Date', type: 'date', section: 'Financials' },

  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support', 'Executive Producing'] },
  { key: 'quals_type', label: 'Quals Type', type: 'singleSelect', section: 'Details',
    options: ['Standard Capabilities Deck', 'Customized Quals', 'Both'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'Details',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Partnership'] },
  { key: 'win_loss_reason', label: 'Win/Loss Reason', type: 'singleSelect', section: 'Details',
    options: ['Won - Best Fit', 'Won - Relationship', 'Won - Price', 'Lost - Budget', 'Lost - Competitor', 'Lost - Timing', 'Lost - No Decision', 'Lost - Scope Mismatch'] },
  { key: 'referred_by', label: 'Referred By', type: 'text', section: 'Details' },
  { key: 'next_meeting_date', label: 'Next Meeting Date', type: 'date', section: 'Details' },
  { key: 'qualifications_sent', label: 'Qualifications Sent', type: 'checkbox', section: 'Details' },

  // Linked Records
  { key: 'company_ids', label: 'Company', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'companies', labelField: 'company_name' },
  { key: 'associated_contact_ids', label: 'Contacts', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'contacts', labelField: 'contact_name', secondaryField: 'company' },
  { key: 'project_ids', label: 'Projects', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'projects', labelField: 'project_name' },
  { key: 'proposals_ids', label: 'Proposals', type: 'linkedRecord', section: 'Linked Records',
    entityName: 'proposals', labelField: 'proposal_name' },

  { key: 'notes_about', label: 'Notes', type: 'textarea', section: 'Notes' },
  { key: 'contract_milestones', label: 'Contract Milestones', type: 'textarea', section: 'Notes' },
  { key: 'loss_notes', label: 'Loss Notes', type: 'textarea', section: 'Notes' },
]

export default function OpportunityForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.opportunities,
    basePath: '/pipeline',
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
      title="Opportunity"
      isNew={isNew}
    />
  )
}
