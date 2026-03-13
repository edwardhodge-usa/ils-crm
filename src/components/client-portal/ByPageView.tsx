import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  const [healthMap, setHealthMap] = useState<Map<string, { status: number; ok: boolean }>>(new Map())
  const hasValidatedSlugs = useRef(false)

  // ── Auto-fix bad slugs on load ──────────────────────────────────────────
  // Catches edits made directly in Airtable UI that bypass the CRM's slugify.
  // Runs once per mount, auto-corrects both Client Pages and Portal Access.

  useEffect(() => {
    if (hasValidatedSlugs.current || pages.length === 0) return
    hasValidatedSlugs.current = true

    const fixSlugs = async () => {
      let pagesFixed = 0
      let accessFixed = 0
      // Track old→new slug renames so we cascade to Portal Access
      const renames = new Map<string, string>()

      // 1. Fix Client Pages with bad slugs
      for (const page of pages) {
        const addr = page.page_address as string | null
        if (!addr || addr === 'null') continue
        const correct = slugify(addr)
        if (addr !== correct) {
          await window.electronAPI.clientPages.update(page.id as string, { page_address: correct })
          renames.set(addr, correct)
          pagesFixed++
        }
      }

      // 2. Fix Portal Access records — cascade renames + fix independently bad slugs
      for (const rec of accessRecords) {
        const addr = rec.page_address as string | null
        if (!addr || addr === 'null') continue
        // Check if this was renamed via a Client Page fix
        const cascaded = renames.get(addr)
        if (cascaded) {
          await window.electronAPI.portalAccess.update(rec.id as string, { page_address: cascaded })
          accessFixed++
          continue
        }
        // Otherwise check if it's independently malformed
        const correct = slugify(addr)
        if (addr !== correct) {
          await window.electronAPI.portalAccess.update(rec.id as string, { page_address: correct })
          accessFixed++
        }
      }

      if (pagesFixed > 0 || accessFixed > 0) {
        console.log(`[Portal] Auto-fixed slugs: ${pagesFixed} page(s), ${accessFixed} access record(s)`)
        reloadPages()
        reloadAccess()
      }
    }

    fixSlugs()
  }, [pages, accessRecords, reloadPages, reloadAccess])

  // ── Batch Framer page health check on mount ────────────────────────────────

  useEffect(() => {
    if (pages.length === 0) return
    let cancelled = false
    const checkAll = async () => {
      const results = new Map<string, { status: number; ok: boolean }>()
      for (const page of pages) {
        if (cancelled) break
        const slug = page.page_address as string
        if (!slug || slug === 'null') continue
        try {
          const result = await window.electronAPI.framer.checkPageHealth(slug)
          results.set(slug, result)
          if (!cancelled) setHealthMap(new Map(results))
        } catch { /* skip */ }
        // Stagger 200ms between requests (5 req/sec limit)
        await new Promise(r => setTimeout(r, 200))
      }
    }
    checkAll()
    return () => { cancelled = true }
  }, [pages])

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

      // Cascade: when page_address changes, update all Portal Access records that reference the old slug
      if (key === 'page_address' && selectedPage) {
        const oldSlug = selectedPage.page_address as string | null
        const newSlug = typeof value === 'string' ? value : null
        if (oldSlug && oldSlug !== 'null' && newSlug && oldSlug !== newSlug) {
          const affected = accessRecords.filter(r => r.page_address === oldSlug)
          await Promise.all(
            affected.map(r =>
              window.electronAPI.portalAccess.update(r.id as string, { page_address: newSlug }),
            ),
          )
          if (affected.length > 0) reloadAccess()
        }
      }
    },
    [selectedPageId, selectedPage, pages, accessRecords, reloadPages, reloadAccess],
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
        status: 'ACTIVE',
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

  // ── Health summary for toolbar ─────────────────────────────────────────────
  const checkedCount = healthMap.size
  const liveCount = Array.from(healthMap.values()).filter(v => v.ok).length
  const sluggedPages = pages.filter(p => p.page_address && p.page_address !== 'null').length

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
        healthMap={healthMap}
        healthSummary={{ liveCount, sluggedPages, checkedCount }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderLeft: '1px solid var(--separator)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Content Toolbar ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '8px 12px',
            borderBottom: '1px solid var(--color-separator)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => window.electronAPI?.shell?.openExternal?.('https://framer.com/projects')}
            title="Open Framer editor to sync and publish changes"
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--color-fill-tertiary)',
              border: '1px solid var(--color-separator)',
              borderRadius: 6,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <path d="M9.5 6.5v3a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6a1 1 0 011-1h3M7.5 1.5h3v3M5.5 6.5l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Publish to Framer
          </button>
        </div>

        {/* ── Detail Content ───────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
