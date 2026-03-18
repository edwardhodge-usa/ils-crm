import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
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
  secondaryField?: string
  allowCreate?: boolean
  /** For multiSelect: 'dropdown' renders a dropdown panel instead of the flat pill-toggle grid */
  variant?: 'dropdown'
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

function MultiSelectField({
  label,
  labelStyle,
  options,
  selected,
  onChange,
  allowCreate,
}: {
  label: string
  labelStyle: React.CSSProperties
  options: string[]
  selected: string[]
  onChange: (v: unknown) => void
  allowCreate?: boolean
}) {
  const [newValue, setNewValue] = useState('')

  const handleAddNew = useCallback(() => {
    const trimmed = newValue.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) {
      onChange(JSON.stringify([...selected, trimmed]))
    }
    setNewValue('')
  }, [newValue, selected, onChange])

  return (
    <div className="py-2">
      <label style={{ ...labelStyle, display: 'block', width: 'auto', marginBottom: 4 }}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
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
      {allowCreate && (
        <div style={{ marginTop: 6 }}>
          <input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddNew()
              }
            }}
            placeholder="Add new..."
            style={{
              fontSize: 12,
              padding: '6px 8px',
              borderRadius: 6,
              border: 'none',
              borderBottom: '1px solid var(--separator)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'default',
              fontFamily: 'inherit',
              width: 140,
            }}
          />
        </div>
      )}
    </div>
  )
}

function MultiSelectDropdownField({
  label,
  labelStyle,
  options,
  selected,
  onChange,
  allowCreate,
}: {
  label: string
  labelStyle: React.CSSProperties
  options: string[]
  selected: string[]
  onChange: (v: unknown) => void
  allowCreate?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggleOption(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt]
    onChange(JSON.stringify(next))
  }

  function handleAddNew() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) {
      onChange(JSON.stringify([...selected, trimmed]))
    }
    setNewValue('')
  }

  return (
    <div className="py-2" ref={containerRef} style={{ position: 'relative' }}>
      <label style={{ ...labelStyle, display: 'block', width: 'auto', marginBottom: 4 }}>{label}</label>

      {/* Trigger row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
          minHeight: 30,
          padding: '4px 8px',
          borderRadius: 6,
          background: 'var(--bg-input)',
          border: open ? '1px solid var(--color-accent)' : '1px solid var(--separator-opaque)',
          cursor: 'default',
          transition: 'border-color 150ms',
          boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 2.5px var(--color-accent-translucent)' : 'none',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Select...</span>
        ) : (
          selected.map(s => (
            <span
              key={s}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 7px', borderRadius: 5,
                background: 'var(--color-accent-translucent)',
                color: 'var(--color-accent)',
                fontSize: 11, fontWeight: 500, lineHeight: 1.4,
              }}
            >
              {s}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); toggleOption(s) }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 9, lineHeight: 1, color: 'var(--color-accent)',
                  cursor: 'default', opacity: 0.7,
                }}
              >
                ✕
              </button>
            </span>
          ))
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          marginTop: 4,
          borderRadius: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--separator-opaque)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}>
          {/* Options list */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
            {options.map(opt => {
              const isChecked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px',
                    cursor: 'default',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt)}
                    style={{ accentColor: 'var(--color-accent)', cursor: 'default', flexShrink: 0 }}
                  />
                  <span>{opt}</span>
                </label>
              )
            })}
            {options.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                No options
              </div>
            )}
          </div>

          {/* allowCreate input */}
          {allowCreate && (
            <div style={{
              borderTop: '1px solid var(--separator-opaque)',
              padding: '6px 8px',
              display: 'flex', gap: 6,
            }}>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddNew() }
                  e.stopPropagation()
                }}
                placeholder="Add custom tag..."
                style={{
                  flex: 1, minWidth: 0,
                  fontSize: 12, padding: '5px 8px',
                  borderRadius: 5, border: '1px solid var(--separator-opaque)',
                  background: 'var(--bg-input)', color: 'var(--text-primary)',
                  outline: 'none', cursor: 'default', fontFamily: 'inherit',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--separator-opaque)'}
              />
              <button
                type="button"
                onClick={handleAddNew}
                style={{
                  padding: '0 10px', height: 28, borderRadius: 5,
                  background: 'var(--color-accent)', border: 'none',
                  fontSize: 12, fontWeight: 500, color: 'var(--text-on-accent)',
                  cursor: 'default', flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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

    // Merge known options with any custom values already selected (from allowCreate)
    const allOptions = [...(field.options || [])]
    for (const s of selected) {
      if (!allOptions.includes(s)) allOptions.push(s)
    }

    if (field.variant === 'dropdown') {
      return (
        <MultiSelectDropdownField
          label={field.label}
          labelStyle={labelStyle}
          options={allOptions}
          selected={selected}
          onChange={onChange}
          allowCreate={field.allowCreate}
        />
      )
    }

    return (
      <MultiSelectField
        label={field.label}
        labelStyle={labelStyle}
        options={allOptions}
        selected={selected}
        onChange={onChange}
        allowCreate={field.allowCreate}
      />
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
          secondaryField={field.secondaryField}
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
    field.type === 'url' ? 'text' :
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
