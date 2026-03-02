const ICON_COLORS = [
  { bg: 'rgba(99,102,241,0.15)', fg: '#818CF8' },
  { bg: 'rgba(52,211,153,0.15)', fg: '#34D399' },
  { bg: 'rgba(251,146,60,0.15)', fg: '#FB923C' },
  { bg: 'rgba(56,189,248,0.15)', fg: '#38BDF8' },
  { bg: 'rgba(168,85,247,0.15)', fg: '#A855F7' },
  { bg: 'rgba(244,63,94,0.15)', fg: '#F43F5E' },
  { bg: 'rgba(245,158,11,0.15)', fg: '#F59E0B' },
  { bg: 'rgba(16,185,129,0.15)', fg: '#10B981' },
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
      className="cursor-default transition-colors duration-[150ms]"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderBottom: '1px solid var(--separator)',
        background: isSelected ? 'var(--color-accent-translucent)' : undefined,
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
    >
      {/* Building icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, background: color.bg, color: color.fg,
      }}>
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Name + category */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
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
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 140,
            }}>
              {categoryLabel}
            </span>
          )}
          {contactCount > 0 && (
            <span style={{
              fontSize: 11, color: 'var(--text-tertiary)',
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
