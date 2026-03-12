import { resolvedPortalName, resolvedPortalEmail, resolvedPortalCompany } from '../../utils/portal-helpers'
import useDarkMode from '../../hooks/useDarkMode'
import { colorMap, defaultColors } from '../shared/StatusBadge'

interface AccessRowProps {
  record: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
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

/** Map portal stage values to StatusBadge colorMap keys */
function stageColors(stage: string | null, isDark: boolean): { color: string; bg: string } | null {
  if (!stage) return null
  // Direct match first (covers 'Prospect', 'Lead', 'Partner', 'Past Client', 'Active Client')
  let entry = colorMap[stage]
  // Alias: 'Client' → 'Active Client' / 'Customer'
  if (!entry && stage === 'Client') entry = colorMap['Active Client'] || colorMap['Customer']
  if (!entry) entry = defaultColors
  return { color: isDark ? entry.textDark : entry.text, bg: entry.bg }
}

function formatDate(val: unknown): string | null {
  if (!val) return null
  const d = new Date(String(val))
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AccessRow({ record, isSelected, onClick, onContextMenu }: AccessRowProps) {
  const isDark = useDarkMode()

  const name = resolvedPortalName(record)
  const email = resolvedPortalEmail(record)
  const company = resolvedPortalCompany(record)
  const notes = (record.notes as string | null) || null
  const stage = (record.stage as string | null) || null
  const dateAdded = formatDate(record.date_added)

  const avatarColor = hashColor(name)
  const sc = stageColors(stage, isDark)

  // Build subtitle parts: email + company
  const subtitleParts: string[] = []
  if (email) subtitleParts.push(email)
  if (company) subtitleParts.push(company)
  const subtitle = subtitleParts.join(' · ')

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        minHeight: 56,
        cursor: 'default',
        background: isSelected ? 'var(--bg-selected)' : 'transparent',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--bg-selected)' : 'transparent' }}
    >
      {/* Avatar circle */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
          background: `${avatarColor}22`,
          color: avatarColor,
        }}
      >
        {initials(name)}
      </div>

      {/* Middle column: name, subtitle, notes preview */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Name */}
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name}
        </div>

        {/* Email + Company subtitle */}
        {subtitle && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {subtitle}
          </div>
        )}

        {/* Notes preview */}
        {notes && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
            marginTop: 1,
          }}>
            {notes}
          </div>
        )}
      </div>

      {/* Right column: stage badge + date */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
        gap: 3,
      }}>
        {stage && sc && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.4,
            color: sc.color,
            background: sc.bg,
            whiteSpace: 'nowrap',
          }}>
            {stage}
          </span>
        )}
        {dateAdded && (
          <span style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
          }}>
            {dateAdded}
          </span>
        )}
      </div>
    </div>
  )
}
