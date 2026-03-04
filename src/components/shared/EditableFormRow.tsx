import { useState, useEffect, useRef, useCallback } from 'react'

export type EditableFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'singleSelect'
  | 'multiSelect'
  | 'checkbox'
  | 'readonly'

export interface EditableField {
  key: string
  label: string
  type: EditableFieldType
  options?: string[]
  isLink?: boolean
}

interface EditableFormRowProps {
  field: EditableField
  value: unknown
  isLast?: boolean
  onSave: (key: string, value: unknown) => Promise<void>
}

function formatDisplayValue(value: unknown, type: EditableFieldType): string {
  if (value === null || value === undefined || value === '') return '—'

  switch (type) {
    case 'currency': {
      const num = Number(value)
      return isNaN(num) ? '—' : `$${num.toLocaleString()}`
    }
    case 'checkbox':
      return value === 1 || value === true ? 'Yes' : 'No'
    case 'multiSelect': {
      if (typeof value === 'string') {
        try {
          const arr = JSON.parse(value) as string[]
          return arr.length > 0 ? arr.join(', ') : '—'
        } catch {
          return value || '—'
        }
      }
      if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—'
      return '—'
    }
    case 'date': {
      const str = String(value)
      const d = new Date(str)
      if (isNaN(d.getTime())) return str
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    default:
      return String(value)
  }
}

function toEditValue(value: unknown, type: EditableFieldType): string {
  if (value === null || value === undefined) return ''
  if (type === 'currency' || type === 'number') {
    const num = Number(value)
    return isNaN(num) ? '' : String(num)
  }
  if (type === 'date') {
    const str = String(value)
    const d = new Date(str)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }
  return String(value)
}

function parseMultiSelectValue(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function EditableFormRow({ field, value, isLast = false, onSave }: EditableFormRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([])
  const [showMultiPopover, setShowMultiPopover] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEditValue(toEditValue(value, field.type))
    setMultiSelectValues(parseMultiSelectValue(value))
  }, [value, field.type])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (field.type === 'text' || field.type === 'number' || field.type === 'currency') {
        const input = inputRef.current as HTMLInputElement
        input.select()
      }
    }
  }, [editing, field.type])

  useEffect(() => {
    if (!showMultiPopover) return
    function handleOutsideClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowMultiPopover(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showMultiPopover])

  const doSave = useCallback(async (newValue: unknown) => {
    if (newValue === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(field.key, newValue)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }, [field.key, onSave, value])

  const handleTextSave = useCallback(() => {
    const trimmed = editValue.trim()
    if (field.type === 'number' || field.type === 'currency') {
      const num = trimmed === '' ? null : Number(trimmed)
      doSave(num)
    } else {
      doSave(trimmed || null)
    }
  }, [editValue, field.type, doSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditValue(toEditValue(value, field.type))
      setEditing(false)
    } else if (e.key === 'Enter' && field.type !== 'textarea') {
      handleTextSave()
    }
  }, [value, field.type, handleTextSave])

  const handleClick = () => {
    if (field.type === 'readonly' || saving) return

    if (field.type === 'checkbox') {
      const newVal = value === 1 || value === true ? 0 : 1
      setSaving(true)
      onSave(field.key, newVal).finally(() => setSaving(false))
      return
    }

    if (field.type === 'multiSelect') {
      setMultiSelectValues(parseMultiSelectValue(value))
      setShowMultiPopover(true)
      return
    }

    if (field.type === 'singleSelect') {
      setEditValue(toEditValue(value, field.type))
      setEditing(true)
      return
    }

    setEditValue(toEditValue(value, field.type))
    setEditing(true)
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value || null
    doSave(newVal)
  }

  const handleMultiToggle = (opt: string) => {
    setMultiSelectValues(prev =>
      prev.includes(opt) ? prev.filter(v => v !== opt) : [...prev, opt],
    )
  }

  const handleMultiDone = () => {
    setShowMultiPopover(false)
    const jsonVal = JSON.stringify(multiSelectValues)
    const currentJson = JSON.stringify(parseMultiSelectValue(value))
    if (jsonVal !== currentJson) {
      setSaving(true)
      onSave(field.key, jsonVal).finally(() => setSaving(false))
    }
  }

  const isInteractive = field.type !== 'readonly'
  const showChevron = field.type === 'singleSelect' || field.type === 'multiSelect'

  // --- Render edit controls ---

  const renderEditControl = () => {
    if (field.type === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={e => { if (e.key === 'Escape') { setEditValue(toEditValue(value, field.type)); setEditing(false) } }}
          style={{
            width: '100%', minHeight: 60, resize: 'vertical',
            background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
            borderRadius: 4, padding: '4px 8px',
            fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
            fontFamily: 'inherit', outline: 'none', cursor: 'default',
          }}
        />
      )
    }

    if (field.type === 'singleSelect') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={handleSelectChange}
          onBlur={() => setEditing(false)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
            borderRadius: 4, padding: '4px 8px',
            fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
            fontFamily: 'inherit', outline: 'none', cursor: 'default',
            maxWidth: 200, textAlign: 'right' as const,
          }}
        >
          <option value="">—</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'date') {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="date"
          value={editValue}
          onChange={e => { doSave(e.target.value || null) }}
          onBlur={() => setEditing(false)}
          onKeyDown={handleKeyDown}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
            borderRadius: 4, padding: '4px 8px',
            fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
            fontFamily: 'inherit', outline: 'none', cursor: 'default',
            maxWidth: 200,
          }}
        />
      )
    }

    // text, number, currency
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleTextSave}
        onKeyDown={handleKeyDown}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
          borderRadius: 4, padding: '4px 8px',
          fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
          fontFamily: 'inherit', outline: 'none', cursor: 'default',
          maxWidth: 200, textAlign: 'right' as const,
        }}
      />
    )
  }

  // --- Checkbox toggle ---

  if (field.type === 'checkbox') {
    const isOn = value === 1 || value === true
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
          {field.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Saving...</span>}
          <div
            onClick={handleClick}
            style={{
              width: 42, height: 24, borderRadius: 12,
              background: isOn ? 'var(--color-green)' : 'var(--bg-tertiary)',
              position: 'relative', cursor: 'default',
              transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 10,
              background: '#FFFFFF',
              position: 'absolute', top: 2,
              left: isOn ? 20 : 2,
              transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      </div>
    )
  }

  // --- Textarea editing layout (full-width) ---

  if (editing && field.type === 'textarea') {
    return (
      <div style={{
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        background: 'var(--bg-hover)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
          {field.label}
        </span>
        {renderEditControl()}
      </div>
    )
  }

  // --- Default row layout ---

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', minHeight: 36,
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        background: editing ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
        position: 'relative',
      }}
    >
      {/* Label */}
      <span style={{
        fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
        flexShrink: 0, marginRight: 12,
      }}>
        {field.label}
      </span>

      {/* Value / Edit control */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Saving...</span>}
          {renderEditControl()}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>Saving...</span>}
          <span
            onClick={isInteractive ? handleClick : undefined}
            onMouseEnter={e => { if (isInteractive) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (isInteractive) e.currentTarget.style.background = 'transparent' }}
            style={{
              fontSize: 13, fontWeight: 400,
              color: field.isLink ? 'var(--color-accent)' : 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: 5,
              cursor: 'default', borderRadius: 4, padding: '2px 6px', margin: '-2px -6px',
              transition: 'background 150ms',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              minWidth: 0, textAlign: 'right' as const,
              background: 'transparent',
            }}
          >
            {formatDisplayValue(value, field.type)}
            {showChevron && (
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4, flexShrink: 0 }}>⌃</span>
            )}
          </span>
        </div>
      )}

      {/* MultiSelect popover */}
      {showMultiPopover && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute', right: 14, top: '100%', zIndex: 200,
            background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
            borderRadius: 8, padding: 8,
            maxHeight: 200, overflowY: 'auto',
            minWidth: 180,
            boxShadow: 'var(--shadow-menu)',
          }}
        >
          {(field.options || []).map(opt => {
            const checked = multiSelectValues.includes(opt)
            return (
              <label
                key={opt}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 4,
                  cursor: 'default', fontSize: 13,
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  transition: 'background 150ms',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleMultiToggle(opt)}
                  style={{ cursor: 'default' }}
                />
                {opt}
              </label>
            )
          })}
          <button
            onClick={handleMultiDone}
            style={{
              width: '100%', marginTop: 8, padding: '6px 0',
              background: 'var(--color-accent)', color: 'var(--text-on-accent)',
              border: 'none', borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              cursor: 'default',
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
