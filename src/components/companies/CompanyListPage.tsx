import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import useEntityList from '../../hooks/useEntityList'
import { CompanyRow } from './CompanyRow'
import { CompanyDetail } from './CompanyDetail'

interface CompanyListItem {
  id: string
  name: string
  industry: string | null
  type: string | null
  contactCount: number
  logoUrl: string | null
  modifiedAt: string | null
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
    logoUrl: (row.logo_url as string) || null,
    modifiedAt: (row._airtable_modified_at as string) || null,
  }
}

export default function CompanyListPage() {
  const { data: companies, loading, error } = useEntityList(() => window.electronAPI.companies.getAll())
  const { data: contactsData } = useEntityList(() => window.electronAPI.contacts.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'industry' | 'newest'>(() => (localStorage.getItem('sort-companies') as 'name' | 'type' | 'industry' | 'newest') || 'name')

  const filteredCompanies: CompanyListItem[] = useMemo(() => {
    let items = (companies as Record<string, unknown>[]).map(row =>
      toListItem(row, contactsData as Record<string, unknown>[])
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q) ||
        (c.type ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...items]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'type':
        sorted.sort((a, b) => (a.type ?? '').localeCompare(b.type ?? ''))
        break
      case 'industry':
        sorted.sort((a, b) => (a.industry ?? '').localeCompare(b.industry ?? ''))
        break
      case 'newest':
        sorted.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
        break
    }
    return sorted
  }, [companies, contactsData, search, sortBy])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full w-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* List pane — 300px fixed */}
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Header: entity name + count badge + add button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Companies
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filteredCompanies.length}
            </span>
          </div>
          <PrimaryButton onClick={() => navigate('/companies/new')}>
            + New Company
          </PrimaryButton>
        </div>

        {/* Search — pill shape */}
        <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies…"
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
            {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
          </span>
          <select
            value={sortBy}
            onChange={e => { const v = e.target.value as typeof sortBy; setSortBy(v); localStorage.setItem('sort-companies', v) }}
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
            <option value="type">Type</option>
            <option value="industry">Industry</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Company list */}
        <div className="flex-1 overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No companies match your search.' : 'No companies yet. Sync from Airtable in Settings.'}
            </div>
          ) : (sortBy === 'type' || sortBy === 'industry') ? (() => {
            const groupKey = sortBy
            const groups = new Map<string, CompanyListItem[]>()
            for (const item of filteredCompanies) {
              const key = item[groupKey] || `No ${groupKey === 'type' ? 'Type' : 'Industry'}`
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <GroupedSectionHeader label={label} count={items.length} />
                {items.map(company => (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    isSelected={selectedId === company.id}
                    onClick={() => setSelectedId(company.id)}
                  />
                ))}
              </div>
            ))
          })() : (
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
