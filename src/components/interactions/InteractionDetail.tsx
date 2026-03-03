import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import { PencilIcon } from '../shared/icons/PencilIcon'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'

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

// ─── Reusable form row ───────────────────────────────────────────────────────

function FormRow({
  label,
  value,
  isLast = false,
  multiline = false,
  children,
}: {
  label: string
  value?: string | null
  isLast?: boolean
  multiline?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: multiline ? 'flex-start' : 'center',
        minHeight: 36,
        padding: '8px 12px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--separator)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-primary)',
          flexShrink: 0,
          width: 90,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        {children ?? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
              lineHeight: multiline ? '20px' : '16px',
              textAlign: multiline ? 'left' : 'right',
              display: 'block',
            }}
          >
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface InteractionDetailProps {
  interactionId: string | null
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InteractionDetail({ interactionId }: InteractionDetailProps) {
  const navigate = useNavigate()
  const [interaction, setInteraction] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!interactionId) {
      setInteraction(null)
      return
    }
    setInteraction(null)
    window.electronAPI.interactions.getById(interactionId).then(res => {
      if (res.success && res.data) {
        setInteraction(res.data as Record<string, unknown>)
      }
    })
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
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // ── Field extraction ───────────────────────────────────────────────────────

  const type        = (interaction.type         as string | null) ?? null
  const date        = (interaction.date         as string | null) ?? null
  const subject     = (interaction.subject      as string | null) ?? null
  const summary     = (interaction.summary      as string | null) ?? null
  const next_steps  = (interaction.next_steps   as string | null) ?? null
  const duration    = (interaction.duration     as string | null) ?? null
  const contactName = (interaction.contact_name as string | null) ??
                      (interaction.contact      as string | null) ?? null

  const colors  = getTypeColor(type)
  const icon    = interactionTypeIcon(type, 20)
  const dateStr = formatDate(date)

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
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '8px 16px',
          borderBottom: '0.5px solid var(--separator)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate(`/interactions/${interactionId}/edit`)}
          title="Edit interaction"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'default',
            transition: 'background 150ms, color 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-hover)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
        >
          <PencilIcon />
        </button>
      </div>

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

        {/* ── Details grouped container ── */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <FormRow label="Type">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 6,
                background: colors.bg,
                color: colors.fg,
                lineHeight: '18px',
              }}
            >
              {type ?? '—'}
            </span>
          </FormRow>

          {Boolean(contactName) && (
            <FormRow label="Contact">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: 'var(--color-accent)',
                  cursor: 'default',
                }}
              >
                {contactName}
              </span>
            </FormRow>
          )}

          <FormRow label="Date" value={dateStr} />

          {Boolean(duration) && (
            <FormRow label="Duration" value={duration} />
          )}

          {Boolean(summary) && (
            <FormRow
              label="Summary"
              value={summary}
              multiline
              isLast={!next_steps}
            />
          )}

          {Boolean(next_steps) && (
            <FormRow
              label="Next Steps"
              value={next_steps}
              multiline
              isLast
            />
          )}

          {/* If no summary and no next_steps, close with date as last */}
          {!summary && !next_steps && !duration && (
            <span />
          )}
        </div>

        {/* ── Notes section (if summary is long or serves as notes) ── */}
        {/* Already handled above in form rows */}

        {/* ── New Follow-up Task button ── */}
        <button
          onClick={() => navigate('/tasks/new')}
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
