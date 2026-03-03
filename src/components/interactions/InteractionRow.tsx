import { useState } from 'react'
import { interactionTypeIcon } from '../shared/icons/InteractionIcons'

// ─── Type → color mapping ────────────────────────────────────────────────────

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
  // Try exact match first
  if (TYPE_COLORS[type]) return TYPE_COLORS[type]
  // Fuzzy match (e.g. "phone call" vs "Phone Call")
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
  if (!raw) return ''
  const [y, m, d] = raw.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface InteractionRowProps {
  interaction: {
    id: string
    type: string | null
    date: string | null
    subject: string | null
    summary: string | null
    contact_name: string | null
  }
  isSelected: boolean
  onClick: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InteractionRow({ interaction, isSelected, onClick }: InteractionRowProps) {
  const { type, date, subject, summary, contact_name } = interaction
  const [hovered, setHovered] = useState(false)

  const displayName = contact_name || subject || type || 'Interaction'
  const preview = summary?.trim() ?? null
  const colors = getTypeColor(type)
  const icon = interactionTypeIcon(type, 14)

  const bg = isSelected
    ? 'var(--color-accent-translucent)'
    : hovered
      ? 'var(--bg-hover)'
      : 'transparent'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 14px',
        background: bg,
        borderLeft: isSelected
          ? '2.5px solid var(--color-accent)'
          : '2.5px solid transparent',
        transition: 'background 150ms',
        cursor: 'default',
        borderBottom: '0.5px solid var(--separator)',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          borderRadius: '50%',
          background: colors.bg,
          color: colors.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Line 1: contact/subject name */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>

        {/* Line 2: date + preview */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          {Boolean(date) && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                flexShrink: 0,
                lineHeight: '14px',
              }}
            >
              {formatDate(date)}
            </span>
          )}
          {Boolean(preview) && Boolean(date) && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>·</span>
          )}
          {Boolean(preview) && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: '15px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {preview}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
