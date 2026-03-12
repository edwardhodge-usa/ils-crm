import { useState, useMemo } from 'react'
import useEntityList from '../../hooks/useEntityList'
import ByPageView from './ByPageView'
import ByPersonView from './ByPersonView'
import { resolveLookup } from '../../utils/portal-helpers'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  // Data loading — useEntityList takes a callback, returns { data, loading, error, reload }
  const { data: pages, loading: pagesLoading, reload: reloadPages } = useEntityList(
    () => window.electronAPI.clientPages.getAll()
  )
  const { data: rawAccessRecords, loading: accessLoading, reload: reloadAccess } = useEntityList(
    () => window.electronAPI.portalAccess.getAll()
  )
  const { data: logs } = useEntityList(
    () => window.electronAPI.portalLogs.getAll()
  )
  const { data: companies } = useEntityList(
    () => window.electronAPI.companies.getAll()
  )

  // Build company ID→name map and enrich access records where contact_company_lookup
  // contains a raw Airtable record ID instead of a resolved company name
  const accessRecords = useMemo(() => {
    const companyMap = new Map<string, string>()
    for (const c of companies) {
      if (c.id && c.company_name) companyMap.set(c.id as string, c.company_name as string)
      if (c.airtable_id && c.company_name) companyMap.set(c.airtable_id as string, c.company_name as string)
    }
    if (companyMap.size === 0) return rawAccessRecords

    return rawAccessRecords.map(r => {
      const lookup = resolveLookup(r.contact_company_lookup)
      if (lookup && lookup.startsWith('rec') && companyMap.has(lookup)) {
        return { ...r, contact_company_lookup: companyMap.get(lookup)! }
      }
      return r
    })
  }, [rawAccessRecords, companies])

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
