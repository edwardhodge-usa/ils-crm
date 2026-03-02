import { useState, useMemo } from 'react'
import { RfqRow } from './RfqRow'
import { RfqDetail } from './RfqDetail'

interface RfqListItem {
  id: string
  title: string
  status: string | null
  companyName: string | null
  requestDate: string | null
  raw: Record<string, unknown>
}

export default function RfqListPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // RFQs have no IPC handler yet — load gracefully with empty array
  const rfqs: RfqListItem[] = useMemo(() => [], [])

  const filteredRfqs: RfqListItem[] = useMemo(() => {
    if (!search.trim()) return rfqs
    const q = search.toLowerCase()
    return rfqs.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.status ?? '').toLowerCase().includes(q) ||
      (r.companyName ?? '').toLowerCase().includes(q)
    )
  }, [rfqs, search])

  const selectedRfq = filteredRfqs.find(r => r.id === selectedId) ?? null

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
            placeholder="Search RFQs…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRfqs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No RFQs match your search.' : 'No RFQs yet.'}
            </div>
          ) : (
            filteredRfqs.map(rfq => (
              <RfqRow
                key={rfq.id}
                rfq={rfq}
                isSelected={selectedId === rfq.id}
                onClick={() => setSelectedId(rfq.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <RfqDetail
        rfqId={selectedId}
        rfqData={selectedRfq?.raw ?? null}
      />
    </div>
  )
}
