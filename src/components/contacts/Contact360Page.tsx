import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { EmptyState } from '../shared/EmptyState'
import { ContactStats } from './ContactStats'
import { PencilIcon } from '../shared/icons/PencilIcon'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'
import { containsId } from '../../utils/linked-records'

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
            title="Edit contact"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'default',
              background: 'none', color: 'var(--text-tertiary)', transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            style={{
              fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
              color: 'var(--color-red)', background: 'none',
              border: 'none', cursor: 'default', fontFamily: 'inherit',
              transition: 'background 150ms',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 18px' }}>

        {/* 1. Hero block */}
        <div style={{ padding: '18px 0 14px', borderBottom: '1px solid var(--separator)' }}>
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
                        fontSize: 11, fontWeight: 500, padding: '2px 8px',
                        borderRadius: 4, background: 'var(--color-accent-translucent)',
                        color: 'var(--color-accent)', opacity: 0.85,
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
                  flex: 1, padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  borderRadius: 8, border: 'none', cursor: 'default', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', transition: 'background 150ms',
                  background: action.primary ? 'var(--color-accent)' : 'var(--bg-secondary)',
                  color: action.primary ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  minHeight: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Contact Info — Apple form rows */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Contact Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {Boolean(contact.email) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Email</span>
                <button
                  onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                  style={{ fontSize: 13, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                >
                  {contact.email as string}
                </button>
              </div>
            )}
            {Boolean(contact.mobile_phone) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Mobile</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{contact.mobile_phone as string}</span>
              </div>
            )}
            {Boolean(contact.phone) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Phone</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{contact.phone as string}</span>
              </div>
            )}
            {Boolean(contact.linkedin_url) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>LinkedIn</span>
                <button
                  onClick={() => window.electronAPI.shell.openExternal(contact.linkedin_url as string)}
                  style={{ fontSize: 13, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                >
                  {(contact.linkedin_url as string)
                    .replace('https://www.linkedin.com/in/', '')
                    .replace('https://linkedin.com/in/', '')}
                </button>
              </div>
            )}
            {Boolean(contact.categorization) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--separator)', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Category</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
                  }}>
                    {contact.categorization as string}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>⌃</span>
                </div>
              </div>
            )}
            {Boolean(contact.event_tags) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', minHeight: 36 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>Event Tags</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{contact.event_tags as string}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Open Opportunities — linked records container */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Open Opportunities
          </div>
          {openOpps.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No open opportunities</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {openOpps.slice(0, 3).map((opp, idx) => (
                <div
                  key={opp.id as string}
                  onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: idx < Math.min(openOpps.length, 3) - 1 ? '1px solid var(--separator)' : undefined,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, background: 'rgba(191,90,242,0.10)', color: '#BF5AF2',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(opp.opportunity_name as string) || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                      {opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : '—'}
                      {Boolean(opp.sales_stage) && ` · ${opp.sales_stage as string}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Recent Interactions — linked records container */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Recent Interactions
          </div>
          {interactions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No interactions yet</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {interactions.slice(0, 3).map((interaction, idx) => (
                <div
                  key={interaction.id as string}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: idx < Math.min(interactions.length, 3) - 1 ? '1px solid var(--separator)' : undefined,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)', background: 'rgba(118,118,128,0.10)',
                  }}>
                    {interactionTypeIcon(interaction.type as string)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(interaction.type as string) || (interaction.subject as string) || 'Interaction'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                      {interaction.date as string}
                      {Boolean(interaction.summary) && ` · ${(interaction.summary as string).slice(0, 50)}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

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
