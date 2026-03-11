import { useState, useEffect, useCallback } from 'react'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import {
  CONTACT_CREATE_FIELDS,
  OPPORTUNITY_CREATE_FIELDS,
} from '../../config/create-fields'
import { parseCollaboratorName, resolveCollaboratorSave } from '../../utils/collaborator'

function buildProjectEditableFields(leadOptions: string[]): EditableField[] {
  return [
    { key: 'project_lead', label: 'Project Lead', type: 'singleSelect',
      options: leadOptions },
    { key: 'start_date', label: 'Start Date', type: 'date' },
    { key: 'target_completion', label: 'End Date', type: 'date' },
    { key: 'status', label: 'Status', type: 'singleSelect',
      options: ['Kickoff', 'Discovery', 'Concept Development', 'Design Development', 'Production', 'Installation', 'Opening/Launch', 'Closeout', 'Complete', 'On Hold', 'Cancelled', 'Strategy'] },
    { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect',
      options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support'] },
    { key: 'contract_value', label: 'Contract Value', type: 'currency' },
    { key: 'location', label: 'Location', type: 'text' },
  ]
}

interface ProjectDetailProps {
  projectId: string | null
  leadOptions: string[]
  collaboratorMap?: Record<string, string>
}

export function ProjectDetail({ projectId, leadOptions, collaboratorMap = {} }: ProjectDetailProps) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null)

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!projectId) return
    await window.electronAPI.projects.update(projectId, { [key]: val })
    const res = await window.electronAPI.projects.getById(projectId)
    if (res.success && res.data) setProject(res.data as Record<string, unknown>)
  }, [projectId])

  const handleLinkedSave = useCallback(async (key: string, val: unknown) => {
    if (!projectId) return
    await window.electronAPI.projects.update(projectId, { [key]: val })
    const res = await window.electronAPI.projects.getById(projectId)
    if (res.success && res.data) setProject(res.data as Record<string, unknown>)
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      return
    }

    let cancelled = false

    async function load() {
      setProject(null)
      const projectRes = await window.electronAPI.projects.getById(projectId!)
      if (cancelled) return
      if (projectRes.success && projectRes.data) {
        setProject(projectRes.data as Record<string, unknown>)
      }

      // Background refresh from Airtable for latest data
      window.electronAPI.projects.refresh(projectId!).then(freshRes => {
        if (!cancelled && freshRes.success && freshRes.data) {
          setProject(freshRes.data as Record<string, unknown>)
        }
      })
    }

    load()
    return () => { cancelled = true }
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
            {buildProjectEditableFields(leadOptions).map((field, idx, arr) => {
              const raw = (project as Record<string, unknown>)[field.key]
              const displayVal = field.key === 'project_lead' ? parseCollaboratorName(raw as string | null) : raw
              return (
                <EditableFormRow
                  key={field.key}
                  field={field}
                  value={displayVal}
                  isLast={idx === arr.length - 1}
                  onSave={async (key, val) => {
                    await handleFieldSave(key, resolveCollaboratorSave(key, val, collaboratorMap))
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* 4. Linked Records — interactive LinkedRecordPicker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Related
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <LinkedRecordPicker
              label="Contacts"
              entityApi={window.electronAPI.contacts}
              labelField="contact_name"
              labelFallbackFields={['first_name', 'last_name']}
              secondaryField="company"
              value={project.contacts_ids}
              onChange={val => handleLinkedSave('contacts_ids', val)}
              createFields={CONTACT_CREATE_FIELDS}
              createTitle="New Contact"
              createApi={window.electronAPI.contacts}
              placeholder="Search contacts..."
            />
            <LinkedRecordPicker
              label="Opportunities"
              entityApi={window.electronAPI.opportunities}
              labelField="opportunity_name"
              value={project.sales_opportunities_ids}
              onChange={val => handleLinkedSave('sales_opportunities_ids', val)}
              createFields={OPPORTUNITY_CREATE_FIELDS}
              createTitle="New Opportunity"
              createDefaults={{ sales_stage: 'Prospecting' }}
              createApi={window.electronAPI.opportunities}
              placeholder="Search opportunities..."
            />
          </div>
        </div>

        {/* 5. Notes */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Notes
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'description', label: 'Description', type: 'textarea' }}
              value={project.description}
              onSave={handleFieldSave}
            />
            <EditableFormRow
              field={{ key: 'key_milestones', label: 'Key Milestones', type: 'textarea' }}
              value={project.key_milestones}
              isLast
              onSave={handleFieldSave}
            />
          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 16 }} />

      </div>
    </div>
  )
}
