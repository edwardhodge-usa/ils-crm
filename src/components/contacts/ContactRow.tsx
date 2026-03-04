import type { ContactListItem } from '@/types'
import useDarkMode from '../../hooks/useDarkMode'
import { CompanyLogo } from '../shared/CompanyLogo'
import { Avatar } from '../shared/Avatar'

interface ContactRowProps {
  contact: ContactListItem
  isSelected: boolean
  onClick: () => void
}

export function ContactRow({ contact, isSelected, onClick }: ContactRowProps) {
  const {
    firstName, lastName, jobTitle, companyName,
    specialtyNames, specialtyColors, daysSinceContact, photoUrl,
  } = contact

  const name = `${firstName} ${lastName}`.trim()
  const hasSubtitle = Boolean(jobTitle || companyName)

  // Days badge styling: warn (orange) for 14-20d, danger (red) for 21+
  const daysColor = daysSinceContact !== null && daysSinceContact !== undefined
    ? daysSinceContact >= 21 ? 'var(--color-red)' : daysSinceContact >= 14 ? 'var(--color-orange)' : 'var(--color-accent)'
    : undefined

  const isDark = useDarkMode()

  // Parse specialty color from "bg|fg|fgDark" encoded string
  function parseSpecColor(encoded: string | undefined): { bg: string; fg: string; fgDark: string } {
    if (!encoded || !encoded.includes('|')) {
      return { bg: 'rgba(88,86,214,0.22)', fg: '#3634A3', fgDark: '#5E5CE6' }
    }
    const parts = encoded.split('|')
    return { bg: parts[0], fg: parts[1], fgDark: parts[2] || parts[1] }
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
      <Avatar name={name || '?'} size={32} photoUrl={photoUrl} />

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

        {/* Subtitle: role · [logo] company */}
        {hasSubtitle && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            overflow: 'hidden', whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {jobTitle && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {jobTitle}
              </span>
            )}
            {jobTitle && companyName && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>·</span>
            )}
            {companyName && contact.companyLogoUrl && (
              <CompanyLogo name={companyName} logoUrl={contact.companyLogoUrl} size={16} />
            )}
            {companyName && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {companyName}
              </span>
            )}
          </div>
        )}

        {/* Meta row: specialty tag + days badge */}
        {(specialtyNames[0] || (daysSinceContact !== null && daysSinceContact !== undefined)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            {specialtyNames[0] && (() => {
              const sc = parseSpecColor(specialtyColors[0])
              return (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px',
                  borderRadius: 4, flexShrink: 0,
                  background: sc.bg, color: isDark ? sc.fgDark : sc.fg,
                }}>
                  {specialtyNames[0]}
                </span>
              )
            })()}
            {daysSinceContact !== null && daysSinceContact !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 6px',
                borderRadius: 4, flexShrink: 0, marginLeft: 'auto',
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
