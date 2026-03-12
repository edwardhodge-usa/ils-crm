import { useMemo, useState } from 'react'
import { useLinkedImages } from '../../hooks/useLinkedImages'
import { resolvedPortalName, resolvedPortalEmail, resolvedPortalCompany } from '../../utils/portal-helpers'
import { buildCollaboratorMap, resolveCollaboratorSave } from '../../utils/collaborator'
import { EditableFormRow } from '../shared/EditableFormRow'
import type { EditableField } from '../shared/EditableFormRow'
interface AccessDetailPanelProps {
  record: Record<string, unknown>
  allAccessRecords: Record<string, unknown>[]
  onFieldSave: (key: string, value: unknown) => Promise<void>
  onClose: () => void
  otherPages: { pageAddress: string; dateAdded: string }[]
  onNavigateToPage: (pageAddress: string) => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2',
  '#FF375F', '#40CBE0', '#5E5CE6', '#FF453A',
]

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatDate(val: unknown): string {
  if (!val) return '—'
  const d = new Date(String(val))
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Field Definitions ──────────────────────────────────────────────────────────

const PORTAL_FIELDS = (collaboratorOptions: string[]): EditableField[] => [
  { key: 'stage', label: 'Stage', type: 'singleSelect', options: ['Prospect', 'Lead', 'Client', 'Past Client', 'Partner'] },
  { key: 'status', label: 'Status', type: 'singleSelect', options: ['ACTIVE', 'IN-ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', options: [] },
  { key: 'services_interested_in', label: 'Services Interested In', type: 'multiSelect' },
  { key: 'project_budget', label: 'Project Budget', type: 'currency' },
  { key: 'follow_up_date', label: 'Follow Up Date', type: 'date' },
  { key: 'assignee', label: 'Assignee', type: 'singleSelect', options: collaboratorOptions },
  { key: 'decision_maker', label: 'Decision Maker', type: 'text' },
  { key: 'expected_project_start_date', label: 'Expected Project Start', type: 'date' },
]

const CONTACT_FIELDS: EditableField[] = [
  { key: 'position_title', label: 'Position Title', type: 'text' },
  { key: 'phone_number', label: 'Phone', type: 'text' },
  { key: 'website', label: 'Website', type: 'text', isLink: true },
  { key: 'industry', label: 'Industry', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
]

const NOTES_FIELD: EditableField = { key: 'notes', label: '', type: 'textarea' }

// ─── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      color: 'var(--text-tertiary)',
      marginTop: 20,
      marginBottom: 6,
      padding: '0 2px',
    }}>
      {title}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AccessDetailPanel({
  record,
  allAccessRecords,
  onFieldSave,
  onClose,
  otherPages,
  onNavigateToPage,
}: AccessDetailPanelProps) {
  const { contactPhotoUrl } = useLinkedImages(record)
  const [hoverClose, setHoverClose] = useState(false)

  const name = resolvedPortalName(record)
  const email = resolvedPortalEmail(record)
  const company = resolvedPortalCompany(record)
  const avatarColor = hashColor(name)

  // Build collaborator options from all access records
  const { options: collaboratorOptions, map: collaboratorMap } = useMemo(
    () => buildCollaboratorMap(allAccessRecords, 'assignee'),
    [allAccessRecords],
  )

  const portalFields = useMemo(() => PORTAL_FIELDS(collaboratorOptions), [collaboratorOptions])

  // Resolve collaborator display name back to raw JSON on save
  const handleFieldSave = async (key: string, value: unknown) => {
    const resolved = resolveCollaboratorSave(key, value, collaboratorMap, new Set(['assignee']))
    await onFieldSave(key, resolved)
  }

  return (
    <div style={{
      width: 300,
      minWidth: 300,
      height: '100%',
      borderLeft: '1px solid var(--separator)',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Scrollable content */}
      <div style={{ padding: 16, flex: 1 }}>
        {/* ── Header Section ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div
            onClick={onClose}
            onMouseEnter={() => setHoverClose(true)}
            onMouseLeave={() => setHoverClose(false)}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: hoverClose ? 'var(--bg-hover)' : 'transparent',
              cursor: 'default',
              transition: 'background 150ms',
            }}
          >
            ✕
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
          {contactPhotoUrl ? (
            <img
              src={contactPhotoUrl}
              alt={name}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 600,
              background: `${avatarColor}22`,
              color: avatarColor,
            }}>
              {initials(name)}
            </div>
          )}

          {/* Name */}
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginTop: 10,
            textAlign: 'center',
            wordBreak: 'break-word',
          }}>
            {name}
          </div>

          {/* Email */}
          {email && (
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 2,
              textAlign: 'center',
              wordBreak: 'break-all',
            }}>
              {email}
            </div>
          )}

          {/* Company */}
          {company && (
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 1,
              textAlign: 'center',
            }}>
              {company}
            </div>
          )}
        </div>

        {/* ── Portal Fields Section ── */}
        <SectionHeader title="Portal" />
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--separator)',
          overflow: 'hidden',
        }}>
          {portalFields.map((field, i) => (
            <EditableFormRow
              key={field.key}
              field={field}
              value={record[field.key]}
              isLast={i === portalFields.length - 1}
              onSave={handleFieldSave}
            />
          ))}
        </div>

        {/* ── Contact Info Section ── */}
        <SectionHeader title="Contact Info" />
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--separator)',
          overflow: 'hidden',
        }}>
          {CONTACT_FIELDS.map((field, i) => (
            <EditableFormRow
              key={field.key}
              field={field}
              value={record[field.key]}
              isLast={i === CONTACT_FIELDS.length - 1}
              onSave={handleFieldSave}
            />
          ))}
        </div>

        {/* ── Notes Section ── */}
        <SectionHeader title="Notes" />
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--separator)',
          overflow: 'hidden',
        }}>
          <EditableFormRow
            field={NOTES_FIELD}
            value={record.notes}
            isLast
            onSave={handleFieldSave}
          />
        </div>

        {/* ── Other Pages Section ── */}
        {otherPages.length > 0 && (
          <>
            <SectionHeader title="Other Pages" />
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 8,
              border: '1px solid var(--separator)',
              overflow: 'hidden',
            }}>
              {otherPages.map((page, i) => (
                <div
                  key={page.pageAddress}
                  onClick={() => onNavigateToPage(page.pageAddress)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    minHeight: 36,
                    borderBottom: i < otherPages.length - 1 ? '1px solid var(--separator)' : 'none',
                    cursor: 'default',
                    background: 'transparent',
                    transition: 'background 150ms',
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--color-accent)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}>
                    {page.pageAddress}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                    marginLeft: 8,
                  }}>
                    {formatDate(page.dateAdded)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
