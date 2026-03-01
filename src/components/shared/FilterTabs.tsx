interface FilterTabsProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
  counts: Record<string, number>
}

export default function FilterTabs({ tabs, activeTab, onTabChange, counts }: FilterTabsProps) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            activeTab === tab
              ? 'bg-[var(--color-accent-translucent)] text-[var(--color-accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {tab}
          <span className="ml-1 text-[10px] opacity-60">{counts[tab] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
