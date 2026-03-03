import { useState } from 'react'

interface FilterTabsProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
  counts: Record<string, number>
}

export default function FilterTabs({ tabs, activeTab, onTabChange, counts }: FilterTabsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
      {tabs.map(tab => (
        <TabButton
          key={tab}
          label={tab}
          count={counts[tab] ?? 0}
          isActive={activeTab === tab}
          onClick={() => onTabChange(tab)}
        />
      ))}
    </div>
  )
}

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const bg = isActive
    ? 'var(--color-accent)'
    : hovered
      ? 'var(--bg-hover)'
      : 'var(--bg-secondary)'
  const color = isActive ? 'var(--text-on-accent)' : 'var(--text-primary)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '4px 12px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        color,
        border: 'none',
        cursor: 'default',
        transition: 'background 150ms, color 150ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}>{count}</span>
    </button>
  )
}
