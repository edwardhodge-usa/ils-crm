import { useState, useRef, useEffect } from 'react'

interface DateSuggestionPickerProps {
  value: string | null  // ISO date string (YYYY-MM-DD) or null
  onSave: (date: string | null) => Promise<void>
}

function getDateSuggestions(): { label: string; sublabel: string; date: string }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const display = (d: Date) => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // This Weekend = next Saturday (or today if already Saturday)
  const dayOfWeek = today.getDay()
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + (6 - dayOfWeek))

  // Next Week = next Monday
  const monday = new Date(today)
  monday.setDate(today.getDate() + ((8 - dayOfWeek) % 7 || 7))

  return [
    { label: 'Today', sublabel: display(today), date: fmt(today) },
    { label: 'Tomorrow', sublabel: display(tomorrow), date: fmt(tomorrow) },
    { label: 'This Weekend', sublabel: display(saturday), date: fmt(saturday) },
    { label: 'Next Week', sublabel: display(monday), date: fmt(monday) },
  ]
}

export default function DateSuggestionPicker({ value, onSave }: DateSuggestionPickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCustom(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (showCustom && inputRef.current) inputRef.current.focus()
  }, [showCustom])

  const handleSelect = async (date: string | null) => {
    setOpen(false)
    setShowCustom(false)
    await onSave(date)
  }

  const handleCustomConfirm = async () => {
    if (customValue) {
      await handleSelect(customValue)
    }
  }

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const suggestions = getDateSuggestions()

  const calIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="var(--text-tertiary)" strokeWidth="1.2" />
      <path d="M1.5 7h13" stroke="var(--text-tertiary)" strokeWidth="1.2" />
      <path d="M5 1.5v3M11 1.5v3" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Row display */}
      <div
        onClick={() => setOpen(!open)}
        className="cursor-default"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', minHeight: 36,
          background: 'transparent', transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
          Due Date
        </span>
        <span style={{
          fontSize: 13, fontWeight: 400,
          color: displayValue ? 'var(--text-primary)' : 'var(--text-tertiary)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {displayValue || 'Add Date'}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>⌃</span>
        </span>
      </div>

      {/* Suggestions popover */}
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute', right: 14, top: '100%', zIndex: 200,
            background: 'var(--bg-card)', border: '1px solid var(--separator)',
            borderRadius: 8, padding: 4,
            minWidth: 220, boxShadow: 'var(--shadow-menu)',
          }}
        >
          {!showCustom ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', padding: '6px 10px 4px' }}>
                Suggestions
              </div>
              {suggestions.map(s => (
                <div
                  key={s.label}
                  onClick={() => handleSelect(s.date)}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 6,
                    background: 'transparent', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {calIcon}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.sublabel}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
              <div
                onClick={() => { setShowCustom(true); setCustomValue(value || '') }}
                className="cursor-default"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 6,
                  background: 'transparent', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {calIcon}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Custom...</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Use the calendar to pick a date</div>
                </div>
              </div>
              {value && (
                <>
                  <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
                  <div
                    onClick={() => handleSelect(null)}
                    className="cursor-default"
                    style={{
                      padding: '7px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                      color: 'var(--color-red)', background: 'transparent', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Remove Date
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Pick a date
              </div>
              <input
                ref={inputRef}
                type="date"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomConfirm(); if (e.key === 'Escape') { setShowCustom(false); setOpen(false) } }}
                style={{
                  width: '100%', fontSize: 13, padding: '6px 8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--separator)',
                  borderRadius: 6, color: 'var(--text-primary)',
                  fontFamily: 'inherit', outline: 'none', cursor: 'default',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCustom(false) }}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    border: 'none', cursor: 'default',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCustomConfirm}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                    background: 'var(--color-accent)', color: 'var(--text-on-accent)',
                    border: 'none', cursor: 'default',
                  }}
                >
                  Set Date
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
