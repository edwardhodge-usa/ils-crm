import { useState, useMemo } from 'react'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import useEntityList from '../../hooks/useEntityList'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = ['All', 'Review', 'Approved', 'Rejected', 'Needs Info', 'Duplicate'] as const
type StatusTab = typeof STATUS_TABS[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw)
  if (!s) return ''
  // ISO date: YYYY-MM-DD
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
  const name = (contact.contact_name as string | null) || 'Unnamed'
  const source = (contact.import_source as string | null) ?? null
  const status = (contact.onboarding_status as string | null) ?? null

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: status badge + source */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && (
          <span className="text-[10px]">
            <StatusBadge value={status} />
          </span>
        )}
        {Boolean(source) && (
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] leading-none flex-shrink-0 truncate max-w-[80px]">
            {source}
          </span>
        )}
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

  const name = (contact.contact_name as string | null) || 'Unnamed'
  const email = (contact.email as string | null) ?? null
  const company = (contact.company as string | null) ?? null
  const jobTitle = (contact.job_title as string | null) ?? null
  const phone = (contact.phone as string | null) ?? null
  const source = (contact.import_source as string | null) ?? null
  const importDate = contact.import_date ?? null
  const status = (contact.onboarding_status as string | null) ?? null
  const categorization = (contact.categorization as string | null) ?? null
  const notes = (contact.notes as string | null) ?? null

  const isAlreadyReviewed = status === 'Approved' || status === 'Rejected'

  const fields: Array<{ label: string; value: string | null }> = [
    { label: 'Email', value: email },
    { label: 'Company', value: company },
    { label: 'Job Title', value: jobTitle },
    { label: 'Phone', value: phone },
    { label: 'Source', value: source },
    { label: 'Imported', value: formatDate(importDate) || null },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[11px] text-[var(--text-tertiary)] truncate">
          {name}
        </div>
        {Boolean(status) && <StatusBadge value={status} />}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {name}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(categorization) && (
              <StatusBadge value={categorization} />
            )}
            {Boolean(jobTitle) && !categorization && (
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {jobTitle}
              </span>
            )}
          </div>
        </div>

        {/* Approve / Reject actions */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Review Action
          </div>
          {isAlreadyReviewed ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">
              Already {status?.toLowerCase()}. Use the buttons below to change the decision.
            </div>
          ) : (
            <div className="text-[12px] text-[var(--text-secondary)]">
              Review this contact and approve to add them to Contacts, or reject to archive.
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onApprove}
              className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-on-accent)] bg-[var(--color-green)] rounded-lg hover:opacity-90 transition-opacity cursor-default"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-[var(--text-on-accent)] bg-[var(--color-red)] rounded-lg hover:opacity-90 transition-opacity cursor-default"
            >
              Reject
            </button>
          </div>
        </div>

        {/* Contact details */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Details
          </div>
          <div className="space-y-1.5">
            {fields.map(({ label, value }) =>
              value ? (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)] w-[72px] flex-shrink-0 pt-px">
                    {label}
                  </span>
                  <span className="text-[12px] text-[var(--text-primary)] flex-1 min-w-0 break-words">
                    {value}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Notes */}
        {Boolean(notes) && (
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
              Notes
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {notes}
            </p>
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
        String(c.contact_name ?? '').toLowerCase().includes(q) ||
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
    <div className="flex h-full overflow-hidden">

      {/* List pane — 240px fixed */}
      <div className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Status tabs */}
        <div className="px-2 py-1.5 border-b border-[var(--separator)] flex-shrink-0">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedId(null) }}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full cursor-default transition-colors duration-[150ms] ${
                  activeTab === tab
                    ? 'bg-[var(--color-accent)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {tab}
                {tabCounts[tab] > 0 && (
                  <span className="ml-1 opacity-70">{tabCounts[tab]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
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
        message={`${action === 'approve' ? 'Approve' : 'Reject'} "${(selected?.contact_name as string) ?? 'this contact'}"?`}
        confirmLabel={action === 'approve' ? 'Approve' : 'Reject'}
        destructive={action === 'reject'}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}
