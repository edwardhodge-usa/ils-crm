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
      (c.status ?? '').toLowerCase().includes(q)
    )
  }, [contracts, search])

  const selectedContract = filteredContracts.find(c => c.id === selectedId) ?? null

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
            placeholder="Search contracts…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
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
