import { useLocation } from 'react-router-dom'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { ROUTE_TITLES } from '../../config/routes'

export default function TopBar() {
  const location = useLocation()
  const { isSyncing, progress } = useSyncStatus()

  const title = ROUTE_TITLES[location.pathname] ??
    Object.entries(ROUTE_TITLES).find(([path]) =>
      path !== '/' && location.pathname.startsWith(path)
    )?.[1] ?? ''

  return (
    <div className="h-12 bg-[var(--bg-window)] border-b border-[var(--separator-opaque)] flex items-center px-4 window-drag">
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Sync indicator */}
        <div className="flex items-center gap-1.5">
          {isSyncing ? (
            <>
              <svg className="w-3 h-3 text-[var(--color-accent)] spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.2-8.6" />
              </svg>
              <span className="text-[var(--color-accent)]">
                {progress?.table ? `Syncing ${progress.table}...` : 'Syncing...'}
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
              <span className="text-[var(--text-tertiary)]">Synced</span>
            </>
          )}
        </div>

        {/* Search button */}
        <button
          aria-label="Search"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          Search
          <kbd className="ml-1 text-[10px] text-[var(--text-tertiary)] font-mono">⌘K</kbd>
        </button>
      </div>
    </div>
  )
}
