import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import { ContextMenu } from '../shared/ContextMenu'
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

type SortKey = 'name' | 'status' | 'value' | 'company' | 'newest'

export default function ProposalListPage() {
  const { data: proposals, loading, error, reload } = useEntityList(() => window.electronAPI.proposals.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(() => (localStorage.getItem('sort-proposals') as SortKey) || 'name')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, id })
  }, [])

  const handleDuplicate = useCallback(async (id: string) => {
    const res = await window.electronAPI.proposals.getById(id)
    if (!res.success || !res.data) return
    const source = res.data as Record<string, unknown>

    // Strip internal/readonly fields
    const { id: _id, airtable_id: _aid, _pending_push, _airtable_modified_at, _local_modified_at,
      company_name: _cn, client_company: _cc, ...fields } = source

    fields.proposal_name = ((fields.proposal_name as string) || 'Unnamed Proposal') + ' (Copy)'

    await window.electronAPI.proposals.create(fields)
    reload()
  }, [reload])

  // Status grouping: merge related statuses into pipeline stages
  const STATUS_GROUP_ORDER = ['No Status', 'Draft', 'Submitted', 'Won', 'Lost'] as const
  const STATUS_GROUP_MAP: Record<string, string> = {
    'Draft': 'Draft',
    'In Review': 'Submitted',
    'Pending': 'Submitted',
    'Pending Approval': 'Submitted',
    'Submitted': 'Submitted',
    'Sent to Client': 'Submitted',
    'Under Review': 'Submitted',
    'Approved': 'Submitted',
    'Closed Won': 'Won',
    'Closed Lost': 'Lost',
    'Rejected': 'Lost',
  }

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
      case 'status': {
        const groupIndex = (s: string | null) => {
          const group = STATUS_GROUP_MAP[s ?? ''] ?? 'No Status'
          return STATUS_GROUP_ORDER.indexOf(group as typeof STATUS_GROUP_ORDER[number])
        }
        sorted.sort((a, b) => groupIndex(a.status) - groupIndex(b.status))
        break
      }
      case 'value':
        sorted.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        break
      case 'company':
        sorted.sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? ''))
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

  const isGrouped = sortBy === 'status' || sortBy === 'company'

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* List pane — 240px fixed */}
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">
        {/* Header: title + count + add button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Proposals
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filtered.length}
            </span>
          </div>
          <PrimaryButton onClick={() => navigate('/proposals/new')}>
            + New Proposal
          </PrimaryButton>
        </div>

        {/* Search */}
        <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search proposals…"
            style={{
              width: '100%', fontSize: 12, padding: '6px 12px',
              borderRadius: 9999, border: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
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
            onChange={e => { const v = e.target.value as SortKey; setSortBy(v); localStorage.setItem('sort-proposals', v) }}
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
            <option value="company">Company</option>
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
              const key = sortBy === 'status'
                ? (STATUS_GROUP_MAP[item.status ?? ''] ?? 'No Status')
                : (item.companyName || 'No Company')
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            const orderedKeys = sortBy === 'status'
              ? (STATUS_GROUP_ORDER as readonly string[]).filter(g => groups.has(g))
              : Array.from(groups.keys()).sort((a, b) =>
                  a === 'No Company' ? 1 : b === 'No Company' ? -1 : a.localeCompare(b))
            return orderedKeys.map(key => {
              const items = groups.get(key)!
              return (
                <div key={key}>
                  <GroupedSectionHeader label={key} count={items.length} />
                  {items.map(proposal => (
                    <ProposalRow
                      key={proposal.id}
                      proposal={proposal}
                      isSelected={selectedId === proposal.id}
                      onClick={() => setSelectedId(proposal.id)}
                      onContextMenu={e => handleContextMenu(e, proposal.id)}
                    />
                  ))}
                </div>
              )
            })
          })() : (
            filtered.map(proposal => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                isSelected={selectedId === proposal.id}
                onClick={() => setSelectedId(proposal.id)}
                onContextMenu={e => handleContextMenu(e, proposal.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <ProposalDetail proposalId={selectedId} />

      <ContextMenu
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        items={[
          { label: 'Duplicate', onClick: () => contextMenu && handleDuplicate(contextMenu.id) },
        ]}
      />
    </div>
  )
}
