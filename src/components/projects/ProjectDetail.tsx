import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'

interface ProjectDetailProps {
  projectId: string | null
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const navigate = useNavigate()
  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([])
  const [opps, setOpps] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setContacts([])
      setOpps([])
      return
    }

    async function load() {
      setProject(null)
      setContacts([])
      setOpps([])

      const [projectRes, contactsRes, oppsRes] = await Promise.all([
        window.electronAPI.projects.getById(projectId!),
        window.electronAPI.contacts.getAll(),
        window.electronAPI.opportunities.getAll(),
      ])

      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data as Record<string, unknown>)
      }

      function containsId(idsJson: unknown, targetId: string): boolean {
        if (!idsJson) return false
        try {
          const arr = JSON.parse(idsJson as string)
          return Array.isArray(arr) && arr.includes(targetId)
        } catch {
          return false
        }
      }

      if (contactsRes.success && contactsRes.data) {
        const linked = (contactsRes.data as Record<string, unknown>[]).filter(c =>
          containsId(c.projects_ids, projectId!) || containsId(c.project_ids, projectId!)
        )
        setContacts(linked)
      }

      if (oppsRes.success && oppsRes.data) {
        const linked = (oppsRes.data as Record<string, unknown>[]).filter(o =>
          containsId(o.project_ids, projectId!) || containsId(o.projects_ids, projectId!)
        )
        setOpps(linked)
      }
    }

    load()
  }, [projectId])

  if (!projectId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a project" subtitle="Choose a project from the list to view details" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <div className="flex items-center justify-center h-full">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>
        </div>
      </div>
    )
  }

  const projectName = (project.project_name as string) || 'Unnamed Project'
  const status = (project.status as string | null) ?? null
  const startDate = (project.start_date as string | null) ?? null
  const endDate = (project.target_completion as string | null) ?? (project.actual_completion as string | null) ?? null
  const contractValue = project.contract_value ? Number(project.contract_value) : null
  const description = (project.description as string | null) ?? null
  const keyMilestones = (project.key_milestones as string | null) ?? null
  const location = (project.location as string | null) ?? null

  const stats = [
    { label: 'Contacts', value: contacts.length },
    { label: 'Opportunities', value: opps.length },
    { label: 'Value', value: contractValue ? `$${contractValue.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[11px] text-[var(--text-tertiary)] truncate">
          {projectName}
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/edit`)}
          className="px-2.5 py-1 text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:opacity-80 transition-opacity cursor-default"
        >
          Edit
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {projectName}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(status) && <StatusBadge value={status} />}
            {Boolean(location) && (
              <span className="text-[11px] text-[var(--text-tertiary)]">{location}</span>
            )}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Key dates */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Timeline
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">Start Date</div>
              <div className="text-[12px] font-medium text-[var(--text-primary)]">
                {startDate || '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">End Date</div>
              <div className="text-[12px] font-medium text-[var(--text-primary)]">
                {endDate || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Linked Contacts */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No linked contacts</div>
          ) : (
            contacts.slice(0, 3).map(c => {
              const name = (c.contact_name as string) ||
                [c.first_name, c.last_name].filter(Boolean).join(' ') ||
                'Unnamed'
              const title = (c.job_title as string | null) ?? null
              return (
                <div
                  key={c.id as string}
                  className="flex items-center gap-2 py-1.5 border-b border-[var(--separator)] last:border-0 cursor-default hover:bg-[var(--bg-hover)] -mx-4 px-4 transition-colors duration-[150ms]"
                  onClick={() => navigate(`/contacts/${c.id as string}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{name}</div>
                    {Boolean(title) && (
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate">{title}</div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 5. Linked Opportunities */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Opportunities
          </div>
          {opps.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No linked opportunities</div>
          ) : (
            opps.slice(0, 3).map(o => (
              <div
                key={o.id as string}
                className="px-3 py-2 rounded-lg bg-[var(--bg-card)] mb-1.5 cursor-default hover:bg-[var(--bg-hover)] transition-colors duration-[150ms]"
                onClick={() => navigate(`/pipeline/${o.id as string}/edit`)}
              >
                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                  {(o.opportunity_name as string) || '—'}
                </div>
                {Boolean(o.deal_value) && (
                  <div className="text-[11px] text-[var(--color-green)] mt-0.5">
                    ${Number(o.deal_value).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 6. Notes */}
        {(Boolean(description) || Boolean(keyMilestones)) && (
          <div className="px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
              Notes
            </div>
            {Boolean(description) && (
              <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                {description}
              </div>
            )}
            {Boolean(keyMilestones) && (
              <>
                <div className="text-[10px] text-[var(--text-tertiary)] mt-2 mb-0.5 font-medium">Key Milestones</div>
                <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {keyMilestones}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
