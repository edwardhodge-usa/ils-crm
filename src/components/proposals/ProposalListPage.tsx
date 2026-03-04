import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import useEntityList from '../../hooks/useEntityList'
import { ProposalRow } from './ProposalRow'
import { ProposalDetail } from './ProposalDetail'

interface ProposalListItem {
  id: string
  name: string
  status: string | null
  value: number | null
  companyName: string | null
  modifiedAt: string | null
}

function toListItem(row: Record<string, unknown>): ProposalListItem {
  return {
    id: row.id as string,
    name: (row.proposal_name as string | null) || 'Unnamed Proposal',
    status: (row.status as string | null) ?? null,
    value: row.proposed_value ? Number(row.proposed_value) : null,
    companyName: (row.company_name as string | null) ?? (row.client_company as string | null) ?? null,
    modifiedAt: (row._airtable_modified_at as string) || null,
  }
}

type SortKey = 'name' | 'status' | 'value' | 'newest'

export default function ProposalListPage() {
  const { data: proposals, loading, error } = useEntityList(() => window.electronAPI.proposals.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    let items = (proposals as Record<string, unknown>[]).map(toListItem)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.status ?? '').toLowerCase().includes(q) ||
        (p.companyName ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...items]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'status':
        sorted.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? ''))
        break
      case 'value':
        sorted.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        break
      case 'newest':
        sorted.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
        break
    }
    return sorted
  }, [proposals, search, sortBy])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  const isGrouped = sortBy === 'status'

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
            placeholder="Search proposals…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <PrimaryButton onClick={() => navigate('/proposals/new')}>
            + New
          </PrimaryButton>
        </div>

        {/* Sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filtered.length} proposal{filtered.length !== 1 ? 's' : ''}
          </span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            style={{
              fontSize: 11, fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none', outline: 'none',
              cursor: 'default',
              textAlign: 'right',
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="status">Status</option>
            <option value="value">Value High→Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No proposals match your search.' : 'No proposals yet. Sync from Airtable in Settings.'}
            </div>
          ) : isGrouped ? (() => {
            const groups = new Map<string, ProposalListItem[]>()
            for (const item of filtered) {
              const key = item.status || 'No Status'
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <GroupedSectionHeader label={label} count={items.length} />
                {items.map(proposal => (
                  <ProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    isSelected={selectedId === proposal.id}
                    onClick={() => setSelectedId(proposal.id)}
                  />
                ))}
              </div>
            ))
          })() : (
            filtered.map(proposal => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                isSelected={selectedId === proposal.id}
                onClick={() => setSelectedId(proposal.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <ProposalDetail proposalId={selectedId} />
    </div>
  )
}
