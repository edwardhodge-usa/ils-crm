import { useState, useMemo, useEffect, useCallback } from 'react'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import useEntityList from '../../hooks/useEntityList'
import { CONTACT_CREATE_FIELDS } from '../../config/create-fields'
import { parseIds } from '../../utils/linked-records'
import { parseCollaboratorName } from '../../utils/collaborator'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import { ContextMenu } from '../shared/ContextMenu'
import ConfirmDialog from '../shared/ConfirmDialog'

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
      const contactIds = parseIds(record!.contact_ids)

      if (contactIds.length > 0) {
        const res = await window.electronAPI.contacts.getById(contactIds[0])
        if (!cancelled && res.success && res.data) {
          const contact = res.data as Record<string, unknown>
          if (contact.contact_photo_url) setContactPhotoUrl(contact.contact_photo_url as string)

          // 2. Get company logo from the contact's company link
          const companyIds = parseIds(contact.company_ids ?? contact.companies_ids)

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
  }, [record?.id])

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

/** Safely extract a display string from a value that may be a lookup array */
function resolveLookup(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    // Might be a JSON array from a lookup field stored as text
    if (val.startsWith('[')) {
      try {
        const arr = JSON.parse(val)
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      } catch { /* not JSON, use as-is */ }
    }
    return val
  }
  if (Array.isArray(val) && val.length > 0) return String(val[0])
  return String(val)
}

/**
 * Resolve the best display name for a Portal Access record.
 * Entries created via Slack often have `name` set to the unique identifier
 * (Airtable record ID) instead of a human-readable name.
 */
function resolvedName(row: Record<string, unknown>): string {
  // Try the name field first — but skip if it looks like an Airtable record ID
  const name = row.name as string | null
  if (name && name !== row.airtable_id) {
    return name
  }
  // Try contact_name_lookup (stored as JSON array from linked record)
  const contactName = resolveLookup(row.contact_name_lookup)
  if (contactName) return contactName
  // Try email fields as fallback
  const email = row.email as string | null
  if (email) return email
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  // Last resort — use name even if it's the ID, or show placeholder
  return name || 'Unnamed'
}

function resolvedEmail(row: Record<string, unknown>): string | null {
  const contactEmail = resolveLookup(row.contact_email_lookup)
  if (contactEmail) return contactEmail
  return (row.email as string | null) || null
}

// ─── Editable field definitions ──────────────────────────────────────────────

const PORTAL_EDITABLE_FIELDS: EditableField[] = [
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


const PORTAL_OTHER_FIELDS_STATIC: EditableField[] = [
  { key: 'date_added', label: 'Added', type: 'date' },
]

/** Extract unique collaborator objects from all portal_access records' assignee fields */
function buildCollaboratorOptions(records: Record<string, unknown>[]): { id: string; name: string; email: string; json: string }[] {
  const seen = new Map<string, { id: string; name: string; email: string; json: string }>()
  for (const r of records) {
    const val = r.assignee
    if (!val || typeof val !== 'string') continue
    try {
      const parsed = JSON.parse(val)
      if (parsed && typeof parsed === 'object' && parsed.id && !seen.has(parsed.id)) {
        seen.set(parsed.id, {
          id: parsed.id,
          name: parsed.name || parsed.email || parsed.id,
          email: parsed.email || '',
          json: val,
        })
      }
    } catch {
      // Legacy plain string — can't create an option without an ID
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
}

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
  onContextMenu?: (e: React.MouseEvent) => void
  groupedBy?: string
  linkedCompanyName?: string | null
}

function PortalAccessRow({ record, isSelected, onClick, onContextMenu, groupedBy, linkedCompanyName }: PortalRowProps) {
  const name = resolvedName(record)
  const email = resolvedEmail(record)
  const company = linkedCompanyName ?? null
  const status = (record.status as string | null) ?? null

  // When grouped by company, show email instead (company is in the section header)
  const subtitle = groupedBy === 'company'
    ? (email || null)
    : (company || email || null)

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
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
      {/* Line 1: name + status badge right-aligned */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        lineHeight: 1.3,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>
          {name}
        </span>
        {Boolean(status) && <StatusBadge value={status} />}
      </div>

      {/* Line 2: subtitle (company or email) */}
      {Boolean(subtitle) && (
        <div style={{
          fontSize: 11, color: 'var(--text-secondary)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailProps {
  record: Record<string, unknown> | null
  logs: Record<string, unknown>[]
  onFieldSave: (key: string, val: unknown) => Promise<void>
  onContactFieldSave: (key: string, val: unknown) => Promise<void>
  onDeleteLog: (id: string) => Promise<void>
  linkedCompanyName?: string | null
  linkedContact?: Record<string, unknown> | null
  collaboratorOptions: { id: string; name: string; email: string; json: string }[]
}

function PortalAccessDetail({ record, logs, onFieldSave, onContactFieldSave, onDeleteLog, linkedCompanyName, linkedContact, collaboratorOptions }: DetailProps) {
  const { contactPhotoUrl, companyLogoUrl } = useLinkedImages(record)
  const [showAllLogs, setShowAllLogs] = useState(false)

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
  const stage = (record.stage as string | null) ?? null
  const company = linkedCompanyName ?? null

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
              {Boolean(stage) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <StatusBadge value={stage} />
                </div>
              )}
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
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
            <div style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              Portal URL
            </div>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
            }}>
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
                className="cursor-default"
                style={{
                  background: 'var(--bg-tertiary)', border: '1px solid var(--separator)',
                  fontSize: 11, fontWeight: 500,
                  color: 'var(--text-secondary)', padding: '3px 8px',
                  borderRadius: 6, flexShrink: 0,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Page Path — editable */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
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

        {/* Details — Contact, Status, Assignee, Added, Notes */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Details
          </div>
          {/* Contact + Position + Email */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <LinkedRecordPicker
              label="Contact"
              entityApi={window.electronAPI.contacts}
              labelField="contact_name"
              labelFallbackFields={['first_name', 'last_name']}
              secondaryField="company"
              value={record.contact_ids}
              onChange={val => onFieldSave('contact_ids', val)}
              createFields={CONTACT_CREATE_FIELDS}
              createTitle="New Contact"
              createApi={window.electronAPI.contacts}
              placeholder="Search contacts..."
              multiple={false}
            />
            {linkedContact && (
              <>
                <EditableFormRow
                  field={{ key: 'job_title', label: 'Position', type: 'text' }}
                  value={(linkedContact.job_title as string) || null}
                  isLast={false}
                  onSave={onContactFieldSave}
                />
                <EditableFormRow
                  field={{ key: 'email', label: 'Email', type: 'text', isLink: true }}
                  value={(linkedContact.email as string) || null}
                  isLast
                  onSave={onContactFieldSave}
                />
              </>
            )}
          </div>
          {/* Company */}
          {linkedContact && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
              <LinkedRecordPicker
                label="Company"
                entityApi={window.electronAPI.companies}
                labelField="company_name"
                value={linkedContact.companies_ids}
                onChange={val => onContactFieldSave('companies_ids', val)}
                placeholder="Search companies..."
                multiple={false}
              />
            </div>
          )}
          {/* Status + Assignee + Added + Notes */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, marginTop: 8, position: 'relative', overflow: 'visible' }}>
            <EditableFormRow
              field={{
                key: 'status', label: 'Status', type: 'statusSelect',
                options: ['ACTIVE', 'IN-ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED'],
              }}
              value={record.status}
              isLast={false}
              onSave={onFieldSave}
            />
            {/* Assignee dropdown — collaborator field */}
            {(() => {
              let currentCollabId = ''
              const assigneeVal = record.assignee
              if (assigneeVal && typeof assigneeVal === 'string') {
                try {
                  const parsed = JSON.parse(assigneeVal)
                  if (parsed && typeof parsed === 'object' && parsed.id) currentCollabId = parsed.id
                } catch { /* Legacy plain string */ }
              }
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', minHeight: 36,
                  borderBottom: '1px solid var(--separator)',
                  cursor: 'default',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
                    Assignee
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {collaboratorOptions.length > 0 ? (
                      <select
                        value={currentCollabId}
                        onChange={e => {
                          const selectedId = e.target.value
                          if (!selectedId) {
                            onFieldSave('assignee', null)
                          } else {
                            const opt = collaboratorOptions.find(o => o.id === selectedId)
                            if (opt) onFieldSave('assignee', opt.json)
                          }
                        }}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--separator)',
                          borderRadius: 4, padding: '4px 8px',
                          fontSize: 13, fontWeight: 400, color: 'var(--text-primary)',
                          fontFamily: 'inherit', outline: 'none', cursor: 'default',
                          maxWidth: 200, textAlign: 'right' as const,
                        }}
                      >
                        <option value="">Unassigned</option>
                        {collaboratorOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
                        {parseCollaboratorName(assigneeVal) || '—'}
                      </span>
                    )}
                    {collaboratorOptions.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>&#x2303;</span>
                    )}
                  </div>
                </div>
              )
            })()}
            {PORTAL_OTHER_FIELDS_STATIC.map((field) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={field.key === 'date_added' ? (formatDate(record[field.key]) || null) : record[field.key]}
                isLast={false}
                onSave={onFieldSave}
              />
            ))}
            <EditableFormRow
              field={{ key: 'notes', label: 'Notes', type: 'textarea' }}
              value={record.notes}
              isLast
              onSave={onFieldSave}
            />
          </div>
        </div>

        {/* Activity — Total Visits, Last Activity, Recent Visits (max 4) */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
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
              borderBottom: relatedLogs.length > 0 ? '1px solid var(--separator)' : 'none',
            }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>Last Activity</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{lastActivity ?? '---'}</span>
            </div>
            {relatedLogs.slice(0, 4).map((log, i, arr) => {
              const ts = String(log.timestamp ?? '')
              const dateStr = (() => {
                const m = ts.match(/^(\d{4}-\d{2}-\d{2})/)
                return m ? formatDate(m[1]) : ts
              })()
              const page = (log.page_url as string | null) ?? null
              const city = (log.city as string | null) ?? null
              const isLast = i === arr.length - 1 && relatedLogs.length <= 4

              return (
                <div
                  key={i}
                  className="cursor-default"
                  style={{
                    padding: '10px 14px',
                    borderBottom: isLast ? 'none' : '1px solid var(--separator)',
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
            {/* View All button when more than 4 logs */}
            {relatedLogs.length > 4 && (
              <div
                onClick={() => setShowAllLogs(true)}
                className="cursor-default"
                style={{
                  padding: '8px 14px',
                  textAlign: 'center',
                  fontSize: 12, fontWeight: 500, color: 'var(--color-accent)',
                  borderTop: '1px solid var(--separator)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                View All {relatedLogs.length} Visits
              </div>
            )}
          </div>
        </div>

        {/* Full activity log overlay */}
        {showAllLogs && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onClick={e => { if (e.target === e.currentTarget) setShowAllLogs(false) }}
          >
            <div style={{
              width: 480, maxHeight: '70vh',
              background: 'var(--bg-window)',
              borderRadius: 12,
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--separator)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  All Visits ({relatedLogs.length})
                </span>
                <button
                  onClick={() => setShowAllLogs(false)}
                  className="cursor-default"
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--separator)',
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                >
                  Done
                </button>
              </div>
              {/* Scrollable log list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {relatedLogs.map((log, i) => {
                  const ts = String(log.timestamp ?? '')
                  const dateStr = (() => {
                    const m = ts.match(/^(\d{4}-\d{2}-\d{2})/)
                    return m ? formatDate(m[1]) : ts
                  })()
                  const page = (log.page_url as string | null) ?? null
                  const city = (log.city as string | null) ?? null
                  const logId = log.id as string

                  return (
                    <div
                      key={logId || i}
                      className="cursor-default"
                      style={{
                        padding: '10px 16px',
                        borderBottom: i < relatedLogs.length - 1 ? '1px solid var(--separator)' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >
                      {/* Log info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
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
                            fontSize: 12, color: 'var(--color-accent)', marginTop: 2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {page}
                          </div>
                        )}
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await onDeleteLog(logId)
                        }}
                        className="cursor-default"
                        style={{
                          background: 'transparent', border: 'none',
                          fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)',
                          padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                          transition: 'color 150ms, background 150ms',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = 'var(--color-red)'
                          e.currentTarget.style.background = 'rgba(255,59,48,0.08)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-tertiary)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )
                })}
                {relatedLogs.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                    No visits recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Portal Info — editable selects and dates */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
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



        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortalAccessPage() {
  const { data: records, loading, error, reload } = useEntityList(() => window.electronAPI.portalAccess.getAll())
  const { data: contactsData, reload: reloadContacts } = useEntityList(() => window.electronAPI.contacts.getAll())
  const { data: companiesData } = useEntityList(() => window.electronAPI.companies.getAll())
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'status' | 'stage' | 'newest' | 'oldest'>(() => (localStorage.getItem('sort-portal') as 'name' | 'company' | 'status' | 'stage' | 'newest' | 'oldest') || 'name')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  // Build id→record map for contacts
  const contactMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    for (const c of contactsData) {
      map.set(c.id as string, c)
    }
    return map
  }, [contactsData])

  // Build id→name map for companies
  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companiesData) {
      if (c.company_name) {
        map.set(c.id as string, c.company_name as string)
      }
    }
    return map
  }, [companiesData])

  // Resolve company name for a portal access record via contact → company chain
  const resolveLinkedCompany = useCallback((row: Record<string, unknown>): string | null => {
    const contactIds = parseIds(row.contact_ids)
    if (contactIds.length === 0) return null
    const contact = contactMap.get(contactIds[0])
    if (!contact) return null
    const companyIds = parseIds(contact.companies_ids)
    if (companyIds.length === 0) return null
    return companyNameMap.get(companyIds[0]) || null
  }, [contactMap, companyNameMap])

  const handleNew = useCallback(async () => {
    const res = await window.electronAPI.portalAccess.create({})
    if (res.success && res.data) {
      reload()
      setSelectedId(res.data)
    }
  }, [reload])

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, id })
  }, [])

  const handleDuplicate = useCallback(async (id: string) => {
    const res = await window.electronAPI.portalAccess.getById(id)
    if (!res.success || !res.data) return
    const source = res.data as Record<string, unknown>

    // Strip internal, readonly, lookup, and formula fields (assignee is now writable)
    const stripKeys = new Set([
      'id', 'airtable_id', '_pending_push', '_airtable_modified_at', '_local_modified_at',
      'framer_page_url',
      'contact_name_lookup', 'contact_company_lookup', 'contact_email_lookup',
      'contact_phone_lookup', 'contact_job_title_lookup', 'contact_industry_lookup',
      'contact_tags_lookup', 'contact_website_lookup', 'contact_address_line_lookup',
      'contact_city_lookup', 'contact_state_lookup', 'contact_country_lookup',
    ])
    const fields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(source)) {
      if (!stripKeys.has(k)) fields[k] = v
    }

    // Append " (Copy)" to the resolved name field
    const nameField = fields.name as string | null
    if (nameField) {
      fields.name = nameField + ' (Copy)'
    } else {
      fields.name = (resolvedName(source)) + ' (Copy)'
    }

    await window.electronAPI.portalAccess.create(fields)
    reload()
  }, [reload])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await window.electronAPI.portalAccess.delete(deleteTarget.id)
    if (selectedId === deleteTarget.id) setSelectedId(null)
    setDeleteTarget(null)
    reload()
  }, [deleteTarget, selectedId, reload])

  // Load portal logs once for activity data
  useEffect(() => {
    window.electronAPI.portalLogs.getAll().then(res => {
      if (res.success && res.data) {
        setLogs(res.data as Record<string, unknown>[])
      }
    }).catch(() => { /* logs stay empty */ })
  }, [])

  // Background refresh selected record from Airtable for latest data (debounced)
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    const timer = setTimeout(() => {
      window.electronAPI.portalAccess.refresh(selectedId).then(() => {
        if (!cancelled) reload()
      })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedId]) // reload is stable (useCallback) — no need in deps

  const filtered = useMemo(() => {
    let list = records as Record<string, unknown>[]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        resolvedName(r).toLowerCase().includes(q) ||
        String(resolvedEmail(r) ?? '').toLowerCase().includes(q) ||
        String(resolveLinkedCompany(r) ?? '').toLowerCase().includes(q) ||
        String(r.status ?? '').toLowerCase().includes(q) ||
        String(r.stage ?? '').toLowerCase().includes(q) ||
        String(r.lead_source ?? '').toLowerCase().includes(q) ||
        String(r.industry ?? '').toLowerCase().includes(q) ||
        String(r.notes ?? '').toLowerCase().includes(q) ||
        String(r.services_interested_in ?? '').toLowerCase().includes(q) ||
        String(r.position_title ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => resolvedName(a).localeCompare(resolvedName(b)))
        break
      case 'company':
        sorted.sort((a, b) => (resolveLinkedCompany(a) ?? '').localeCompare(resolveLinkedCompany(b) ?? ''))
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
  }, [records, search, sortBy, resolveLinkedCompany])

  const selected = filtered.find(r => r.id === selectedId) ?? null

  // Build collaborator options from all records' assignee fields
  const collaboratorOptions = useMemo(
    () => buildCollaboratorOptions(records as Record<string, unknown>[]),
    [records]
  )

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!selectedId) return
    await window.electronAPI.portalAccess.update(selectedId, { [key]: val })
    reload()
  }, [selectedId, reload])

  // Save a field on the linked Contact record (not the portal_access record)
  const handleContactFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!selected) return
    const cIds = parseIds(selected.contact_ids)
    if (!cIds.length) return
    const contactId = cIds[0]
    await window.electronAPI.contacts.update(contactId, { [key]: val })
    // Refresh contacts data so the UI updates
    reloadContacts()
  }, [selected, reloadContacts])

  const handleDeleteLog = useCallback(async (id: string) => {
    await window.electronAPI.portalLogs.delete(id)
    setLogs(prev => prev.filter(l => (l.id as string) !== id))
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 240px fixed */}
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Header: title + count */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Portal Access
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filtered.length}
            </span>
          </div>
          <button
            onClick={handleNew}
            style={{
              width: 24, height: 24, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              fontSize: 18, fontWeight: 300, color: 'var(--color-accent)',
              cursor: 'default',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="New Access"
          >
            +
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search portal access…"
            style={{
              width: '100%', fontSize: 12, padding: '6px 12px',
              borderRadius: 9999, border: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
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
            onChange={e => { const v = e.target.value as typeof sortBy; setSortBy(v); localStorage.setItem('sort-portal', v) }}
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
            <option value="company">Company</option>
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
          ) : (sortBy === 'company' || sortBy === 'status' || sortBy === 'stage') ? (() => {
            const groups = new Map<string, Record<string, unknown>[]>()
            for (const r of filtered) {
              const val = sortBy === 'company'
                ? (resolveLinkedCompany(r) || 'No Company')
                : ((r[sortBy] as string) || 'No ' + (sortBy === 'status' ? 'Status' : 'Stage'))
              if (!groups.has(val)) groups.set(val, [])
              groups.get(val)!.push(r)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <GroupedSectionHeader label={label} count={items.length} />
                {items.map(record => (
                  <PortalAccessRow
                    key={record.id as string}
                    record={record}
                    isSelected={selectedId === (record.id as string)}
                    onClick={() => setSelectedId(record.id as string)}
                    onContextMenu={e => handleContextMenu(e, record.id as string)}
                    groupedBy={sortBy}
                    linkedCompanyName={resolveLinkedCompany(record)}
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
                onContextMenu={e => handleContextMenu(e, record.id as string)}
                linkedCompanyName={resolveLinkedCompany(record)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <PortalAccessDetail record={selected} logs={logs} onFieldSave={handleFieldSave} onContactFieldSave={handleContactFieldSave} onDeleteLog={handleDeleteLog} linkedCompanyName={selected ? resolveLinkedCompany(selected) : null} linkedContact={(() => { if (!selected) return null; const cIds = parseIds(selected.contact_ids); return cIds.length ? contactMap.get(cIds[0]) ?? null : null })()} collaboratorOptions={collaboratorOptions} />

      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        items={[
          { label: 'Duplicate', onClick: () => contextMenu && handleDuplicate(contextMenu.id) },
          { label: 'Delete', destructive: true, onClick: () => {
            if (!contextMenu) return
            const record = filtered.find(r => (r.id as string) === contextMenu.id)
            setDeleteTarget({ id: contextMenu.id, name: record ? resolvedName(record) : 'this record' })
          }},
        ]}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Portal Access"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove it from Airtable.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
