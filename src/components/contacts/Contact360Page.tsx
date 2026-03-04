import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import { Avatar } from '../shared/Avatar'
import { EmptyState } from '../shared/EmptyState'
import { ContactStats } from './ContactStats'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'
import { containsId } from '../../utils/linked-records'
import useDarkMode from '../../hooks/useDarkMode'

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

/* ── Apple-style form row inside a grouped container ── */
function FormRow({
  label,
  children,
  isLast = false,
  isDropdown = false,
  isLink = false,
  onClick,
}: {
  label: string
  children: React.ReactNode
  isLast?: boolean
  isDropdown?: boolean
  isLink?: boolean
  onClick?: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', minHeight: 36,
      borderBottom: isLast ? 'none' : '1px solid var(--separator)',
    }}>
      <span style={{
        fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
        flexShrink: 0, marginRight: 12,
      }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13, fontWeight: 400,
          color: isLink ? 'var(--color-accent)' : 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 5,
          cursor: 'default', borderRadius: 4, padding: '2px 6px', margin: '-2px -6px',
          transition: 'background 150ms',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0, textAlign: 'right' as const,
          background: 'transparent', border: 'none', fontFamily: 'inherit',
        }}
        onClick={onClick}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {children}
        {isDropdown && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4, flexShrink: 0 }}>⌃</span>}
      </span>
    </div>
  )
}

/* ── Linked record row (opportunities, interactions) ── */
function LinkedRow({
  icon,
  iconBg,
  iconColor,
  title,
  meta,
  isLast = false,
  onClick,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  meta: string
  isLast?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', cursor: 'default',
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, background: iconBg, color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
          {meta}
        </div>
      </div>
      <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
    </div>
  )
}

export default function Contact360Page({ contactId, onDeleted }: Contact360Props = {}) {
  const isDark = useDarkMode()
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const id = contactId ?? routeId
  const isEmbedded = contactId !== undefined

  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [specialtyNames, setSpecialtyNames] = useState<string[]>([])
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [linkedInInput, setLinkedInInput] = useState('')
  const [showLinkedInInput, setShowLinkedInInput] = useState(false)

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

  useEffect(() => {
    if (!id) {
      setContact(null)
      setLinkedData({})
      setSpecialtyNames([])
      setCompanyName(null)
      setCompanyId(null)
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

      // Resolve linked company name
      if (result.data) {
        const contactData = result.data as Record<string, unknown>
        try {
          const cIds: string[] = JSON.parse((contactData.companies_ids as string) || '[]')
          if (cIds.length > 0) {
            setCompanyId(cIds[0])
            const compRes = await window.electronAPI.companies.getById(cIds[0])
            if (compRes.success && compRes.data) {
              setCompanyName((compRes.data as Record<string, unknown>).company_name as string || null)
            }
          } else {
            setCompanyId(null)
            setCompanyName(null)
          }
        } catch {
          setCompanyId(null)
          setCompanyName(null)
        }
      }
    }
    load()
  }, [id])

  // Empty state when no contact selected
  if (!id || !contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-window)', borderLeft: '1px solid var(--separator)' }}>
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

  /* ── Determine which Contact Info fields exist ── */
  const contactInfoFields: { label: string; value: string; isLink?: boolean; onClick?: () => void }[] = []
  if (companyName) contactInfoFields.push({
    label: 'Company', value: companyName, isLink: true,
    onClick: () => companyId && navigate(`/companies/${companyId}`),
  })
  if (contact.email) contactInfoFields.push({
    label: 'Email', value: contact.email as string, isLink: true,
    onClick: () => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`),
  })
  if (contact.mobile_phone) contactInfoFields.push({ label: 'Mobile', value: contact.mobile_phone as string })
  if (contact.phone) contactInfoFields.push({ label: 'Phone', value: contact.phone as string })
  if (contact.linkedin_url) contactInfoFields.push({
    label: 'LinkedIn',
    value: (contact.linkedin_url as string)
      .replace('https://www.linkedin.com/in/', '')
      .replace('https://linkedin.com/in/', ''),
    isLink: true,
    onClick: () => window.electronAPI.shell.openExternal(contact.linkedin_url as string),
  })

  /* ── CRM Info fields ── */
  const crmInfoFields: { label: string; value: React.ReactNode; isDropdown?: boolean }[] = []
  if (contact.categorization) crmInfoFields.push({
    label: 'Category',
    value: (
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
      }}>
        {contact.categorization as string}
      </span>
    ),
    isDropdown: true,
  })
  if (contact.event_tags) crmInfoFields.push({
    label: 'Event Tags',
    value: contact.event_tags as string,
    isDropdown: true,
  })
  if (contact.qualification_status) crmInfoFields.push({
    label: 'Qualification',
    value: (
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
      }}>
        {contact.qualification_status as string}
      </span>
    ),
    isDropdown: true,
  })
  if (contact.client_type) crmInfoFields.push({
    label: 'Client Type',
    value: (
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
      }}>
        {contact.client_type as string}
      </span>
    ),
    isDropdown: true,
  })
  if (contact.onboarding_status) crmInfoFields.push({
    label: 'Onboarding',
    value: (
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
      }}>
        {contact.onboarding_status as string}
      </span>
    ),
    isDropdown: true,
  })
  if (contact.import_source) crmInfoFields.push({
    label: 'Import Source',
    value: (
      <span style={{
        fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
        background: 'rgba(118,118,128,0.12)', color: 'var(--text-secondary)',
      }}>
        {contact.import_source as string}
      </span>
    ),
    isDropdown: true,
  })
  // Tags (multiSelect)
  const tags: string[] = (() => {
    try {
      const raw = contact.tags
      if (!raw) return []
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()
  if (tags.length > 0) crmInfoFields.push({
    label: 'Tags',
    value: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
        {tags.map((tag: string) => (
          <span
            key={tag}
            style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 4, background: 'rgba(175,82,222,0.22)',
              color: isDark ? '#BF5AF2' : '#8944AB',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    ),
  })
  if (specialtyNames.length > 0) crmInfoFields.push({
    label: 'Specialty',
    value: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
        {specialtyNames.map((name: string) => (
          <span
            key={name}
            style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 4, background: 'rgba(0,122,255,0.22)',
              color: isDark ? '#409CFF' : '#0055B3',
            }}
          >
            {name}
          </span>
        ))}
      </div>
    ),
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-window)', borderLeft: '1px solid var(--separator)' }}>

      {/* Scrollable content */}
      <div className="flex-1" style={{ overflowY: 'auto', padding: '24px 28px' }}>

        {/* ── 1. Hero section ── */}
        <div style={{ padding: '0 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                name={fullName}
                size={50}
                photoUrl={contact.contact_photo_url as string | null}
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
              />
              {photoLoading && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
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
                  {/* Fetch from LinkedIn */}
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                {fullName}
              </div>
              {(Boolean(contact.job_title) || Boolean(contact.company)) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {contact.job_title as string}
                  {Boolean(contact.job_title) && Boolean(contact.company) ? ' · ' : ''}
                  {contact.company as string}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons: Email, Call, LinkedIn — Apple Contacts tinted button style */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {Boolean(contact.email) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--color-accent)',
                  background: 'rgba(0,122,255,0.10)', border: 'none', cursor: 'default',
                  borderRadius: 8, padding: '6px 14px', fontFamily: 'inherit',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,122,255,0.10)'}
              >
                Email
              </button>
            )}
            {Boolean(contact.phone || contact.mobile_phone) && (
              <button
                onClick={() => {
                  const num = (contact.mobile_phone || contact.phone) as string
                  window.electronAPI.shell.openExternal(`tel:${num}`)
                }}
                style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--color-green)',
                  background: 'rgba(52,199,89,0.10)', border: 'none', cursor: 'default',
                  borderRadius: 8, padding: '6px 14px', fontFamily: 'inherit',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,199,89,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(52,199,89,0.10)'}
              >
                Call
              </button>
            )}
            {Boolean(contact.linkedin_url) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(contact.linkedin_url as string)}
                style={{
                  fontSize: 12, fontWeight: 500, color: '#0A66C2',
                  background: 'rgba(10,102,194,0.10)', border: 'none', cursor: 'default',
                  borderRadius: 8, padding: '6px 14px', fontFamily: 'inherit',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,102,194,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,102,194,0.10)'}
              >
                LinkedIn
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Stats strip ── */}
        <ContactStats stats={stats} />

        {/* ── 3. Contact Info — grouped form rows ── */}
        {contactInfoFields.length > 0 && (
          <>
            <SectionLabel>Contact Info</SectionLabel>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
              {contactInfoFields.map((field, idx) => (
                <FormRow
                  key={field.label}
                  label={field.label}
                  isLast={idx === contactInfoFields.length - 1}
                  isLink={field.isLink}
                  onClick={field.onClick}
                >
                  {field.value}
                </FormRow>
              ))}
            </div>
          </>
        )}

        {/* ── 4. CRM Info — grouped form rows ── */}
        {crmInfoFields.length > 0 && (
          <>
            <SectionLabel>CRM Info</SectionLabel>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
              {crmInfoFields.map((field, idx) => (
                <FormRow
                  key={field.label}
                  label={field.label}
                  isLast={idx === crmInfoFields.length - 1}
                  isDropdown={field.isDropdown}
                >
                  {field.value}
                </FormRow>
              ))}
            </div>
          </>
        )}

        {/* ── 5. Opportunities — linked records ── */}
        <SectionLabel>Opportunities</SectionLabel>
        {openOpps.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', marginBottom: 16 }}>
            No open opportunities
          </div>
        ) : (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
            {openOpps.slice(0, 5).map((opp, idx) => (
              <LinkedRow
                key={opp.id as string}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  </svg>
                }
                iconBg="rgba(175,82,222,0.22)"
                iconColor="#AF52DE"
                title={(opp.opportunity_name as string) || '—'}
                meta={`${opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : '—'}${Boolean(opp.sales_stage) ? ` · ${opp.sales_stage as string}` : ''}`}
                isLast={idx === Math.min(openOpps.length, 5) - 1}
                onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
              />
            ))}
          </div>
        )}

        {/* ── 6. Interactions — linked records ── */}
        <SectionLabel>Interactions</SectionLabel>
        {interactions.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0', marginBottom: 16 }}>
            No interactions yet
          </div>
        ) : (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
            {interactions.slice(0, 5).map((interaction, idx) => (
              <LinkedRow
                key={interaction.id as string}
                icon={interactionTypeIcon(interaction.type as string)}
                iconBg="rgba(118,118,128,0.22)"
                iconColor="var(--text-secondary)"
                title={(interaction.type as string) || (interaction.subject as string) || 'Interaction'}
                meta={`${interaction.date as string || '—'}${Boolean(interaction.summary) ? ` · ${(interaction.summary as string).slice(0, 50)}` : ''}`}
                isLast={idx === Math.min(interactions.length, 5) - 1}
              />
            ))}
          </div>
        )}

        {/* ── 7. Delete button — destructive, at bottom ── */}
        <div style={{ marginTop: 8, marginBottom: 24 }}>
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
