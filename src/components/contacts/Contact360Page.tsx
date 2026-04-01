import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { EmptyState } from '../shared/EmptyState'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'
import { containsId } from '../../utils/linked-records'
import { stageBadgeTokens } from '../../config/stages'

/* ── Field definitions (unchanged) ── */

const ZONE3_DETAIL_FIELDS: EditableField[] = [
  { key: 'job_title', label: 'Title', type: 'text' },
  { key: 'office_phone', label: 'Office', type: 'text' },
  { key: 'website', label: 'Website', type: 'text', isLink: true },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
]

const ZONE2_CRM_FIELDS: EditableField[] = [
  { key: 'categorization', label: 'Category', type: 'multiSelect',
    options: ['Client', 'Prospect', 'Partner', 'Consultant', 'Talent', 'Vendor Contact', 'Industry Peer', 'Employee', 'Investor', 'Advisor', 'VIP', 'Press', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Real Estate', 'Consulting', 'Other', 'Hospitality', 'Logistics', 'Fitness', 'Legal', 'Media', 'Design', 'Venture Capital', 'Retail', 'Entertainment'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Website', 'Inbound', 'Outbound', 'Event', 'Social Media', 'Other', 'LinkedIn', 'Cold Call'] },
]

const ZONE2_QUAL_FIELD: EditableField = {
  key: 'qualification_status', label: 'Qualification', type: 'singleSelect',
  options: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Nurturing'],
}

const ZONE2_SCORE_FIELD: EditableField = {
  key: 'lead_score', label: 'Lead Score', type: 'number',
}

const ZONE2_EVENTS_FIELD: EditableField = {
  key: 'event_tags', label: 'Events', type: 'multiSelect',
  options: ['IAAPA 2025', 'SATE 2025', 'LDI 2025', 'Soho Holloway', 'LA LGBT', 'EEE 2026'], allowCreate: true,
}

const ZONE2_LAST_CONTACT_FIELD: EditableField = {
  key: 'last_contact_date', label: 'Last Contact', type: 'date',
}

const CONTACT_PARTNER_FIELDS: EditableField[] = [
  { key: 'partner_type', label: 'Partner Type', type: 'singleSelect',
    options: ['Fabricator', 'AV/Lighting', 'Scenic/Set Builder', 'Architect', 'Interior Designer', 'Graphic Designer', 'F&B Consultant', 'Tech/Interactive', 'Operations Consultant', 'Production Company', 'Freelancer/Individual', 'Other'] },
  { key: 'partner_status', label: 'Partner Status', type: 'singleSelect',
    options: ['Active - Preferred', 'Active', 'Inactive', 'Do Not Use'] },
  { key: 'quality_rating', label: 'Quality', type: 'singleSelect',
    options: ['\u2B50\u2B50\u2B50\u2B50\u2B50 Excellent', '\u2B50\u2B50\u2B50\u2B50 Good', '\u2B50\u2B50\u2B50 Average', '\u2B50\u2B50 Below Average', '\u2B50 Poor'] },
  { key: 'reliability_rating', label: 'Reliability', type: 'singleSelect',
    options: ['\u2B50\u2B50\u2B50\u2B50\u2B50 Excellent', '\u2B50\u2B50\u2B50\u2B50 Good', '\u2B50\u2B50\u2B50 Average', '\u2B50\u2B50 Below Average', '\u2B50 Poor'] },
  { key: 'rate_info', label: 'Rate Info', type: 'text' },
]

/* ── Hidden fields that still need to exist for hero action pills + contact info ── */
const HERO_ACTION_FIELDS: EditableField[] = [
  { key: 'email', label: 'Email', type: 'text', isLink: true },
  { key: 'mobile_phone', label: 'Mobile', type: 'text' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'text', isLink: true },
]

interface Contact360Props {
  /** When provided, use this ID instead of URL params (embedded split-pane mode) */
  contactId?: string | null
  /** Called after successful delete in embedded mode */
  onDeleted?: () => void
}

/* ── Section label above grouped containers ── */
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.06em', color: 'var(--text-secondary)',
      margin: '16px 0 6px',
    }}>
      {children}
    </div>
  )
}

/* ── Timeline entry types ── */
interface TimelineEntry {
  id: string
  type: 'opportunity' | 'interaction'
  date: Date
  data: Record<string, unknown>
}

function formatTimelineDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Contact360Page({ contactId, onDeleted }: Contact360Props = {}) {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = contactId ?? routeId
  const isEmbedded = contactId !== undefined

  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [linkedInInput, setLinkedInInput] = useState('')
  const [showLinkedInInput, setShowLinkedInInput] = useState(false)
  const [companiesData, setCompaniesData] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    window.electronAPI.companies.getAll().then(res => {
      if (res.success && res.data) setCompaniesData(res.data as Record<string, unknown>[])
    }).catch(() => {})
  }, [])

  /** Resolve company name from companies_ids linked record */
  const resolvedCompanyName = useMemo(() => {
    if (!contact) return null
    const companiesIds = contact.companies_ids
    if (!companiesIds) return null
    try {
      const ids = typeof companiesIds === 'string' ? JSON.parse(companiesIds as string) : companiesIds
      if (Array.isArray(ids) && ids.length > 0) {
        const match = companiesData.find(c => c.id === ids[0])
        return match ? (match.company_name as string) : null
      }
    } catch { /* ignore parse errors */ }
    return null
  }, [contact, companiesData])

  async function handleFetchLinkedInPhoto(urlOverride?: string) {
    if (!id) return
    const url = urlOverride ?? (contact?.linkedin_url as string | null)
    if (!url || !url.includes('linkedin.com')) return
    setPhotoLoading(true)
    setShowPhotoMenu(false)
    setShowLinkedInInput(false)
    setLinkedInInput('')
    try {
      const result = await window.electronAPI.contactPhoto.fetch(id, url)
      if (result.success) {
        const res = await window.electronAPI.contacts.getById(id)
        if (res.success && res.data) setContact(res.data as Record<string, unknown>)
      }
    } catch { /* handled by IPC */ }
    setPhotoLoading(false)
  }

  async function handleUploadPhoto() {
    if (!id) return
    setShowPhotoMenu(false)
    const fileResult = await window.electronAPI.contactPhoto.selectFile()
    if (!fileResult.success || !fileResult.data) return
    setPhotoLoading(true)
    try {
      const result = await window.electronAPI.contactPhoto.upload(id, fileResult.data)
      if (result.success) {
        const res = await window.electronAPI.contacts.getById(id)
        if (res.success && res.data) setContact(res.data as Record<string, unknown>)
      }
    } catch { /* handled by IPC */ }
    setPhotoLoading(false)
  }

  async function handleRemovePhoto() {
    if (!id) return
    setPhotoLoading(true)
    setShowPhotoMenu(false)
    try {
      const result = await window.electronAPI.contactPhoto.remove(id)
      if (result.success) {
        setContact(prev => prev ? { ...prev, contact_photo_url: null } : null)
      }
    } catch { /* handled by IPC */ }
    setPhotoLoading(false)
  }

  const handleFieldSave = async (key: string, val: unknown) => {
    const targetId = contactId || id
    if (!targetId) return
    await window.electronAPI.contacts.update(targetId, { [key]: val })
    const res = await window.electronAPI.contacts.getById(targetId)
    if (res.success && res.data) setContact(res.data as Record<string, unknown>)
  }

  useEffect(() => {
    if (!id) {
      setContact(null)
      setLinkedData({})
      return
    }

    let cancelled = false

    async function load() {
      const result = await window.electronAPI.contacts.getById(id!)
      if (cancelled) return
      if (result.success && result.data) {
        setContact(result.data as Record<string, unknown>)
      } else {
        setContact(null)
      }

      // Load linked records for tabs
      const [opps, tasks, proposals, interactions] = await Promise.all([
        window.electronAPI.opportunities.getAll(),
        window.electronAPI.tasks.getAll(),
        window.electronAPI.proposals.getAll(),
        window.electronAPI.interactions.getAll(),
      ])

      if (cancelled) return

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

      // Background refresh from Airtable for latest data
      window.electronAPI.contacts.refresh(id!).then(freshRes => {
        if (!cancelled && freshRes.success && freshRes.data) {
          setContact(freshRes.data as Record<string, unknown>)
        }
      })
    }
    load()
    return () => { cancelled = true }
  }, [id])

  /* ── Derived data (must stay above early return — Rules of Hooks) ── */

  const openOpps = linkedData.opportunities || []
  const interactions = linkedData.interactions || []

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = []

    for (const opp of openOpps) {
      const dateStr = (opp.airtable_modified_at || opp.created_at) as string | undefined
      const d = dateStr ? new Date(dateStr) : new Date(0)
      entries.push({ id: opp.id as string, type: 'opportunity', date: d, data: opp })
    }

    for (const inter of interactions) {
      const dateStr = (inter.date || inter.airtable_modified_at || inter.created_at) as string | undefined
      const d = dateStr ? new Date(dateStr) : new Date(0)
      entries.push({ id: inter.id as string, type: 'interaction', date: d, data: inter })
    }

    entries.sort((a, b) => b.date.getTime() - a.date.getTime())
    return entries
  }, [openOpps, interactions])

  const eventTags = useMemo<string[]>(() => {
    const raw = contact?.event_tags
    if (!raw) return []
    if (Array.isArray(raw)) return raw as string[]
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch { return [] }
    }
    return []
  }, [contact?.event_tags])

  // Empty state when no contact selected
  if (!id || !contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-window)', borderLeft: '1px solid var(--separator)' }}>
        <EmptyState title="Select a contact" subtitle="Choose a contact from the list to view details" />
      </div>
    )
  }

  const meetingCount = interactions.filter(i => i.type === 'Meeting').length

  let daysSince: number | string = '\u2014'
  if (contact.last_contact_date) {
    const lastDate = new Date(contact.last_contact_date as string)
    if (!isNaN(lastDate.getTime())) {
      const diffMs = Date.now() - lastDate.getTime()
      daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }
  }

  const fullName = (contact.contact_name as string) ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    'Unnamed Contact'

  const totalTimelineCount = timelineEntries.length
  const visibleTimeline = timelineEntries.slice(0, 10)

  /* ── Stat color helpers ── */
  const statColors = {
    'Open Opps': { value: 'var(--color-accent)', bg: 'rgba(0,122,255,0.08)' },
    'Meetings': { value: 'var(--color-green)', bg: 'rgba(52,199,89,0.08)' },
    'Days Since': { value: 'var(--color-orange)', bg: 'rgba(255,149,0,0.08)' },
  } as Record<string, { value: string; bg: string }>

  const statsData = [
    { label: 'Open Opps', value: openOpps.length },
    { label: 'Meetings', value: meetingCount },
    { label: 'Days Since', value: daysSince },
  ]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg-window)', borderLeft: '1px solid var(--separator)',
      position: 'relative',
    }}>

      {/* ══════════════════════════════════════════
          ZONE 1 — Hero Bar (fixed, never scrolls)
          ══════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, padding: '14px 18px',
      }}>
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 12,
          boxShadow: 'var(--shadow-sm)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              name={fullName}
              size={56}
              photoUrl={contact.contact_photo_url as string | null}
              onClick={() => setShowPhotoMenu(!showPhotoMenu)}
            />
            {photoLoading && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--text-on-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </div>
            )}
            {showPhotoMenu && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                  background: 'var(--bg-secondary)', borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 0.5px var(--separator)',
                  padding: '4px 0', minWidth: 200, zIndex: 100,
                }}
                onMouseLeave={() => { setShowPhotoMenu(false); setShowLinkedInInput(false); setLinkedInInput('') }}
              >
                {showLinkedInInput ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const url = linkedInInput.trim()
                      if (url && url.includes('linkedin.com')) {
                        handleFetchLinkedInPhoto(url)
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '4px 6px' }}
                  >
                    <input
                      autoFocus
                      type="url"
                      placeholder="Paste LinkedIn URL..."
                      value={linkedInInput}
                      onChange={e => setLinkedInInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') { setShowLinkedInInput(false); setLinkedInInput('') } }}
                      style={{
                        width: '100%', fontSize: 12, padding: '5px 8px',
                        borderRadius: 5, border: '1px solid var(--separator)',
                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </form>
                ) : (
                  <div
                    onClick={() => {
                      if (contact.linkedin_url) {
                        handleFetchLinkedInPhoto()
                      } else {
                        setShowLinkedInInput(true)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 14px', fontSize: 13, color: 'var(--text-primary)',
                      cursor: 'default', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>in</span>
                    Auto-fetch from LinkedIn
                  </div>
                )}
                <div
                  onClick={handleUploadPhoto}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', fontSize: 13, color: 'var(--text-primary)',
                    cursor: 'default', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>&uarr;</span>
                  Upload image&#8230;
                </div>
                {Boolean(contact.contact_photo_url) && (
                  <>
                    <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
                    <div
                      onClick={handleRemovePhoto}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 14px', fontSize: 13, color: 'var(--color-red)',
                        cursor: 'default', transition: 'background 150ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>&times;</span>
                      Remove photo
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Identity + action pills */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.2px' }}>
              {fullName}
            </div>
            {(Boolean(contact.job_title) || Boolean(resolvedCompanyName)) && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {contact.job_title as string}
                {Boolean(contact.job_title) && Boolean(resolvedCompanyName) ? ' \u00B7 ' : ''}
                {resolvedCompanyName && (
                  <span style={{ color: 'var(--color-accent)' }}>{resolvedCompanyName}</span>
                )}
              </div>
            )}
            {/* Action pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {Boolean(contact.email) && (
                <button
                  onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                  style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--color-accent)',
                    background: 'rgba(0,122,255,0.10)', border: 'none', cursor: 'default',
                    borderRadius: 6, padding: '4px 10px', fontFamily: 'inherit',
                    transition: 'background 150ms', maxWidth: 120,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,122,255,0.10)'}
                >
                  Email
                </button>
              )}
              {Boolean(contact.mobile_phone || contact.office_phone) && (
                <button
                  onClick={() => {
                    const num = (contact.mobile_phone || contact.office_phone) as string
                    window.electronAPI.shell.openExternal(`tel:${num}`)
                  }}
                  style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--color-green)',
                    background: 'rgba(52,199,89,0.10)', border: 'none', cursor: 'default',
                    borderRadius: 6, padding: '4px 10px', fontFamily: 'inherit',
                    transition: 'background 150ms', maxWidth: 120,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,199,89,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,199,89,0.10)'}
                >
                  Call
                </button>
              )}
              {Boolean(contact.linkedin_url) && (
                <button
                  onClick={() => {
                    const url = contact.linkedin_url as string
                    window.electronAPI.shell.openExternal(url.startsWith('http') ? url : `https://${url}`)
                  }}
                  style={{
                    fontSize: 11, fontWeight: 500, color: '#5ac8fa',
                    background: 'rgba(90,200,250,0.12)', border: 'none', cursor: 'default',
                    borderRadius: 6, padding: '4px 10px', fontFamily: 'inherit',
                    transition: 'background 150ms', maxWidth: 120,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,200,250,0.20)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(90,200,250,0.12)'}
                >
                  LinkedIn
                </button>
              )}
            </div>
          </div>

          {/* Stats — separated by vertical line */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
            borderLeft: '1px solid var(--separator-opaque)',
            paddingLeft: 14, marginLeft: 4,
          }}>
            {statsData.map((stat, i) => {
              const colors = statColors[stat.label] || { value: 'var(--text-primary)', bg: 'transparent' }
              return (
                <div key={stat.label} style={{
                  textAlign: 'center', padding: '0 12px',
                  borderRight: i < statsData.length - 1 ? '1px solid var(--separator)' : 'none',
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: colors.value, lineHeight: 1.2 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {stat.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ZONE 2 — CRM Grouped Bento (fixed, never scrolls)
          ══════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, padding: '0 18px 10px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {/* Left card — grouped list: Category, Industry, Lead Source */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 10,
          overflow: 'hidden',
        }}>
          {ZONE2_CRM_FIELDS.map((field, idx) => (
            <EditableFormRow
              key={field.key}
              field={field}
              value={(contact as Record<string, unknown>)[field.key]}
              isLast={idx === ZONE2_CRM_FIELDS.length - 1}
              onSave={handleFieldSave}
            />
          ))}
        </div>

        {/* Right side — two stat cells + events strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Top: Qualification + Lead Score side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 10,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Qualification
              </div>
              <EditableFormRow
                field={{ ...ZONE2_QUAL_FIELD, label: '' }}
                value={contact.qualification_status}
                isLast
                onSave={handleFieldSave}
              />
            </div>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 10,
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Lead Score
              </div>
              <EditableFormRow
                field={{ ...ZONE2_SCORE_FIELD, label: '' }}
                value={contact.lead_score}
                isLast
                onSave={handleFieldSave}
              />
            </div>
          </div>

          {/* Bottom: Events tag strip + Last Contact */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 10,
            padding: '6px 10px',
            display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
            minHeight: 32,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginRight: 4 }}>
              Events
            </span>
            {eventTags.length > 0 ? eventTags.map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 500, color: 'var(--color-accent)',
                background: 'rgba(0,122,255,0.10)', borderRadius: 4,
                padding: '2px 6px', whiteSpace: 'nowrap',
              }}>
                {tag}
              </span>
            )) : (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{'\u2014'}</span>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ZONE 3 — Bottom Split (fills remaining, both sides scroll)
          ══════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr',
        overflow: 'hidden', minHeight: 0,
      }}>
        {/* ── Left column — detail cards, scrolls independently ── */}
        <div style={{
          overflowY: 'auto', padding: '6px 18px 24px',
          borderRight: '1px solid var(--separator)',
        }}>
          {/* Company picker */}
          <SectionLabel>Company</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            <LinkedRecordPicker
              label="Company"
              entityApi={window.electronAPI.companies}
              labelField="company_name"
              value={contact.companies_ids}
              onChange={val => handleFieldSave('companies_ids', val)}
              placeholder="Search companies..."
              multiple={false}
            />
          </div>

          {/* Details grouped list */}
          <SectionLabel>Details</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            {ZONE3_DETAIL_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(contact as Record<string, unknown>)[field.key]}
                isLast={idx === ZONE3_DETAIL_FIELDS.length - 1}
                onSave={handleFieldSave}
              />
            ))}
          </div>

          {/* Hidden editable rows for Email, Mobile, LinkedIn (hero pills display them, but they need to be editable somewhere) */}
          <SectionLabel>Contact</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            {HERO_ACTION_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(contact as Record<string, unknown>)[field.key]}
                isLast={idx === HERO_ACTION_FIELDS.length - 1}
                onSave={handleFieldSave}
              />
            ))}
          </div>

          {/* Last Contact Date + Events (editable) */}
          <SectionLabel>CRM</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            <EditableFormRow
              field={ZONE2_LAST_CONTACT_FIELD}
              value={contact.last_contact_date}
              isLast={false}
              onSave={handleFieldSave}
            />
            <EditableFormRow
              field={ZONE2_EVENTS_FIELD}
              value={contact.event_tags}
              isLast
              onSave={handleFieldSave}
            />
          </div>

          {/* Partner / Vendor */}
          <SectionLabel>Partner / Vendor</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            {CONTACT_PARTNER_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(contact as Record<string, unknown>)[field.key]}
                isLast={idx === CONTACT_PARTNER_FIELDS.length - 1}
                onSave={handleFieldSave}
              />
            ))}
          </div>

          {/* Notes */}
          <SectionLabel>Notes</SectionLabel>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 4, boxShadow: 'var(--shadow-sm)' }}>
            <EditableFormRow
              field={{ key: 'notes', label: 'Notes', type: 'textarea' }}
              value={contact.notes}
              isLast
              onSave={handleFieldSave}
            />
          </div>
        </div>

        {/* ── Right column — Timeline, scrolls independently ── */}
        <div style={{
          overflowY: 'auto', padding: '6px 18px 24px',
        }}>
          {/* Timeline header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            margin: '16px 0 10px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)',
            }}>
              Timeline
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 500, color: '#bf5af2',
                background: 'rgba(191,90,242,0.12)', borderRadius: 4,
                padding: '2px 8px',
              }}>
                Deals
              </span>
              <span style={{
                fontSize: 10, fontWeight: 500, color: '#5ac8fa',
                background: 'rgba(90,200,250,0.12)', borderRadius: 4,
                padding: '2px 8px',
              }}>
                Activity
              </span>
            </div>
          </div>

          {/* Timeline entries */}
          {visibleTimeline.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 20px',
              color: 'var(--text-secondary)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>No activity yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Opportunities and interactions will appear here
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical connector line */}
              <div style={{
                position: 'absolute', left: 9, top: 18, bottom: 18,
                width: 1, background: 'var(--separator)',
              }} />

              {visibleTimeline.map((entry) => {
                const isOpp = entry.type === 'opportunity'
                const dotColor = isOpp ? '#bf5af2' : '#5ac8fa'

                if (isOpp) {
                  const opp = entry.data
                  const stage = (opp.sales_stage as string) || ''
                  const badgeTokens = stageBadgeTokens(stage)
                  const dealValue = opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : null

                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex', gap: 10, marginBottom: 8,
                        position: 'relative', cursor: 'default',
                      }}
                      onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
                      onMouseEnter={e => {
                        const card = e.currentTarget.querySelector('[data-card]') as HTMLElement
                        if (card) card.style.background = 'var(--bg-hover)'
                      }}
                      onMouseLeave={e => {
                        const card = e.currentTarget.querySelector('[data-card]') as HTMLElement
                        if (card) card.style.background = 'var(--bg-secondary)'
                      }}
                    >
                      {/* Dot indicator */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 8,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: dotColor,
                        }} />
                      </div>

                      {/* Card */}
                      <div data-card style={{
                        flex: 1, background: 'var(--bg-secondary)', borderRadius: 8,
                        padding: '8px 12px', minWidth: 0,
                        transition: 'background 150ms',
                      }}>
                        {/* Row 1: Name + Value */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}>
                            {(opp.opportunity_name as string) || '\u2014'}
                          </div>
                          {dealValue && (
                            <div style={{
                              fontSize: 12, fontWeight: 600,
                              color: badgeTokens.text, flexShrink: 0,
                            }}>
                              {dealValue}
                            </div>
                          )}
                        </div>
                        {/* Row 2: Stage badge + date */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {stage && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                              background: badgeTokens.bg, color: badgeTokens.text,
                              whiteSpace: 'nowrap',
                            }}>
                              {stage}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {formatTimelineDate(entry.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  // Interaction card
                  const inter = entry.data
                  const interType = (inter.type as string) || ''
                  const subject = (inter.subject as string) || ''
                  const summary = (inter.summary as string) || ''

                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex', gap: 10, marginBottom: 8,
                        position: 'relative', cursor: 'default',
                      }}
                    >
                      {/* Dot indicator */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: 8,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: dotColor,
                        }} />
                      </div>

                      {/* Card */}
                      <div style={{
                        flex: 1, background: 'var(--bg-secondary)', borderRadius: 8,
                        padding: '8px 12px', minWidth: 0,
                      }}>
                        {/* Row 1: Type + Subject */}
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                            {interactionTypeIcon(interType)}
                          </span>
                          {interType}{subject ? ` \u2014 ${subject}` : ''}
                        </div>
                        {/* Row 2: Summary snippet */}
                        {summary && (
                          <div style={{
                            fontSize: 12, color: 'var(--text-secondary)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {summary.slice(0, 80)}{summary.length > 80 ? '\u2026' : ''}
                          </div>
                        )}
                        {/* Row 3: Date */}
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                          {formatTimelineDate(entry.date)}
                        </div>
                      </div>
                    </div>
                  )
                }
              })}

              {/* "View all" link if more than 10 */}
              {totalTimelineCount > 10 && (
                <div style={{
                  textAlign: 'center', padding: '8px 0', marginTop: 4,
                }}>
                  <span style={{
                    fontSize: 12, color: 'var(--color-accent)', cursor: 'default',
                  }}>
                    View all ({totalTimelineCount})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Delete Contact — bottom of right column */}
          <div style={{ marginTop: 24, textAlign: 'center', paddingBottom: 16 }}>
            <button
              onClick={() => setShowDelete(true)}
              style={{
                fontSize: 13, fontWeight: 400, padding: '8px 0',
                color: 'var(--color-red)', background: 'none',
                border: 'none', cursor: 'default', fontFamily: 'inherit',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Delete Contact
            </button>
          </div>
        </div>
      </div>

      {/* Error banner — outside scroll areas */}
      {deleteError && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
          padding: '10px 16px', color: 'var(--color-red)', zIndex: 50,
        }}>
          <span style={{ fontSize: 13 }}>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            style={{ marginLeft: 16, color: 'inherit', background: 'none', border: 'none', cursor: 'default', fontFamily: 'inherit' }}
          >
            {'\u2715'}
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
            setDeleteError(result.error || 'Delete failed \u2014 please try again')
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
