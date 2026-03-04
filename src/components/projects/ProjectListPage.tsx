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

export default function ProjectListPage() {
  const { data: projects, loading, error } = useEntityList(() => window.electronAPI.projects.getAll())
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredProjects: ProjectListItem[] = useMemo(() => {
    const items = (projects as Record<string, unknown>[]).map(toListItem)
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q) ||
      (p.companyName ?? '').toLowerCase().includes(q)
    )
  }, [projects, search])

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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No projects match your search.' : 'No projects yet. Sync from Airtable in Settings.'}
            </div>
          ) : (
            filteredProjects.map(project => (
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
