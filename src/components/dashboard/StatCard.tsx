// StatCard — flat metric tile inside grouped container
// Gold standard: no individual bg/shadow/radius — parent container provides grouping

import useDarkMode from '../../hooks/useDarkMode'

interface StatCardProps {
  icon: string
  value: string | number
  label: string
  subtitle?: string
  variant?: 'default' | 'red' | 'green' | 'indigo'
  isLast?: boolean
}

const ACCENT_COLORS: Record<string, { light: string; dark: string }> = {
  red: { light: '#FF3B30', dark: '#FF453A' },
  green: { light: '#34C759', dark: '#30D158' },
  indigo: { light: '#5856D6', dark: '#5E5CE6' },
}

export default function StatCard({ icon, value, label, subtitle, variant = 'default', isLast = false }: StatCardProps) {
  // Determine accent color for value when variant is not default and value > 0
  const hasAccent = variant !== 'default'
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
  const showAccent = hasAccent && !isNaN(numericValue) && numericValue > 0

  // Detect dark mode for accent color selection
  const isDark = useDarkMode()
  const accentColor = showAccent && ACCENT_COLORS[variant]
    ? (isDark ? ACCENT_COLORS[variant].dark : ACCENT_COLORS[variant].light)
    : undefined

  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        minHeight: 80,
        cursor: 'default',
        borderRight: isLast ? 'none' : '1px solid var(--separator)',
      }}
    >
      <div style={{ fontSize: 17, marginBottom: 6, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: -0.5,
          lineHeight: 1,
          marginBottom: 4,
          color: accentColor || 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>
        {label}
      </div>
      {Boolean(subtitle) && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
