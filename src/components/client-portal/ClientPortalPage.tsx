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
  const { data: rawLogs } = useEntityList(
    () => window.electronAPI.portalLogs.getAll()
  )
  const { data: companies } = useEntityList(
    () => window.electronAPI.companies.getAll()
  )
  const { data: contacts } = useEntityList(
    () => window.electronAPI.contacts.getAll()
  )

  // Bug #15: Filter out blank/empty portal log records that have no meaningful display data
  const logs = useMemo(() => {
    return rawLogs.filter(log => {
      const hasName = log.client_name && String(log.client_name).trim() !== ''
      const hasUrl = log.page_url && String(log.page_url).trim() !== ''
      const hasTimestamp = log.timestamp && String(log.timestamp).trim() !== ''
      // Keep records that have at least a name or page URL AND a timestamp
      return (hasName || hasUrl) && hasTimestamp
    })
  }, [rawLogs])

  // Bug #14: Build lookup maps from contacts and companies tables, then enrich
  // portal access records where lookup fields contain raw Airtable record IDs
  // or are empty (lookup fields may not sync when the linked Contact has no data)
  const accessRecords = useMemo(() => {
    // Company ID→name map
    const companyMap = new Map<string, string>()
    for (const c of companies) {
      if (c.id && c.company_name) companyMap.set(c.id as string, c.company_name as string)
    }

    // Contact ID→{name, email, companyIds} map for resolving linked Contact records
    const contactMap = new Map<string, { name: string | null; email: string | null; companyIds: string | null }>()
    for (const c of contacts) {
      const id = c.id as string
      if (!id) continue
      const contactName = (c.contact_name as string | null) ||
        [c.first_name, c.last_name].filter(Boolean).join(' ') || null
      contactMap.set(id, {
        name: contactName,
        email: (c.email as string | null) || null,
        companyIds: (c.companies_ids as string | null) || null,
      })
    }

    return rawAccessRecords.map(r => {
      const enriched = { ...r }

      // Parse the contact_ids linked field to find the linked Contact record
      let linkedContactIds: string[] = []
      const rawIds = r.contact_ids
      if (rawIds) {
        try {
          const parsed = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds
          if (Array.isArray(parsed)) linkedContactIds = parsed
        } catch { /* ignore parse errors */ }
      }
      const linkedContact = linkedContactIds.length > 0 ? contactMap.get(linkedContactIds[0]) : null

      // Enrich name: use lookup field, fall back to linked Contact name
      const currentName = resolveLookup(r.contact_name_lookup)
      if (!currentName && linkedContact?.name) {
        enriched.contact_name_lookup = linkedContact.name
      }

      // Enrich email: use lookup field, fall back to linked Contact email
      const currentEmail = resolveLookup(r.contact_email_lookup)
      if (!currentEmail && linkedContact?.email) {
        enriched.contact_email_lookup = linkedContact.email
      }

      // Enrich company: resolve record ID from lookup field or from linked Contact's company
      const companyLookup = resolveLookup(enriched.contact_company_lookup)
      if (companyLookup && companyLookup.startsWith('rec') && companyMap.has(companyLookup)) {
        enriched.contact_company_lookup = companyMap.get(companyLookup)!
      } else if (!companyLookup || companyLookup.startsWith('rec')) {
        // Try resolving via the linked Contact's companies_ids
        if (linkedContact?.companyIds) {
          try {
            const compIds = typeof linkedContact.companyIds === 'string'
              ? JSON.parse(linkedContact.companyIds)
              : linkedContact.companyIds
            if (Array.isArray(compIds) && compIds.length > 0) {
              const companyName = companyMap.get(compIds[0])
              if (companyName) enriched.contact_company_lookup = companyName
            }
          } catch { /* ignore parse errors */ }
        }
      }

      return enriched
    })
  }, [rawAccessRecords, companies, contacts])

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
