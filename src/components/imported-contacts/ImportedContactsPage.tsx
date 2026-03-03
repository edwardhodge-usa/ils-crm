import { useState, useMemo } from 'react'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import useEntityList from '../../hooks/useEntityList'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = ['All', 'Review', 'Approved', 'Rejected', 'Needs Info', 'Duplicate'] as const
type StatusTab = typeof STATUS_TABS[number]

const AVATAR_COLORS = [
  { bg: 'rgba(0,122,255,0.18)', fg: '#007AFF' },       // systemBlue
  { bg: 'rgba(52,199,89,0.18)', fg: '#34C759' },        // systemGreen
  { bg: 'rgba(255,149,0,0.18)', fg: '#FF9500' },        // systemOrange
  { bg: 'rgba(255,45,85,0.18)', fg: '#FF2D55' },        // systemPink
  { bg: 'rgba(175,82,222,0.18)', fg: '#AF52DE' },       // systemPurple
  { bg: 'rgba(88,86,214,0.18)', fg: '#5856D6' },        // systemIndigo
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a display name from available fields */
function getContactName(contact: Record<string, unknown>): string {
  // Try the primary field first
  const imported = (contact.imported_contact_name as string | null)?.trim()
  if (imported) return imported

  // Try first_name + last_name
  const first = (contact.first_name as string | null)?.trim() ?? ''
  const last = (contact.last_name as string | null)?.trim() ?? ''
  if (first || last) return `${first} ${last}`.trim()

  // Fall back to email
  const email = (contact.email as string | null)?.trim()
  if (email) return email

  return 'Unnamed'
}

function formatDate(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw)
  if (!s) return ''
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return s
  const [, y, m, d] = match.map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── List row ─────────────────────────────────────────────────────────────────

interface ListRowProps {
  contact: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
}

function ImportedContactRow({ contact, isSelected, onClick }: ListRowProps) {
  const name = getContactName(contact)
  const source = (contact.import_source as string | null) ?? null
  const status = (contact.onboarding_status as string | null) ?? null
  const company = (contact.company as string | null) ?? null
  const email = (contact.email as string | null) ?? null
  const color = avatarColor(name)

  return (
    <div
      onClick={onClick}
      className="cursor-default"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderBottom: '1px solid var(--separator)',
        borderLeft: isSelected ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, background: color.bg, color: color.fg,
      }}>
        {initials(name)}
      </div>

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {Boolean(status) && <StatusBadge value={status} />}
          {Boolean(company) && !source && (
            <span style={{
              fontSize: 11, color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {company}
            </span>
          )}
          {Boolean(email) && !company && !source && (
            <span style={{
              fontSize: 11, color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {email}
            </span>
          )}
          {Boolean(source) && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 9999,
              background: 'rgba(88,86,214,0.10)',
              color: 'var(--color-accent)',
              fontWeight: 500,
              flexShrink: 0,
              marginLeft: 'auto',
            }}>
              {source}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailProps {
  contact: Record<string, unknown> | null
  onApprove: () => void
  onReject: () => void
}

function ImportedContactDetail({ contact, onApprove, onReject }: DetailProps) {
  if (!contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState
          title="Select a contact"
          subtitle="Choose a contact from the list to review and approve or reject"
        />
      </div>
    )
  }

  const name = getContactName(contact)
  const email = (contact.email as string | null) ?? null
  const company = (contact.company as string | null) ?? null
  const jobTitle = (contact.job_title as string | null) ?? null
  const phone = (contact.phone as string | null) ?? null
  const source = (contact.import_source as string | null) ?? null
  const importDate = contact.import_date ?? null
  const status = (contact.onboarding_status as string | null) ?? null
  const categorization = (contact.categorization as string | null) ?? null
  const notes = (contact.note as string | null) ?? null
  const importedBy = (contact.imported_by as string | null) ?? null
  const assignedAdmin = (contact.assigned_admin as string | null) ?? null

  const isAlreadyReviewed = status === 'Approved' || status === 'Rejected'
  const color = avatarColor(name)

  const fields: Array<{ label: string; value: string | null }> = [
    { label: 'Email', value: email },
    { label: 'Company', value: company },
    { label: 'Job Title', value: jobTitle },
    { label: 'Phone', value: phone },
    { label: 'Source', value: source },
    { label: 'Imported', value: formatDate(importDate) || null },
    { label: 'Imported By', value: importedBy },
    { label: 'Admin', value: assignedAdmin },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{name}</span>
        {Boolean(status) && <StatusBadge value={status} />}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero block */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 700, background: color.bg, color: color.fg,
            }}>
              {initials(name)}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {Boolean(categorization) && <StatusBadge value={categorization} />}
                {Boolean(jobTitle) && !categorization && (
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{jobTitle}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Approve / Reject actions */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Review Action
          </div>
          {isAlreadyReviewed ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Already {status?.toLowerCase()}. Use the buttons below to change the decision.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Review this contact and approve to add them to Contacts, or reject to archive.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={onApprove}
              className="cursor-default"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-on-accent)', background: 'var(--color-green)',
                borderRadius: 8, border: 'none',
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="cursor-default"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-on-accent)', background: 'var(--color-red)',
                borderRadius: 8, border: 'none',
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Reject
            </button>
          </div>
        </div>

        {/* Contact details — grouped container */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Details
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {fields.filter(f => f.value).map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                  padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--separator)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)',
                  textAlign: 'right', maxWidth: '60%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes — grouped container */}
        {Boolean(notes) && (
          <div style={{ padding: '14px 16px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Notes
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', padding: '10px 14px' }}>
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)',
                lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0,
              }}>
                {notes}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportedContactsPage() {
  const { data: contacts, loading, error, reload } = useEntityList(() => window.electronAPI.importedContacts.getAll())
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [search, setSearch] = useState('')

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length }
    STATUS_TABS.forEach(tab => {
      if (tab !== 'All') counts[tab] = contacts.filter(c => c.onboarding_status === tab).length
    })
    return counts
  }, [contacts])

  const filtered = useMemo(() => {
    let result = activeTab === 'All'
      ? contacts
      : contacts.filter(c => c.onboarding_status === activeTab)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        String(c.imported_contact_name ?? '').toLowerCase().includes(q) ||
        String(c.first_name ?? '').toLowerCase().includes(q) ||
        String(c.last_name ?? '').toLowerCase().includes(q) ||
        String(c.email ?? '').toLowerCase().includes(q) ||
        String(c.company ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [contacts, activeTab, search])

  const selected = filtered.find(c => c.id === selectedId) ?? null

  async function handleAction() {
    if (!selected || !action) return
    const id = selected.id as string
    if (action === 'approve') {
      await window.electronAPI.importedContacts.approve(id)
    } else {
      await window.electronAPI.importedContacts.reject(id, 'Rejected via CRM app')
    }
    setAction(null)
    reload()
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 300px fixed */}
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full text-[13px] px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Status tabs */}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {STATUS_TABS.map(tab => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedId(null) }}
                  className="cursor-default"
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 9999,
                    border: 'none',
                    fontFamily: 'inherit',
                    transition: 'background 150ms',
                    background: isActive ? 'var(--color-accent)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--text-on-accent)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = isActive ? 'var(--color-accent)' : 'var(--bg-tertiary)'
                  }}
                >
                  {tab}
                  {tabCounts[tab] > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>{tabCounts[tab]}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)] px-4 text-center">
              {search
                ? 'No contacts match your search.'
                : activeTab === 'All'
                  ? 'No imported contacts.'
                  : `No ${activeTab.toLowerCase()} contacts.`}
            </div>
          ) : (
            filtered.map(contact => (
              <ImportedContactRow
                key={contact.id as string}
                contact={contact}
                isSelected={selectedId === (contact.id as string)}
                onClick={() => setSelectedId(contact.id as string)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <ImportedContactDetail
        contact={selected}
        onApprove={() => setAction('approve')}
        onReject={() => setAction('reject')}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={action !== null}
        title={action === 'approve' ? 'Approve Contact' : 'Reject Contact'}
        message={`${action === 'approve' ? 'Approve' : 'Reject'} "${selected ? getContactName(selected) : 'this contact'}"?`}
        confirmLabel={action === 'approve' ? 'Approve' : 'Reject'}
        destructive={action === 'reject'}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}
