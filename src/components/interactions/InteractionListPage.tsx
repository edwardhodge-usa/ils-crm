import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import useEntityList from '../../hooks/useEntityList'
import { InteractionRow } from './InteractionRow'
import { InteractionDetail } from './InteractionDetail'

// ─── Shape for list rows ─────────────────────────────────────────────────────

interface InteractionListItem {
  id: string
  type: string | null
  date: string | null
  subject: string | null
  summary: string | null
  contact_name: string | null
}

function toListItem(row: Record<string, unknown>): InteractionListItem {
  return {
    id:           row.id           as string,
    type:         (row.type         as string | null) ?? null,
    date:         (row.date         as string | null) ?? null,
    subject:      (row.subject      as string | null) ?? null,
    summary:      (row.summary      as string | null) ?? null,
    contact_name: (row.contact_name as string | null) ??
                  (row.contact      as string | null) ?? null,
  }
}

// Sort descending by date (most recent first); null dates go to bottom
function byDateDesc(a: InteractionListItem, b: InteractionListItem): number {
  const da = a.date ?? '0000'
  const db = b.date ?? '0000'
  return db.localeCompare(da)
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function InteractionListPage() {
  const { data: interactions, loading, error } =
    useEntityList(() => window.electronAPI.interactions.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered: InteractionListItem[] = useMemo(() => {
    const items = (interactions as Record<string, unknown>[])
      .map(toListItem)
      .sort(byDateDesc)

    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i =>
      (i.subject      ?? '').toLowerCase().includes(q) ||
      (i.type         ?? '').toLowerCase().includes(q) ||
      (i.summary      ?? '').toLowerCase().includes(q) ||
      (i.contact_name ?? '').toLowerCase().includes(q)
    )
  }, [interactions, search])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-red)',
        }}
      >
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* ── List pane — 240px fixed ── */}
      <div
        style={{
          width: 240,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRight: '0.5px solid var(--separator)',
          background: 'var(--bg-window)',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px 0 14px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '-0.2px',
                color: 'var(--text-primary)',
              }}
            >
              Interactions
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                borderRadius: 10,
                padding: '1px 7px',
                lineHeight: '16px',
              }}
            >
              {filtered.length}
            </span>
          </div>

          {/* Add button */}
          <button
            onClick={() => navigate('/interactions/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-accent)',
              fontSize: 18,
              fontWeight: 400,
              cursor: 'default',
              lineHeight: 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Log new interaction"
          >
            +
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '8px 14px 8px 14px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search interactions..."
            style={{
              width: '100%',
              fontSize: 12,
              padding: '5px 10px',
              borderRadius: 16,
              border: 'none',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'default',
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontSize: 12,
                color: 'var(--text-secondary)',
                padding: '0 20px',
                textAlign: 'center',
                lineHeight: '18px',
              }}
            >
              {search
                ? 'No interactions match your search.'
                : 'No interactions logged yet. Click + to record your first call, email, or meeting.'}
            </div>
          ) : (
            filtered.map(item => (
              <InteractionRow
                key={item.id}
                interaction={item}
                isSelected={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Detail panel — flex-1 ── */}
      <InteractionDetail interactionId={selectedId} />
    </div>
  )
}
