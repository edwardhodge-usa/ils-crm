import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'task', label: 'Task', type: 'text', required: true, section: 'Details' },
  { key: 'status', label: 'Status', type: 'singleSelect', section: 'Details',
    options: ['To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled'] },
  { key: 'priority', label: 'Priority', type: 'singleSelect', section: 'Details',
    options: ['🔴 High', '🟡 Medium', '🟢 Low'] },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Details',
    options: ['Administrative', 'Follow-up Call', 'Follow-up Email', 'Internal Review', 'Other', 'Presentation Deck', 'Research', 'Schedule Meeting', 'Send Proposal', 'Send Qualifications'] },

  { key: 'due_date', label: 'Due Date', type: 'date', section: 'Dates' },
  { key: 'completed_date', label: 'Completed Date', type: 'date', section: 'Dates' },

  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
]

export default function TaskForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.tasks,
    basePath: '/tasks',
    defaults: { status: 'To Do' },
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
      title="Task"
      isNew={isNew}
    />
  )
}
