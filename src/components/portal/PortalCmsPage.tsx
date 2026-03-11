import { useState, useMemo, useCallback } from 'react'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import { Avatar } from '../shared/Avatar'
import useEntityList from '../../hooks/useEntityList'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract a display string from a lookup value that may be a JSON array */
function resolveLookup(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        const arr = JSON.parse(val)
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      } catch { /* not JSON, use as-is */ }
    }
    return val
  }
  if (Array.isArray(val) && val.length > 0) return String(val[0])
  return String(val)
}

/** Get best display name for a Portal Access record */
function resolvedPortalName(row: Record<string, unknown>): string {
  const name = row.name as string | null
  if (name && name !== row.airtable_id) return name
  const contactName = resolveLookup(row.contact_name_lookup)
  if (contactName) return contactName
  const email = row.email as string | null
  if (email) return email
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  return name || 'Unnamed'
}

function resolvedPortalEmail(row: Record<string, unknown>): string | null {
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  return (row.email as string | null) || null
}

// ─── Toggle switch component ─────────────────────────────────────────────────

function ToggleSwitch({
  label,
  isOn,
  onToggle,
}: {
  label: string
  isOn: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        cursor: 'default',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-primary)',
        }}
      >
        {label}
      </span>
      <div
        onClick={onToggle}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: isOn ? 'var(--color-accent)' : 'rgba(128,128,128,0.2)',
          position: 'relative',
          cursor: 'default',
          transition: 'background 200ms ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: '#FFFFFF',
            position: 'absolute',
            top: 2,
            left: isOn ? 20 : 2,
            transition: 'left 200ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Inline editable text ────────────────────────────────────────────────────

function InlineEditableText({
  value,
  placeholder,
  fontSize,
  fontWeight,
  color,
  fontFamily,
  onSave,
}: {
  value: string | null
  placeholder: string
  fontSize: number
  fontWeight: number
  color: string
  fontFamily?: string
  onSave: (val: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  const handleSave = () => {
    const trimmed = draft.trim()
    onSave(trimmed || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) }
        }}
        style={{
          fontSize,
          fontWeight,
          color: 'var(--text-primary)',
          fontFamily: fontFamily || 'inherit',
          background: 'var(--bg-card)',
          border: '1px solid var(--color-accent)',
          borderRadius: 4,
          padding: '2px 6px',
          outline: 'none',
          cursor: 'default',
          width: '100%',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => { setDraft(value || ''); setEditing(true) }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      style={{
        fontSize,
        fontWeight,
        color: value ? color : 'var(--text-tertiary)',
        fontStyle: value ? 'normal' : 'italic',
        fontFamily: fontFamily || 'inherit',
        borderRadius: 4,
        padding: '2px 6px',
        margin: '-2px -6px',
        cursor: 'default',
        transition: 'background 150ms',
        background: 'transparent',
        lineHeight: 1.3,
      }}
    >
      {value || placeholder}
    </div>
  )
}

// ─── List row ────────────────────────────────────────────────────────────────

function ClientPageRow({
  record,
  isSelected,
  onClick,
}: {
  record: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
}) {
  const clientName = (record.client_name as string) || 'Unnamed'
  const slug = (record.page_address as string) || ''
  const sectionFlags = [
    Boolean(record.head),
    Boolean(record.v_prmagic),
    Boolean(record.v_highlight),
    Boolean(record.v_360),
    Boolean(record.v_full_l),
  ]

  return (
    <div
      onClick={onClick}
      style={{
        padding: '9px 12px',
        minHeight: 52,
        borderBottom: '1px solid var(--separator)',
        borderLeft: isSelected ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
        cursor: 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {clientName}
        </div>
        {Boolean(slug) && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            /{slug}
          </div>
        )}
      </div>

      {/* Section indicator dots */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
        {sectionFlags.map((on, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: on ? 'var(--color-green)' : 'var(--bg-tertiary)',
              transition: 'background 150ms',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Detail panel ────────────────────────────────────────────────────────────

function ClientPageDetail({
  record,
  portalRecords,
  onFieldSave,
}: {
  record: Record<string, unknown> | null
  portalRecords: Record<string, unknown>[]
  onFieldSave: (key: string, val: unknown) => Promise<void>
}) {
  if (!record) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-window)',
          borderLeft: '1px solid var(--separator)',
        }}
      >
        <EmptyState
          title="Select a client page"
          subtitle="Choose a page from the list to view and edit details"
        />
      </div>
    )
  }

  const clientName = (record.client_name as string) || ''
  const pageTitle = (record.page_title as string) || ''
  const pageSubtitle = (record.page_subtitle as string) || ''
  const slug = (record.page_address as string) || ''
  const deckUrl = (record.deck_url as string) || ''
  const preparedFor = record.prepared_for
  const thankYou = record.thank_you

  const fullUrl = slug
    ? `https://www.imaginelabstudios.com/ils-clients/${slug}`
    : ''

  // Cross-reference: Portal Access records matching this page's page_address
  const linkedContacts = useMemo(() => {
    if (!slug) return []
    return portalRecords.filter(
      r => (r.page_address as string)?.toLowerCase() === slug.toLowerCase()
    )
  }, [portalRecords, slug])

  // Toggle sections
  const sectionToggles: { key: string; label: string }[] = [
    { key: 'head', label: 'Header' },
    { key: 'v_prmagic', label: 'Practical Magic' },
    { key: 'v_highlight', label: 'Highlights' },
    { key: 'v_360', label: '360 Video' },
    { key: 'v_full_l', label: 'Full Length' },
  ]

  const handleToggle = (key: string) => {
    const current = record[key]
    onFieldSave(key, current ? 0 : 1)
  }

  const handleOpenUrl = () => {
    if (!fullUrl) return
    window.electronAPI.shell.openExternal(fullUrl)
  }

  const handleOpenDeck = () => {
    if (!deckUrl) return
    // Validate scheme
    const url = deckUrl.startsWith('http') ? deckUrl : `https://${deckUrl}`
    window.electronAPI.shell.openExternal(url)
  }

  // Editable fields for "Prepared For" and "Thank You"
  const contentFields: EditableField[] = [
    { key: 'prepared_for', label: 'Prepared For', type: 'text' },
    { key: 'thank_you', label: 'Thank You', type: 'text' },
  ]

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-window)',
        borderLeft: '1px solid var(--separator)',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* A. Page Header */}
        <div style={{ padding: '20px 20px 16px' }}>
          <InlineEditableText
            value={clientName}
            placeholder="Client Name"
            fontSize={20}
            fontWeight={700}
            color="var(--text-primary)"
            onSave={val => onFieldSave('client_name', val)}
          />
          <div style={{ marginTop: 4 }}>
            <InlineEditableText
              value={pageTitle}
              placeholder="Page title"
              fontSize={15}
              fontWeight={400}
              color="var(--text-secondary)"
              onSave={val => onFieldSave('page_title', val)}
            />
          </div>
          <div style={{ marginTop: 2 }}>
            <InlineEditableText
              value={pageSubtitle}
              placeholder="Page subtitle"
              fontSize={13}
              fontWeight={400}
              color="var(--text-tertiary)"
              onSave={val => onFieldSave('page_subtitle', val)}
            />
          </div>
        </div>

        {/* B. Page URL Bar */}
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                imaginelabstudios.com/ils-clients/
              </span>
              <div style={{ minWidth: 0 }}>
                <InlineEditableText
                  value={slug}
                  placeholder="slug"
                  fontSize={13}
                  fontWeight={500}
                  color="var(--text-primary)"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  onSave={val => onFieldSave('page_address', val)}
                />
              </div>
            </div>
            {Boolean(slug) && (
              <button
                onClick={handleOpenUrl}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'var(--color-accent)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                Open
              </button>
            )}
          </div>
        </div>

        {/* C. Deck Link */}
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Presentation Deck
          </div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <InlineEditableText
                  value={deckUrl}
                  placeholder="No deck linked"
                  fontSize={13}
                  fontWeight={400}
                  color="var(--color-accent)"
                  onSave={val => onFieldSave('deck_url', val)}
                />
              </div>
              {Boolean(deckUrl) && (
                <button
                  onClick={handleOpenDeck}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--separator)',
                    borderRadius: 6,
                    cursor: 'default',
                    flexShrink: 0,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                >
                  Open Deck
                </button>
              )}
            </div>
          </div>
        </div>

        {/* D. Page Content Fields */}
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Page Content
          </div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {contentFields.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={field.key === 'prepared_for' ? preparedFor : thankYou}
                isLast={idx === contentFields.length - 1}
                onSave={onFieldSave}
              />
            ))}
          </div>
        </div>

        {/* E. Page Sections (toggle switches) */}
        <div style={{ padding: '0 20px 16px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            Page Sections
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              padding: '8px 14px',
            }}
          >
            {sectionToggles.map(t => (
              <ToggleSwitch
                key={t.key}
                label={t.label}
                isOn={Boolean(record[t.key])}
                onToggle={() => handleToggle(t.key)}
              />
            ))}
          </div>
        </div>

        {/* F. Contacts with Access */}
        <div style={{ padding: '0 20px 20px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Contacts with Access
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-tertiary)',
              }}
            >
              {linkedContacts.length}
            </span>
          </div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {linkedContacts.length === 0 ? (
              <div
                style={{
                  padding: '14px',
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--text-tertiary)',
                }}
              >
                (No contacts linked)
              </div>
            ) : (
              linkedContacts.map((contact, idx) => {
                const name = resolvedPortalName(contact)
                const email = resolvedPortalEmail(contact)
                return (
                  <div
                    key={(contact.id as string) || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      borderBottom:
                        idx < linkedContacts.length - 1
                          ? '1px solid var(--separator)'
                          : 'none',
                    }}
                  >
                    <Avatar name={name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </div>
                      {Boolean(email) && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {email}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PortalCmsPage() {
  const { data: clientPages, loading, error, reload } = useEntityList(() =>
    window.electronAPI.clientPages.getAll()
  )
  const { data: portalRecords } = useEntityList(() =>
    window.electronAPI.portalAccess.getAll()
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Filter and sort
  const filtered = useMemo(() => {
    const pages = clientPages as Record<string, unknown>[]
    const base = !search.trim()
      ? pages
      : pages.filter(p => {
          const q = search.toLowerCase()
          return (
            String(p.client_name ?? '').toLowerCase().includes(q) ||
            String(p.page_address ?? '').toLowerCase().includes(q) ||
            String(p.page_title ?? '').toLowerCase().includes(q)
          )
        })
    return base.sort((a, b) =>
      String(a.client_name ?? '').localeCompare(String(b.client_name ?? ''))
    )
  }, [clientPages, search])

  const selectedRecord = useMemo(
    () =>
      selectedId
        ? (clientPages as Record<string, unknown>[]).find(
            p => (p.id as string) === selectedId
          ) ?? null
        : null,
    [clientPages, selectedId]
  )

  const handleNew = useCallback(async () => {
    const res = await window.electronAPI.clientPages.create({})
    if (res.success && res.data) {
      reload()
      setSelectedId(res.data)
    }
  }, [reload])

  const handleFieldSave = useCallback(
    async (key: string, value: unknown) => {
      if (!selectedId) return
      const res = await window.electronAPI.clientPages.update(selectedId, {
        [key]: value,
      })
      if (res.success) reload()
    },
    [selectedId, reload]
  )

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          color: 'var(--color-red)',
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        background: 'var(--bg-window)',
      }}
    >
      {/* List panel */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--separator)',
          background: 'var(--bg-window)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Client Pages
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filtered.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => window.electronAPI.shell.openExternal('https://framer.com/projects/ImagineLab-Front-Page--qq2NfIkO8OdMKvVMZXJR-8RBFW?node=uzKrlTPBU')}
              style={{
                padding: '3px 8px', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: '1px solid var(--separator)',
                fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
                cursor: 'default',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Open Framer to sync Airtable changes and publish"
            >
              Sync & Publish
            </button>
            <button
              onClick={handleNew}
              style={{
                width: 24, height: 24, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none',
                fontSize: 18, fontWeight: 300, color: 'var(--color-accent)',
                cursor: 'default',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="New Page"
            >
              +
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid var(--separator)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages..."
            style={{
              flex: 1,
              fontSize: 12,
              padding: '5px 8px',
              borderRadius: 6,
              border: '1px solid var(--separator)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'default',
              fontFamily: 'inherit',
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {filtered.length}
          </span>
        </div>

        {/* List rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {search ? 'No pages match your search.' : 'No client pages yet.'}
            </div>
          ) : (
            filtered.map(page => (
              <ClientPageRow
                key={page.id as string}
                record={page}
                isSelected={(page.id as string) === selectedId}
                onClick={() => setSelectedId(page.id as string)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <ClientPageDetail
        record={selectedRecord}
        portalRecords={portalRecords as Record<string, unknown>[]}
        onFieldSave={handleFieldSave}
      />
    </div>
  )
}
