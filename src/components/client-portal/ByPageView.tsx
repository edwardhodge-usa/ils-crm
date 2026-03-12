import { useState, useEffect, useMemo, useCallback } from 'react'
import PageList from './PageList'
import PageDetail from './PageDetail'
import GrantAccessPopover from './GrantAccessPopover'
import { slugify, uniqueSlug } from '../../utils/slugify'

/** Treat null, "null", undefined, and empty string as missing */
function isEmptySlug(val: unknown): boolean {
  return !val || val === 'null'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ByPageViewProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  search: string
  onSearchChange: (s: string) => void
  reloadPages: () => void
  reloadAccess: () => void
  pendingPageAddress?: string | null
  onClearPending?: () => void
  view: 'byPage' | 'byPerson'
  onViewChange: (v: 'byPage' | 'byPerson') => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ByPageView({
  pages,
  accessRecords,
  logs,
  search,
  onSearchChange,
  reloadPages,
  reloadAccess,
  pendingPageAddress,
  onClearPending,
  view,
  onViewChange,
}: ByPageViewProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [dirtyPages, setDirtyPages] = useState<Set<string>>(new Set())
  const [grantPopover, setGrantPopover] = useState<{ x: number; y: number } | null>(null)

  // ── Auto-select first page ────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedPageId && pages.length > 0) {
      setSelectedPageId(pages[0].id as string)
    }
  }, [pages]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate to pending page address ──────────────────────────────────────

  useEffect(() => {
    if (pendingPageAddress) {
      const target = pages.find(p => p.page_address === pendingPageAddress)
      if (target) {
        setSelectedPageId(target.id as string)
      }
      onClearPending?.()
    }
  }, [pendingPageAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedPage = useMemo(
    () => pages.find(p => p.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  )

  const pageAccessRecords = useMemo(
    () => {
      const addr = selectedPage?.page_address as string | null
      if (!selectedPage || !addr || addr === 'null') return []
      return accessRecords.filter(r => r.page_address === addr)
    },
    [accessRecords, selectedPage],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNewPage = useCallback(async () => {
    const res = await window.electronAPI.clientPages.create({})
    if (res.success && res.data) {
      reloadPages()
      setSelectedPageId(
        typeof res.data === 'string'
          ? res.data
          : (res.data as unknown as Record<string, unknown>).id as string,
      )
    }
  }, [reloadPages])

  const handlePageFieldSave = useCallback(
    async (key: string, value: unknown) => {
      if (!selectedPageId) return
      await window.electronAPI.clientPages.update(selectedPageId, { [key]: value })
      reloadPages()

      // Auto-slugify: if editing client_name and page_address is empty/null/"null", generate slug
      if (key === 'client_name' && selectedPage && isEmptySlug(selectedPage.page_address)) {
        const slug = uniqueSlug(
          slugify(String(value)),
          pages.map(p => String(p.page_address ?? '')),
        )
        await window.electronAPI.clientPages.update(selectedPageId, { page_address: slug })
        reloadPages()
      }
    },
    [selectedPageId, selectedPage, pages, reloadPages],
  )

  const handleMarkDirty = useCallback((pageId: string) => {
    setDirtyPages(prev => new Set(prev).add(pageId))
  }, [])

  const handleDismissBanner = useCallback((pageId: string) => {
    setDirtyPages(prev => {
      const next = new Set(prev)
      next.delete(pageId)
      return next
    })
  }, [])

  const handleAccessFieldSave = useCallback(
    async (recordId: string, key: string, value: unknown) => {
      await window.electronAPI.portalAccess.update(recordId, { [key]: value })
      reloadAccess()
    },
    [reloadAccess],
  )

  const handleDeleteAccess = useCallback(
    async (recordId: string) => {
      await window.electronAPI.portalAccess.delete(recordId)
      reloadAccess()
    },
    [reloadAccess],
  )

  const handleGrantAccess = useCallback(() => {
    setGrantPopover({ x: 300, y: 100 })
  }, [])

  const handleGrantContact = useCallback(
    async (contactId: string, name: string, email: string) => {
      if (!selectedPage || isEmptySlug(selectedPage.page_address)) return
      const pa = selectedPage.page_address as string
      const result = await window.electronAPI.portalAccess.create({
        page_address: pa,
        name,
        email,
        stage: 'Lead',
        contact_ids: JSON.stringify([contactId]),
        date_added: new Date().toISOString().split('T')[0],
      })
      if (!result.success) {
        console.error('[Portal] Grant access failed:', result.error)
        return
      }
      reloadAccess()
      setGrantPopover(null)
    },
    [selectedPage, reloadAccess],
  )

  const handleNavigateToPage = useCallback(
    (pageAddress: string) => {
      const target = pages.find(p => p.page_address === pageAddress)
      if (target) {
        setSelectedPageId(target.id as string)
      }
    },
    [pages],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <PageList
        pages={pages}
        accessRecords={accessRecords}
        selectedId={selectedPageId}
        onSelect={setSelectedPageId}
        search={search}
        onSearchChange={onSearchChange}
        onNewPage={handleNewPage}
        view={view}
        onViewChange={onViewChange}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderLeft: '1px solid var(--separator)',
          overflow: 'hidden',
        }}
      >
        {selectedPage ? (
          <PageDetail
            page={selectedPage}
            accessRecords={pageAccessRecords}
            allAccessRecords={accessRecords}
            logs={logs}
            onPageFieldSave={handlePageFieldSave}
            onAccessFieldSave={handleAccessFieldSave}
            onDeleteAccess={handleDeleteAccess}
            onGrantAccess={handleGrantAccess}
            dirtyPages={dirtyPages}
            onMarkDirty={handleMarkDirty}
            onDismissBanner={handleDismissBanner}
            onNavigateToPage={handleNavigateToPage}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              fontSize: 14,
              cursor: 'default',
            }}
          >
            Select a page to view details
          </div>
        )}
      </div>
      {grantPopover && selectedPage && !isEmptySlug(selectedPage.page_address) && (
        <GrantAccessPopover
          pageAddress={selectedPage.page_address as string}
          onGrant={handleGrantContact}
          onClose={() => setGrantPopover(null)}
          position={grantPopover}
        />
      )}
    </div>
  )
}
