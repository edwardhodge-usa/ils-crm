import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import { PencilIcon } from '../shared/icons/PencilIcon'
import { Avatar } from '../shared/Avatar'
import { containsId } from '../../utils/linked-records'
import { ContactStats } from '../contacts/ContactStats'
import useDarkMode from '../../hooks/useDarkMode'

/** Stage badge colors for opportunities — Apple system colors */
const STAGE_COLORS: Record<string, { bg: string; fg: string; fgDark: string }> = {
  'Prospecting': { bg: 'rgba(48,176,199,0.22)', fg: '#0E7A8D', fgDark: '#40CBE0' },
  'Qualified': { bg: 'rgba(52,199,89,0.22)', fg: '#248A3D', fgDark: '#30D158' },
  'Proposal Sent': { bg: 'rgba(175,82,222,0.22)', fg: '#8944AB', fgDark: '#BF5AF2' },
  'Negotiation': { bg: 'rgba(255,149,0,0.22)', fg: '#C93400', fgDark: '#FF9F0A' },
  'Closed Won': { bg: 'rgba(52,199,89,0.22)', fg: '#248A3D', fgDark: '#30D158' },
  'Closed Lost': { bg: 'rgba(255,59,48,0.22)', fg: '#D70015', fgDark: '#FF453A' },
}

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

interface CompanyDetailProps {
  companyId: string | null
  onDeleted?: () => void
}

export function CompanyDetail({ companyId, onDeleted }: CompanyDetailProps) {
  const isDark = useDarkMode()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([])
  const [opps, setOpps] = useState<Record<string, unknown>[]>([])
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      setCompany(null)
      setContacts([])
      setOpps([])
      return
    }

    async function load() {
      setCompany(null)
      setContacts([])
      setOpps([])

      const [companyRes, contactsRes, oppsRes] = await Promise.all([
        window.electronAPI.companies.getById(companyId!),
        window.electronAPI.contacts.getAll(),
        window.electronAPI.opportunities.getAll(),
      ])

      if (companyRes.success && companyRes.data) {
        setCompany(companyRes.data as Record<string, unknown>)
      }

      if (contactsRes.success && contactsRes.data) {
        const linked = (contactsRes.data as Record<string, unknown>[]).filter(c =>
          containsId(c.companies_ids, companyId!)
        )
        setContacts(linked)
      }

      if (oppsRes.success && oppsRes.data) {
        const linked = (oppsRes.data as Record<string, unknown>[]).filter(o =>
          containsId(o.company_ids, companyId!)
        )
        setOpps(linked)
      }
    }

    load()
  }, [companyId])

  if (!companyId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a company" subtitle="Choose a company from the list to view details" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <div className="flex items-center justify-center h-full">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading...</div>
        </div>
      </div>
    )
  }

  const companyName = (company.company_name as string) || 'Unnamed Company'
  const industry = (company.industry as string | null) ?? null
  const companyType = (company.type as string | null) ?? null
  const category = (company.category as string | null) ?? null
  const website = (company.website as string | null) ?? null
  const phone = (company.phone as string | null) ?? null
  const location = [company.city, company.state_region, company.country].filter(Boolean).join(', ') || null
  const color = iconColor(companyName)

  const openOpps = opps.filter(o => o.sales_stage !== 'Closed Won' && o.sales_stage !== 'Closed Lost')
  const totalOppValue = opps.reduce((sum, o) => sum + (Number(o.deal_value) || 0), 0)

  const stats = [
    { label: 'Contacts', value: contacts.length },
    { label: 'Open Opps', value: openOpps.length },
    { label: 'Total Value', value: totalOppValue > 0 ? `$${totalOppValue.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{companyName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => navigate(`/companies/${companyId}/edit`)}
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
            {/* Letter icon */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, background: color.bg, color: color.fg,
            }}>
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: -0.4 }}>
                {companyName}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 }}>
                {Boolean(industry) && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {industry}
                  </span>
                )}
                {Boolean(location) && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {Boolean(industry) ? '· ' : ''}{location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
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

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Company Info — Apple form rows */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Company Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {renderInfoRows()}
          </div>
        </div>

        {/* 4. Linked Contacts */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No linked contacts</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {contacts.slice(0, 5).map((c, idx) => {
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
                      borderBottom: idx < Math.min(contacts.length, 5) - 1 ? '1px solid var(--separator)' : undefined,
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
          {contacts.length > 5 && (
            <div
              style={{ fontSize: 12, color: 'var(--color-accent)', marginTop: 6, cursor: 'default' }}
              onClick={() => navigate(`/companies/${companyId}`)}
            >
              View all {contacts.length} contacts
            </div>
          )}
        </div>

        {/* 5. Open Opportunities */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Open Opportunities
          </div>
          {openOpps.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No open opportunities</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {openOpps.slice(0, 3).map((opp, idx) => {
                const stage = (opp.sales_stage as string | null) ?? null
                const stageColor = stage ? (STAGE_COLORS[stage] || { bg: 'rgba(118,118,128,0.10)', fg: 'var(--text-secondary)', fgDark: 'var(--text-secondary)' }) : null
                return (
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
                      fontSize: 13, background: 'rgba(175,82,222,0.22)', color: '#AF52DE',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(opp.opportunity_name as string) || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {opp.deal_value ? `$${Number(opp.deal_value).toLocaleString()}` : '—'}
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

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

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
          const result = await window.electronAPI.companies.delete(companyId!)
          if (result.success) {
            onDeleted?.()
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
      { label: 'Address', value: location },
      { label: 'Industry', value: industry, isDropdown: true },
      { label: 'Type', value: companyType, isDropdown: true },
      { label: 'Category', value: category, isDropdown: true },
    ]

    const visibleRows = rows.filter(r => Boolean(r.value))

    if (visibleRows.length === 0) {
      return (
        <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
          No company info
        </div>
      )
    }

    return visibleRows.map((row, idx) => (
      <DetailFormRow
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

/** A single Apple-style form row for the detail pane */
function DetailFormRow({ label, value, isDropdown, isLink, isLast }: {
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
            color: isLink ? 'var(--color-accent)' : 'var(--text-secondary)',
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
