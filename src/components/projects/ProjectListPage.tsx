import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import useEntityList from '../../hooks/useEntityList'
import { ProjectRow } from './ProjectRow'
import { ProjectDetail } from './ProjectDetail'
import { parseCollaboratorName } from '../../utils/collaborator'

interface ProjectListItem {
  id: string
  name: string
  status: string | null
  companyName: string | null
  modifiedAt: string | null
}

function toListItem(row: Record<string, unknown>): ProjectListItem {
  return {
    id: row.id as string,
    name: (row.project_name as string | null) || 'Unnamed Project',
    status: (row.status as string | null) ?? null,
    companyName: (row.company_name as string | null) ?? (row.client_company as string | null) ?? null,
    modifiedAt: (row._airtable_modified_at as string) || null,
  }
}

type SortKey = 'name' | 'status' | 'company' | 'newest'

export default function ProjectListPage() {
  const { data: projects, loading, error } = useEntityList(() => window.electronAPI.projects.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(() => (localStorage.getItem('sort-projects') as SortKey) || 'name')

  const filtered = useMemo(() => {
    const rawRows = projects as Record<string, unknown>[]
    let items = rawRows.map(toListItem)
    if (search.trim()) {
      const q = search.toLowerCase()
      const rawById = new Map<string, Record<string, unknown>>()
      for (const r of rawRows) rawById.set(r.id as string, r)
      items = items.filter(p => {
        const raw = rawById.get(p.id)
        return (
          p.name.toLowerCase().includes(q) ||
          (p.status ?? '').toLowerCase().includes(q) ||
          (p.companyName ?? '').toLowerCase().includes(q) ||
          (String(raw?.engagement_type ?? '')).toLowerCase().includes(q) ||
          (String(raw?.description ?? '')).toLowerCase().includes(q) ||
          (String(raw?.location ?? '')).toLowerCase().includes(q) ||
          (String(raw?.project_lead ?? '')).toLowerCase().includes(q) ||
          (String(raw?.key_milestones ?? '')).toLowerCase().includes(q)
        )
      })
    }
    const sorted = [...items]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'status':
        sorted.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? ''))
        break
      case 'company':
        sorted.sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? ''))
        break
      case 'newest':
        sorted.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
        break
    }
    return sorted
  }, [projects, search, sortBy])

  const { leadOptions, leadCollaboratorMap } = useMemo(() => {
    const names = new Set<string>()
    const map: Record<string, string> = {}
    for (const p of projects as Record<string, unknown>[]) {
      const raw = (p.project_lead as string | null) ?? null
      const name = parseCollaboratorName(raw)
      if (name && raw) {
        names.add(name)
        if (!map[name]) map[name] = raw
      }
    }
    return { leadOptions: Array.from(names).sort(), leadCollaboratorMap: map }
  }, [projects])

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
              Projects
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filtered.length}
            </span>
          </div>
          <PrimaryButton onClick={() => navigate('/projects/new')}>
            + New Project
          </PrimaryButton>
        </div>

        {/* Search */}
        <div style={{ padding: '0 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
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
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
          <select
            value={sortBy}
            onChange={e => { const v = e.target.value as SortKey; setSortBy(v); localStorage.setItem('sort-projects', v) }}
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
              const key = sortBy === 'company'
                ? (item.companyName || 'No Company')
                : (item.status || 'No Status')
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            const orderedKeys = sortBy === 'company'
              ? Array.from(groups.keys()).sort((a, b) =>
                  a === 'No Company' ? 1 : b === 'No Company' ? -1 : a.localeCompare(b))
              : Array.from(groups.keys())
            return orderedKeys.map(key => {
              const items = groups.get(key)!
              return (
                <div key={key}>
                  <GroupedSectionHeader label={key} count={items.length} />
                  {items.map(project => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isSelected={selectedId === project.id}
                      onClick={() => setSelectedId(project.id)}
                    />
                  ))}
                </div>
              )
            })
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
      <ProjectDetail projectId={selectedId} leadOptions={leadOptions} collaboratorMap={leadCollaboratorMap} />
    </div>
  )
}
