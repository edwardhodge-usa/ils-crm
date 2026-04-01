import { useState, useMemo, useCallback } from 'react'
import { EditableFormRow } from '../shared/EditableFormRow'
import type { EditableField } from '../shared/EditableFormRow'
import AccessRow from './AccessRow'
import AccessDetailPanel from './AccessDetailPanel'
import FramerSyncBanner from './FramerSyncBanner'
import ActivityLog from './ActivityLog'
import { ContextMenu } from '../shared/ContextMenu'
import { resolvedPortalName, resolvedPortalEmail } from '../../utils/portal-helpers'
import { slugify } from '../../utils/slugify'

// ── Types ────────────────────────────────────────────────────────────────────

interface PageDetailProps {
  page: Record<string, unknown>
  accessRecords: Record<string, unknown>[]
  allAccessRecords: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  onPageFieldSave: (key: string, value: unknown) => Promise<void>
  onAccessFieldSave: (recordId: string, key: string, value: unknown) => Promise<void>
  onDeleteAccess: (recordId: string) => void
  onGrantAccess: () => void
  dirtyPages: Set<string>
  onMarkDirty: (pageId: string) => void
  onDismissBanner: (pageId: string) => void
  onNavigateToPage: (pageAddress: string) => void
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Section toggle definitions — these map to checkbox fields on Client Pages */
const SECTION_TOGGLES: { key: string; label: string }[] = [
  { key: 'head', label: 'Header' },
  { key: 'v_prmagic', label: 'Practical Magic' },
  { key: 'v_highlight', label: 'Highlights' },
  { key: 'v_360', label: '360 Video' },
  { key: 'v_full_l', label: 'Full Length' },
]

/** Editable page fields displayed as form rows */
const PAGE_FIELDS: EditableField[] = [
  { key: 'page_address', label: 'Page Address', type: 'text' },
  { key: 'deck_url', label: 'Deck URL', type: 'text', isLink: true },
  { key: 'prepared_for', label: 'Prepared For', type: 'text' },
  { key: 'thank_you', label: 'Thank You', type: 'text' },
]

/** Default values for page fields — shown as pre-filled text instead of ghost placeholders */
const PAGE_FIELD_DEFAULTS: Record<string, string> = {
  prepared_for: 'Client contact',
  thank_you: 'Closing message',
  deck_url: 'drive.google.com/...',
}

const DEFAULT_PAGE_TITLE = 'Capabilities Presentation'
const DEFAULT_PAGE_SUBTITLE = "We've prepared this overview of our capabilities, approach and video examples — please don't hesitate to reach out with any questions."

// ── Component ────────────────────────────────────────────────────────────────

export default function PageDetail({
  page,
  accessRecords,
  allAccessRecords,
  logs,
  onPageFieldSave,
  onAccessFieldSave,
  onDeleteAccess,
  onGrantAccess,
  dirtyPages,
  onMarkDirty,
  onDismissBanner,
  onNavigateToPage,
}: PageDetailProps) {
  const pageId = page.id as string
  const rawAddr = page.page_address as string | null
  const pageAddress = (rawAddr && rawAddr !== 'null') ? rawAddr : null
  const clientName = (page.client_name as string) || ''
  const pageTitle = (page.page_title as string) || ''
  const subtitle = (page.page_subtitle as string) || ''

  // ── Local state ────────────────────────────────────────────────
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; recordId: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Derived data ───────────────────────────────────────────────

  const selectedRecord = useMemo(() => {
    if (!selectedAccessId) return null
    return accessRecords.find(r => (r.id as string) === selectedAccessId) ?? null
  }, [selectedAccessId, accessRecords])

  /** Other pages the selected person has access to (by email match) */
  const otherPagesForPerson = useMemo(() => {
    if (!selectedRecord) return []
    const email = resolvedPortalEmail(selectedRecord)
    if (!email) return []

    return allAccessRecords
      .filter(r => {
        const rEmail = resolvedPortalEmail(r)
        const rAddress = r.page_address as string | null
        return rEmail === email && rAddress && rAddress !== pageAddress
      })
      .map(r => ({
        pageAddress: r.page_address as string,
        dateAdded: (r.date_added as string) || '',
      }))
  }, [selectedRecord, allAccessRecords, pageAddress])

  // ── Handlers ───────────────────────────────────────────────────

  /** Wrap page field saves to also mark page as dirty */
  const handlePageFieldSave = useCallback(async (key: string, value: unknown) => {
    const finalValue = key === 'page_address' && typeof value === 'string'
      ? slugify(value)
      : value
    await onPageFieldSave(key, finalValue)
    onMarkDirty(pageId)
  }, [onPageFieldSave, onMarkDirty, pageId])

  const handleToggle = useCallback((key: string) => {
    const current = page[key]
    const newVal = current === 1 || current === true ? 0 : 1
    handlePageFieldSave(key, newVal)
  }, [page, handlePageFieldSave])

  const handleOpenUrl = useCallback(() => {
    if (!pageAddress) return
    const url = `https://imaginelabstudios.com/ils-clients/${pageAddress}`
    window.electronAPI?.shell?.openExternal?.(url)
  }, [pageAddress])

  const handleContextMenu = useCallback((e: React.MouseEvent, recordId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, recordId })
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (confirmDeleteId) {
      onDeleteAccess(confirmDeleteId)
      setConfirmDeleteId(null)
      if (selectedAccessId === confirmDeleteId) setSelectedAccessId(null)
    }
  }, [confirmDeleteId, onDeleteAccess, selectedAccessId])

  // ── Render ─────────────────────────────────────────────────────

  const deleteName = useMemo(() => {
    if (!confirmDeleteId) return ''
    const rec = accessRecords.find(r => (r.id as string) === confirmDeleteId)
    return rec ? resolvedPortalName(rec) : 'this record'
  }, [confirmDeleteId, accessRecords])

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ── Main content column ── */}
      <div style={{
        flex: 1,
        minWidth: 400,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 1. Framer sync banner */}
        <FramerSyncBanner
          visible={dirtyPages.has(pageId)}
          onDismiss={() => onDismissBanner(pageId)}
        />

        <div style={{ padding: '0 20px 20px' }}>
          {/* 2. Page URL bar */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 12,
            }}
          >
            <div style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              <span>imaginelabstudios.com/ils-clients/</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {pageAddress || '—'}
              </span>
            </div>
            {Boolean(pageAddress) && (
              <button
                onClick={handleOpenUrl}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'var(--color-accent)',
                  color: 'var(--text-on-accent)',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                Open
              </button>
            )}
          </div>

          {/* 3. Page title (client_name) — large heading */}
          <div style={{ marginTop: 16 }}>
            <EditableFormRow
              field={{ key: 'client_name', label: 'Client Name', type: 'text' }}
              value={clientName}
              isLast={false}
              onSave={handlePageFieldSave}
            />
          </div>

          {/* 4. Page title */}
          <EditableFormRow
            field={{ key: 'page_title', label: 'Page Title', type: 'textarea' }}
            value={pageTitle || DEFAULT_PAGE_TITLE}
            isLast={false}
            onSave={handlePageFieldSave}
          />

          {/* 5. Page subtitle */}
          <EditableFormRow
            field={{ key: 'page_subtitle', label: 'Subtitle', type: 'textarea' }}
            value={subtitle || DEFAULT_PAGE_SUBTITLE}
            isLast={false}
            onSave={handlePageFieldSave}
          />

          {/* 5. Form rows for page fields */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            overflow: 'hidden',
            marginTop: 12,
          }}>
            {PAGE_FIELDS.map((field, i) => {
              let val = page[field.key]
              // Sanitize "null" string from SQLite to actual null
              if (val === 'null') val = null
              // Pre-fill with default value if field is empty
              const displayVal = val || PAGE_FIELD_DEFAULTS[field.key] || val
              return (
                <EditableFormRow
                  key={field.key}
                  field={field}
                  value={displayVal}
                  isLast={i === PAGE_FIELDS.length - 1}
                  onSave={handlePageFieldSave}
                />
              )
            })}
          </div>

          {/* 6. Section toggles */}
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
            color: 'var(--text-tertiary)',
            marginTop: 16,
            marginBottom: 8,
          }}>
            Page Sections
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {SECTION_TOGGLES.map(t => {
              const isOn = page[t.key] === 1 || page[t.key] === true
              return (
                <button
                  key={t.key}
                  onClick={() => handleToggle(t.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    background: isOn ? 'rgba(52,199,89,0.1)' : 'var(--bg-tertiary)',
                    color: isOn ? 'var(--color-green)' : 'var(--text-tertiary)',
                    cursor: 'default',
                    border: 'none',
                  }}
                >
                  {/* Colored dot indicator */}
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isOn ? 'var(--color-green)' : 'var(--text-placeholder)',
                    flexShrink: 0,
                  }} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* 7. Divider */}
          <div style={{
            height: 1,
            background: 'var(--separator)',
            margin: '16px 0',
          }} />

          {/* 8. People with Access section header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 0.5,
              color: 'var(--text-tertiary)',
            }}>
              People with Access ({accessRecords.length})
            </span>
            <button
              onClick={onGrantAccess}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-accent)',
                background: 'none',
                border: 'none',
                cursor: 'default',
                padding: '2px 4px',
              }}
            >
              + Grant Access
            </button>
          </div>

          {/* 9. Access list */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {accessRecords.length === 0 ? (
              <div style={{
                padding: 14,
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--text-tertiary)',
              }}>
                No one has access to this page yet
              </div>
            ) : (
              accessRecords.map(rec => {
                const recId = rec.id as string
                return (
                  <div key={recId}>
                    <AccessRow
                      record={rec}
                      isSelected={recId === selectedAccessId}
                      onClick={() => setSelectedAccessId(
                        selectedAccessId === recId ? null : recId
                      )}
                      onContextMenu={(e) => handleContextMenu(e, recId)}
                    />
                    {/* 10. Inline delete confirmation bar */}
                    {confirmDeleteId === recId && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'rgba(255,59,48,0.06)',
                        borderBottom: '1px solid var(--separator)',
                      }}>
                        <span style={{
                          flex: 1,
                          fontSize: 13,
                          color: 'var(--text-primary)',
                        }}>
                          Delete access for {deleteName}?
                        </span>
                        <button
                          onClick={handleDeleteConfirm}
                          style={{
                            padding: '4px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--color-red)',
                            color: 'var(--text-on-accent)',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'default',
                          }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            padding: '4px 12px',
                            fontSize: 12,
                            fontWeight: 500,
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'default',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* 10. Context menu */}
          <ContextMenu
            position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
            onClose={() => setContextMenu(null)}
            items={[
              {
                label: 'Delete Access',
                destructive: true,
                onClick: () => {
                  if (contextMenu) setConfirmDeleteId(contextMenu.recordId)
                },
              },
            ]}
          />

          {/* 11. Divider */}
          <div style={{
            height: 1,
            background: 'var(--separator)',
            margin: '16px 0',
          }} />

          {/* 12. Recent Activity header */}
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
            color: 'var(--text-tertiary)',
            marginBottom: 8,
          }}>
            Recent Activity
          </div>

          {/* 13. Activity log */}
          <ActivityLog
            logs={logs}
            pageSlug={pageAddress || undefined}
          />

        </div>
      </div>

      {/* ── Access detail panel (right side) ── */}
      {selectedRecord && (
        <AccessDetailPanel
          record={selectedRecord}
          allAccessRecords={allAccessRecords}
          onFieldSave={(key, val) =>
            onAccessFieldSave(selectedRecord.id as string, key, val)
          }
          onClose={() => setSelectedAccessId(null)}
          otherPages={otherPagesForPerson}
          onNavigateToPage={onNavigateToPage}
        />
      )}
    </div>
  )
}
