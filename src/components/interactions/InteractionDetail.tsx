import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'
import { firstId } from '../../utils/linked-records'
import { parseCollaboratorName } from '../../utils/collaborator'

// ─── Type → color mapping (matches InteractionRow) ───────────────────────────

const TYPE_COLORS: Record<string, { fg: string; bg: string }> = {
  'Phone Call':       { fg: 'var(--color-green)', bg: 'color-mix(in srgb, var(--color-green) 10%, transparent)' },
  'Meeting':          { fg: 'var(--color-accent)', bg: 'color-mix(in srgb, var(--color-accent) 10%, transparent)' },
  'Email':            { fg: 'var(--color-orange)', bg: 'color-mix(in srgb, var(--color-orange) 10%, transparent)' },
  'Virtual Meeting':  { fg: 'var(--color-indigo)', bg: 'color-mix(in srgb, var(--color-indigo) 10%, transparent)' },
  'Note':             { fg: 'var(--text-tertiary)', bg: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)' },
}

const DEFAULT_COLOR = { fg: 'var(--text-tertiary)', bg: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)' }

function getTypeColor(type: string | null): { fg: string; bg: string } {
  if (!type) return DEFAULT_COLOR
  if (TYPE_COLORS[type]) return TYPE_COLORS[type]
  const t = type.toLowerCase()
  if (t.includes('phone') || t.includes('call')) return TYPE_COLORS['Phone Call']
  if (t.includes('meeting') && !t.includes('virtual')) return TYPE_COLORS['Meeting']
  if (t.includes('email')) return TYPE_COLORS['Email']
  if (t.includes('virtual')) return TYPE_COLORS['Virtual Meeting']
  if (t.includes('note')) return TYPE_COLORS['Note']
  return DEFAULT_COLOR
}

// ─── Date formatting ─────────────────────────────────────────────────────────

function formatDate(raw: string | null): string {
  if (!raw) return '—'
  const [y, m, d] = raw.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Editable fields definition ──────────────────────────────────────────────

const INTERACTION_EDITABLE_FIELDS: EditableField[] = [
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'type', label: 'Type', type: 'singleSelect',
    options: ['📧 Email', '📞 Phone Call', '🤝 Meeting (In-Person)', '💻 Meeting (Virtual)', '🍽️ Lunch/Dinner', '🎪 Conference/Event', '📝 Note'] },
  { key: 'direction', label: 'Direction', type: 'singleSelect',
    options: ['Outbound (we initiated)', 'Inbound (they initiated)'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'duration', label: 'Duration', type: 'text' },
  { key: 'logged_by', label: 'Logged By', type: 'text' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
  { key: 'next_steps', label: 'Next Steps', type: 'textarea' },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface InteractionDetailProps {
  interactionId: string | null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InteractionDetail({ interactionId }: InteractionDetailProps) {
  const navigate = useNavigate()
  const [interaction, setInteraction] = useState<Record<string, unknown> | null>(null)
  const [linkedContact, setLinkedContact] = useState<Record<string, unknown> | null>(null)
  const [linkedOpp, setLinkedOpp] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!interactionId) {
      setInteraction(null)
      setLinkedContact(null)
      setLinkedOpp(null)
      return
    }
    setInteraction(null)
    setLinkedContact(null)
    setLinkedOpp(null)

    async function load() {
      const res = await window.electronAPI.interactions.getById(interactionId!)
      if (res.success && res.data) {
        const data = res.data as Record<string, unknown>
        setInteraction(data)

        const contactId = firstId(data.contacts_ids)
        const oppId = firstId(data.sales_opportunities_ids)

        const noOp = Promise.resolve({ success: false, data: null })
        const [contactRes, oppRes] = await Promise.all([
          contactId ? window.electronAPI.contacts.getById(contactId) : noOp,
          oppId ? window.electronAPI.opportunities.getById(oppId) : noOp,
        ])

        if (contactRes.success && contactRes.data) {
          setLinkedContact(contactRes.data as Record<string, unknown>)
        }
        if (oppRes.success && oppRes.data) {
          setLinkedOpp(oppRes.data as Record<string, unknown>)
        }
      }
    }
    load()
  }, [interactionId])

  // ── Inline-edit save handler ────────────────────────────────────────────────

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!interactionId) return
    await window.electronAPI.interactions.update(interactionId, { [key]: val })
    const res = await window.electronAPI.interactions.getById(interactionId)
    if (res.success && res.data) setInteraction(res.data as Record<string, unknown>)
  }, [interactionId])

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (!interactionId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-window)',
          borderLeft: '0.5px solid var(--separator)',
        }}
      >
        <EmptyState
          title="Select an interaction"
          subtitle="Choose an interaction from the list to view details"
        />
      </div>
    )
  }

  if (!interaction) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-window)',
          borderLeft: '0.5px solid var(--separator)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // ── Field extraction ───────────────────────────────────────────────────────

  const type        = (interaction.type         as string | null) ?? null
  const date        = (interaction.date         as string | null) ?? null
  const subject     = (interaction.subject      as string | null) ?? null
  const resolvedContactName = linkedContact
    ? (linkedContact.contact_name as string) || [linkedContact.first_name, linkedContact.last_name].filter(Boolean).join(' ') || null
    : null
  const contactName = resolvedContactName ??
                      (interaction.contact_name as string | null) ??
                      (interaction.contact      as string | null) ?? null
  const resolvedOppName = linkedOpp
    ? (linkedOpp.opportunity_name as string) || null
    : null

  const colors  = getTypeColor(type)
  const icon    = interactionTypeIcon(type, 20)
  const dateStr = formatDate(date)

  // ── Related records (readonly navigational rows) ────────────────────────────

  const relatedFields: EditableField[] = []
  if (contactName) {
    relatedFields.push({ key: '_contact', label: 'Contact', type: 'readonly', isLink: true })
  }
  if (resolvedOppName) {
    relatedFields.push({ key: '_opportunity', label: 'Opportunity', type: 'readonly', isLink: true })
  }

  const relatedValues: Record<string, unknown> = {
    _contact: contactName,
    _opportunity: resolvedOppName,
  }

  const handleRelatedClick = (key: string) => {
    if (key === '_contact' && linkedContact) {
      navigate(`/contacts/${linkedContact.id as string}`)
    } else if (key === '_opportunity' && linkedOpp) {
      navigate(`/pipeline/${linkedOpp.id as string}/edit`)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-window)',
        borderLeft: '0.5px solid var(--separator)',
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px 20px' }}>

        {/* Hero: type icon + label + date */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {/* Icon circle — 40px */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: colors.bg,
              color: colors.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            {icon}
          </div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '20px',
            }}
          >
            {type ?? 'Interaction'}
          </div>

          {Boolean(subject) && subject !== type && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              {subject}
            </div>
          )}

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginTop: 4,
            }}
          >
            {dateStr}
          </div>
        </div>

        {/* ── Editable details ── */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {INTERACTION_EDITABLE_FIELDS.map((field, i) => {
            const raw = interaction[field.key]
            const displayVal = field.key === 'logged_by' ? parseCollaboratorName(raw as string | null) : raw
            return (
              <EditableFormRow
                key={field.key}
                field={field}
                value={displayVal}
                isLast={i === INTERACTION_EDITABLE_FIELDS.length - 1 && relatedFields.length === 0}
                onSave={handleFieldSave}
              />
            )
          })}
        </div>

        {/* ── Related records (readonly navigational links) ── */}
        {relatedFields.length > 0 && (
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {relatedFields.map((field, i) => (
              <div
                key={field.key}
                onClick={() => handleRelatedClick(field.key)}
                style={{ cursor: 'default' }}
              >
                <EditableFormRow
                  field={field}
                  value={relatedValues[field.key]}
                  isLast={i === relatedFields.length - 1}
                  onSave={async () => {}}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── New Follow-up Task button ── */}
        <button
          onClick={() => navigate('/tasks')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-accent)',
            background: 'transparent',
            border: 'none',
            borderRadius: 8,
            cursor: 'default',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Follow-up Task
        </button>

      </div>
    </div>
  )
}
