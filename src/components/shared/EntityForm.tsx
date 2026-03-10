import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import LinkedRecordPicker from './LinkedRecordPicker'
import { parseIds } from '../../utils/linked-records'
import { normalizeUrl } from '../../utils/normalize-url'
import { CREATE_FIELD_REGISTRY } from '../../config/create-fields'

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
  | 'linkedRecord'

export interface FormFieldDef {
  key: string
  label: string
  type: FormFieldType
  options?: string[]
  placeholder?: string
  required?: boolean
  section?: string
  entityName?: string
  labelField?: string
}

interface EntityFormProps {
  fields: FormFieldDef[]
  initialValues: Record<string, unknown>
  onSave: (values: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  title: string
  isNew?: boolean
  /** Called when "+" is clicked on a linked record field. If provided, suppresses default picker. */
  onLinkedRecordOpen?: (fieldKey: string, entityName: string, labelField: string) => void
}

export interface EntityFormHandle {
  setFieldValue: (key: string, value: unknown) => void
}

const EntityForm = forwardRef<EntityFormHandle, EntityFormProps>(function EntityForm({
  fields,
  initialValues,
  onSave,
  onCancel,
  title,
  isNew,
  onLinkedRecordOpen,
}, ref) {
  const [values, setValues] = useState<Record<string, unknown>>({ ...initialValues })

  useImperativeHandle(ref, () => ({
    setFieldValue(key: string, value: unknown) {
      setValues(prev => ({ ...prev, [key]: value }))
    },
  }), [])
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
      // Auto-prepend https:// to URL fields missing a protocol
      const normalized = { ...values }
      for (const field of fields) {
        if (field.type === 'url' && typeof normalized[field.key] === 'string') {
          normalized[field.key] = normalizeUrl(normalized[field.key] as string)
        }
      }
      await onSave(normalized)
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Header — fixed */}
      <div className="flex items-center justify-between flex-shrink-0 px-6 py-3 border-b border-[var(--separator)]">
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
                    onLinkedRecordOpen={onLinkedRecordOpen}
                  />
                  {idx < sectionFields.length - 1 && (
                    <div className="border-b border-[var(--separator)] my-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </form>
  )
})

export default EntityForm

export function FieldRenderer({
  field,
  value,
  onChange,
  onLinkedRecordCreate,
  onLinkedRecordOpen,
}: {
  field: FormFieldDef
  value: unknown
  onChange: (v: unknown) => void
  /** When provided, linked record "+ Create" triggers this instead of simple inline create.
   *  Called with (fieldKey, entityName, labelField, searchText). Used by CreateRecordSheet for split-pane. */
  onLinkedRecordCreate?: (fieldKey: string, entityName: string, labelField: string, searchText: string) => void
  /** When provided, linked record "+" triggers this to open a browser pane instead of the inline picker. */
  onLinkedRecordOpen?: (fieldKey: string, entityName: string, labelField: string) => void
}) {
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
    flexShrink: 0, width: 120,
  }

  if (field.type === 'readonly') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label style={labelStyle}>{field.label}</label>
        <p className="text-[13px] text-[var(--text-secondary)]">{(value as string) || '—'}</p>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="py-2">
        <label style={{ ...labelStyle, display: 'block', width: 'auto', marginBottom: 4 }}>{field.label}</label>
        <textarea
          style={{
            width: '100%',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-input)',
            border: 'none',
            borderRadius: 6,
            padding: '8px 10px',
            outline: 'none',
            minHeight: 80,
            resize: 'vertical' as const,
            cursor: 'default',
            fontFamily: 'inherit',
            transition: 'box-shadow 150ms',
          }}
          onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--color-accent-translucent)'}
          onBlur={e => e.currentTarget.style.boxShadow = 'none'}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
        />
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-between min-h-[36px] py-1.5">
        <label style={labelStyle}>{field.label}</label>
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
      <div className="flex items-center min-h-[36px] py-1.5 gap-4">
        <label style={labelStyle}>{field.label}</label>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <select
            style={{
              appearance: 'none' as const,
              width: '100%',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'var(--bg-input)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 24px 5px 10px',
              height: 28,
              outline: 'none',
              cursor: 'default',
              textAlign: 'right' as const,
            }}
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value || null)}
          >
            <option value="">— Select —</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>⌃</span>
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
        <label style={{ ...labelStyle, display: 'block', width: 'auto', marginBottom: 4 }}>{field.label}</label>
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

  if (field.type === 'linkedRecord' && field.entityName && field.labelField) {
    // If parent wants to handle this linked record via a pane, render simple row
    if (onLinkedRecordOpen) {
      return (
        <LinkedRecordRow
          field={field}
          value={value}
          onChange={onChange}
          labelStyle={labelStyle}
          onOpen={() => onLinkedRecordOpen(field.key, field.entityName!, field.labelField!)}
        />
      )
    }

    const api = (window.electronAPI as unknown as Record<string, unknown>)[field.entityName] as
      { getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>; create: (v: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }> } | undefined
    if (!api) return null

    // Use registry for split-pane create sheet
    const registry = CREATE_FIELD_REGISTRY[field.entityName]

    // If parent provides onLinkedRecordCreate, use that for split-pane sub-creation
    const handleCreate = onLinkedRecordCreate
      ? async (name: string): Promise<string | null> => {
          onLinkedRecordCreate(field.key, field.entityName!, field.labelField!, name)
          return null // signal: don't link yet, the sub-create pane will handle it
        }
      : !registry
        ? async (name: string): Promise<string | null> => {
            const payload: Record<string, unknown> = { [field.labelField!]: name }
            if (field.entityName === 'contacts') {
              const parts = name.split(' ')
              payload.first_name = parts[0] || name
              payload.last_name = parts.slice(1).join(' ') || ''
              payload.contact_name = name
            }
            const res = await api.create(payload)
            if (res.success && res.data) return res.data as string
            return null
          }
        : undefined

    return (
      <div className="py-1.5">
        <LinkedRecordPicker
          entityApi={api}
          labelField={field.labelField}
          label={field.label}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          {...(handleCreate ? { onCreate: handleCreate } : {})}
          {...(registry ? {
            createFields: registry.fields,
            createTitle: registry.title,
            createApi: api,
          } : {})}
        />
      </div>
    )
  }

  const pillStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    border: 'none',
    borderRadius: 6,
    padding: '5px 10px',
    outline: 'none',
    cursor: 'default',
    transition: 'box-shadow 150ms',
    height: 28,
  }
  const focusRing = '0 0 0 2.5px var(--color-accent-translucent)'

  if (field.type === 'currency') {
    return (
      <div className="flex items-center min-h-[36px] py-1.5 gap-4">
        <label style={labelStyle}>{field.label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flexShrink: 0 }}>$</span>
          <input
            type="number"
            style={{ ...pillStyle, flex: 1, minWidth: 0, textAlign: 'right' }}
            onFocus={e => e.currentTarget.style.boxShadow = focusRing}
            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
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
      <div className="flex items-center min-h-[36px] py-1.5 gap-4">
        <label style={labelStyle}>{field.label}</label>
        <input
          type="number"
          style={{ ...pillStyle, flex: 1, minWidth: 0, textAlign: 'right' }}
          onFocus={e => e.currentTarget.style.boxShadow = focusRing}
          onBlur={e => e.currentTarget.style.boxShadow = 'none'}
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
    <div className="flex items-center justify-between min-h-[36px] py-1.5 gap-4">
      <label style={labelStyle}>{field.label}</label>
      <input
        type={inputType}
        style={{ ...pillStyle, flex: 1, minWidth: 0, textAlign: 'right' }}
        onFocus={e => e.currentTarget.style.boxShadow = focusRing}
        onBlur={e => e.currentTarget.style.boxShadow = 'none'}
        value={(value as string) || ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={field.placeholder || field.label}
        required={field.required}
      />
    </div>
  )
}

/** Simple linked record row: shows linked name(s) + "+" button that opens a pane */
function LinkedRecordRow({
  field,
  value,
  onChange,
  labelStyle,
  onOpen,
}: {
  field: FormFieldDef
  value: unknown
  onChange: (v: unknown) => void
  labelStyle: React.CSSProperties
  onOpen: () => void
}) {
  const [allRecords, setAllRecords] = useState<Array<{ id: string; label: string }>>([])
  const linkedIds: string[] = parseIds(value)

  useEffect(() => {
    const api = (window.electronAPI as unknown as Record<string, unknown>)[field.entityName!] as
      { getAll: () => Promise<{ success: boolean; data?: unknown[] }> } | undefined
    if (!api) return
    api.getAll().then(res => {
      if (!res.success || !res.data) return
      setAllRecords((res.data as Array<Record<string, unknown>>).map(r => ({
        id: String(r.id || ''),
        label: String(r[field.labelField!] || r.id || ''),
      })).filter(r => r.id))
    })
  }, [field.entityName, field.labelField])

  const linkedNames = linkedIds.map(id => {
    const rec = allRecords.find(r => r.id === id)
    return { id, label: rec?.label || '...' }
  })

  function handleUnlink(id: string) {
    const next = linkedIds.filter(i => i !== id)
    onChange(next.length > 0 ? JSON.stringify(next) : null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 36, padding: '6px 0', gap: 16 }}>
      <label style={labelStyle}>{field.label}</label>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {linkedNames.map(({ id, label }) => (
          <span
            key={id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6,
              background: 'var(--color-accent-translucent)',
              color: 'var(--color-accent)',
              fontSize: 12, fontWeight: 500,
            }}
          >
            {label}
            <button
              type="button"
              onClick={() => handleUnlink(id)}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 10, lineHeight: 1, color: 'var(--text-tertiary)', cursor: 'default',
              }}
            >
              ✕
            </button>
          </span>
        ))}
        {linkedNames.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>None</span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'transparent', border: 'none',
          fontSize: 16, lineHeight: 1,
          color: 'var(--color-accent)',
          cursor: 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        +
      </button>
    </div>
  )
}
