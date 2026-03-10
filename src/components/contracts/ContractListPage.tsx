import { useState, useMemo } from 'react'
import { ContractRow } from './ContractRow'
import { ContractDetail } from './ContractDetail'

interface ContractListItem {
  id: string
  name: string
  status: string | null
  value: number | null
  startDate: string | null
  raw: Record<string, unknown>
}

export default function ContractListPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Contracts have no IPC handler yet — load gracefully with empty array
  const contracts: ContractListItem[] = useMemo(() => [], [])

  const filteredContracts: ContractListItem[] = useMemo(() => {
    if (!search.trim()) return contracts
    const q = search.toLowerCase()
    return contracts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.status ?? '').toLowerCase().includes(q) ||
      (String(c.raw?.description ?? '')).toLowerCase().includes(q) ||
      (String(c.raw?.notes ?? '')).toLowerCase().includes(q) ||
      (String(c.raw?.company_name ?? '')).toLowerCase().includes(q)
    )
  }, [contracts, search])

  const selectedContract = filteredContracts.find(c => c.id === selectedId) ?? null

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
              Contracts
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filteredContracts.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contracts…"
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
          {filteredContracts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No contracts match your search.' : 'No contracts yet.'}
            </div>
          ) : (
            filteredContracts.map(contract => (
              <ContractRow
                key={contract.id}
                contract={contract}
                isSelected={selectedId === contract.id}
                onClick={() => setSelectedId(contract.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <ContractDetail
        contractId={selectedId}
        contractData={selectedContract?.raw ?? null}
      />
    </div>
  )
}
