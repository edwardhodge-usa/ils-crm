import { useState } from 'react'

const ICON_COLORS = [
  { bg: 'rgba(0,122,255,0.22)', fg: '#007AFF', fgDark: '#409CFF' },       // systemBlue
  { bg: 'rgba(52,199,89,0.22)', fg: '#34C759', fgDark: '#30D158' },        // systemGreen
  { bg: 'rgba(255,149,0,0.22)', fg: '#FF9500', fgDark: '#FF9F0A' },        // systemOrange
  { bg: 'rgba(255,45,85,0.22)', fg: '#FF2D55', fgDark: '#FF375F' },        // systemPink
  { bg: 'rgba(175,82,222,0.22)', fg: '#AF52DE', fgDark: '#BF5AF2' },       // systemPurple
  { bg: 'rgba(88,86,214,0.22)', fg: '#5856D6', fgDark: '#5E5CE6' },        // systemIndigo
  { bg: 'rgba(48,176,199,0.22)', fg: '#30B0C7', fgDark: '#40CBE0' },       // systemTeal
  { bg: 'rgba(0,199,190,0.22)', fg: '#00C7BE', fgDark: '#63E6E2' },        // systemMint
  { bg: 'rgba(50,173,230,0.22)', fg: '#32ADE6', fgDark: '#70D7FF' },       // systemCyan
  { bg: 'rgba(255,204,0,0.22)', fg: '#C79800', fgDark: '#FFD60A' },        // systemYellow
  { bg: 'rgba(162,132,94,0.22)', fg: '#A2845E', fgDark: '#AC8E68' },       // systemBrown
]

export function iconColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length]
}

interface CompanyLogoProps {
  name: string
  logoUrl?: string | null
  size: 16 | 30 | 40 | 50
  onClick?: () => void
}

export function CompanyLogo({ name, logoUrl, size, onClick }: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false)
  const color = iconColor(name)
  const radius = { 16: 3, 30: 7, 40: 10, 50: 12 }[size]
  const fontSize = { 16: 8, 30: 13, 40: 16, 50: 20 }[size]

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onClick={onClick}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'contain',
          flexShrink: 0,
          background: '#fff',
          cursor: 'default',
        }}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        background: color.bg,
        color: color.fg,
        cursor: 'default',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
