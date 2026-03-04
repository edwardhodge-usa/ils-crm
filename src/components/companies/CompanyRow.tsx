import { CompanyLogo, iconColor } from '../shared/CompanyLogo'
import useDarkMode from '../../hooks/useDarkMode'

interface CompanyRowProps {
  company: {
    id: string
    name: string
    industry: string | null
    type: string | null
    contactCount: number
    logoUrl?: string | null
  }
  isSelected: boolean
  onClick: () => void
}

export function CompanyRow({ company, isSelected, onClick }: CompanyRowProps) {
  const { name, industry, type, contactCount } = company
  const color = iconColor(name)
  const isDark = useDarkMode()
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
      {/* Company logo or letter fallback */}
      <CompanyLogo name={name} logoUrl={company.logoUrl} size={30} />

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
              background: `rgba(${hexToRgb(isDark ? color.fgDark : color.fg)},0.22)`,
              color: isDark ? color.fgDark : color.fg,
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
