import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { ProjectRow } from './ProjectRow'
import { ProjectDetail } from './ProjectDetail'

interface ProjectListItem {
  id: string
  name: string
  status: string | null
  companyName: string | null
}

function toListItem(row: Record<string, unknown>): ProjectListItem {
  return {
    id: row.id as string,
    name: (row.project_name as string | null) || 'Unnamed Project',
    status: (row.status as string | null) ?? null,
    companyName: (row.company_name as string | null) ?? (row.client_company as string | null) ?? null,
  }
}

type SortKey = 'name' | 'status' | 'newest'

export default function ProjectListPage() {
  const { data: projects, loading, error } = useEntityList(() => window.electronAPI.projects.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    let items = (projects as Record<string, unknown>[]).map(toListItem)
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
      case 'newest':
        sorted.sort((a, b) => b.id.localeCompare(a.id))
        break
    }
    return sorted
  }, [projects, search, sortBy])

  const leadOptions = useMemo(() => {
    const names = new Set<string>()
    for (const p of projects as Record<string, unknown>[]) {
      const lead = p.project_lead as string | null
      if (lead) names.add(lead)
    }
    return Array.from(names).sort()
  }, [projects])

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
            placeholder="Search projects…"
            className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <PrimaryButton onClick={() => navigate('/projects/new')}>
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
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
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
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No projects match your search.' : 'No projects yet. Sync from Airtable in Settings.'}
            </div>
          ) : isGrouped ? (() => {
            const groups = new Map<string, ProjectListItem[]>()
            for (const item of filtered) {
              const key = item.status || 'No Status'
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  padding: '18px 12px 6px',
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-window)',
                  borderBottom: '0.5px solid var(--separator)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span>{label.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {items.length}
                  </span>
                </div>
                {items.map(project => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isSelected={selectedId === project.id}
                    onClick={() => setSelectedId(project.id)}
                  />
                ))}
              </div>
            ))
          })() : (
            filtered.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                isSelected={selectedId === project.id}
                onClick={() => setSelectedId(project.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <ProjectDetail projectId={selectedId} leadOptions={leadOptions} />
    </div>
  )
}
