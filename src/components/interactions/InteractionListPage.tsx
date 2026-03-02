import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { InteractionRow } from './InteractionRow'
import { InteractionDetail } from './InteractionDetail'

// ─── Shape for list rows ──────────────────────────────────────────────────────

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
    // Airtable syncs contact name as a lookup; may be stored directly on the row
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

// ─── Main component ───────────────────────────────────────────────────────────

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
      (i.subject     ?? '').toLowerCase().includes(q) ||
      (i.type        ?? '').toLowerCase().includes(q) ||
      (i.summary     ?? '').toLowerCase().includes(q) ||
      (i.contact_name ?? '').toLowerCase().includes(q)
    )
  }, [interactions, search])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-red)]">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* List pane — 240px fixed */}
      <div className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search interactions…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <PrimaryButton onClick={() => navigate('/interactions/new')}>
            + Log
          </PrimaryButton>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search
                ? 'No interactions match your search.'
                : 'No interactions logged yet. Click + Log to record your first call, email, or meeting.'}
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

      {/* Detail panel — flex-1 */}
      <InteractionDetail interactionId={selectedId} />
    </div>
  )
}
