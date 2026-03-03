import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { PencilIcon } from '../shared/icons/PencilIcon'
import { containsId } from '../../utils/linked-records'

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
  const projectLead = (project.project_lead as string | null) ?? null

  const stats = [
    { label: 'Contacts', value: contacts.length },
    { label: 'Opportunities', value: opps.length },
    { label: 'Value', value: contractValue ? `$${contractValue.toLocaleString()}` : '—' },
  ]

  const infoRows: { label: string; value: string | null; isDropdown?: boolean }[] = [
    { label: 'Project Lead', value: projectLead },
    { label: 'Start Date', value: startDate },
    { label: 'End Date', value: endDate },
    { label: 'Status', value: status, isDropdown: true },
    { label: 'Contract Value', value: contractValue ? `$${contractValue.toLocaleString()}` : null },
  ]

  const visibleRows = infoRows.filter(r => Boolean(r.value))

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {projectName}
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/edit`)}
          title="Edit project"
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-default"
        >
          <PencilIcon />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 18px' }}>

        {/* 1. Hero block */}
        <div style={{ padding: '18px 0 14px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {projectName}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(status) && <StatusBadge value={status} />}
            {Boolean(location) && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{location}</span>
            )}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Project details — Apple HIG form rows */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Project Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {visibleRows.length === 0 ? (
              <div style={{ padding: 14, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                No project info
              </div>
            ) : (
              visibleRows.map((row, idx) => (
                <DetailFormRow
                  key={row.label}
                  label={row.label}
                  value={row.value!}
                  isDropdown={row.isDropdown}
                  isLast={idx === visibleRows.length - 1}
                />
              ))
            )}
          </div>
        </div>

        {/* 4. Linked Contacts */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No linked contacts</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {contacts.slice(0, 3).map((c, idx) => {
                const name = (c.contact_name as string) ||
                  [c.first_name, c.last_name].filter(Boolean).join(' ') ||
                  'Unnamed'
                const title = (c.job_title as string | null) ?? null
                return (
                  <div
                    key={c.id as string}
                    className="cursor-default"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < Math.min(contacts.length, 3) - 1 ? '1px solid var(--separator)' : undefined,
                      transition: 'background 150ms',
                    }}
                    onClick={() => navigate(`/contacts/${c.id as string}`)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                      </div>
                      {Boolean(title) && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {title}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 5. Linked Opportunities */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Opportunities
          </div>
          {opps.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No linked opportunities</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {opps.slice(0, 3).map((o, idx) => (
                <div
                  key={o.id as string}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: idx < Math.min(opps.length, 3) - 1 ? '1px solid var(--separator)' : undefined,
                    transition: 'background 150ms',
                  }}
                  onClick={() => navigate(`/pipeline/${o.id as string}/edit`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(o.opportunity_name as string) || '—'}
                    </div>
                    {Boolean(o.deal_value) && (
                      <div style={{ fontSize: 11, color: 'var(--color-green)', marginTop: 1 }}>
                        ${Number(o.deal_value).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Notes */}
        {(Boolean(description) || Boolean(keyMilestones)) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Notes
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', padding: '10px 14px' }}>
              {Boolean(description) && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {description}
                </div>
              )}
              {Boolean(keyMilestones) && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 2, fontWeight: 500 }}>Key Milestones</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {keyMilestones}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

      </div>
    </div>
  )
}

/** A single Apple-style form row for the detail pane */
function DetailFormRow({ label, value, isDropdown, isLast }: {
  label: string
  value: string
  isDropdown?: boolean
  isLast?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', minHeight: 36,
      borderBottom: isLast ? undefined : '1px solid var(--separator)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            borderRadius: 4, padding: '2px 6px', margin: '-2px -6px',
            background: hovered ? 'var(--bg-hover)' : 'transparent',
            transition: 'background 150ms',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {value}
        </span>
        {isDropdown && (
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4, flexShrink: 0 }}>⌃</span>
        )}
      </div>
    </div>
  )
}
