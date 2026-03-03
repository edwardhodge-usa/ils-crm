const ICON_COLORS = [
  { bg: 'rgba(99,102,241,0.12)', fg: '#818CF8' },
  { bg: 'rgba(52,211,153,0.12)', fg: '#34D399' },
  { bg: 'rgba(251,146,60,0.12)', fg: '#FB923C' },
  { bg: 'rgba(56,189,248,0.12)', fg: '#38BDF8' },
  { bg: 'rgba(168,85,247,0.12)', fg: '#A855F7' },
  { bg: 'rgba(244,63,94,0.12)', fg: '#F43F5E' },
  { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' },
  { bg: 'rgba(16,185,129,0.12)', fg: '#10B981' },
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
              fontSize: 11, fontWeight: 500, padding: '1px 6px',
              borderRadius: 4, lineHeight: 1.4, opacity: 0.85,
              background: `rgba(${hexToRgb(color.fg)},0.10)`,
              color: color.fg,
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

/** Convert a hex color like #818CF8 to "129,140,248" for rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r},${g},${b}`
}
