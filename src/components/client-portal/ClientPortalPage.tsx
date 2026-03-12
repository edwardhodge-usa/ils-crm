import { useState } from 'react'
import useEntityList from '../../hooks/useEntityList'
import ByPageView from './ByPageView'
import ByPersonView from './ByPersonView'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  // Data loading — useEntityList takes a callback, returns { data, loading, error, reload }
  const { data: pages, loading: pagesLoading, reload: reloadPages } = useEntityList(
    () => window.electronAPI.clientPages.getAll()
  )
  const { data: accessRecords, loading: accessLoading, reload: reloadAccess } = useEntityList(
    () => window.electronAPI.portalAccess.getAll()
  )
  const { data: logs } = useEntityList(
    () => window.electronAPI.portalLogs.getAll()
  )

  const [view, setView] = useState<'byPage' | 'byPerson'>('byPage')
  const [search, setSearch] = useState('')
  const [pendingPageAddress, setPendingPageAddress] = useState<string | null>(null)

  const loading = pagesLoading || accessLoading

  // Cross-view navigation: switch to By Page view with a specific page selected
  const handleSwitchToPageView = (pageAddress: string) => {
    setView('byPage')
    setPendingPageAddress(pageAddress)
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {view === 'byPage' ? (
        <ByPageView
          pages={pages}
          accessRecords={accessRecords}
          logs={logs}
          search={search}
          onSearchChange={setSearch}
          reloadPages={reloadPages}
          reloadAccess={reloadAccess}
          pendingPageAddress={pendingPageAddress}
          onClearPending={() => setPendingPageAddress(null)}
          view={view}
          onViewChange={setView}
        />
      ) : (
        <ByPersonView
          pages={pages}
          accessRecords={accessRecords}
          logs={logs}
          search={search}
          onSearchChange={setSearch}
          onSwitchToPageView={handleSwitchToPageView}
          reloadAccess={reloadAccess}
          view={view}
          onViewChange={setView}
        />
      )}
    </div>
  )
}
