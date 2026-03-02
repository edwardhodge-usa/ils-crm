import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { ProposalRow } from './ProposalRow'
import { ProposalDetail } from './ProposalDetail'

interface ProposalListItem {
  id: string
  name: string
  status: string | null
  value: number | null
  companyName: string | null
}

function toListItem(row: Record<string, unknown>): ProposalListItem {
  return {
    id: row.id as string,
    name: (row.proposal_name as string | null) || 'Unnamed Proposal',
    status: (row.status as string | null) ?? null,
    value: row.proposed_value ? Number(row.proposed_value) : null,
    companyName: (row.company_name as string | null) ?? (row.client_company as string | null) ?? null,
  }
}

export default function ProposalListPage() {
  const { data: proposals, loading, error } = useEntityList(() => window.electronAPI.proposals.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredProposals: ProposalListItem[] = useMemo(() => {
    const items = (proposals as Record<string, unknown>[]).map(toListItem)
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q) ||
      (p.companyName ?? '').toLowerCase().includes(q)
    )
  }, [proposals, search])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full overflow-hidden">
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredProposals.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No proposals match your search.' : 'No proposals yet. Sync from Airtable in Settings.'}
            </div>
          ) : (
            filteredProposals.map(proposal => (
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
