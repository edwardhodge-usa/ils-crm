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
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">
        {/* Header: title + count */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              RFQs
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filteredRfqs.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search RFQs…"
            style={{
              width: '100%', fontSize: 12, padding: '6px 12px',
              borderRadius: 9999, border: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
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
