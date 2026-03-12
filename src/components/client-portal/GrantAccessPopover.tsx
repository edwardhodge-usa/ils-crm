import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface GrantAccessPopoverProps {
  pageAddress: string
  onGrant: (contactId: string, name: string, email: string) => Promise<void>
  onClose: () => void
  position: { x: number; y: number }
}

interface ContactRecord {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  companies_ids: string | null
}

export default function GrantAccessPopover({
  pageAddress: _pageAddress,
  onGrant,
  onClose,
  position,
}: GrantAccessPopoverProps) {
  void _pageAddress
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [companyNameMap, setCompanyNameMap] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  // Load contacts and companies on mount
  useEffect(() => {
    async function load() {
      const [contactsRes, companiesRes] = await Promise.all([
        window.electronAPI.contacts.getAll(),
        window.electronAPI.companies.getAll(),
      ])
      if (contactsRes.success && Array.isArray(contactsRes.data)) {
        setContacts(
          (contactsRes.data as Record<string, unknown>[]).map((c) => ({
            id: c.id as string,
            first_name: (c.first_name as string | null) ?? null,
            last_name: (c.last_name as string | null) ?? null,
            email: (c.email as string | null) ?? null,
            companies_ids: (c.companies_ids as string | null) ?? null,
          }))
        )
      }
      if (companiesRes.success && Array.isArray(companiesRes.data)) {
        const map = new Map<string, string>()
        for (const co of companiesRes.data as Record<string, unknown>[]) {
          const rec = co
          if (rec.company_name) {
            map.set(rec.id as string, rec.company_name as string)
          }
        }
        setCompanyNameMap(map)
      }
    }
    load()
  }, [])

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  // Escape key closes popover
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Keep popover within viewport
  useEffect(() => {
    if (!popoverRef.current) return
    const rect = popoverRef.current.getBoundingClientRect()
    const el = popoverRef.current
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`
    }
  }, [contacts, showNewForm])

  // Resolve company name from linked record IDs
  function getCompanyName(companiesIds: string | null): string | null {
    if (!companiesIds) return null
    try {
      const ids =
        typeof companiesIds === 'string' ? JSON.parse(companiesIds) : companiesIds
      if (Array.isArray(ids) && ids.length > 0) {
        return companyNameMap.get(ids[0]) || null
      }
    } catch {
      /* ignore parse errors */
    }
    return null
  }

  // Filtered contacts based on search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return contacts
    return contacts.filter((c) => {
      const first = (c.first_name || '').toLowerCase()
      const last = (c.last_name || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      return first.includes(q) || last.includes(q) || email.includes(q)
    })
  }, [contacts, search])

  function handleSelectContact(contact: ContactRecord) {
    const name = [(contact.first_name || ''), (contact.last_name || '')]
      .filter(Boolean)
      .join(' ')
    onGrant(contact.id, name, contact.email || '')
  }

  async function handleCreateAndGrant() {
    if (!newFirst.trim() && !newLast.trim()) return
    if (!newEmail.trim()) return
    setSaving(true)
    try {
      const res = await window.electronAPI.contacts.create({
        first_name: newFirst.trim(),
        last_name: newLast.trim(),
        email: newEmail.trim(),
      })
      if (res.success && res.data) {
        const name = [newFirst.trim(), newLast.trim()].filter(Boolean).join(' ')
        await onGrant(res.data as string, name, newEmail.trim())
      }
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-secondary)',
    borderRadius: 6,
    padding: '8px',
    fontSize: 13,
    border: '1px solid var(--separator)',
    outline: 'none',
    color: 'var(--text-primary)',
    cursor: 'default',
  }

  return createPortal(
    <>
      {/* Transparent backdrop for click-outside detection */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
        }}
        onMouseDown={onClose}
      />
      {/* Popover card */}
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          width: 320,
          background: 'var(--bg-primary)',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)',
          padding: 8,
          cursor: 'default',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <input
          ref={searchRef}
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />

        {/* Scrollable contact list */}
        <div
          style={{
            maxHeight: 300,
            overflowY: 'auto',
            marginTop: 6,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: '12px 8px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                cursor: 'default',
              }}
            >
              No contacts found
            </div>
          )}
          {filtered.map((contact) => {
            const name = [(contact.first_name || ''), (contact.last_name || '')]
              .filter(Boolean)
              .join(' ')
            const company = getCompanyName(contact.companies_ids)
            return (
              <div
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = ''
                }}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  cursor: 'default',
                  transition: 'background 100ms',
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {name || 'Unnamed Contact'}
                </div>
                {Boolean(contact.email) && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 1,
                    }}
                  >
                    {contact.email}
                  </div>
                )}
                {Boolean(company) && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      marginTop: 1,
                    }}
                  >
                    {company}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Separator */}
        <div
          style={{
            height: 1,
            background: 'var(--separator)',
            margin: '6px 0',
          }}
        />

        {/* Create New Contact toggle / form */}
        {!showNewForm ? (
          <div
            onClick={() => setShowNewForm(true)}
            style={{
              fontSize: 13,
              color: 'var(--color-accent)',
              padding: 8,
              textAlign: 'center',
              cursor: 'default',
              borderRadius: 6,
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ''
            }}
          >
            Create New Contact
          </div>
        ) : (
          <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="First Name"
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                style={inputStyle}
              />
            </div>
            <input
              type="text"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={handleCreateAndGrant}
              disabled={saving || (!newFirst.trim() && !newLast.trim()) || !newEmail.trim()}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                background: 'var(--color-accent)',
                color: 'var(--text-on-accent)',
                borderRadius: 6,
                border: 'none',
                cursor: 'default',
                opacity: saving || (!newFirst.trim() && !newLast.trim()) || !newEmail.trim() ? 0.5 : 1,
                transition: 'opacity 100ms',
              }}
            >
              {saving ? 'Saving...' : 'Save & Grant Access'}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
