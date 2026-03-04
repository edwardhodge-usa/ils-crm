import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface LinkedRecordPickerProps {
  entityApi: { getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }> }
  labelField: string
  value: unknown
  onChange: (v: unknown) => void
  multiple?: boolean
  placeholder?: string
}

export default function LinkedRecordPicker({
  entityApi,
  labelField,
  value,
  onChange,
  multiple = true,
  placeholder = 'Search to link...',
}: LinkedRecordPickerProps) {
  const [allRecords, setAllRecords] = useState<Array<{ id: string; label: string }>>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse current linked IDs
  const linkedIds: string[] = (() => {
    if (!value) return []
    if (Array.isArray(value)) return value as string[]
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  })()

  // Fetch all records on mount
  useEffect(() => {
    let cancelled = false
    entityApi.getAll().then(res => {
      if (cancelled || !res.success || !res.data) return
      const records = (res.data as Array<Record<string, unknown>>).map(r => ({
        id: String(r.id || ''),
        label: String(r[labelField] || r.id || ''),
      })).filter(r => r.id)
      setAllRecords(records)
    })
    return () => { cancelled = true }
  }, [entityApi, labelField])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      width: rect.width,
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

  return (
    <div ref={containerRef} className="py-2">
      {/* Pills for linked records */}
      {linkedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedNames.map(({ id, label }) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent-translucent)] text-[var(--color-accent)] border border-[var(--color-accent)]/40"
              style={{ fontSize: 12 }}
            >
              {label}
              <button
                type="button"
                onClick={() => handleUnlink(id)}
                className="ml-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-default"
                style={{ fontSize: 11, lineHeight: 1 }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-[var(--bg-window)] border border-[var(--separator-opaque)] rounded-md px-3 py-1.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-colors cursor-default"
        style={{ fontSize: 13 }}
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={handleOpen}
        placeholder={placeholder}
      />

      {/* Dropdown via portal */}
      {open && dropdownPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 9999,
            background: 'var(--bg-window)',
            border: '1px solid var(--separator-opaque)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {filtered.length === 0 ? (
            <div
              className="px-3 py-2 text-[var(--text-tertiary)]"
              style={{ fontSize: 13 }}
            >
              No records found
            </div>
          ) : (
            filtered.slice(0, 50).map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleLink(r.id)}
                className="w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-default transition-colors"
                style={{ fontSize: 13 }}
              >
                {r.label}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
