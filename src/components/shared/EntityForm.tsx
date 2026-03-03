import { useState, useEffect, useRef } from 'react'

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'date'
  | 'singleSelect'
  | 'multiSelect'
  | 'checkbox'
  | 'readonly'

export interface FormFieldDef {
  key: string
  label: string
  type: FormFieldType
  options?: string[]
  placeholder?: string
  required?: boolean
  section?: string
}

interface EntityFormProps {
  fields: FormFieldDef[]
  initialValues: Record<string, unknown>
  onSave: (values: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  title: string
  isNew?: boolean
}

export default function EntityForm({
  fields,
  initialValues,
  onSave,
  onCancel,
  title,
  isNew,
}: EntityFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...initialValues })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Cmd+S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function setValue(key: string, value: unknown) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(values)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      console.error('[EntityForm] Save error:', msg)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  // Group fields by section
  const sections = new Map<string, FormFieldDef[]>()
  for (const field of fields) {
    const section = field.section || 'General'
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(field)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{isNew ? `New ${title}` : `Edit ${title}`}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-[var(--text-secondary)] bg-[var(--separator-opaque)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1.5 text-[var(--text-on-accent)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-[var(--color-red)]/15 border border-[var(--color-red)]/30 rounded-md text-[var(--color-red)]">
          {error}
        </div>
      )}

      {/* Sections */}
      {Array.from(sections.entries()).map(([sectionName, sectionFields]) => (
        <div key={sectionName} className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
          <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-4">{sectionName}</h3>
          <div className="flex flex-col">
            {sectionFields.map((field, idx) => (
              <div key={field.key}>
                <FieldRenderer
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                />
                {idx < sectionFields.length - 1 && (
                  <div className="border-b border-[var(--separator)] my-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </form>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const labelClass = 'text-[13px] font-normal text-[var(--text-primary)] flex-shrink-0'

  if (field.type === 'readonly') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label className={labelClass}>{field.label}</label>
        <p className="text-[13px] text-[var(--text-secondary)]">{(value as string) || '—'}</p>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="py-2">
        <label className={`${labelClass} block mb-1`}>{field.label}</label>
        <textarea
          className={`w-full bg-[var(--bg-window)] border border-[var(--separator-opaque)] rounded-md px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-colors min-h-[80px] resize-y text-left`}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label className={labelClass}>{field.label}</label>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--separator-opaque)] bg-[var(--bg-window)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
        />
      </div>
    )
  }

  if (field.type === 'singleSelect') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label className={labelClass}>{field.label}</label>
        <div className="relative flex items-center">
          <select
            className="appearance-none bg-transparent border-none text-[13px] text-[var(--text-primary)] outline-none cursor-default pr-5 text-right"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value || null)}
          >
            <option value="">— Select —</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className="absolute right-0 text-[10px] text-[var(--text-tertiary)] pointer-events-none">⌃</span>
        </div>
      </div>
    )
  }

  if (field.type === 'multiSelect') {
    const selected: string[] = (() => {
      if (!value) return []
      if (typeof value === 'string') {
        try { return JSON.parse(value) } catch { return [] }
      }
      return Array.isArray(value) ? value : []
    })()

    return (
      <div className="py-2">
        <label className={`${labelClass} block mb-1`}>{field.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map(opt => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? selected.filter(s => s !== opt)
                    : [...selected, opt]
                  onChange(JSON.stringify(next))
                }}
                className={`px-2 py-1 rounded-md transition-colors ${
                  isSelected
                    ? 'bg-[var(--color-accent-translucent)] text-[var(--color-accent)] border border-[var(--color-accent)]/40'
                    : 'bg-[var(--separator-opaque)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-hover)]'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'currency') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label className={labelClass}>{field.label}</label>
        <div className="relative flex items-center">
          <span className="text-[var(--text-tertiary)] mr-1 text-[13px]">$</span>
          <input
            type="number"
            className="bg-transparent border-none text-[13px] text-[var(--text-primary)] outline-none w-[120px] text-right"
            value={value != null ? String(value) : ''}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="0"
          />
        </div>
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label className={labelClass}>{field.label}</label>
        <input
          type="number"
          className="bg-transparent border-none text-[13px] text-[var(--text-primary)] outline-none w-[120px] text-right"
          value={value != null ? String(value) : ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.placeholder}
        />
      </div>
    )
  }

  // Default: text, email, phone, url, date
  const inputType =
    field.type === 'email' ? 'email' :
    field.type === 'date' ? 'date' :
    field.type === 'url' ? 'url' :
    field.type === 'phone' ? 'tel' :
    'text'

  return (
    <div className="flex items-center justify-between min-h-[36px] py-1.5">
      <label className={labelClass}>{field.label}</label>
      <input
        type={inputType}
        className="bg-transparent border-none text-[13px] text-[var(--text-primary)] outline-none flex-1 ml-4 text-right min-w-0"
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={field.placeholder}
        required={field.required}
      />
    </div>
  )
}
