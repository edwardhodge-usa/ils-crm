import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSyncStatus } from '../../hooks/useSyncStatus'
import { ROUTE_TITLES } from '../../config/routes'

export default function TopBar() {
  const location = useLocation()
  const { isSyncing, progress, forceSync } = useSyncStatus()
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.app.getVersion().then(result => {
      if (result.success) setVersion(result.data)
    })
  }, [])

  const title = ROUTE_TITLES[location.pathname] ??
    Object.entries(ROUTE_TITLES).find(([path]) =>
      path !== '/' && location.pathname.startsWith(path)
    )?.[1] ?? ''

  return (
    <div className="h-12 bg-[var(--bg-window)] border-b border-[var(--separator-opaque)] flex items-center justify-end px-4 window-drag relative">
      {/* Absolutely centered title — unaffected by right-side content */}
      <h1 className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-[var(--text-primary)] pointer-events-none">
        {title}
      </h1>

      <div className="flex items-center gap-3 relative">
        {/* Sync indicator — click to force sync */}
        <button
          aria-label={isSyncing ? 'Syncing in progress' : 'Force sync'}
          disabled={isSyncing}
          onClick={() => { if (!isSyncing) forceSync() }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border-none bg-transparent cursor-default hover:bg-[var(--bg-hover)] disabled:hover:bg-transparent transition-colors"
        >
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
        </button>

        {/* Version label */}
        {version && (
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
            v{version}
          </span>
        )}
      </div>
    </div>
  )
}
