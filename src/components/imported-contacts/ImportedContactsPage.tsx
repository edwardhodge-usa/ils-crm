import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { Avatar } from '../shared/Avatar'
import useEntityList from '../../hooks/useEntityList'
import useDarkMode from '../../hooks/useDarkMode'

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_TABS = ['All', 'Email', 'Contacts'] as const
type SourceTab = typeof SOURCE_TABS[number]

type SortMode = 'confidence' | 'newest' | 'threads'

const RELATIONSHIP_COLORS: Record<string, { text: string; textDark: string; bg: string }> = {
  'Client':        { text: '#0055B3', textDark: '#409CFF', bg: 'rgba(0,122,255,0.18)' },
  'Prospect':      { text: '#0055B3', textDark: '#409CFF', bg: 'rgba(0,122,255,0.18)' },
  'Partner':       { text: '#007A5E', textDark: '#30D158', bg: 'rgba(52,199,89,0.18)' },
  'Consultant':    { text: '#C79800', textDark: '#FFD60A', bg: 'rgba(255,204,0,0.18)' },
  'Vendor Contact': { text: '#8944AB', textDark: '#BF5AF2', bg: 'rgba(175,82,222,0.18)' },
  'Talent':        { text: '#C93400', textDark: '#FF9F0A', bg: 'rgba(255,149,0,0.18)' },
  'Employee':      { text: '#248A3D', textDark: '#30D158', bg: 'rgba(52,199,89,0.18)' },
  'Investor':      { text: '#007A5E', textDark: '#64D2FF', bg: 'rgba(100,210,255,0.18)' },
  'Advisor':       { text: '#007A5E', textDark: '#64D2FF', bg: 'rgba(100,210,255,0.18)' },
  'Industry Peer': { text: '#8944AB', textDark: '#BF5AF2', bg: 'rgba(175,82,222,0.18)' },
  'Other':         { text: '#636366', textDark: '#98989D', bg: 'rgba(142,142,147,0.18)' },
}

// Must match Airtable Categorization multipleSelects options exactly
const RELATIONSHIP_OPTIONS = ['Client', 'Prospect', 'Partner', 'Consultant', 'Vendor Contact', 'Talent', 'Employee', 'Investor', 'Advisor', 'Industry Peer', 'Other']

function getRelColors(type: string | null, isDark: boolean) {
  const c = RELATIONSHIP_COLORS[type ?? 'Other'] ?? RELATIONSHIP_COLORS['Other']
  return { fg: isDark ? c.textDark : c.text, bg: c.bg }
}

function confidenceColor(score: number): { fg: string; bg: string } {
  if (score >= 80) return { fg: '#248A3D', bg: 'rgba(52,199,89,0.18)' }
  if (score >= 50) return { fg: '#C79800', bg: 'rgba(255,204,0,0.18)' }
  return { fg: '#636366', bg: 'rgba(142,142,147,0.18)' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContactName(contact: Record<string, unknown>): string {
  const imported = (contact.imported_contact_name as string | null)?.trim()
  if (imported) return imported
  const first = (contact.first_name as string | null)?.trim() ?? ''
  const last = (contact.last_name as string | null)?.trim() ?? ''
  if (first || last) return `${first} ${last}`.trim()
  const email = (contact.email as string | null)?.trim()
  if (email) return email
  return 'Unnamed'
}

function getSubtitle(contact: Record<string, unknown>): string {
  const title = (contact.job_title as string | null)?.trim() ?? ''
  const company = (contact.company as string | null)?.trim() ??
    (contact.suggested_company_name as string | null)?.trim() ?? ''
  if (title && company) return `${title} at ${company}`
  if (title) return title
  if (company) return company
  return (contact.email as string | null)?.trim() ?? ''
}

function isEnrichmentRow(contact: Record<string, unknown>): boolean {
  const relatedIds = contact.related_crm_contact_ids as string | null
  if (!relatedIds) return false
  try {
    const arr = JSON.parse(relatedIds)
    return Array.isArray(arr) && arr.length > 0
  } catch { return false }
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Never'
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return 'Just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function formatDate(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw)
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return s
  const [, y, m, d] = match.map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── List row ─────────────────────────────────────────────────────────────────

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      padding: '6px 12px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
      userSelect: 'none' as const,
    }}>
      {label} ({count})
    </div>
  )
}

interface ListRowProps {
  contact: Record<string, unknown>
  isSelected: boolean
  isChecked?: boolean
  onClick: () => void
  onToggleCheck?: () => void
}

function ImportedContactRow({ contact, isSelected, isChecked, onClick, onToggleCheck }: ListRowProps) {
  const isDark = useDarkMode()
  const name = getContactName(contact)
  const enrichmentField = (contact._enrichment_field as string | null)
  const subtitle = enrichmentField
    ? `Update ${enrichmentField.replace(/_/g, ' ')}: ${(contact.current_value as string) ?? ''} → ${(contact.suggested_value as string) ?? ''}`
    : getSubtitle(contact)
  const relType = (contact.relationship_type as string | null) ?? 'Other'
  const confidence = (contact.confidence_score as number | null) ?? 0
  const threadCount = (contact.email_thread_count as number | null) ?? 0
  const enrichment = isEnrichmentRow(contact)
  const relC = getRelColors(relType, isDark)
  const confC = confidenceColor(confidence)

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
        background: isSelected
          ? 'var(--color-accent-translucent)'
          : enrichment
            ? (isDark ? 'rgba(52,199,89,0.06)' : 'rgba(52,199,89,0.04)')
            : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = enrichment ? (isDark ? 'rgba(52,199,89,0.10)' : 'rgba(52,199,89,0.08)') : 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = enrichment ? (isDark ? 'rgba(52,199,89,0.06)' : 'rgba(52,199,89,0.04)') : '' }}
    >
      {/* Batch checkbox */}
      {onToggleCheck && (
        <input
          type="checkbox"
          checked={isChecked ?? false}
          onChange={(e) => { e.stopPropagation(); onToggleCheck() }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
        />
      )}
      {/* Avatar */}
      <Avatar name={name} size={30} photoUrl={contact.contact_photo_url as string | null} />

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-secondary)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
          {/* Relationship badge */}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px',
            borderRadius: 9999, background: relC.bg, color: relC.fg,
          }}>
            {relType}
          </span>

          {/* Confidence or UPDATE badge */}
          {enrichment ? (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px',
              borderRadius: 9999, background: 'rgba(52,199,89,0.18)', color: '#248A3D',
            }}>
              UPDATE
            </span>
          ) : confidence > 0 ? (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px',
              borderRadius: 9999, background: confC.bg, color: confC.fg,
            }}>
              {confidence}%
            </span>
          ) : null}

          {/* Thread count */}
          {threadCount > 0 && (
            <span style={{
              fontSize: 10, color: 'var(--text-secondary)', marginLeft: 'auto',
            }}>
              {threadCount} thread{threadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// ─── Enrichment diff detail view ─────────────────────────────

interface EnrichmentDetailProps {
  item: Record<string, unknown>
  crmContacts: Record<string, unknown>[]
  onAccept: () => void
  onDismiss: () => void
}

function EnrichmentDetail({ item, crmContacts, onAccept, onDismiss }: EnrichmentDetailProps) {
  const isDark = useDarkMode()
  const fieldName = (item.field_name as string | null) ?? 'Unknown Field'
  const currentValue = (item.current_value as string | null) ?? ''
  const suggestedValue = (item.suggested_value as string | null) ?? ''
  const confidence = (item.confidence_score as number | null) ?? 0
  const sourceDate = item.source_email_date as string | null
  const status = (item.status as string | null) ?? 'Pending'
  const confC = confidenceColor(confidence)

  // Resolve the linked CRM contact for context
  let linkedContact: Record<string, unknown> | null = null
  try {
    const ids = JSON.parse((item.contact_ids as string) || '[]')
    if (Array.isArray(ids) && ids.length > 0) {
      linkedContact = crmContacts.find(c => c.id === ids[0]) as Record<string, unknown> | null ?? null
    }
  } catch { /* ignore */ }
  const contactName = linkedContact
    ? [linkedContact.first_name, linkedContact.last_name].filter(Boolean).join(' ') || (linkedContact.contact_name as string) || 'Unknown'
    : (item.imported_contact_name as string) || 'Unknown Contact'
  const contactEmail = (linkedContact?.email as string | null) ?? null
  const contactCompany = (linkedContact?.company as string | null) ?? null

  // Live current_value: re-read from CRM contact, auto-detect if already applied
  const liveCurrentValue = linkedContact ? ((linkedContact[fieldName] as string) ?? '') : currentValue
  const alreadyApplied = suggestedValue && liveCurrentValue && liveCurrentValue.toLowerCase().trim() === suggestedValue.toLowerCase().trim()

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z"
                  stroke="rgba(52,199,89,0.8)" strokeWidth="1.5" fill="rgba(52,199,89,0.15)" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {(item.imported_contact_name as string) || 'Field Update'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Update {fieldName.replace(/_/g, ' ')} from email scan
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              background: confC.bg,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: confC.fg }}>
                {confidence}% confidence
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onDismiss}
              className="cursor-default"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--color-red)', background: 'transparent',
                border: '1px solid var(--color-red)', borderRadius: 8,
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
            >
              Dismiss
            </button>
            <button
              onClick={onAccept}
              className="cursor-default"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-on-accent)', background: 'var(--color-green)',
                border: 'none', borderRadius: 8,
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
            >
              Accept Update
            </button>
          </div>
        </div>

        {/* CRM Contact Context */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>CRM Contact</SectionLabel>
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: isDark ? 'rgba(0,122,255,0.06)' : 'rgba(0,122,255,0.04)',
            border: '1px solid rgba(0,122,255,0.15)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {contactName}
            </div>
            {contactEmail && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {contactEmail}
              </div>
            )}
            {contactCompany && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {contactCompany}
              </div>
            )}
          </div>
        </div>

        {/* Diff view */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>Proposed Change</SectionLabel>
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: isDark ? 'rgba(52,199,89,0.06)' : 'rgba(52,199,89,0.04)',
            border: '1px solid rgba(52,199,89,0.2)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 10 }}>
              {fieldName}
            </div>

            {/* Current value (live from CRM) */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                CURRENT VALUE {liveCurrentValue !== currentValue ? '(live)' : ''}
              </div>
              <div style={{
                fontSize: 14, color: 'var(--text-secondary)',
                textDecoration: alreadyApplied ? 'none' : 'line-through', opacity: alreadyApplied ? 1 : 0.7,
                padding: '6px 10px', borderRadius: 6,
                background: alreadyApplied
                  ? (isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)')
                  : (isDark ? 'rgba(255,59,48,0.08)' : 'rgba(255,59,48,0.05)'),
              }}>
                {alreadyApplied ? `✓ Already applied: ${liveCurrentValue}` : (liveCurrentValue || '(empty)')}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 16, marginBottom: 6 }}>
              ↓
            </div>

            {/* Suggested value */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#248A3D', marginBottom: 4 }}>
                SUGGESTED VALUE
              </div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 6,
                background: isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)',
                border: '1px solid rgba(52,199,89,0.25)',
              }}>
                {suggestedValue || '(empty)'}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div style={{ padding: '14px 20px' }}>
          <SectionLabel>Details</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="Status" value={status} />
            <StatCard label="Source Date" value={sourceDate ? formatDate(sourceDate) : '--'} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Company fuzzy matching ──────────────────────────────────────────────────

interface CompanyMatch {
  id: string
  name: string
  type: string | null
  matchType: 'exact' | 'starts-with' | 'contains'
}

function findCompanyMatches(extracted: string, companies: Record<string, unknown>[]): CompanyMatch[] {
  if (!extracted || extracted.trim().length === 0) return []
  const query = extracted.toLowerCase().trim()
  const matches: CompanyMatch[] = []

  for (const company of companies) {
    const name = (company.company_name as string | null)?.trim()
    if (!name) continue
    const nameLower = name.toLowerCase()
    const id = company.id as string
    const companyType = (company.company_type as string | null) ?? null

    if (nameLower === query) {
      matches.push({ id, name, type: companyType, matchType: 'exact' })
    } else if (nameLower.startsWith(query)) {
      matches.push({ id, name, type: companyType, matchType: 'starts-with' })
    } else {
      const shorter = Math.min(query.length, nameLower.length)
      if (nameLower.includes(query) && query.length > shorter * 0.5) {
        matches.push({ id, name, type: companyType, matchType: 'contains' })
      }
    }
  }

  const priority: Record<string, number> = { exact: 0, 'starts-with': 1, contains: 2 }
  matches.sort((a, b) => priority[a.matchType] - priority[b.matchType])
  return matches
}

// ─── Company Picker ──────────────────────────────────────────────────────────

interface CompanyPickerProps {
  suggestedName: string | null
  companies: Record<string, unknown>[]
  onSelect: (id: string, name: string) => void
  onCreateNew: (name: string) => void
  onClear: () => void
  selectedId: string | null
  selectedName: string | null
}

function CompanyPicker({ suggestedName, companies, onSelect, onCreateNew, onClear, selectedId, selectedName }: CompanyPickerProps) {
  const [searchText, setSearchText] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-match on mount
  useEffect(() => {
    if (suggestedName && !selectedId) {
      const matches = findCompanyMatches(suggestedName, companies)
      const exact = matches.find(m => m.matchType === 'exact')
      if (exact) {
        onSelect(exact.id, exact.name)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const query = searchText || suggestedName || ''
  const matches = useMemo(() => {
    if (!query.trim()) return companies.slice(0, 20).map(c => ({
      id: c.id as string,
      name: (c.company_name as string | null) ?? '',
      type: (c.company_type as string | null) ?? null,
      matchType: 'contains' as const,
    }))
    return findCompanyMatches(query, companies)
  }, [query, companies])

  // Selected state — show linked company
  if (selectedId && selectedName) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(0,122,255,0.08)',
        border: '1px solid rgba(0,122,255,0.20)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          {selectedName}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px',
          borderRadius: 9999, background: 'rgba(0,122,255,0.18)', color: '#0055B3',
        }}>
          Linked
        </span>
        <button
          onClick={onClear}
          className="cursor-default"
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--bg-tertiary)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit',
            lineHeight: 1, padding: 0,
          }}
          title="Clear company selection"
        >
          ×
        </button>
      </div>
    )
  }

  // Search / dropdown state
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={searchText}
        onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
        onFocus={() => setShowDropdown(true)}
        placeholder={suggestedName || 'Search companies...'}
        className="cursor-default w-full text-[13px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--separator-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, maxHeight: 200, overflowY: 'auto',
          background: 'var(--bg-popover, var(--bg-window))',
          border: '1px solid var(--separator-strong)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}>
          {matches.slice(0, 15).map(m => (
            <div
              key={m.id}
              onClick={() => { onSelect(m.id, m.name); setShowDropdown(false); setSearchText('') }}
              className="cursor-default"
              style={{
                padding: '6px 12px', fontSize: 13, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span>{m.name}</span>
              {m.type && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  {m.type}
                </span>
              )}
            </div>
          ))}
          {/* Create new option */}
          {query.trim() && (
            <div
              onClick={() => { onCreateNew(query.trim()); setShowDropdown(false); setSearchText('') }}
              className="cursor-default"
              style={{
                padding: '6px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--color-accent)',
                borderTop: '1px solid var(--separator)',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              + Create "{query.trim()}"
            </div>
          )}
          {matches.length === 0 && !query.trim() && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
              No companies found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailProps {
  contact: Record<string, unknown> | null
  onAddToCrm: (fields: Record<string, unknown>) => void
  onDismiss: () => void
  onReject: () => void
  companies: Record<string, unknown>[]
}

function ImportedContactDetail({ contact, onAddToCrm, onDismiss, onReject, companies }: DetailProps) {
  const isDark = useDarkMode()

  // Local form state — isolated from parent re-renders.
  // Parent uses key={selectedId} so this remounts with fresh state per contact.
  const [editFields, setEditFields] = useState<Record<string, string>>(() => ({
    first_name: (contact?.first_name as string | null) ?? '',
    last_name: (contact?.last_name as string | null) ?? '',
    email: (contact?.email as string | null) ?? '',
    phone: (contact?.phone as string | null) ?? '',
    job_title: (contact?.job_title as string | null) ?? '',
    relationship_type: (contact?.relationship_type as string | null) ?? 'Other',
  }))

  // Company picker state
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [createCompanyName, setCreateCompanyName] = useState<string | null>(null)

  // Reclassify state
  const [reclassifying, setReclassifying] = useState(false)
  const [reclassifyResult, setReclassifyResult] = useState<Record<string, { old: unknown; new: unknown }> | null>(null)

  const setEditField = useCallback((key: string, val: string) => {
    setEditFields(prev => ({ ...prev, [key]: val }))
  }, [])

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState
          title="Select a contact"
          subtitle="Choose a contact from the list to review their email intelligence data"
        />
      </div>
    )
  }

  const name = getContactName(contact)
  const subtitle = getSubtitle(contact)
  const relType = editFields.relationship_type || ((contact.relationship_type as string | null) ?? 'Other')
  const confidence = (contact.confidence_score as number | null) ?? 0
  const aiReasoning = (contact.ai_reasoning as string | null) ?? null
  const threadCount = (contact.email_thread_count as number | null) ?? 0
  const firstSeen = contact.first_seen_date as string | null
  const lastSeen = contact.last_seen_date as string | null
  const discoveredVia = (contact.discovered_via as string | null) ?? null
  const suggestedCompany = (contact.suggested_company_name as string | null) ?? null
  const enrichment = isEnrichmentRow(contact)
  const onboardingStatus = (contact.onboarding_status as string | null) ?? 'Review'

  const relC = getRelColors(relType, isDark)
  const confC = confidenceColor(confidence)

  // Determine if already actioned
  const isDismissed = onboardingStatus === 'Dismissed'
  const isRejected = onboardingStatus === 'Rejected'
  const isApproved = onboardingStatus === 'Approved'
  const isActioned = isDismissed || isRejected || isApproved

  // Time span between first and last seen
  const timeSpan = (() => {
    if (!firstSeen || !lastSeen) return null
    const f = new Date(firstSeen)
    const l = new Date(lastSeen)
    if (isNaN(f.getTime()) || isNaN(l.getTime())) return null
    const days = Math.round((l.getTime() - f.getTime()) / 86400000)
    if (days < 1) return 'Same day'
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`
    if (days < 365) return `${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''}`
    return `${(days / 365).toFixed(1)} years`
  })()

  const inputClass = "w-full text-[13px] px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--separator-strong)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero section */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={name} size={52} photoUrl={contact.contact_photo_url as string | null} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                {subtitle}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={onDismiss}
              disabled={isDismissed}
              className="cursor-default disabled:opacity-40"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--color-red)',
                background: 'transparent',
                border: '1px solid var(--color-red)',
                borderRadius: 8,
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
              onMouseEnter={e => { if (!isDismissed) e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {isDismissed ? 'Dismissed' : 'Dismiss'}
            </button>
            <button
              onClick={() => onAddToCrm({ ...editFields, ...(companyId ? { company_id: companyId } : {}), ...(createCompanyName ? { create_company_name: createCompanyName } : {}) })}
              disabled={isApproved}
              className="cursor-default disabled:opacity-40"
              style={{
                flex: 1, padding: '7px 12px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-on-accent)',
                background: 'var(--color-green)',
                border: 'none',
                borderRadius: 8,
                fontFamily: 'inherit', transition: 'opacity 150ms',
              }}
              onMouseEnter={e => { if (!isApproved) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {isApproved ? 'Added to CRM' : enrichment ? 'Update CRM Contact' : 'Add to CRM'}
            </button>
          </div>

          {/* Re-scan button */}
          {!enrichment && !isApproved && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                disabled={reclassifying}
                onClick={async () => {
                  setReclassifying(true)
                  setReclassifyResult(null)
                  try {
                    const result = await window.electronAPI.gmail.reclassify(contact.id as string)
                    if (result.success && result.changes && Object.keys(result.changes).length > 0) {
                      setReclassifyResult(result.changes)
                    }
                  } catch (err) {
                    console.error('Reclassify failed:', err)
                  } finally {
                    setReclassifying(false)
                  }
                }}
                style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
                  background: 'transparent', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)', cursor: reclassifying ? 'wait' : 'pointer',
                  opacity: reclassifying ? 0.6 : 1, fontFamily: 'inherit',
                }}
              >
                {reclassifying ? 'Scanning...' : 'Re-scan'}
              </button>
              {reclassifyResult && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {Object.entries(reclassifyResult).map(([field, { old: oldVal, new: newVal }]) => (
                    <span key={field} style={{ marginRight: 8 }}>
                      {field.replace(/_/g, ' ')}: <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{String(oldVal ?? 'none')}</span> → <strong>{String(newVal)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isActioned && (
            <div style={{
              marginTop: 8, fontSize: 12, fontStyle: 'italic',
              color: 'var(--text-secondary)',
            }}>
              Status: {onboardingStatus}
            </div>
          )}
        </div>

        {/* AI Reasoning card */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>AI Reasoning</SectionLabel>
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: isDark ? 'rgba(175,82,222,0.08)' : 'rgba(175,82,222,0.05)',
            border: '1px solid rgba(175,82,222,0.20)',
          }}>
            <p style={{
              fontSize: 13, color: 'var(--text-primary)',
              lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {aiReasoning || `Contact discovered via email scan. ${
                enrichment
                  ? 'Already exists in CRM — new data found from email activity.'
                  : `Appeared in ${threadCount || 0} email thread${threadCount !== 1 ? 's' : ''}.`
              }`}
            </p>
          </div>
        </div>

        {/* Confidence + Relationship row */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Confidence */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: confC.bg,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: confC.fg }}>
                Confidence
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: confC.fg }}>
                {confidence}%
              </span>
            </div>

            {/* Relationship */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: relC.bg,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: relC.fg }}>
                {relType}
              </span>
            </div>
          </div>
        </div>

        {/* Extracted Contact Info — editable grid */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>Extracted Contact Info</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                First Name
              </label>
              <input
                type="text"
                className={inputClass}
                value={editFields.first_name ?? ''}
                onChange={e => setEditField('first_name', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                Last Name
              </label>
              <input
                type="text"
                className={inputClass}
                value={editFields.last_name ?? ''}
                onChange={e => setEditField('last_name', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                Email
              </label>
              <input
                type="text"
                className={inputClass}
                value={editFields.email ?? ''}
                onChange={e => setEditField('email', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                Phone
              </label>
              <input
                type="text"
                className={inputClass}
                value={editFields.phone ?? ''}
                onChange={e => setEditField('phone', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                Title
              </label>
              <input
                type="text"
                className={inputClass}
                value={editFields.job_title ?? ''}
                onChange={e => setEditField('job_title', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>
                Relationship Type
              </label>
              <select
                className={inputClass}
                value={editFields.relationship_type ?? 'Other'}
                onChange={e => setEditField('relationship_type', e.target.value)}
              >
                {RELATIONSHIP_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Company pairing — picker replaces static card */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--separator)' }}>
          <SectionLabel>Company Pairing</SectionLabel>
          <CompanyPicker
            suggestedName={suggestedCompany}
            companies={companies}
            selectedId={companyId}
            selectedName={companyName ?? (createCompanyName ? `${createCompanyName} (new)` : null)}
            onSelect={(id, name) => { setCompanyId(id); setCompanyName(name); setCreateCompanyName(null) }}
            onCreateNew={(name) => { setCreateCompanyName(name); setCompanyId(null); setCompanyName(null) }}
            onClear={() => { setCompanyId(null); setCompanyName(null); setCreateCompanyName(null) }}
          />
          {suggestedCompany && !companyId && !createCompanyName && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              AI suggested: {suggestedCompany}
            </div>
          )}
        </div>

        {/* Email Activity stats */}
        <div style={{ padding: '14px 20px' }}>
          <SectionLabel>Email Activity</SectionLabel>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          }}>
            <StatCard label="Threads" value={String(threadCount || 0)} />
            <StatCard label="Time Span" value={timeSpan || '--'} />
            <StatCard label="First Seen" value={firstSeen ? formatDate(firstSeen) : '--'} />
            <StatCard label="Last Seen" value={lastSeen ? formatDate(lastSeen) : '--'} />
          </div>

          {discoveredVia && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Discovered via: {discoveredVia}
            </div>
          )}
        </div>

        {/* Reject action at bottom */}
        {!isRejected && (
          <div style={{ padding: '0 20px 20px' }}>
            <button
              onClick={onReject}
              className="cursor-default"
              style={{
                width: '100%', padding: '7px 12px', fontSize: 12, fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '1px solid var(--separator-strong)',
                borderRadius: 8,
                fontFamily: 'inherit', transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--color-red)'
                e.currentTarget.style.borderColor = 'var(--color-red)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--separator-strong)'
              }}
            >
              Reject Permanently
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportedContactsPage() {
  const { data: contacts, loading, error, reload } = useEntityList(() => window.electronAPI.importedContacts.getAll(), { syncReload: false })
  const { data: enrichmentItems, loading: enrichLoading, reload: reloadEnrichment } = useEntityList(() => window.electronAPI.enrichmentQueue.getAll(), { syncReload: false })
  const { data: companiesList } = useEntityList(() => window.electronAPI.companies.getAll(), { syncReload: true })
  const { data: crmContacts } = useEntityList(() => window.electronAPI.contacts.getAll(), { syncReload: false })
  const [sourceTab, setSourceTab] = useState<SourceTab>('All')
  const [sortBy, setSortBy] = useState<SortMode>('confidence')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<'dismiss' | 'reject' | 'add' | null>(null)

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // AI classification indicator
  const [hasApiKey, setHasApiKey] = useState(false)
  useEffect(() => {
    window.electronAPI.settings.getSecure('anthropic_api_key').then(res => {
      setHasApiKey(!!res?.data)
    }).catch(() => {})
  }, [])

  // Scan state
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const scanListenerRef = useRef(false)

  // Holds edit fields passed up from detail panel for use in approve handler
  const pendingFieldsRef = useRef<Record<string, string>>({})

  // Merge enrichment queue items into the contact list (with _type marker)
  // Use Record<string, unknown> so all dynamic field access works without type errors
  type MergedItem = Record<string, unknown> & { _type: 'imported' | 'enrichment' }

  const mergedContacts: MergedItem[] = useMemo(() => {
    const importedWithType: MergedItem[] = contacts
      .filter(c => (c.onboarding_status as string | null) !== 'Approved')
      .map(c => ({ ...c, _type: 'imported' as const }))
    // Only show pending enrichment items (not already approved/dismissed)
    // Build contact name lookup from CRM contacts
    const contactNameMap = new Map<string, string>()
    for (const c of crmContacts) {
      const id = c.id as string
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || (c.contact_name as string) || (c.email as string) || 'Unknown'
      contactNameMap.set(id, String(name))
    }

    const pendingEnrichment: MergedItem[] = enrichmentItems
      .filter(e => {
        const status = (e.status as string | null)?.toLowerCase() ?? ''
        return !status.includes('approved') && !status.includes('dismissed')
      })
      .map(e => {
        // Resolve the linked contact name
        let contactName = 'Unknown Contact'
        try {
          const ids = JSON.parse((e.contact_ids as string) || '[]')
          if (Array.isArray(ids) && ids.length > 0) {
            contactName = contactNameMap.get(ids[0]) || 'Unknown Contact'
          }
        } catch { /* ignore */ }

        return {
          ...e,
          _type: 'enrichment' as const,
          imported_contact_name: contactName,
          _enrichment_field: (e.field_name as string | null) ?? 'field',
          confidence_score: e.confidence_score ?? 0,
          relationship_type: 'Update',
          email_thread_count: 0,
        }
      })
    // Enrichment items sort first (section divider added in render)
    return [...pendingEnrichment, ...importedWithType]
  }, [contacts, enrichmentItems, crmContacts])

  // Load scan status on mount
  useEffect(() => {
    window.electronAPI.gmail.scanStatus().then(res => {
      if (res.success && res.data) {
        setIsScanning(res.data.scanning ?? false)
        setLastScan(res.data.lastScan ?? null)
      }
    }).catch(() => {})
  }, [])

  // Listen for scan progress events
  useEffect(() => {
    if (scanListenerRef.current) return
    scanListenerRef.current = true
    window.electronAPI.gmail.onScanProgress((progress: unknown) => {
      const p = progress as Record<string, unknown>
      if (p.status === 'complete' || p.status === 'error') {
        setIsScanning(false)
        setLastScan(new Date().toISOString())
        reload()
        reloadEnrichment()
      } else {
        setIsScanning(true)
      }
    })
    return () => {
      window.electronAPI.gmail.removeScanProgressListener()
      scanListenerRef.current = false
    }
  }, [reload, reloadEnrichment])


  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: mergedContacts.length }
    counts['Email'] = mergedContacts.filter(c =>
      c._type === 'enrichment' ||
      (c.source as string | null) === 'Email Scan'
    ).length
    counts['Contacts'] = mergedContacts.filter(c => {
      if (c._type === 'enrichment') return false
      return (c.source as string | null) !== 'Email Scan'
    }).length
    return counts
  }, [mergedContacts])

  // Filtered + sorted contacts
  const filtered = useMemo(() => {
    let result = mergedContacts

    // Source filter
    if (sourceTab === 'Email') {
      result = result.filter(c =>
        c._type === 'enrichment' ||
        (c.source as string | null) === 'Email Scan'
      )
    } else if (sourceTab === 'Contacts') {
      result = result.filter(c => {
        if (c._type === 'enrichment') return false
        const src = (c.source as string | null) ?? (c.import_source as string | null) ?? ''
        return src !== 'email' && src !== 'Email Scan'
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        String(c.imported_contact_name ?? '').toLowerCase().includes(q) ||
        String(c.first_name ?? '').toLowerCase().includes(q) ||
        String(c.last_name ?? '').toLowerCase().includes(q) ||
        String(c.email ?? '').toLowerCase().includes(q) ||
        String(c.company ?? '').toLowerCase().includes(q) ||
        String(c.job_title ?? '').toLowerCase().includes(q) ||
        String(c.suggested_company_name ?? '').toLowerCase().includes(q) ||
        String(c.relationship_type ?? '').toLowerCase().includes(q) ||
        String(c.field_name ?? '').toLowerCase().includes(q) ||
        String(c.suggested_value ?? '').toLowerCase().includes(q)
      )
    }

    // Sort
    const sorted = [...result]
    switch (sortBy) {
      case 'confidence':
        sorted.sort((a, b) => ((b.confidence_score as number | null) ?? 0) - ((a.confidence_score as number | null) ?? 0))
        break
      case 'newest':
        sorted.sort((a, b) => {
          const da = (b.last_seen_date as string | null) ?? (b.source_email_date as string | null) ?? (b.import_date as string | null) ?? ''
          const db = (a.last_seen_date as string | null) ?? (a.source_email_date as string | null) ?? (a.import_date as string | null) ?? ''
          return da.localeCompare(db)
        })
        break
      case 'threads':
        sorted.sort((a, b) => ((b.email_thread_count as number | null) ?? 0) - ((a.email_thread_count as number | null) ?? 0))
        break
    }
    return sorted
  }, [mergedContacts, sourceTab, search, sortBy])

  const selected = filtered.find(c => c.id === selectedId) ?? null

  // Scan handler
  async function handleScanNow() {
    setIsScanning(true)
    try {
      await window.electronAPI.gmail.scanNow()
    } catch {
      setIsScanning(false)
    }
  }

  // Action handlers
  async function handleAction() {
    if (!selected || !action) return
    const id = selected.id as string
    const isEnrichment = selected._type === 'enrichment'

    if (isEnrichment) {
      // Enrichment queue actions
      if (action === 'add') {
        await window.electronAPI.enrichmentQueue.approve(id)
      } else if (action === 'dismiss') {
        await window.electronAPI.enrichmentQueue.dismiss(id)
      }
    } else {
      // Imported contact actions
      if (action === 'dismiss') {
        await window.electronAPI.importedContacts.dismiss(id)
      } else if (action === 'reject') {
        await window.electronAPI.importedContacts.reject(id, 'Rejected via CRM app')
      } else if (action === 'add') {
        // Full approve flow: creates Contact + Company via backend, marks approved
        const fields = pendingFieldsRef.current
        await window.electronAPI.importedContacts.approve(id, {
          first_name: fields.first_name || null,
          last_name: fields.last_name || null,
          email: fields.email || null,
          phone: fields.phone || null,
          job_title: fields.job_title || null,
          relationship_type: fields.relationship_type || null,
          suggested_company_name: selected.suggested_company_name || null,
          ...(fields.company_id ? { company_id: fields.company_id } : {}),
          ...(fields.create_company_name ? { create_company_name: fields.create_company_name } : {}),
        })
      }
    }
    setAction(null)
    setSelectedId(null) // Clear selection — forces repopulation on next pick
    reload()
    reloadEnrichment()
  }

  if (loading || enrichLoading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 320px fixed */}
      <div className="w-[320px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search imported contacts..."
            className="w-full text-[13px] px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Source filter tabs */}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--separator)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {SOURCE_TABS.map(tab => {
              const isActive = sourceTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => { setSourceTab(tab); setSelectedId(null) }}
                  className="cursor-default"
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    borderRadius: 9999,
                    border: 'none',
                    fontFamily: 'inherit',
                    transition: 'background 150ms, color 150ms',
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
                  <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                    {tabCounts[tab] ?? 0}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scan controls + sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
          gap: 8,
        }}>
          {/* Scan button + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="cursor-default disabled:opacity-50"
              style={{
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                background: 'var(--color-accent)', color: 'var(--text-on-accent)',
                borderRadius: 6, border: 'none', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'opacity 150ms',
              }}
            >
              {isScanning && (
                <svg className="w-3 h-3 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {isScanning ? 'Scanning...' : 'Scan Email'}
            </button>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {lastScan ? timeAgo(lastScan) : ''}
            </span>
          </div>

          {/* Sort toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            {(['confidence', 'newest', 'threads'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className="cursor-default"
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 500,
                  borderRadius: 4, border: 'none', fontFamily: 'inherit',
                  background: sortBy === mode ? 'var(--bg-tertiary)' : 'transparent',
                  color: sortBy === mode ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 150ms',
                }}
              >
                {mode === 'confidence' ? 'Conf.' : mode === 'newest' ? 'New' : 'Threads'}
              </button>
            ))}
          </div>
        </div>

        {/* AI classification status */}
        <div style={{
          padding: '4px 12px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
          fontSize: 10, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: hasApiKey ? 'var(--color-green)' : 'var(--text-secondary)',
          }} />
          {hasApiKey ? 'AI classification active' : 'AI classification off \u2014 add API key in Settings'}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)] px-4 text-center">
              {search
                ? 'No contacts match your search.'
                : sourceTab === 'All'
                  ? 'No imported contacts. Run a scan to discover contacts from email.'
                  : `No ${sourceTab.toLowerCase()} contacts.`}
            </div>
          ) : (
            (() => {
              const enrichmentRows = filtered.filter(c => c._type === 'enrichment')
              const importedRows = filtered.filter(c => c._type === 'imported')
              return (
                <>
                  {/* Batch action bar */}
                  {selectedIds.size > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px',
                      background: 'var(--bg-elevated)',
                      backdropFilter: 'blur(20px)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginRight: 8 }}>
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={async () => {
                          if (!confirm(`Approve ${selectedIds.size} items? Enrichment updates will be applied immediately.`)) return
                          for (const id of selectedIds) {
                            const item = filtered.find(c => (c.id as string) === id)
                            if (!item) continue
                            try {
                              if (item._type === 'enrichment') {
                                await window.electronAPI.enrichmentQueue.approve(id)
                              } else {
                                await window.electronAPI.importedContacts.approve(id)
                              }
                            } catch (err) {
                              console.error(`Batch approve failed for ${id}:`, err)
                            }
                          }
                          clearSelection()
                          reload()
                          reloadEnrichment()
                        }}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
                          background: 'var(--color-accent)', color: 'white', border: 'none', cursor: 'pointer',
                        }}
                      >
                        Approve All
                      </button>
                      <button
                        onClick={async () => {
                          for (const id of selectedIds) {
                            const item = filtered.find(c => (c.id as string) === id)
                            if (!item) continue
                            try {
                              if (item._type === 'enrichment') {
                                await window.electronAPI.enrichmentQueue.dismiss(id)
                              } else {
                                await window.electronAPI.importedContacts.dismiss(id)
                              }
                            } catch (err) {
                              console.error(`Batch dismiss failed for ${id}:`, err)
                            }
                          }
                          clearSelection()
                          reload()
                          reloadEnrichment()
                        }}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                          background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer',
                        }}
                      >
                        Dismiss All
                      </button>
                      <button onClick={clearSelection} style={{
                        fontSize: 14, fontWeight: 500, padding: '2px 8px', marginLeft: 'auto',
                        background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer',
                      }}>
                        ×
                      </button>
                    </div>
                  )}
                  {enrichmentRows.length > 0 && (
                    <>
                      <SectionDivider label="Updates for existing contacts" count={enrichmentRows.length} />
                      {enrichmentRows.map(contact => (
                        <ImportedContactRow
                          key={contact.id as string}
                          contact={contact}
                          isSelected={selectedId === (contact.id as string)}
                          isChecked={selectedIds.has(contact.id as string)}
                          onClick={() => setSelectedId(contact.id as string)}
                          onToggleCheck={() => toggleSelect(contact.id as string)}
                        />
                      ))}
                    </>
                  )}
                  {importedRows.length > 0 && (
                    <>
                      {enrichmentRows.length > 0 && <SectionDivider label="New contact suggestions" count={importedRows.length} />}
                      {importedRows.map(contact => (
                        <ImportedContactRow
                          key={contact.id as string}
                          contact={contact}
                          isSelected={selectedId === (contact.id as string)}
                          isChecked={selectedIds.has(contact.id as string)}
                          onClick={() => setSelectedId(contact.id as string)}
                          onToggleCheck={() => toggleSelect(contact.id as string)}
                        />
                      ))}
                    </>
                  )}
                </>
              )
            })()
          )}
        </div>
      </div>

      {/* Detail panel — flex-1, routes between enrichment diff and imported contact detail */}
      {selected?._type === 'enrichment' ? (
        <EnrichmentDetail
          item={selected}
          crmContacts={crmContacts}
          onAccept={() => setAction('add')}
          onDismiss={() => setAction('dismiss')}
        />
      ) : (
        <ImportedContactDetail
          key={selectedId ?? 'none'}
          contact={selected}
          companies={companiesList}
          onAddToCrm={(fields) => { pendingFieldsRef.current = fields as Record<string, string>; setAction('add') }}
          onDismiss={() => setAction('dismiss')}
          onReject={() => setAction('reject')}
        />
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={action !== null}
        title={
          selected?._type === 'enrichment'
            ? (action === 'add' ? 'Accept Update' : 'Dismiss Update')
            : action === 'add'
              ? 'Add to CRM'
              : action === 'dismiss'
                ? 'Dismiss Contact'
                : 'Reject Contact'
        }
        message={
          selected?._type === 'enrichment'
            ? (action === 'add'
                ? `Apply the suggested "${(selected?.field_name as string) ?? 'field'}" update to the CRM contact?`
                : `Dismiss this enrichment suggestion?`)
            : action === 'add'
              ? `Create a new CRM contact from "${selected ? getContactName(selected) : 'this contact'}"?${
                  pendingFieldsRef.current.company_id
                    ? ''
                    : pendingFieldsRef.current.create_company_name
                      ? ` A new company "${pendingFieldsRef.current.create_company_name}" will also be created.`
                      : (selected?.suggested_company_name && !selected?.suggested_company_ids)
                        ? ` A new company "${selected.suggested_company_name}" will also be created.`
                        : ''
                }`
              : action === 'dismiss'
                ? `Dismiss "${selected ? getContactName(selected) : 'this contact'}"? You can undo this later.`
                : `Permanently reject "${selected ? getContactName(selected) : 'this contact'}"?`
        }
        confirmLabel={
          selected?._type === 'enrichment'
            ? (action === 'add' ? 'Accept' : 'Dismiss')
            : action === 'add' ? 'Add to CRM' : action === 'dismiss' ? 'Dismiss' : 'Reject'
        }
        destructive={action === 'reject'}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}
