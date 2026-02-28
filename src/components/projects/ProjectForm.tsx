import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'project_name', label: 'Project Name', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },

  { key: 'project_value', label: 'Project Value', type: 'currency', section: 'Financials' },
  { key: 'start_date', label: 'Start Date', type: 'date', section: 'Financials' },
  { key: 'end_date', label: 'End Date', type: 'date', section: 'Financials' },

  { key: 'location', label: 'Location', type: 'text', section: 'Location' },

  { key: 'description', label: 'Description', type: 'textarea', section: 'Notes' },
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function ProjectForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.projects,
    basePath: '/projects',
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
      title="Project"
      isNew={isNew}
    />
  )
}
