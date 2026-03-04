import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { FormFieldDef } from './EntityForm'
import CreateRecordSheet from './CreateRecordSheet'
import { parseIds } from '../../utils/linked-records'

interface LinkedRecordPickerProps {
  entityApi: { getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }> }
  labelField: string
  /** Secondary field to build display label (e.g. first_name + last_name for contacts) */
  labelFallbackFields?: string[]
  value: unknown
  onChange: (v: unknown) => void
  /** Legacy: simple create callback (name only) */
  onCreate?: (name: string) => Promise<string | null>
  /** Modal create: field definitions for the create form */
  createFields?: FormFieldDef[]
  /** Modal create: title for the create modal (e.g. "New Contact") */
  createTitle?: string
  /** Modal create: default values to pre-populate */
  createDefaults?: Record<string, unknown>
  /** Modal create: entity API with create method */
  createApi?: { create: (values: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }> }
  multiple?: boolean
  placeholder?: string
  label: string
}

export default function LinkedRecordPicker({
  entityApi,
  labelField,
  labelFallbackFields,
  value,
  onChange,
  onCreate,
  createFields,
  createTitle,
  createDefaults,
  createApi,
  multiple = true,
  placeholder = 'Search to link...',
  label,
}: LinkedRecordPickerProps) {
  const [allRecords, setAllRecords] = useState<Array<{ id: string; label: string }>>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [sheetSearchText, setSheetSearchText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasModalCreate = Boolean(createFields && createApi)
  const canCreate = Boolean(onCreate) || hasModalCreate

  // Parse current linked IDs
  const linkedIds = parseIds(value)

  function buildLabel(r: Record<string, unknown>): string {
    const primary = r[labelField]
    if (primary && String(primary).trim()) return String(primary)
    if (labelFallbackFields) {
      const parts = labelFallbackFields.map(f => r[f]).filter(Boolean)
      if (parts.length > 0) return parts.join(' ')
    }
    return String(r.id || '')
  }

  // Fetch all records on mount
  const refreshRecords = useCallback(() => {
    entityApi.getAll().then(res => {
      if (!res.success || !res.data) return
      const records = (res.data as Array<Record<string, unknown>>).map(r => ({
        id: String(r.id || ''),
        label: buildLabel(r),
      })).filter(r => r.id)
      setAllRecords(records)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityApi, labelField])

  useEffect(() => {
    refreshRecords()
  }, [refreshRecords])

  // Close dropdown on outside click (exclude the portal dropdown itself)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)
        && (!dropdownRef.current || !dropdownRef.current.contains(target))) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Position dropdown using portal
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    })
  }, [])

  function handleOpen() {
    updatePosition()
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function emitChange(ids: string[]) {
    onChange(ids.length > 0 ? JSON.stringify(ids) : null)
  }

  function handleLink(id: string) {
    if (multiple) {
      if (!linkedIds.includes(id)) {
        emitChange([...linkedIds, id])
      }
    } else {
      emitChange([id])
      setOpen(false)
      setSearch('')
    }
  }

  function handleUnlink(id: string) {
    emitChange(linkedIds.filter(i => i !== id))
  }

  async function handleCreate() {
    if (hasModalCreate) {
      // Capture search text before closing dropdown
      setSheetSearchText(search.trim())
      setOpen(false)
      setSearch('')
      setShowCreateSheet(true)
      return
    }
    // Legacy: simple name-only create
    if (!onCreate || !search.trim()) return
    setCreating(true)
    try {
      const newId = await onCreate(search.trim())
      if (newId) {
        refreshRecords()
        handleLink(newId)
        setSearch('')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleSheetSubmit(values: Record<string, unknown>): Promise<string | null> {
    if (!createApi) return null
    const res = await createApi.create(values)
    if (res.success && res.data) {
      const newId = res.data as string
      refreshRecords()
      handleLink(newId)
      setSearch('')
      setOpen(false)
      return newId
    }
    throw new Error(res.error || 'Failed to create record')
  }

  // Filter records: exclude already linked, match search
  const filtered = allRecords.filter(r =>
    !linkedIds.includes(r.id) &&
    r.label.toLowerCase().includes(search.toLowerCase())
  )

  // Resolve linked record names
  const linkedNames = linkedIds.map(id => {
    const rec = allRecords.find(r => r.id === id)
    return { id, label: rec?.label || id.slice(0, 8) + '...' }
  })

  const hasSearch = search.trim().length > 0

  // Build defaults for create sheet: pre-populate name field from captured search text
  const sheetDefaults = (() => {
    if (!sheetSearchText) return createDefaults || {}
    const base = { ...createDefaults }
    if (labelField === 'contact_name') {
      const parts = sheetSearchText.split(' ')
      base.first_name = parts[0] || ''
      base.last_name = parts.slice(1).join(' ') || ''
      base.contact_name = sheetSearchText
    } else {
      base[labelField] = sheetSearchText
    }
    return base
  })()

  return (
    <div
      ref={containerRef}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--separator)',
      }}
    >
      {/* Label row with + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: linkedNames.length > 0 || open ? 8 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
          {label}
        </span>
        {!open && (
          <button
            type="button"
            onClick={handleOpen}
            style={{
              width: 20, height: 20, borderRadius: 5,
              background: 'transparent', border: 'none',
              fontSize: 16, lineHeight: 1,
              color: 'var(--color-accent)',
              cursor: 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            +
          </button>
        )}
      </div>

      {/* Pills for linked records */}
      {linkedNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: open ? 8 : 0 }}>
          {linkedNames.map(({ id, label: name }) => (
            <span
              key={id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 5,
                background: 'var(--color-accent-translucent)',
                color: 'var(--color-accent)',
                fontSize: 12, fontWeight: 500,
              }}
            >
              {name}
              <button
                type="button"
                onClick={() => handleUnlink(id)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 10, lineHeight: 1,
                  color: 'var(--text-tertiary)',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Inline search input (shown when open) */}
      {open && (
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setSearch('') }
            if (e.key === 'Enter' && hasSearch && canCreate && filtered.length === 0) {
              e.preventDefault()
              handleCreate()
            }
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--color-accent)',
            borderRadius: 6, padding: '5px 10px',
            fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'inherit', outline: 'none',
            cursor: 'default',
          }}
        />
      )}

      {/* Dropdown via portal */}
      {open && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 10001,
            background: 'var(--bg-sheet)',
            border: '1px solid var(--separator-opaque)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            padding: '4px 0',
          }}
        >
          {filtered.length === 0 && !hasSearch && (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No records available
            </div>
          )}

          {filtered.length === 0 && hasSearch && !canCreate && (
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No matching records
            </div>
          )}

          {filtered.slice(0, 50).map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleLink(r.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '6px 12px', fontSize: 13,
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none', cursor: 'default',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {r.label}
            </button>
          ))}

          {/* Create new option */}
          {canCreate && hasSearch && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              style={{
                width: '100%', textAlign: 'left',
                padding: '6px 12px', fontSize: 13,
                color: 'var(--color-accent)',
                fontWeight: 500,
                background: 'transparent',
                border: 'none', cursor: 'default',
                borderTop: filtered.length > 0 ? '1px solid var(--separator)' : 'none',
                transition: 'background 150ms',
                opacity: creating ? 0.5 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {creating ? 'Creating...' : `+ Create "${search.trim()}"`}
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Create Record Sheet (modal) */}
      {showCreateSheet && createFields && createApi && (
        <CreateRecordSheet
          title={createTitle || 'New Record'}
          fields={createFields}
          defaults={sheetDefaults}
          onSubmit={handleSheetSubmit}
          onClose={() => { setShowCreateSheet(false); setSheetSearchText('') }}
        />
      )}
    </div>
  )
}
