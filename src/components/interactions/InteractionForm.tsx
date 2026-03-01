import EntityForm, { type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'

const FIELDS: FormFieldDef[] = [
  { key: 'subject', label: 'Subject', type: 'text', required: true, section: 'Details' },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Details',
    options: ['📧 Email', '📞 Phone Call', '🤝 Meeting (In-Person)', '💻 Meeting (Virtual)', '🍽️ Lunch/Dinner', '🎪 Conference/Event', '📝 Note'] },
  { key: 'direction', label: 'Direction', type: 'singleSelect', section: 'Details',
    options: ['Outbound (we initiated)', 'Inbound (they initiated)'] },
  { key: 'date', label: 'Date', type: 'date', section: 'Details' },

  { key: 'summary', label: 'Summary', type: 'textarea', section: 'Notes' },
  { key: 'next_steps', label: 'Next Steps', type: 'textarea', section: 'Notes' },
]

export default function InteractionForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.interactions,
    basePath: '/interactions',
    defaults: { date: new Date().toISOString().split('T')[0] },
  })

  if (loading || initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-[13px]">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)] text-[13px]">{error}</div>
  }

  return (
    <EntityForm
      fields={FIELDS}
      initialValues={initialValues}
      onSave={handleSave}
      onCancel={handleCancel}
      title="Interaction"
      isNew={isNew}
    />
  )
}
