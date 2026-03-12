import { useMemo } from 'react'
import { useLinkedImages } from '../../hooks/useLinkedImages'
import {
  resolvedPortalName,
  resolvedPortalEmail,
  resolvedPortalCompany,
} from '../../utils/portal-helpers'
import { buildCollaboratorMap, resolveCollaboratorSave } from '../../utils/collaborator'
import { EditableFormRow } from '../shared/EditableFormRow'
import type { EditableField } from '../shared/EditableFormRow'
import StatusBadge from '../shared/StatusBadge'
import PageCard from './PageCard'
import ActivityLog from './ActivityLog'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonDetailProps {
  email: string
  records: Record<string, unknown>[]
  pages: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  onAccessFieldSave: (recordId: string, key: string, value: unknown) => Promise<void>
  onNavigateToPage: (pageAddress: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function PersonDetail({
  email,
  records,
  pages,
  logs,
  onAccessFieldSave,
  onNavigateToPage,
}: PersonDetailProps) {
  const primaryRecord = records[0]
  const { contactPhotoUrl } = useLinkedImages(primaryRecord)

  const name = resolvedPortalName(primaryRecord)
  const displayEmail = resolvedPortalEmail(primaryRecord)
  const company = resolvedPortalCompany(primaryRecord)
  const stage = primaryRecord.stage as string | null

  const { options: collabOptions, map: collabMap } = useMemo(
    () => buildCollaboratorMap(records, 'assignee'),
    [records],
  )

  const handleFieldSave = async (key: string, value: unknown) => {
    const resolved = resolveCollaboratorSave(key, value, collabMap, new Set(['assignee']))
    await onAccessFieldSave(primaryRecord.id as string, key, resolved)
  }

  // ── Field definitions ──────────────────────────────────────────────────────

  const detailFields: EditableField[] = useMemo(
    () => [
      { key: 'stage', label: 'Stage', type: 'singleSelect', options: ['Prospect', 'Lead', 'Client', 'Past Client', 'Partner'] },
      { key: 'status', label: 'Status', type: 'singleSelect', options: ['ACTIVE', 'IN-ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED'] },
      { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', options: [] },
      { key: 'services_interested_in', label: 'Services Interested In', type: 'multiSelect', options: [] },
      { key: 'project_budget', label: 'Project Budget', type: 'currency' },
      { key: 'follow_up_date', label: 'Follow-up Date', type: 'date' },
      { key: 'assignee', label: 'Assignee', type: 'singleSelect', options: collabOptions },
      { key: 'decision_maker', label: 'Decision Maker', type: 'text' },
      { key: 'expected_project_start_date', label: 'Expected Start', type: 'date' },
      { key: 'position_title', label: 'Position Title', type: 'text' },
      { key: 'phone_number', label: 'Phone', type: 'text' },
      { key: 'website', label: 'Website', type: 'text', isLink: true },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
    [collabOptions],
  )

  const notesField: EditableField = { key: 'notes', label: '', type: 'textarea' }

  // ── Page cards ─────────────────────────────────────────────────────────────

  const pageCards = useMemo(() => {
    return records.map(record => {
      const slug = record.page_address as string | null
      const matchedPage = slug
        ? pages.find(p => (p.page_address as string) === slug)
        : null
      return { record, page: matchedPage, slug }
    })
  }, [records, pages])

  // ── Render ─────────────────────────────────────────────────────────────────

  const avatarColor = hashColor(name)

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
      }}
    >
      {/* ── Person header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
        {contactPhotoUrl ? (
          <img
            src={contactPhotoUrl}
            alt={name}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              flexShrink: 0,
              background: `${avatarColor}22`,
              color: avatarColor,
            }}
          >
            {initials(name)}
          </div>
        )}

        {/* Name + email + company/stage */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>

          {Boolean(displayEmail) && (
            <div
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayEmail}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {Boolean(company) && (
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {company}
              </span>
            )}
            <StatusBadge value={stage} />
          </div>
        </div>
      </div>

      {/* ── Pages with Access ──────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'var(--text-tertiary)',
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        Pages with Access ({records.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pageCards.map(({ record, page, slug }) => {
          const dateAdded = (record.date_added as string) || ''

          if (page) {
            return (
              <PageCard
                key={record.id as string}
                page={page}
                dateAdded={dateAdded}
                onNavigate={() => onNavigateToPage(slug as string)}
              />
            )
          }

          // Minimal card when page data isn't found
          return (
            <div
              key={record.id as string}
              onClick={() => { if (slug) onNavigateToPage(slug) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--bg-secondary)',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  flexShrink: 0,
                  opacity: 0.4,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {slug || 'Unknown page'}
                </div>
                {Boolean(slug) && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    /ils-clients/{slug}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {dateAdded ? new Date(dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
              <span style={{ fontSize: 16, color: 'var(--text-tertiary)', lineHeight: 1 }}>
                {'\u203A'}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Details ────────────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'var(--text-tertiary)',
          marginTop: 24,
          marginBottom: 6,
        }}
      >
        Details
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {detailFields.map((field, i) => (
          <EditableFormRow
            key={field.key}
            field={field}
            value={primaryRecord[field.key]}
            isLast={i === detailFields.length - 1}
            onSave={handleFieldSave}
          />
        ))}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'var(--text-tertiary)',
          marginTop: 24,
          marginBottom: 6,
        }}
      >
        Notes
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <EditableFormRow
          field={notesField}
          value={primaryRecord.notes}
          isLast
          onSave={handleFieldSave}
        />
      </div>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'var(--text-tertiary)',
          marginTop: 24,
          marginBottom: 6,
        }}
      >
        Recent Activity
      </div>

      <ActivityLog logs={logs} personEmail={email} />
    </div>
  )
}
