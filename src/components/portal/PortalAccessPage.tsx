import { useState, useMemo, useEffect, useCallback } from 'react'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import useEntityList from '../../hooks/useEntityList'
import { CONTACT_CREATE_FIELDS } from '../../config/create-fields'

/** Resolve the first linked contact's photo and company logo */
function useLinkedImages(record: Record<string, unknown> | null) {
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null)
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setContactPhotoUrl(null)
    setCompanyLogoUrl(null)
    if (!record) return

    let cancelled = false

    async function load() {
      // 1. Get linked contact photo
      const rawIds = record!.contact_ids
      let contactIds: string[] = []
      try {
        contactIds = typeof rawIds === 'string' ? JSON.parse(rawIds) : Array.isArray(rawIds) ? rawIds : []
      } catch { /* empty */ }

      if (contactIds.length > 0) {
        const res = await window.electronAPI.contacts.getById(contactIds[0])
        if (!cancelled && res.success && res.data) {
          const contact = res.data as Record<string, unknown>
          if (contact.contact_photo_url) setContactPhotoUrl(contact.contact_photo_url as string)

          // 2. Get company logo from the contact's company link
          const companyRaw = contact.company_ids ?? contact.companies_ids
          let companyIds: string[] = []
          try {
            companyIds = typeof companyRaw === 'string' ? JSON.parse(companyRaw) : Array.isArray(companyRaw) ? companyRaw : []
          } catch { /* empty */ }

          if (companyIds.length > 0) {
            const compRes = await window.electronAPI.companies.getById(companyIds[0])
            if (!cancelled && compRes.success && compRes.data) {
              const company = compRes.data as Record<string, unknown>
              if (company.logo_url) setCompanyLogoUrl(company.logo_url as string)
            }
          }
        }
      }

      // Fallback: try company name text field to look up company by name
      if (!cancelled && contactIds.length === 0) {
        const companyName = record!.company as string | null
        if (companyName) {
          const allRes = await window.electronAPI.companies.getAll()
          if (!cancelled && allRes.success && allRes.data) {
            const match = (allRes.data as Record<string, unknown>[]).find(
              c => (c.company_name as string)?.toLowerCase() === companyName.toLowerCase()
            )
            if (match?.logo_url) setCompanyLogoUrl(match.logo_url as string)
          }
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [record?.id, record?.contact_ids]) // eslint-disable-line react-hooks/exhaustive-deps

  return { contactPhotoUrl, companyLogoUrl }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw)
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return s
  const [, y, m, d] = match.map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function resolvedName(row: Record<string, unknown>): string {
  return (
    (row.name as string | null) ||
    (row.contact_name_lookup as string | null) ||
    '—'
  )
}

function resolvedEmail(row: Record<string, unknown>): string | null {
  return (
    (row.contact_email_lookup as string | null) ||
    (row.email as string | null) ||
    null
  )
}

function resolvedCompany(row: Record<string, unknown>): string | null {
  return (
    (row.contact_company_lookup as string | null) ||
    (row.company as string | null) ||
    null
  )
}

// ─── Editable field definitions ──────────────────────────────────────────────

const PORTAL_EDITABLE_FIELDS: EditableField[] = [
  { key: 'status', label: 'Status', type: 'statusSelect',
    options: ['Active', 'Inactive', 'Pending', 'Expired', 'Revoked'] },
  { key: 'stage', label: 'Stage', type: 'statusSelect',
    options: ['Prospect', 'Lead', 'Client', 'Past Client', 'Partner'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Website', 'Conference', 'LinkedIn', 'Cold Outreach', 'Inbound', 'Other'] },
  { key: 'services_interested_in', label: 'Services', type: 'multiSelect',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Video Production', 'Brand Strategy', 'Campaign Management', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },
  { key: 'decision_maker', label: 'Decision Maker', type: 'text' },
  { key: 'project_budget', label: 'Budget', type: 'currency' },
  { key: 'expected_project_start_date', label: 'Expected Start', type: 'date' },
  { key: 'follow_up_date', label: 'Follow Up', type: 'date' },
]

/** Contact info pulled from the linked contact record (Airtable lookups) */
const PORTAL_CONTACT_LOOKUP_FIELDS: EditableField[] = [
  { key: 'contact_email_lookup', label: 'Email', type: 'readonly' },
  { key: 'contact_company_lookup', label: 'Company', type: 'readonly' },
  { key: 'contact_job_title_lookup', label: 'Position', type: 'readonly' },
  { key: 'contact_phone_lookup', label: 'Phone', type: 'readonly' },
  { key: 'contact_website_lookup', label: 'Website', type: 'readonly' },
  { key: 'contact_industry_lookup', label: 'Industry', type: 'readonly' },
  { key: 'contact_address_line_lookup', label: 'Address', type: 'readonly' },
  { key: 'contact_city_lookup', label: 'City', type: 'readonly' },
  { key: 'contact_state_lookup', label: 'State', type: 'readonly' },
  { key: 'contact_country_lookup', label: 'Country', type: 'readonly' },
]

const PORTAL_OTHER_FIELDS: EditableField[] = [
  { key: 'assignee', label: 'Assignee', type: 'readonly' },
  { key: 'date_added', label: 'Added', type: 'readonly' },
]

/** Page Path editor with explicit Save button */
function PagePathEditor({ value, onSave }: { value: string; onSave: (val: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(value) }, [value])

  const handleSave = async () => {
    const trimmed = draft.trim()
    if (trimmed === (value || '')) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value || ''); setEditing(true) }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', minHeight: 36, cursor: 'default',
          background: 'transparent', transition: 'background 150ms',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>Page Path</span>
        <span style={{ fontSize: 13, fontWeight: 400, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {value || '—'}
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 14px' }}>
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
        Page Path
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) } else if (e.key === 'Enter') handleSave() }}
          placeholder="/page-slug"
          style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--color-accent)',
            borderRadius: 6, padding: '5px 8px',
            fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
            fontFamily: 'inherit', outline: 'none', cursor: 'default',
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '5px 12px', fontSize: 12, fontWeight: 500,
            background: 'var(--color-accent)', color: 'var(--text-on-accent)',
            border: 'none', borderRadius: 6, cursor: 'default',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => { setDraft(value || ''); setEditing(false) }}
          style={{
            padding: '5px 8px', fontSize: 12, fontWeight: 500,
            background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--separator)', borderRadius: 6, cursor: 'default',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────

interface PortalRowProps {
  record: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
}

function PortalAccessRow({ record, isSelected, onClick }: PortalRowProps) {
  const name = resolvedName(record)
  const email = resolvedEmail(record)
  const company = resolvedCompany(record)
  const status = (record.status as string | null) ?? null

  return (
    <div
      onClick={onClick}
      className="cursor-default"
      style={{
        padding: '9px 12px',
        borderBottom: '1px solid var(--separator)',
        borderLeft: isSelected ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Line 1: name */}
      <div style={{
        fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}>
        {name}
      </div>

      {/* Line 2: email/company + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        {Boolean(status) && <StatusBadge value={status} />}
        {Boolean(email) && (
          <span style={{
            fontSize: 11, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {email}
          </span>
        )}
        {Boolean(company) && !email && (
          <span style={{
            fontSize: 11, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {company}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailProps {
  record: Record<string, unknown> | null
  logs: Record<string, unknown>[]
  onFieldSave: (key: string, val: unknown) => Promise<void>
}

function PortalAccessDetail({ record, logs, onFieldSave }: DetailProps) {
  const { contactPhotoUrl, companyLogoUrl } = useLinkedImages(record)

  if (!record) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState
          title="Select a record"
          subtitle="Choose a portal access record from the list to view details"
        />
      </div>
    )
  }

  const name = resolvedName(record)
  const email = resolvedEmail(record)
  const status = (record.status as string | null) ?? null
  const stage = (record.stage as string | null) ?? null
  const company = resolvedCompany(record)

  // Filter logs related to this record by email match
  const relatedLogs = email
    ? logs.filter(l =>
        (l.client_email as string | null)?.toLowerCase() === email.toLowerCase()
      )
    : []

  const logCount = relatedLogs.length

  const lastLog = relatedLogs
    .filter(l => l.timestamp)
    .sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')))
    [0] ?? null

  const lastActivity = lastLog
    ? (() => {
        const ts = String(lastLog.timestamp ?? '')
        const match = ts.match(/^(\d{4}-\d{2}-\d{2})/)
        return match ? formatDate(match[1]) : ts
      })()
    : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero block — profile photo + name + company logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Profile photo */}
            <div style={{
              width: 48, height: 48, borderRadius: 24, flexShrink: 0,
              background: 'var(--bg-tertiary)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {contactPhotoUrl ? (
                <img
                  src={contactPhotoUrl}
                  alt=""
                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 24 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name + email + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {name}
              </div>
              {Boolean(email) && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {email}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                {Boolean(status) && <StatusBadge value={status} />}
                {Boolean(stage) && <StatusBadge value={stage} />}
              </div>
            </div>

            {/* Company logo */}
            {companyLogoUrl ? (
              <div style={{
                width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--separator)',
              }}>
                <img
                  src={companyLogoUrl}
                  alt={company || ''}
                  title={company || ''}
                  style={{ width: 36, height: 36, objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
            ) : company ? (
              <div
                title={company}
                style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--separator)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {company.charAt(0).toUpperCase()}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Portal URL — prominent, clickable + copyable */}
        {Boolean(record.framer_page_url) && (
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--separator)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
              PORTAL URL
            </span>
            <a
              href={String(record.framer_page_url)}
              onClick={e => {
                e.preventDefault()
                window.electronAPI.shell.openExternal(String(record.framer_page_url))
              }}
              style={{
                flex: 1, minWidth: 0,
                fontSize: 13, fontWeight: 500, color: 'var(--color-accent)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'default', textDecoration: 'none',
              }}
              title={String(record.framer_page_url)}
            >
              {String(record.framer_page_url)}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(String(record.framer_page_url))}
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--separator)',
                cursor: 'default', fontSize: 11, fontWeight: 500,
                color: 'var(--text-secondary)', padding: '3px 8px',
                borderRadius: 6, flexShrink: 0,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              Copy
            </button>
          </div>
        )}

        {/* Page Path — editable */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Portal Page
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <PagePathEditor
              value={(record.page_address as string) || ''}
              onSave={val => onFieldSave('page_address', val || null)}
            />
          </div>
        </div>

        {/* Visit stats */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Activity
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 36, padding: '10px 14px',
              borderBottom: '1px solid var(--separator)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>Total Visits</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{logCount}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 36, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>Last Activity</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{lastActivity ?? '---'}</span>
            </div>
          </div>
        </div>

        {/* Portal Info — editable selects and dates */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Portal Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {PORTAL_EDITABLE_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={record[field.key]}
                isLast={idx === PORTAL_EDITABLE_FIELDS.length - 1}
                onSave={onFieldSave}
              />
            ))}
          </div>
        </div>

        {/* Linked Contact */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Linked Contact
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <LinkedRecordPicker
              label="Contact"
              entityApi={window.electronAPI.contacts}
              labelField="contact_name"
              labelFallbackFields={['first_name', 'last_name']}
              value={record.contact_ids}
              onChange={val => onFieldSave('contact_ids', val)}
              createFields={CONTACT_CREATE_FIELDS}
              createTitle="New Contact"
              createApi={window.electronAPI.contacts}
              placeholder="Search contacts..."
            />
          </div>
        </div>

        {/* Contact Info — pulled from linked contact record (Airtable lookups) */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Contact Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {PORTAL_CONTACT_LOOKUP_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={record[field.key]}
                isLast={idx === PORTAL_CONTACT_LOOKUP_FIELDS.length - 1}
                onSave={onFieldSave}
              />
            ))}
          </div>
        </div>

        {/* Other fields */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Other
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {PORTAL_OTHER_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={field.key === 'date_added' ? (formatDate(record[field.key]) || null) : record[field.key]}
                isLast={idx === PORTAL_OTHER_FIELDS.length - 1}
                onSave={onFieldSave}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Notes
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'notes', label: 'Notes', type: 'textarea' }}
              value={record.notes}
              isLast
              onSave={onFieldSave}
            />
          </div>
        </div>

        {/* Recent portal log entries */}
        {relatedLogs.length > 0 && (
          <div style={{ padding: '14px 16px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Recent Visits
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {relatedLogs.slice(0, 5).map((log, i, arr) => {
                const ts = String(log.timestamp ?? '')
                const dateStr = (() => {
                  const m = ts.match(/^(\d{4}-\d{2}-\d{2})/)
                  return m ? formatDate(m[1]) : ts
                })()
                const page = (log.page_url as string | null) ?? null
                const city = (log.city as string | null) ?? null

                return (
                  <div
                    key={i}
                    className="cursor-default"
                    style={{
                      padding: '10px 14px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--separator)' : 'none',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                        {dateStr}
                      </span>
                      {Boolean(city) && (
                        <span style={{
                          fontSize: 13, color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {city}
                        </span>
                      )}
                    </div>
                    {Boolean(page) && (
                      <div style={{
                        fontSize: 11, color: 'var(--color-accent)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {page}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortalAccessPage() {
  const { data: records, loading, error, reload } = useEntityList(() => window.electronAPI.portalAccess.getAll())
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'stage' | 'newest' | 'oldest'>('name')

  // Load portal logs once for activity data
  useEffect(() => {
    window.electronAPI.portalLogs.getAll().then(res => {
      if (res.success && res.data) {
        setLogs(res.data as Record<string, unknown>[])
      }
    }).catch(() => { /* logs stay empty */ })
  }, [])

  const filtered = useMemo(() => {
    let list = records as Record<string, unknown>[]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        resolvedName(r).toLowerCase().includes(q) ||
        String(resolvedEmail(r) ?? '').toLowerCase().includes(q) ||
        String(resolvedCompany(r) ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => resolvedName(a).localeCompare(resolvedName(b)))
        break
      case 'status':
        sorted.sort((a, b) => String(a.status ?? '').localeCompare(String(b.status ?? '')))
        break
      case 'stage':
        sorted.sort((a, b) => String(a.stage ?? '').localeCompare(String(b.stage ?? '')))
        break
      case 'newest':
        sorted.sort((a, b) => String(b.date_added ?? '').localeCompare(String(a.date_added ?? '')))
        break
      case 'oldest':
        sorted.sort((a, b) => String(a.date_added ?? '').localeCompare(String(b.date_added ?? '')))
        break
    }
    return sorted
  }, [records, search, sortBy])

  const selected = filtered.find(r => r.id === selectedId) ?? null

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!selectedId) return
    await window.electronAPI.portalAccess.update(selectedId, { [key]: val })
    reload()
  }, [selectedId, reload])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 240px fixed */}
      <div className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search portal access…"
            className="w-full text-[13px] px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{
              fontSize: 11, fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none', outline: 'none',
              cursor: 'default',
              textAlign: 'right',
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="status">Status</option>
            <option value="stage">Stage</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No records match your search.' : 'No portal access records.'}
            </div>
          ) : (sortBy === 'status' || sortBy === 'stage') ? (() => {
            const groupKey = sortBy
            const groups = new Map<string, Record<string, unknown>[]>()
            for (const r of filtered) {
              const val = (r[groupKey] as string) || 'No ' + (groupKey === 'status' ? 'Status' : 'Stage')
              if (!groups.has(val)) groups.set(val, [])
              groups.get(val)!.push(r)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  padding: '18px 12px 6px',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-window)',
                  borderBottom: '0.5px solid var(--separator)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{label.startsWith('No ') ? label : label.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {items.length}
                  </span>
                </div>
                {items.map(record => (
                  <PortalAccessRow
                    key={record.id as string}
                    record={record}
                    isSelected={selectedId === (record.id as string)}
                    onClick={() => setSelectedId(record.id as string)}
                  />
                ))}
              </div>
            ))
          })() : (
            filtered.map(record => (
              <PortalAccessRow
                key={record.id as string}
                record={record}
                isSelected={selectedId === (record.id as string)}
                onClick={() => setSelectedId(record.id as string)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <PortalAccessDetail record={selected} logs={logs} onFieldSave={handleFieldSave} />
    </div>
  )
}
