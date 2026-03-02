// StatCard — metric tile with icon and colored variant
// Matches approved mockup: ils-crm-dashboard-v3.html

import { useEffect, useState } from 'react'

interface StatCardProps {
  icon: string
  value: string | number
  label: string
  subtitle?: string
  variant?: 'default' | 'red' | 'green' | 'indigo'
}

const VARIANTS = {
  default: {
    light: { bg: 'white', border: 'rgba(0,0,0,0.08)', num: 'var(--text-primary)', shadow: '0 1px 3px rgba(0,0,0,0.06)' },
    dark: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.07)', num: 'var(--text-primary)', shadow: 'none' },
  },
  red: {
    light: { bg: 'rgba(255,59,48,0.04)', border: 'rgba(255,59,48,0.18)', num: '#FF3B30', shadow: 'none' },
    dark: { bg: 'rgba(255,69,58,0.06)', border: 'rgba(255,69,58,0.28)', num: '#FF453A', shadow: 'none' },
  },
  green: {
    light: { bg: 'rgba(52,199,89,0.04)', border: 'rgba(52,199,89,0.18)', num: '#34C759', shadow: 'none' },
    dark: { bg: 'rgba(48,209,88,0.05)', border: 'rgba(48,209,88,0.22)', num: '#30D158', shadow: 'none' },
  },
  indigo: {
    light: { bg: 'rgba(88,86,214,0.04)', border: 'rgba(88,86,214,0.18)', num: '#5856D6', shadow: 'none' },
    dark: { bg: 'rgba(88,86,214,0.06)', border: 'rgba(88,86,214,0.25)', num: '#9C99FF', shadow: 'none' },
  },
}

export default function StatCard({ icon, value, label, subtitle, variant = 'default' }: StatCardProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const v = VARIANTS[variant][isDark ? 'dark' : 'light']

  return (
    <div
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        boxShadow: v.shadow,
        borderRadius: 10,
        padding: 14,
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 19, marginBottom: 7, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: -1,
          lineHeight: 1,
          marginBottom: 4,
          color: v.num,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}
      </div>
      {Boolean(subtitle) && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
