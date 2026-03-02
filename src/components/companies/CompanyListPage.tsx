import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { CompanyRow } from './CompanyRow'
import { CompanyDetail } from './CompanyDetail'

interface CompanyListItem {
  id: string
  name: string
  industry: string | null
  type: string | null
  contactCount: number
}

function toListItem(
  row: Record<string, unknown>,
  contactsData: Record<string, unknown>[]
): CompanyListItem {
  const id = row.id as string

  // Count contacts linked to this company
  const contactCount = contactsData.filter(c => {
    const raw = c.companies_ids as string | null
    if (!raw) return false
    try {
      const ids = JSON.parse(raw) as string[]
      return ids.includes(id)
    } catch {
      return false
    }
  }).length

  return {
    id,
    name: (row.company_name as string | null) || 'Unnamed Company',
    industry: (row.industry as string | null) ?? null,
    type: (row.type as string | null) ?? null,
    contactCount,
  }
}

export default function CompanyListPage() {
  const { data: companies, loading, error } = useEntityList(() => window.electronAPI.companies.getAll())
  const { data: contactsData } = useEntityList(() => window.electronAPI.contacts.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredCompanies: CompanyListItem[] = useMemo(() => {
    const items = (companies as Record<string, unknown>[]).map(row =>
      toListItem(row, contactsData as Record<string, unknown>[])
    )
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.industry ?? '').toLowerCase().includes(q) ||
      (c.type ?? '').toLowerCase().includes(q)
    )
  }, [companies, contactsData, search])

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
            placeholder="Search companies…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <PrimaryButton onClick={() => navigate('/companies/new')}>
            + New
          </PrimaryButton>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No companies match your search.' : 'No companies yet. Sync from Airtable in Settings.'}
            </div>
          ) : (
            filteredCompanies.map(company => (
              <CompanyRow
                key={company.id}
                company={company}
                isSelected={selectedId === company.id}
                onClick={() => setSelectedId(company.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <CompanyDetail
        companyId={selectedId}
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  )
}
