import type { ContactListItem } from '@/types'

const AVATAR_COLORS = [
  { bg: 'rgba(52,211,153,0.12)', fg: '#34D399' },
  { bg: 'rgba(99,102,241,0.12)', fg: '#818CF8' },
  { bg: 'rgba(251,146,60,0.12)', fg: '#FB923C' },
  { bg: 'rgba(244,63,94,0.12)', fg: '#F43F5E' },
  { bg: 'rgba(56,189,248,0.12)', fg: '#38BDF8' },
  { bg: 'rgba(168,85,247,0.12)', fg: '#A855F7' },
  { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
  { bg: 'rgba(16,185,129,0.12)', fg: '#10B981' },
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(first: string, last: string): string {
  const f = first.trim()[0] || ''
  const l = last.trim()[0] || ''
  return (f + l).toUpperCase() || '?'
}

interface ContactRowProps {
  contact: ContactListItem
  isSelected: boolean
  onClick: () => void
}

export function ContactRow({ contact, isSelected, onClick }: ContactRowProps) {
  const {
    firstName, lastName, jobTitle, companyName,
    specialtyNames, specialtyColors, daysSinceContact,
  } = contact

  const name = `${firstName} ${lastName}`.trim()
  const color = avatarColor(name)
  const subtitle = jobTitle && companyName
    ? `${jobTitle} · ${companyName}`
    : jobTitle || companyName || ''

  // Days badge styling: warn (orange) for 14-20d, danger (red) for 21+
  const daysColor = daysSinceContact !== null && daysSinceContact !== undefined
    ? daysSinceContact >= 21 ? 'var(--color-red)' : daysSinceContact >= 14 ? 'var(--color-orange)' : 'var(--color-accent)'
    : undefined

  // Parse specialty color from "bg|fg" encoded string
  function parseSpecColor(encoded: string | undefined): { bg: string; fg: string } {
    if (!encoded || !encoded.includes('|')) {
      return { bg: 'rgba(88,86,214,0.10)', fg: '#5856D6' }
    }
    const [bg, fg] = encoded.split('|')
    return { bg, fg }
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '11px 14px 12px',
        borderLeft: '2.5px solid',
        borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        cursor: 'default',
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, background: color.bg, color: color.fg,
        letterSpacing: '-0.3px',
      }}>
        {initials(firstName, lastName)}
      </div>

      {/* Name + subtitle + meta */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Name */}
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name || 'Unnamed'}
        </div>

        {/* Subtitle: role · company */}
        {Boolean(subtitle) && (
          <div style={{
            fontSize: 11, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {subtitle}
          </div>
        )}

        {/* Meta row: specialty tag + days badge */}
        {(specialtyNames[0] || (daysSinceContact !== null && daysSinceContact !== undefined)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            {specialtyNames[0] && (() => {
              const sc = parseSpecColor(specialtyColors[0])
              return (
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: '1px 6px',
                  borderRadius: 4, flexShrink: 0, opacity: 0.85,
                  background: sc.bg, color: sc.fg,
                }}>
                  {specialtyNames[0]}
                </span>
              )
            })()}
            {daysSinceContact !== null && daysSinceContact !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 500, padding: '2px 6px',
                borderRadius: 4, flexShrink: 0, marginLeft: 'auto',
                opacity: 0.85,
                background: daysColor === 'var(--color-accent)'
                  ? 'rgba(88,86,214,0.10)'
                  : daysColor === 'var(--color-orange)' ? 'rgba(255,159,10,0.10)' : 'rgba(255,59,48,0.10)',
                color: daysColor,
                whiteSpace: 'nowrap',
              }}>
                {daysSinceContact}d
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
