import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EntityForm, { type FormFieldDef } from '../shared/EntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'project_name', label: 'Project Name', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'singleSelect', section: 'Details',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },

  { key: 'project_value', label: 'Project Value', type: 'currency', section: 'Financials' },
  { key: 'start_date', label: 'Start Date', type: 'date', section: 'Financials' },
  { key: 'end_date', label: 'End Date', type: 'date', section: 'Financials' },

  { key: 'location', label: 'Location', type: 'text', section: 'Location' },

  { key: 'description', label: 'Description', type: 'textarea', section: 'Notes' },
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function ProjectForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(id ? null : {})

  useEffect(() => {
    if (id) {
      window.electronAPI.projects.getById(id).then(result => {
        if (result.success && result.data) setInitialValues(result.data as Record<string, unknown>)
      })
    }
  }, [id])

  if (initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      await window.electronAPI.projects.update(id, values)
    } else {
      await window.electronAPI.projects.create(values)
    }
    navigate('/projects')
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={() => navigate('/projects')}
      title="Project"
      isNew={!id}
    />
  )
}
