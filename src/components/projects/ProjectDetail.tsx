import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import { containsId } from '../../utils/linked-records'

const PROJECT_EDITABLE_FIELDS: EditableField[] = [
  { key: 'project_lead', label: 'Project Lead', type: 'readonly' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'target_completion', label: 'End Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'singleSelect',
    options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },
  { key: 'contract_value', label: 'Contract Value', type: 'currency' },
  { key: 'location', label: 'Location', type: 'text' },
]

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
  const location = (project.location as string | null) ?? null
  const contractValue = project.contract_value ? Number(project.contract_value) : null

  const stats = [
    { label: 'Contacts', value: contacts.length },
    { label: 'Opportunities', value: opps.length },
    { label: 'Value', value: contractValue ? `$${contractValue.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {projectName}
        </div>
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
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{location}</span>
            )}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Project details — Editable form rows */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Project Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {PROJECT_EDITABLE_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(project as Record<string, unknown>)[field.key]}
                isLast={idx === PROJECT_EDITABLE_FIELDS.length - 1}
                onSave={async (key, val) => {
                  await window.electronAPI.projects.update(projectId!, { [key]: val })
                  const res = await window.electronAPI.projects.getById(projectId!)
                  if (res.success && res.data) setProject(res.data as Record<string, unknown>)
                }}
              />
            ))}
          </div>
        </div>

        {/* 4. Linked Contacts */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>No linked contacts</div>
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
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>No linked opportunities</div>
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Notes
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'description', label: 'Description', type: 'textarea' }}
              value={project.description}
              onSave={async (key, val) => {
                await window.electronAPI.projects.update(projectId!, { [key]: val })
                const res = await window.electronAPI.projects.getById(projectId!)
                if (res.success && res.data) setProject(res.data as Record<string, unknown>)
              }}
            />
            <EditableFormRow
              field={{ key: 'key_milestones', label: 'Key Milestones', type: 'textarea' }}
              value={project.key_milestones}
              isLast
              onSave={async (key, val) => {
                await window.electronAPI.projects.update(projectId!, { [key]: val })
                const res = await window.electronAPI.projects.getById(projectId!)
                if (res.success && res.data) setProject(res.data as Record<string, unknown>)
              }}
            />
          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

      </div>
    </div>
  )
}
