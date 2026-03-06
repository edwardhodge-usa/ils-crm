import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import { containsId } from '../../utils/linked-records'
import { Avatar } from '../shared/Avatar'
import { CompanyLogo } from '../shared/CompanyLogo'
import useDarkMode from '../../hooks/useDarkMode'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'

const COMPANY_EDITABLE_FIELDS: EditableField[] = [
  { key: 'type', label: 'Type', type: 'singleSelect',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other', 'Culture', 'Sports', 'Cruise', 'Hospitality/Casino', 'Consulting', 'Theme Parks', 'Entertainment', 'Marketing', 'Design', 'Education', 'Real Estate', 'Media'] },
  { key: 'company_size', label: 'Size', type: 'singleSelect',
    options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Wynn Entertainment'] },
  { key: 'website', label: 'Website', type: 'text', isLink: true },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state_region', label: 'State/Region', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'annual_revenue', label: 'Annual Revenue', type: 'text' },
  { key: 'founding_year', label: 'Founded', type: 'number' },
  { key: 'referred_by', label: 'Referred By', type: 'text' },
]

/** Stage badge colors for opportunities — Apple system colors */
const STAGE_COLORS: Record<string, { bg: string; fg: string; fgDark: string }> = {
  'Prospecting':          { bg: 'rgba(255,204,0,0.22)',   fg: '#9D8500', fgDark: '#FFD60A' },
  'Qualified':            { bg: 'rgba(255,149,0,0.22)',   fg: '#A04B00', fgDark: '#FF9F0A' },
  'Business Development': { bg: 'rgba(175,82,222,0.22)',  fg: '#7B4EA8', fgDark: '#BF5AF2' },
  'Proposal Sent':        { bg: 'rgba(88,86,214,0.22)',   fg: '#3634A3', fgDark: '#5E5CE6' },
  'Negotiation':          { bg: 'rgba(48,176,199,0.22)',  fg: '#1A8FA8', fgDark: '#40CBE0' },
  'Closed Won':           { bg: 'rgba(52,199,89,0.22)',   fg: '#1A7834', fgDark: '#30D158' },
  'Closed Lost':          { bg: 'rgba(255,59,48,0.22)',   fg: '#CC2D22', fgDark: '#FF453A' },
}

export default function Company360Page() {
  const isDark = useDarkMode()
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showLogoMenu, setShowLogoMenu] = useState(false)
  const [logoLoading, setLogoLoading] = useState(false)
  const [linkedInInput, setLinkedInInput] = useState('')
  const [showLinkedInInput, setShowLinkedInInput] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const result = await window.electronAPI.companies.getById(id)
      if (result.success && result.data) {
        setCompany(result.data as Record<string, unknown>)
      }

      const [contacts, opps, projects] = await Promise.all([
        window.electronAPI.contacts.getAll(),
        window.electronAPI.opportunities.getAll(),
        window.electronAPI.projects.getAll(),
      ])

      const linked: Record<string, Record<string, unknown>[]> = {}

      if (contacts.success && contacts.data) {
        linked.contacts = (contacts.data as Record<string, unknown>[]).filter(c =>
          containsId(c.companies_ids, id)
        )
      }

      if (opps.success && opps.data) {
        linked.opportunities = (opps.data as Record<string, unknown>[]).filter(o =>
          containsId(o.company_ids, id)
        )
      }

      if (projects.success && projects.data) {
        // Projects don't link directly to companies — find via company's contacts
        const companyContactIds = new Set((linked.contacts || []).map(c => c.id as string))
        linked.projects = (projects.data as Record<string, unknown>[]).filter(p => {
          for (const field of ['client_ids', 'contacts_ids', 'primary_contact_ids']) {
            try {
              const ids = JSON.parse((p[field] as string) || '[]') as string[]
              if (ids.some(cid => companyContactIds.has(cid))) return true
            } catch { /* not valid JSON */ }
          }
          return false
        })
      }

      setLinkedData(linked)
    }
    load()
  }, [id])

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!id) return
    await window.electronAPI.companies.update(id, { [key]: val })
    const res = await window.electronAPI.companies.getById(id)
    if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
  }, [id])

  useEffect(() => {
    if (!showLogoMenu) {
      setShowLinkedInInput(false)
      setLinkedInInput('')
      return
    }
    const handler = () => setShowLogoMenu(false)
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [showLogoMenu])

  if (!company) return <LoadingSpinner />

  const companyName = (company.company_name as string) || 'Unnamed Company'
  const industry = (company.industry as string | null) ?? null
  const website = (company.website as string | null) ?? null
  const linkedInUrl = (company.linkedin_url as string | null) ?? null
  const phone = (company.phone as string | null) ?? null

  const contacts = linkedData.contacts || []
  const opportunities = linkedData.opportunities || []
  const projects = linkedData.projects || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ width: '100%', background: 'var(--bg-window)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/companies')}
          className="flex items-center gap-1 text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors cursor-default"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Companies
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 28px' }}>

        {/* Hero section */}
        <div style={{ padding: '24px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Company logo with management popover */}
            <div style={{ position: 'relative' }}>
              <CompanyLogo
                name={String(company.company_name || '')}
                logoUrl={company.logo_url as string | null}
                size={50}
                onClick={() => setShowLogoMenu(!showLogoMenu)}
              />
              {logoLoading && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 10,
                  background: 'rgba(0,0,0,0.4)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                </div>
              )}
              {showLogoMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  background: 'var(--bg-card)',
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.08)',
                  width: 200,
                  padding: 4,
                  zIndex: 100,
                  cursor: 'default',
                }}>
                  {/* Auto-fetch */}
                  <div
                    onClick={async (e) => {
                      e.stopPropagation()
                      const ws = company.website as string
                      if (!ws) return
                      setLogoLoading(true)
                      setShowLogoMenu(false)
                      try {
                        await window.electronAPI.companyLogo.fetch(id!, ws)
                        const res = await window.electronAPI.companies.getById(id!)
                        if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
                      } finally {
                        setLogoLoading(false)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 5, fontSize: 13, color: 'var(--text-primary)', cursor: 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-primary)' }}
                  >
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>&#8635;</span>
                    <span>Auto-fetch from website</span>
                  </div>
                  {/* Fetch from LinkedIn */}
                  {showLinkedInInput ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const url = linkedInInput.trim()
                        if (!url || !url.includes('linkedin.com')) return
                        setShowLinkedInInput(false)
                        setLinkedInInput('')
                        setShowLogoMenu(false)
                        setLogoLoading(true)
                        try {
                          await window.electronAPI.companyLogo.fetchLinkedIn(id!, url)
                          const res = await window.electronAPI.companies.getById(id!)
                          if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
                        } finally {
                          setLogoLoading(false)
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
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (linkedInUrl) {
                          setShowLogoMenu(false)
                          setLogoLoading(true)
                          try {
                            await window.electronAPI.companyLogo.fetchLinkedIn(id!, linkedInUrl)
                            const res = await window.electronAPI.companies.getById(id!)
                            if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
                          } finally {
                            setLogoLoading(false)
                          }
                        } else {
                          setShowLinkedInInput(true)
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        borderRadius: 5, fontSize: 13, color: 'var(--text-primary)', cursor: 'default',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-primary)' }}
                    >
                      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>in</span>
                      <span>Fetch from LinkedIn</span>
                    </div>
                  )}
                  {/* Upload */}
                  <div
                    onClick={async (e) => {
                      e.stopPropagation()
                      setShowLogoMenu(false)
                      const fileRes = await window.electronAPI.companyLogo.selectFile()
                      if (fileRes.success && fileRes.data) {
                        setLogoLoading(true)
                        try {
                          await window.electronAPI.companyLogo.upload(id!, fileRes.data)
                          const res = await window.electronAPI.companies.getById(id!)
                          if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
                        } finally {
                          setLogoLoading(false)
                        }
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 5, fontSize: 13, color: 'var(--text-primary)', cursor: 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-primary)' }}
                  >
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>&uarr;</span>
                    <span>Upload image...</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--separator)', margin: '4px 8px' }} />
                  {/* Remove */}
                  <div
                    onClick={async (e) => {
                      e.stopPropagation()
                      setShowLogoMenu(false)
                      setLogoLoading(true)
                      try {
                        await window.electronAPI.companyLogo.remove(id!)
                        const res = await window.electronAPI.companies.getById(id!)
                        if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
                      } finally {
                        setLogoLoading(false)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                      borderRadius: 5, fontSize: 13, color: 'var(--color-red)', cursor: 'default',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-red)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-red)' }}
                  >
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>&times;</span>
                    <span>Remove logo</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: -0.3 }}>
                {companyName}
              </div>
              {Boolean(industry) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {industry}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {Boolean(website) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(
                  website!.startsWith('http') ? website! : `https://${website!}`
                )}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 14px',
                  borderRadius: 8, border: 'none', cursor: 'default', fontFamily: 'inherit',
                  background: 'transparent', color: 'var(--color-accent)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Website
              </button>
            )}
            {Boolean(phone) && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(`tel:${phone!}`)}
                style={{
                  fontSize: 12, fontWeight: 500, padding: '5px 14px',
                  borderRadius: 8, border: 'none', cursor: 'default', fontFamily: 'inherit',
                  background: 'transparent', color: 'var(--color-accent)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Phone
              </button>
            )}
          </div>
        </div>

        {/* COMPANY INFO grouped container */}
        <div style={{ margin: '16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Company Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {COMPANY_EDITABLE_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(company as Record<string, unknown>)[field.key]}
                isLast={idx === COMPANY_EDITABLE_FIELDS.length - 1}
                onSave={handleFieldSave}
              />
            ))}
          </div>
        </div>

        {/* CONTACTS linked section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                No contacts
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {contacts.map((c, idx) => {
                const name = (c.contact_name as string) ||
                  [c.first_name, c.last_name].filter(Boolean).join(' ') ||
                  'Unnamed'
                const title = (c.job_title as string | null) ?? null
                return (
                  <div
                    key={c.id as string}
                    onClick={() => navigate(`/contacts/${c.id as string}`)}
                    className="cursor-default"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < contacts.length - 1 ? '1px solid var(--separator)' : undefined,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <Avatar name={name} size={28} photoUrl={c.contact_photo_url as string | null} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                      </div>
                      {Boolean(title) && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {title}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* OPPORTUNITIES linked section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Opportunities
          </div>
          {opportunities.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                No opportunities
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {opportunities.map((opp, idx) => {
                const oppName = (opp.opportunity_name as string) || '—'
                const stage = (opp.sales_stage as string | null) ?? null
                const stageColor = stage ? (STAGE_COLORS[stage] || { bg: 'rgba(118,118,128,0.10)', fg: 'var(--text-secondary)', fgDark: 'var(--text-secondary)' }) : null
                const dealValue = opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : null
                return (
                  <div
                    key={opp.id as string}
                    onClick={() => navigate(`/pipeline/${opp.id as string}/edit`)}
                    className="cursor-default"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < opportunities.length - 1 ? '1px solid var(--separator)' : undefined,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, background: 'rgba(175,82,222,0.22)', color: 'var(--color-purple)',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {oppName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {dealValue || '—'}
                        {Boolean(stage) && ` · ${stage}`}
                      </div>
                    </div>
                    {Boolean(stage) && stageColor && (
                      <span style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 7px',
                        borderRadius: 4, background: stageColor.bg, color: isDark ? stageColor.fgDark : stageColor.fg,
                        flexShrink: 0, opacity: 0.85,
                      }}>
                        {stage}
                      </span>
                    )}
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PROJECTS linked section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Projects
          </div>
          {projects.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                No projects
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {projects.map((proj, idx) => {
                const projName = (proj.project_name as string) || '—'
                const status = (proj.status as string | null) ?? null
                return (
                  <div
                    key={proj.id as string}
                    onClick={() => navigate(`/projects/${proj.id as string}/edit`)}
                    className="cursor-default"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < projects.length - 1 ? '1px solid var(--separator)' : undefined,
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, background: 'rgba(52,199,89,0.10)', color: 'var(--color-green)',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {projName}
                      </div>
                      {Boolean(status) && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                          {status}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notes section — editable */}
        <div style={{ margin: '16px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Notes
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'company_description', label: 'Description', type: 'textarea' }}
              value={company.company_description}
              onSave={async (key, val) => {
                await window.electronAPI.companies.update(id!, { [key]: val })
                const res = await window.electronAPI.companies.getById(id!)
                if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
              }}
            />
            <EditableFormRow
              field={{ key: 'notes', label: 'Notes', type: 'textarea' }}
              value={company.notes}
              isLast
              onSave={async (key, val) => {
                await window.electronAPI.companies.update(id!, { [key]: val })
                const res = await window.electronAPI.companies.getById(id!)
                if (res.success && res.data) setCompany(res.data as Record<string, unknown>)
              }}
            />
          </div>
        </div>

        {/* Delete button — destructive, at bottom */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <button
            onClick={() => setShowDelete(true)}
            style={{
              width: '100%', padding: '10px', fontSize: 13, fontWeight: 500,
              borderRadius: 10, border: 'none', cursor: 'default', fontFamily: 'inherit',
              background: 'rgba(255,59,48,0.10)', color: 'var(--color-red)',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,59,48,0.10)'}
          >
            Delete Company
          </button>
        </div>

      </div>

      {/* Error banner */}
      {deleteError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
          padding: '10px 16px', color: 'var(--color-red)', flexShrink: 0,
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
        title="Delete Company"
        message={`Are you sure you want to delete "${companyName}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.companies.delete(id!)
          if (result.success) {
            navigate('/companies')
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
