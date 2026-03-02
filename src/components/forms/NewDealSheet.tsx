import { useState } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { FormField, inputClass } from './FormField'
import { StageSegment } from './StageSegment'
import type { Stage } from '@/components/shared/StageBadge'

const DEAL_TYPE_OPTIONS = ['New Business', 'Renewal', 'Expansion', 'Other'] as const

export interface NewDealFormData {
  dealName: string
  company: string
  contact: string
  value: number | ''
  closeDate: string
  stage: Stage | null
  probability: number
  dealType: string
}

interface NewDealSheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: NewDealFormData) => Promise<void>
}

const defaultForm: NewDealFormData = {
  dealName: '',
  company: '',
  contact: '',
  value: '',
  closeDate: '',
  stage: null,
  probability: 0,
  dealType: '',
}

export function NewDealSheet({ isOpen, onClose, onSave }: NewDealSheetProps) {
  const [form, setForm] = useState<NewDealFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set<K extends keyof NewDealFormData>(field: K, value: NewDealFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleStageChange(stage: Stage, probability: number) {
    setForm((prev) => ({ ...prev, stage, probability }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(form)
      setForm(defaultForm)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save deal')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(defaultForm)
    onClose()
  }

  const canSave = form.dealName.trim().length > 0

  return (
    <Sheet isOpen={isOpen} onClose={handleCancel} title="New Deal">
      <div className="flex flex-col gap-4" style={{ width: 480 }}>

        {/* Deal Name */}
        <FormField label="Deal Name" htmlFor="deal-name">
          <input
            id="deal-name"
            type="text"
            className={inputClass}
            placeholder="Deal name"
            value={form.dealName}
            onChange={(e) => set('dealName', e.target.value)}
          />
        </FormField>

        {/* Company + Contact */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Company" htmlFor="deal-company">
            <input
              id="deal-company"
              type="text"
              className={inputClass}
              placeholder="Organization"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
            />
          </FormField>
          <FormField label="Contact" htmlFor="deal-contact">
            <input
              id="deal-contact"
              type="text"
              className={inputClass}
              placeholder="Contact name"
              value={form.contact}
              onChange={(e) => set('contact', e.target.value)}
            />
          </FormField>
        </div>

        {/* Value + Close Date */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Value ($)" htmlFor="deal-value">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--text-secondary)] pointer-events-none">
                $
              </span>
              <input
                id="deal-value"
                type="number"
                min={0}
                className={`${inputClass} pl-6`}
                placeholder="0"
                value={form.value}
                onChange={(e) =>
                  set('value', e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </FormField>
          <FormField label="Close Date" htmlFor="deal-close-date">
            <input
              id="deal-close-date"
              type="date"
              className={inputClass}
              value={form.closeDate}
              onChange={(e) => set('closeDate', e.target.value)}
            />
          </FormField>
        </div>

        {/* Stage */}
        <FormField label="Stage">
          <StageSegment value={form.stage} onChange={handleStageChange} />
        </FormField>

        {/* Probability — auto-fills from stage, still manually editable */}
        <FormField label="Probability">
          <div className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] bg-[var(--color-accent-translucent)]">
            <span className="text-[11px] text-[var(--color-accent)] font-medium whitespace-nowrap">
              Auto from stage:
            </span>
            <input
              id="deal-probability"
              type="number"
              min={0}
              max={100}
              value={form.probability}
              onChange={(e) => set('probability', Number(e.target.value))}
              className="w-16 text-[var(--color-accent)] bg-transparent font-semibold text-[13px] border-none outline-none focus:outline-none"
            />
            <span className="text-[11px] text-[var(--color-accent)]">%</span>
          </div>
        </FormField>

        {/* Deal Type */}
        <FormField label="Deal Type" htmlFor="deal-type">
          <select
            id="deal-type"
            className={inputClass}
            value={form.dealType}
            onChange={(e) => set('dealType', e.target.value)}
          >
            <option value="">Select…</option>
            {DEAL_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </FormField>

        {/* Footer */}
        {Boolean(saveError) && (
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
            {saving ? 'Saving...' : 'Save Deal'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
