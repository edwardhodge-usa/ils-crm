import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { StageBadge } from '../shared/StageBadge'
import { EmptyState } from '../shared/EmptyState'
import { ContactStats } from './ContactStats'
import type { Stage } from '../shared/StageBadge'

export default function Contact360Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [specialtyNames, setSpecialtyNames] = useState<string[]>([])
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      const result = await window.electronAPI.contacts.getById(id)
      if (result.success && result.data) {
        setContact(result.data as Record<string, unknown>)
      }

      // Load linked records for tabs + specialties
      const [opps, tasks, proposals, interactions, specialtiesRes] = await Promise.all([
        window.electronAPI.opportunities.getAll(),
        window.electronAPI.tasks.getAll(),
        window.electronAPI.proposals.getAll(),
        window.electronAPI.interactions.getAll(),
        window.electronAPI.specialties.getAll(),
      ])

      const linked: Record<string, Record<string, unknown>[]> = {}

      function containsId(idsJson: unknown, targetId: string): boolean {
        if (!idsJson) return false
        try {
          const arr = JSON.parse(idsJson as string)
          return Array.isArray(arr) && arr.includes(targetId)
        } catch {
          return false
        }
      }

      if (opps.success && opps.data) {
        linked.opportunities = (opps.data as Record<string, unknown>[]).filter(o =>
          containsId(o.associated_contact_ids, id!)
        )
      }

      if (tasks.success && tasks.data) {
        linked.tasks = (tasks.data as Record<string, unknown>[]).filter(t =>
          containsId(t.contacts_ids, id!)
        )
      }

      if (proposals.success && proposals.data) {
        linked.proposals = (proposals.data as Record<string, unknown>[]).filter(p =>
          containsId(p.client_ids, id!)
        )
      }

      if (interactions.success && interactions.data) {
        linked.interactions = (interactions.data as Record<string, unknown>[]).filter(i =>
          containsId(i.contacts_ids, id!)
        )
      }

      setLinkedData(linked)

      // Resolve specialty names from IDs
      if (specialtiesRes.success && specialtiesRes.data && result.data) {
        const contactData = result.data as Record<string, unknown>
        try {
          const ids: string[] = JSON.parse((contactData.specialties_ids as string) || '[]')
          const allSpecialties = specialtiesRes.data as Record<string, unknown>[]
          const names = allSpecialties
            .filter(s => ids.includes(s.id as string))
            .map(s => s.specialty as string)
            .filter(Boolean)
          setSpecialtyNames(names)
        } catch { /* ignore parse errors */ }
      }
    }
    load()
  }, [id])

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a contact" subtitle="Choose a contact from the list to view details" />
      </div>
    )
  }

  const openOpps = linkedData.opportunities || []
  const interactions = linkedData.interactions || []

  const meetingCount = interactions.filter(i => i.type === 'Meeting').length

  // Compute days since last contact from last_contact_date field
  let daysSince: number | string = '—'
  if (contact.last_contact_date) {
    const lastDate = new Date(contact.last_contact_date as string)
    if (!isNaN(lastDate.getTime())) {
      const diffMs = Date.now() - lastDate.getTime()
      daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }
  }

  const stats = [
    { label: 'Open Opps', value: openOpps.length },
    { label: 'Meetings', value: meetingCount },
    { label: 'Days Since', value: daysSince },
  ]

  const fullName = (contact.contact_name as string) ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    'Unnamed Contact'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar with navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)]">
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-1 text-[12px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors cursor-default"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Contacts
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/contacts/${id}/edit`)}
            className="px-2.5 py-1 text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:opacity-80 transition-opacity cursor-default"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-2.5 py-1 text-[11px] font-medium text-[var(--color-red)] bg-[var(--color-red)]/15 rounded-md hover:bg-[var(--color-red)]/20 transition-colors cursor-default"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="flex items-start gap-3">
            <Avatar name={fullName} size={48} />
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-[var(--text-primary)] leading-tight">
                {fullName}
              </div>
              {(Boolean(contact.job_title) || Boolean(contact.company)) && (
                <div className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
                  {contact.job_title as string}
                  {Boolean(contact.job_title) && Boolean(contact.company) ? ' · ' : ''}
                  {contact.company as string}
                </div>
              )}
              {specialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {specialtyNames.map((name: string) => (
                    <span
                      key={name}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Action buttons row */}
        <div className="flex gap-2 px-4 py-2.5 border-b border-[var(--separator)]">
          {[
            { label: 'Log Interaction', onClick: () => {} },
            { label: 'Add to Opportunity', onClick: () => {} },
            { label: 'Email', onClick: () => { if (contact.email) window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`) } },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex-1 py-1.5 text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-lg hover:opacity-80 transition-opacity duration-[150ms] cursor-default"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* 3. Stats strip */}
        <ContactStats stats={stats} />

        {/* 4. Contact Info section */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">Contact Info</div>
          <div className="flex flex-col gap-2">
            {Boolean(contact.email) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                className="flex items-center gap-2 text-[12px] text-[var(--color-accent)] hover:underline text-left cursor-default"
              >
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">✉</span>
                {contact.email as string}
              </button>
            )}
            {Boolean(contact.mobile_phone) && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">📱</span>
                {contact.mobile_phone as string}
              </div>
            )}
            {Boolean(contact.phone) && !contact.mobile_phone && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">📞</span>
                {contact.phone as string}
              </div>
            )}
            {Boolean(contact.linkedin_url) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(contact.linkedin_url as string)}
                className="flex items-center gap-2 text-[12px] text-[var(--color-accent)] hover:underline truncate text-left cursor-default"
              >
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">in</span>
                {(contact.linkedin_url as string)
                  .replace('https://www.linkedin.com/in/', '')
                  .replace('https://linkedin.com/in/', '')}
              </button>
            )}
            {Boolean(contact.categorization) && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">◈</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  {contact.categorization as string}
                </span>
              </div>
            )}
            {Boolean(contact.event_tags) && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <span className="text-[var(--text-tertiary)] w-4 text-center text-[10px]">📍</span>
                {contact.event_tags as string}
              </div>
            )}
          </div>
        </div>

        {/* 5. Open Opportunities section */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">Open Opportunities</div>
          {openOpps.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No open opportunities</div>
          ) : (
            openOpps.slice(0, 3).map(opp => (
              <div
                key={opp.id as string}
                className="px-3 py-2 rounded-lg bg-[var(--bg-card)] mb-1.5 cursor-default"
                onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] font-medium text-[var(--text-primary)] leading-tight flex-1 truncate">
                    {(opp.opportunity_name as string) || '—'}
                  </div>
                  {Boolean(opp.sales_stage) && (
                    <StageBadge stage={opp.sales_stage as Stage} />
                  )}
                </div>
                <div className="text-[13px] font-bold text-[var(--text-primary)] mt-0.5">
                  {opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : '—'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 6. Recent Interactions section */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">Recent Interactions</div>
          {interactions.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No interactions yet</div>
          ) : (
            interactions.slice(0, 3).map(interaction => (
              <div
                key={interaction.id as string}
                className="flex gap-2 py-1.5 border-b border-[var(--separator)] last:border-0"
              >
                <div className="text-[12px] text-[var(--text-tertiary)] w-5 text-center flex-shrink-0">
                  {interaction.type === 'Call' ? '📞' :
                   interaction.type === 'Meeting' ? '👥' :
                   interaction.type === 'Email' ? '✉' : '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[var(--text-primary)]">
                      {(interaction.type as string) || (interaction.subject as string) || 'Interaction'}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
                      {interaction.date as string}
                    </span>
                  </div>
                  {Boolean(interaction.summary) && (
                    <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                      {interaction.summary as string}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Error banner */}
      {deleteError && (
        <div className="flex items-center justify-between bg-[var(--color-red)]/15 border border-[var(--color-red)]/30 px-4 py-3 text-[var(--color-red)]">
          <span className="text-[12px]">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="ml-4 hover:text-[var(--text-primary)] transition-colors cursor-default">✕</button>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${fullName}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.contacts.delete(id!)
          if (result.success) {
            navigate('/contacts')
          } else {
            setShowDelete(false)
            setDeleteError(result.error || 'Delete failed — please try again')
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
