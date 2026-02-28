import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'proposal_name', label: 'Proposal Name', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['Draft', 'Pending Approval', 'Approved', 'Sent to Client', 'Closed Won', 'Closed Lost', 'Submitted', 'In Review', 'Rejected'] },
  { key: 'template_used', label: 'Template Used', type: 'singleSelect', section: 'Details',
    options: ['Basic', 'Detailed', 'Custom', 'Standard Template', 'Custom Template', 'Marketing Template', 'IT Template', 'Service Template', 'Design Template', 'Security Template', 'Strategy Template', 'HR Template', 'Event Template'] },
  { key: 'approval_status', label: 'Approval Status', type: 'singleSelect', section: 'Details',
    options: ['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Pending', 'Under Review'] },

  { key: 'proposed_value', label: 'Proposed Value', type: 'currency', section: 'Financials' },
  { key: 'date_sent', label: 'Date Sent', type: 'date', section: 'Financials' },
  { key: 'valid_until', label: 'Valid Until', type: 'date', section: 'Financials' },

  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
  { key: 'scope_summary', label: 'Scope Summary', type: 'textarea', section: 'Notes' },
]

export default function ProposalForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.proposals,
    basePath: '/proposals',
    defaults: { status: 'Draft' },
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
      title="Proposal"
      isNew={isNew}
    />
  )
}
