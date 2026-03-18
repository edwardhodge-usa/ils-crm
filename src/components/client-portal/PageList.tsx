import { useMemo, useState, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const DOT_COLORS = [
  '#30D158',
  '#0A84FF',
  '#FF9F0A',
  '#BF5AF2',
  '#FF375F',
  '#40CBE0',
  '#5E5CE6',
  '#FF453A',
] as const

const SECTION_KEYS = ['head', 'v_prmagic', 'v_highlight', 'v_360', 'v_full_l'] as const

const SECTION_NAMES: Record<typeof SECTION_KEYS[number], string> = {
  head: 'Header',
  v_prmagic: 'PR Magic',
  v_highlight: 'Highlights',
  v_360: '360° View',
  v_full_l: 'Full Layout',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PageListProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearchChange: (s: string) => void
  onNewPage: () => void
  view: 'byPage' | 'byPerson'
  onViewChange: (v: 'byPage' | 'byPerson') => void
  healthMap?: Map<string, { status: number; ok: boolean; cmsStatus: string }>
  healthSummary?: { liveCount: number; sluggedPages: number; checkedCount: number }
  statusCounts?: { live: number; ready: number; incomplete: number; error: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Case-insensitive contains match across multiple fields */
function matchesSearch(page: Record<string, unknown>, term: string): boolean {
  if (!term) return true
  const lower = term.toLowerCase()
  const name = String(page.client_name ?? '').toLowerCase()
  const address = String(page.page_address ?? '').toLowerCase()
  const title = String(page.page_title ?? '').toLowerCase()
  return name.includes(lower) || address.includes(lower) || title.includes(lower)
}

/** Derive health dot color and tooltip from health result */
function healthDotStyle(
  slug: string | null,
  health: { status: number; ok: boolean; cmsStatus: string } | undefined,
): { color: string; title: string } {
  if (!slug || slug === 'null') return { color: 'transparent', title: '' }
  if (!health) return { color: 'var(--color-fill-tertiary)', title: 'Checking...' }
  switch (health.cmsStatus) {
    case 'live': return { color: 'var(--color-green)', title: 'Page live' }
    case 'ready': return { color: 'var(--color-orange)', title: 'Ready — needs sync/publish' }
    case 'incomplete': return { color: 'var(--color-fill-tertiary)', title: 'Incomplete — missing required fields' }
    case 'error': return { color: 'var(--color-red)', title: 'Error checking page' }
    default: return { color: 'var(--color-fill-tertiary)', title: 'Checking...' }
  }
}

/** Count how many access records share a page_address with a given page */
function countAccess(
  page: Record<string, unknown>,
  accessRecords: Record<string, unknown>[],
): number {
  const addr = page.page_address as string | null
  if (!addr) return 0
  return accessRecords.filter(r => r.page_address === addr).length
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PageList({
  pages,
  accessRecords,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  onNewPage,
  view,
  onViewChange,
  healthMap,
  healthSummary,
  statusCounts,
}: PageListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Filter + sort pages
  const filteredPages = useMemo(() => {
    const matched = pages.filter(p => matchesSearch(p, search))
    return matched.sort((a, b) => {
      const na = String(a.client_name ?? '').toLowerCase()
      const nb = String(b.client_name ?? '').toLowerCase()
      return na.localeCompare(nb)
    })
  }, [pages, search])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
    },
    [onSelect],
  )

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        flexShrink: 0,
        borderRight: '1px solid var(--separator)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-sidebar)',
      }}
    >
      {/* ── View Toggle ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          margin: '12px 12px 8px',
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          padding: 2,
        }}
      >
        <ToggleButton
          label="By Page"
          active={view === 'byPage'}
          onClick={() => onViewChange('byPage')}
        />
        <ToggleButton
          label="By Person"
          active={view === 'byPerson'}
          onClick={() => onViewChange('byPerson')}
        />
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div style={{ padding: '0 12px 8px' }}>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search pages..."
          style={{
            width: '100%',
            padding: '6px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--separator)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
            cursor: 'default',
          }}
        />
      </div>

      {/* ── Page List ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px',
        }}
      >
        {filteredPages.length === 0 && (
          <div
            style={{
              padding: '20px 10px',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}
          >
            {search ? 'No matching pages' : 'No pages yet'}
          </div>
        )}

        {filteredPages.map((page, index) => {
          const id = page.id as string
          const isSelected = id === selectedId
          const isHovered = id === hoveredId && !isSelected
          const clientName = String(page.client_name ?? 'Untitled')
          const address = page.page_address as string | null
          const access = countAccess(page, accessRecords)
          const dotColor = DOT_COLORS[index % DOT_COLORS.length]
          const healthEntry = address && address !== 'null' ? healthMap?.get(address) : undefined
          const health = healthDotStyle(address, healthEntry)
          const cmsStatus = healthEntry?.cmsStatus

          return (
            <div
              key={id}
              onClick={() => handleSelect(id)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'default',
                marginBottom: 1,
                gap: 10,
                background: isSelected
                  ? 'var(--color-accent)'
                  : isHovered
                    ? 'var(--bg-hover)'
                    : 'transparent',
                transition: 'background 100ms ease',
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  flexShrink: 0,
                }}
              />

              {/* Info column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isSelected
                      ? 'var(--text-on-accent)'
                      : 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {clientName}
                </div>

                {/* Status row: OFF AIR badge + section dots */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 3,
                  }}
                >
                  {/* Status badge for non-live pages */}
                  {cmsStatus && cmsStatus !== 'live' && (() => {
                    let label = ''
                    let bg = ''
                    let fg = ''
                    switch (cmsStatus) {
                      case 'ready':
                        label = 'NEEDS PUBLISH'
                        bg = 'rgba(255,149,0,0.12)'
                        fg = 'var(--color-orange)'
                        break
                      case 'incomplete':
                        label = 'INCOMPLETE'
                        bg = 'var(--color-fill-tertiary)'
                        fg = 'var(--text-secondary)'
                        break
                      case 'error':
                        label = 'ERROR'
                        bg = 'rgba(255,59,48,0.12)'
                        fg = 'var(--color-red)'
                        break
                      default:
                        return null
                    }
                    return (
                      <span
                        title={health.title}
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: 0.4,
                          padding: '2px 6px',
                          borderRadius: 4,
                          flexShrink: 0,
                          background: isSelected ? 'rgba(255,255,255,0.2)' : bg,
                          color: isSelected ? 'rgba(255,255,255,0.85)' : fg,
                        }}
                      >
                        {label}
                      </span>
                    )
                  })()}

                  {/* Section indicator dots */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    {SECTION_KEYS.map(key => {
                      const isEnabled = Boolean(page[key])
                      return (
                        <div
                          key={key}
                          title={SECTION_NAMES[key]}
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: isEnabled
                              ? isSelected
                                ? 'rgba(255,255,255,0.8)'
                                : 'var(--color-green)'
                              : isSelected
                                ? 'rgba(255,255,255,0.25)'
                                : 'var(--text-placeholder)',
                            border: isEnabled
                              ? 'none'
                              : '1px solid var(--separator-opaque)',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Access count badge */}
              {access > 0 && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: isSelected
                      ? 'rgba(255,255,255,0.2)'
                      : 'var(--bg-tertiary)',
                    color: isSelected
                      ? 'rgba(255,255,255,0.85)'
                      : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {access}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Health Summary + New Page Button ── */}
      <div style={{ padding: '8px 12px 12px' }}>
        {healthSummary && healthSummary.sluggedPages > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 0',
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: healthSummary.checkedCount === 0
                  ? 'var(--color-fill-tertiary)'
                  : healthSummary.liveCount === healthSummary.sluggedPages
                    ? 'var(--color-green)'
                    : 'var(--color-orange)',
                flexShrink: 0,
              }}
            />
            {healthSummary.checkedCount === 0
              ? 'Checking pages...'
              : statusCounts
                ? (() => {
                    const parts: string[] = []
                    if (statusCounts.live > 0) parts.push(`${statusCounts.live} Live`)
                    if (statusCounts.ready > 0) parts.push(`${statusCounts.ready} Needs Publish`)
                    if (statusCounts.incomplete > 0) parts.push(`${statusCounts.incomplete} Incomplete`)
                    if (statusCounts.error > 0) parts.push(`${statusCounts.error} Error`)
                    return parts.length > 0 ? parts.join(' \u00b7 ') : `${healthSummary.liveCount}/${healthSummary.sluggedPages} Pages Live`
                  })()
                : `${healthSummary.liveCount}/${healthSummary.sluggedPages} Pages Live`
            }
          </div>
        )}
        <button
          onClick={onNewPage}
          style={{
            width: '100%',
            padding: '7px 0',
            background: 'var(--color-accent-translucent)',
            color: 'var(--color-accent-text)',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'default',
            textAlign: 'center',
          }}
        >
          + New Page
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 0',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        border: 'none',
        borderRadius: 6,
        cursor: 'default',
        transition: 'all 150ms ease',
        color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
        background: active ? 'var(--color-accent)' : 'transparent',
      }}
    >
      {label}
    </button>
  )
}
