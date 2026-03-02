import { useState } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { FormField, inputClass } from './FormField'

type InteractionType = 'Call' | 'Meeting' | 'Email' | 'Text' | 'Other'

const INTERACTION_TYPES: { type: InteractionType; icon: string }[] = [
  { type: 'Call', icon: '📞' },
  { type: 'Meeting', icon: '👥' },
  { type: 'Email', icon: '✉️' },
  { type: 'Text', icon: '💬' },
  { type: 'Other', icon: '📝' },
]

const SHOW_DURATION: InteractionType[] = ['Call', 'Meeting']

export interface LogInteractionFormData {
  type: InteractionType | null
  contacts: string
  date: string
  duration: number | ''
  notes: string
  followUp: boolean
  followUpTaskName: string
  followUpDueDate: string
  followUpPriority: 'High' | 'Medium' | 'Low' | ''
}

interface LogInteractionSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: LogInteractionFormData) => Promise<void>
  defaultContact?: string
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

const defaultForm = (contact: string): LogInteractionFormData => ({
  type: null,
  contacts: contact,
  date: todayIso(),
  duration: '',
  notes: '',
  followUp: false,
  followUpTaskName: '',
  followUpDueDate: '',
  followUpPriority: '',
})

export function LogInteractionSheet({
  isOpen,
  onClose,
  onSave,
  defaultContact = '',
}: LogInteractionSheetProps) {
  const [form, setForm] = useState<LogInteractionFormData>(() => defaultForm(defaultContact))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set<K extends keyof LogInteractionFormData>(field: K, value: LogInteractionFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(form)
      setForm(defaultForm(defaultContact))
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to log interaction')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(defaultForm(defaultContact))
    onClose()
  }

  const showDuration = form.type !== null && SHOW_DURATION.includes(form.type)

  return (
    <Sheet isOpen={isOpen} onClose={handleCancel} title="Log Interaction">
      <div className="flex flex-col gap-4" style={{ width: 480 }}>

        {/* Type — 5 icon buttons */}
        <FormField label="Type">
          <div className="flex gap-2">
            {INTERACTION_TYPES.map(({ type, icon }) => {
              const isSelected = form.type === type
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => set('type', type)}
                  className={[
                    'flex-1 rounded-lg border p-2 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors duration-150',
                    isSelected
                      ? 'bg-[var(--color-accent-translucent)] border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-[var(--separator-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                  ].join(' ')}
                >
                  <span className="text-[18px] leading-none">{icon}</span>
                  {type}
                </button>
              )
            })}
          </div>
        </FormField>

        {/* Contact(s) */}
        <FormField label="Contact(s)" htmlFor="interaction-contacts">
          <input
            id="interaction-contacts"
            type="text"
            className={inputClass}
            placeholder="Contact name(s)"
            value={form.contacts}
            onChange={(e) => set('contacts', e.target.value)}
          />
        </FormField>

        {/* Date + Duration (conditional) */}
        <div className={showDuration ? 'grid grid-cols-2 gap-3' : ''}>
          <FormField label="Date" htmlFor="interaction-date">
            <input
              id="interaction-date"
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </FormField>
          {showDuration && (
            <FormField label="Duration" htmlFor="interaction-duration">
              <div className="flex items-center gap-2">
                <input
                  id="interaction-duration"
                  type="number"
                  min={1}
                  className={`${inputClass} flex-1`}
                  placeholder="30"
                  value={form.duration}
                  onChange={(e) =>
                    set('duration', e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
                <span className="text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                  min
                </span>
              </div>
            </FormField>
          )}
        </div>

        {/* Notes */}
        <FormField label="Notes" htmlFor="interaction-notes">
          <textarea
            id="interaction-notes"
            className={`${inputClass} min-h-[80px] resize-none`}
            placeholder="What was discussed…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </FormField>

        {/* Follow-up task toggle */}
        <div className="flex items-center gap-2">
          <input
            id="follow-up-toggle"
            type="checkbox"
            checked={form.followUp}
            onChange={(e) => set('followUp', e.target.checked)}
            className="w-4 h-4 accent-[var(--color-accent)]"
            aria-label="Add a follow-up task"
          />
          <label
            htmlFor="follow-up-toggle"
            className="text-[13px] text-[var(--text-secondary)] cursor-default select-none"
          >
            Add a follow-up task
          </label>
        </div>

        {/* Follow-up fields — inline expansion, no second sheet */}
        {form.followUp && (
          <div className="flex flex-col gap-3 pl-6 border-l-2 border-[var(--color-accent-translucent)]">
            <FormField label="Task Name" htmlFor="followup-task-name">
              <input
                id="followup-task-name"
                type="text"
                className={inputClass}
                placeholder="Follow up on…"
                value={form.followUpTaskName}
                onChange={(e) => set('followUpTaskName', e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Due Date" htmlFor="followup-due-date">
                <input
                  id="followup-due-date"
                  type="date"
                  className={inputClass}
                  value={form.followUpDueDate}
                  onChange={(e) => set('followUpDueDate', e.target.value)}
                />
              </FormField>
              <FormField label="Priority" htmlFor="followup-priority">
                <select
                  id="followup-priority"
                  className={inputClass}
                  value={form.followUpPriority}
                  onChange={(e) =>
                    set('followUpPriority', e.target.value as LogInteractionFormData['followUpPriority'])
                  }
                >
                  <option value="">Select…</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </FormField>
            </div>
          </div>
        )}

        {/* Footer */}
        {Boolean(saveError) && (
          <p className="text-[12px] text-[var(--color-red)]">{saveError}</p>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--separator)]">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] font-medium text-[var(--text-on-accent)] bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 transition-colors duration-150"
          >
            {saving ? 'Saving...' : 'Log Interaction'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
