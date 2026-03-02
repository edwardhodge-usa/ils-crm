import { useState } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { FormField, inputClass } from './FormField'

const CATEGORIZATION_OPTIONS = [
  'Theater',
  'Film',
  'Live Events',
  'Television',
  'Music',
  'Corporate',
  'Sports',
  'Other',
]

interface NewContactFormData {
  firstName: string
  lastName: string
  company: string
  title: string
  categorization: string
  email: string
  mobile: string
  linkedin: string
  specialties: string
  eventWhereMet: string
  qualityRating: number
  notes: string
}

interface NewContactSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewContactFormData) => Promise<void>
}

const defaultForm: NewContactFormData = {
  firstName: '',
  lastName: '',
  company: '',
  title: '',
  categorization: '',
  email: '',
  mobile: '',
  linkedin: '',
  specialties: '',
  eventWhereMet: '',
  qualityRating: 0,
  notes: '',
}

export function NewContactSheet({ isOpen, onClose, onSave }: NewContactSheetProps) {
  const [form, setForm] = useState<NewContactFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set(field: keyof NewContactFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(form)
      setForm(defaultForm)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(defaultForm)
    onClose()
  }

  const canSave = form.firstName.trim().length > 0

  return (
    <Sheet isOpen={isOpen} onClose={handleCancel} title="New Contact">
      <div className="flex flex-col gap-4" style={{ width: 480 }}>

        {/* Row 1: First Name + Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" htmlFor="first-name">
            <input
              id="first-name"
              type="text"
              className={inputClass}
              placeholder="First"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
            />
          </FormField>
          <FormField label="Last Name" htmlFor="last-name">
            <input
              id="last-name"
              type="text"
              className={inputClass}
              placeholder="Last"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 2: Company */}
        <FormField label="Company" htmlFor="company">
          <input
            id="company"
            type="text"
            className={inputClass}
            placeholder="Organization"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
          />
        </FormField>

        {/* Row 3: Title + Categorization */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Title" htmlFor="title">
            <input
              id="title"
              type="text"
              className={inputClass}
              placeholder="Job title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </FormField>
          <FormField label="Categorization" htmlFor="categorization">
            <select
              id="categorization"
              className={inputClass}
              value={form.categorization}
              onChange={(e) => set('categorization', e.target.value)}
            >
              <option value="">Select…</option>
              {CATEGORIZATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 4: Email + Mobile */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              className={inputClass}
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </FormField>
          <FormField label="Mobile" htmlFor="mobile">
            <input
              id="mobile"
              type="tel"
              className={inputClass}
              placeholder="+1 (555) 000-0000"
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 5: LinkedIn URL */}
        <FormField label="LinkedIn" htmlFor="linkedin">
          <input
            id="linkedin"
            type="url"
            className={inputClass}
            placeholder="https://linkedin.com/in/…"
            value={form.linkedin}
            onChange={(e) => set('linkedin', e.target.value)}
          />
        </FormField>

        {/* Row 6: Specialties */}
        <FormField label="Specialties" htmlFor="specialties">
          <input
            id="specialties"
            type="text"
            className={inputClass}
            placeholder="Add specialty…"
            value={form.specialties}
            onChange={(e) => set('specialties', e.target.value)}
          />
        </FormField>

        {/* Row 7: Event / Where We Met */}
        <FormField label="Event / Where We Met" htmlFor="event-where-met">
          <input
            id="event-where-met"
            type="text"
            className={inputClass}
            placeholder="Conference, event, or context…"
            value={form.eventWhereMet}
            onChange={(e) => set('eventWhereMet', e.target.value)}
          />
        </FormField>

        {/* Row 8: Quality Rating */}
        <FormField label="Quality Rating">
          <div aria-label="Quality Rating" role="group" className="flex items-center gap-2 py-1">
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => set('qualityRating', i + 1 === form.qualityRating ? 0 : i + 1)}
                aria-label={`Rate ${i + 1} out of 5`}
                className="focus:outline-none"
              >
                <div
                  style={{ width: 10, height: 10 }}
                  className={`rounded-full transition-colors duration-150 ${
                    i < form.qualityRating
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--separator-strong)]'
                  }`}
                />
              </button>
            ))}
            {form.qualityRating > 0 && (
              <span className="text-[11px] text-[var(--text-label)] ml-1">
                {form.qualityRating}/5
              </span>
            )}
          </div>
        </FormField>

        {/* Row 9: Notes */}
        <FormField label="Notes" htmlFor="notes">
          <textarea
            id="notes"
            className={`${inputClass} min-h-[60px] resize-none`}
            placeholder="Any notes about this contact…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </FormField>

        {/* Footer */}
        {saveError && (
          <p className="text-[12px] text-red-500">{saveError}</p>
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
            disabled={!canSave || saving}
            className="px-4 py-1.5 text-[13px] font-medium text-[var(--text-on-accent)] bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
