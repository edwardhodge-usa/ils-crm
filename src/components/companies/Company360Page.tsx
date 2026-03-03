import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import { containsId } from '../../utils/linked-records'
import { Avatar } from '../shared/Avatar'
import useDarkMode from '../../hooks/useDarkMode'

const ICON_COLORS = [
  { bg: 'rgba(0,122,255,0.22)', fg: '#007AFF' },       // systemBlue
  { bg: 'rgba(52,199,89,0.22)', fg: '#34C759' },        // systemGreen
  { bg: 'rgba(255,149,0,0.22)', fg: '#FF9500' },        // systemOrange
  { bg: 'rgba(255,45,85,0.22)', fg: '#FF2D55' },        // systemPink
  { bg: 'rgba(175,82,222,0.22)', fg: '#AF52DE' },       // systemPurple
  { bg: 'rgba(88,86,214,0.22)', fg: '#5856D6' },        // systemIndigo
  { bg: 'rgba(255,59,48,0.22)', fg: '#FF3B30' },        // systemRed
  { bg: 'rgba(48,176,199,0.22)', fg: '#30B0C7' },       // systemTeal
]

function iconColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

/** Stage badge colors for opportunities — Apple system colors */
const STAGE_COLORS: Record<string, { bg: string; fg: string; fgDark: string }> = {
  'Prospecting': { bg: 'rgba(48,176,199,0.22)', fg: '#0E7A8D', fgDark: '#40CBE0' },
  'Qualified': { bg: 'rgba(52,199,89,0.22)', fg: '#248A3D', fgDark: '#30D158' },
  'Proposal Sent': { bg: 'rgba(175,82,222,0.22)', fg: '#8944AB', fgDark: '#BF5AF2' },
  'Negotiation': { bg: 'rgba(255,149,0,0.22)', fg: '#C93400', fgDark: '#FF9F0A' },
  'Closed Won': { bg: 'rgba(52,199,89,0.22)', fg: '#248A3D', fgDark: '#30D158' },
  'Closed Lost': { bg: 'rgba(255,59,48,0.22)', fg: '#D70015', fgDark: '#FF453A' },
}

export default function Company360Page() {
  const isDark = useDarkMode()
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  if (!company) return <LoadingSpinner />

  const companyName = (company.company_name as string) || 'Unnamed Company'
  const industry = (company.industry as string | null) ?? null
  const companyType = (company.type as string | null) ?? null
  const category = (company.category as string | null) ?? null
  const website = (company.website as string | null) ?? null
  const phone = (company.phone as string | null) ?? null
  const address = [company.address, company.city, company.state_region, company.country]
    .filter(Boolean)
    .join(', ') || null
  const companySize = (company.company_size as string | null) ?? null
  const annualRevenue = (company.annual_revenue as string | null) ?? null
  const leadSource = (company.lead_source as string | null) ?? null
  const color = iconColor(companyName)

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
          <button
            onClick={() => navigate(`/companies/${id}/edit`)}
            title="Edit company"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'default',
              background: 'none', color: 'var(--text-tertiary)', transition: 'color 150ms',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 28px' }}>

        {/* Hero section */}
        <div style={{ padding: '24px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Large letter icon */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, background: color.bg, color: color.fg,
            }}>
              {companyName.charAt(0).toUpperCase()}
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Company Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {renderInfoRows()}
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
                    <Avatar name={name} size={28} />
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

        {/* Notes section */}
        {Boolean(company.notes) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Notes
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', padding: '10px 14px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {company.notes as string}
              </div>
            </div>
          </div>
        )}

        {/* Description section */}
        {Boolean(company.company_description) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Description
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', padding: '10px 14px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {company.company_description as string}
              </div>
            </div>
          </div>
        )}

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

  /** Render Company Info form rows inside grouped container */
  function renderInfoRows() {
    const rows: { label: string; value: string | null; isDropdown?: boolean; isLink?: boolean }[] = [
      { label: 'Website', value: website, isLink: true },
      { label: 'Phone', value: phone, isLink: true },
      { label: 'Address', value: address },
      { label: 'Industry', value: industry, isDropdown: true },
      { label: 'Type', value: companyType, isDropdown: true },
      { label: 'Category', value: category, isDropdown: true },
      { label: 'Size', value: companySize },
      { label: 'Annual Revenue', value: annualRevenue },
      { label: 'Lead Source', value: leadSource },
    ]

    // Filter to only rows that have values
    const visibleRows = rows.filter(r => Boolean(r.value))

    if (visibleRows.length === 0) {
      return (
        <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          No company info
        </div>
      )
    }

    return visibleRows.map((row, idx) => (
      <FormRow
        key={row.label}
        label={row.label}
        value={row.value!}
        isDropdown={row.isDropdown}
        isLink={row.isLink}
        isLast={idx === visibleRows.length - 1}
      />
    ))
  }
}

/** A single Apple-style form row */
function FormRow({ label, value, isDropdown, isLink, isLast }: {
  label: string
  value: string
  isDropdown?: boolean
  isLink?: boolean
  isLast?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', minHeight: 36,
      borderBottom: isLast ? undefined : '1px solid var(--separator)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13, fontWeight: 400,
            color: isLink ? 'var(--color-accent)' : 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            borderRadius: 4, padding: '2px 6px', margin: '-2px -6px',
            background: hovered ? 'var(--bg-hover)' : 'transparent',
            transition: 'background 150ms',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {value}
        </span>
        {isDropdown && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4, flexShrink: 0 }}>⌃</span>
        )}
      </div>
    </div>
  )
}
