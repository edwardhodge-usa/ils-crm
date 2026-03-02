import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { StageBadge } from '../shared/StageBadge'
import { EmptyState } from '../shared/EmptyState'
import { ContactStats } from './ContactStats'
import type { Stage } from '../shared/StageBadge'

interface Contact360Props {
  /** When provided, use this ID instead of URL params (embedded split-pane mode) */
  contactId?: string | null
  /** Called after successful delete in embedded mode */
  onDeleted?: () => void
}

export default function Contact360Page({ contactId, onDeleted }: Contact360Props = {}) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = contactId ?? routeId
  const isEmbedded = contactId !== undefined

  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [specialtyNames, setSpecialtyNames] = useState<string[]>([])
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setContact(null)
      setLinkedData({})
      setSpecialtyNames([])
      return
    }

    async function load() {
      const result = await window.electronAPI.contacts.getById(id!)
      if (result.success && result.data) {
        setContact(result.data as Record<string, unknown>)
      } else {
        setContact(null)
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

  // Empty state when no contact selected
  if (!id || !contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a contact" subtitle="Choose a contact from the list to view details" />
      </div>
    )
  }

  const openOpps = linkedData.opportunities || []
  const interactions = linkedData.interactions || []
  const meetingCount = interactions.filter(i => i.type === 'Meeting').length

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
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
      }}>
        {isEmbedded ? (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fullName}</span>
        ) : (
          <button
            onClick={() => navigate('/contacts')}
            className="flex items-center gap-1 text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors cursor-default"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Contacts
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => navigate(`/contacts/${id}/edit`)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 500,
              color: 'var(--color-accent)', background: 'var(--color-accent-translucent)',
              borderRadius: 6, border: 'none', cursor: 'default', fontFamily: 'inherit',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 500,
              color: 'var(--color-red)', background: 'rgba(255,59,48,0.15)',
              borderRadius: 6, border: 'none', cursor: 'default', fontFamily: 'inherit',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
            <Avatar name={fullName} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: -0.4 }}>
                {fullName}
              </div>
              {(Boolean(contact.job_title) || Boolean(contact.company)) && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {contact.job_title as string}
                  {Boolean(contact.job_title) && Boolean(contact.company) ? ' · ' : ''}
                  {contact.company as string}
                </div>
              )}
              {specialtyNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {specialtyNames.map((name: string) => (
                    <span
                      key={name}
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 4, background: 'var(--color-accent-translucent)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {[
              { label: 'Log Interaction', primary: true, onClick: () => {} },
              { label: 'Add to Opportunity', primary: false, onClick: () => {} },
              { label: 'Email', primary: false, onClick: () => { if (contact.email) window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`) } },
            ].map(action => (
              <button
                key={action.label}
                onClick={action.onClick}
                style={{
                  flex: 1, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                  borderRadius: 6, border: 'none', cursor: 'default', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', transition: 'opacity 150ms',
                  background: action.primary ? 'var(--color-accent)' : 'var(--bg-secondary)',
                  color: action.primary ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Contact Info section */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Contact Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {Boolean(contact.email) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12 }}>✉</span>
                {contact.email as string}
              </button>
            )}
            {Boolean(contact.mobile_phone) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12 }}>📱</span>
                {contact.mobile_phone as string}
              </div>
            )}
            {Boolean(contact.phone) && !contact.mobile_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12 }}>📞</span>
                {contact.phone as string}
              </div>
            )}
            {Boolean(contact.linkedin_url) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(contact.linkedin_url as string)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>in</span>
                {(contact.linkedin_url as string)
                  .replace('https://www.linkedin.com/in/', '')
                  .replace('https://linkedin.com/in/', '')}
              </button>
            )}
            {Boolean(contact.categorization) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12 }}>◈</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                }}>
                  {contact.categorization as string}
                </span>
              </div>
            )}
            {Boolean(contact.event_tags) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-tertiary)', width: 18, textAlign: 'center', fontSize: 12 }}>📍</span>
                {contact.event_tags as string}
              </div>
            )}
          </div>
        </div>

        {/* 4. Open Opportunities */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Open Opportunities
          </div>
          {openOpps.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No open opportunities</div>
          ) : (
            openOpps.slice(0, 3).map(opp => (
              <div
                key={opp.id as string}
                onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
                style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'default',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--separator)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(opp.opportunity_name as string) || '—'}
                  </div>
                  {Boolean(opp.sales_stage) && <StageBadge stage={opp.sales_stage as Stage} />}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>
                  {opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : '—'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 5. Recent Interactions */}
        <div style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Recent Interactions
          </div>
          {interactions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No interactions yet</div>
          ) : (
            interactions.slice(0, 3).map(interaction => (
              <div
                key={interaction.id as string}
                style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--separator)' }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {interaction.type === 'Call' ? '📞' :
                   interaction.type === 'Meeting' ? '👥' :
                   interaction.type === 'Email' ? '✉' : '💬'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {(interaction.type as string) || (interaction.subject as string) || 'Interaction'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {interaction.date as string}
                    </span>
                  </div>
                  {Boolean(interaction.summary) && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
          padding: '10px 16px', color: 'var(--color-red)',
        }}>
          <span style={{ fontSize: 13 }}>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            style={{ marginLeft: 16, color: 'inherit', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${fullName}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.contacts.delete(id!)
          if (result.success) {
            if (isEmbedded && onDeleted) {
              onDeleted()
            } else {
              navigate('/contacts')
            }
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
