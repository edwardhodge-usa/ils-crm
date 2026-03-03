import useDarkMode from '../../hooks/useDarkMode'

const ICON_COLORS = [
  { bg: 'rgba(0,122,255,0.22)', fg: '#007AFF', fgText: '#0055B3', fgTextDark: '#409CFF' },       // systemBlue
  { bg: 'rgba(52,199,89,0.22)', fg: '#34C759', fgText: '#248A3D', fgTextDark: '#30D158' },        // systemGreen
  { bg: 'rgba(255,149,0,0.22)', fg: '#FF9500', fgText: '#C93400', fgTextDark: '#FF9F0A' },        // systemOrange
  { bg: 'rgba(255,45,85,0.22)', fg: '#FF2D55', fgText: '#D30047', fgTextDark: '#FF375F' },        // systemPink
  { bg: 'rgba(175,82,222,0.22)', fg: '#AF52DE', fgText: '#8944AB', fgTextDark: '#BF5AF2' },       // systemPurple
  { bg: 'rgba(88,86,214,0.22)', fg: '#5856D6', fgText: '#3634A3', fgTextDark: '#5E5CE6' },        // systemIndigo
  { bg: 'rgba(255,59,48,0.22)', fg: '#FF3B30', fgText: '#D70015', fgTextDark: '#FF453A' },        // systemRed
  { bg: 'rgba(48,176,199,0.22)', fg: '#30B0C7', fgText: '#0E7A8D', fgTextDark: '#40CBE0' },       // systemTeal
]

function iconColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

interface CompanyRowProps {
  company: {
    id: string
    name: string
    industry: string | null
    type: string | null
    contactCount: number
  }
  isSelected: boolean
  onClick: () => void
}

export function CompanyRow({ company, isSelected, onClick }: CompanyRowProps) {
  const isDark = useDarkMode()
  const { name, industry, type, contactCount } = company
  const color = iconColor(name)
  const categoryLabel = industry || type || null

  return (
    <div
      onClick={onClick}
      className="cursor-default"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 12px',
        borderLeft: '2.5px solid',
        borderLeftColor: isSelected ? 'var(--color-accent)' : 'transparent',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
        transition: 'background 150ms',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Letter icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, background: color.bg, color: color.fg,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Name + category + contact count */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {Boolean(categoryLabel) && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 6px',
              borderRadius: 4, lineHeight: 1.4,
              background: `rgba(${hexToRgb(color.fg)},0.22)`,
              color: isDark ? color.fgTextDark : color.fgText,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 140,
            }}>
              {categoryLabel}
            </span>
          )}
          {contactCount > 0 && (
            <span style={{
              fontSize: 11, color: 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums', flexShrink: 0,
              marginLeft: categoryLabel ? 0 : 'auto',
            }}>
              {contactCount} {contactCount === 1 ? 'contact' : 'contacts'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** Convert a hex color like #007AFF to "0,122,255" for rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
}
