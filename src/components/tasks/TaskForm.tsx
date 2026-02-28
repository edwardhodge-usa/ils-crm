import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EntityForm, { type FormFieldDef } from '../shared/EntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'task', label: 'Task', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled'] },
  { key: 'priority', label: 'Priority', type: 'singleSelect', section: 'Details',
    options: ['High', 'Medium', 'Low'] },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Details',
    options: ['Administrative', 'Follow-up Call', 'Follow-up Email', 'Internal Review', 'Other', 'Presentation Deck', 'Research', 'Schedule Meeting', 'Send Proposal', 'Send Qualifications'] },

  { key: 'due_date', label: 'Due Date', type: 'date', section: 'Dates' },
  { key: 'completed_date', label: 'Completed Date', type: 'date', section: 'Dates' },

  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function TaskForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(id ? null : { status: 'To Do' })

  useEffect(() => {
    if (id) {
      window.electronAPI.tasks.getById(id).then(result => {
        if (result.success && result.data) setInitialValues(result.data as Record<string, unknown>)
      })
    }
  }, [id])

  if (initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      await window.electronAPI.tasks.update(id, values)
    } else {
      await window.electronAPI.tasks.create(values)
    }
    navigate('/tasks')
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={() => navigate('/tasks')}
      title="Task"
      isNew={!id}
    />
  )
}
