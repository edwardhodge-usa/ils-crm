import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import ConfirmDialog from '../shared/ConfirmDialog'
import DateSuggestionPicker from '../shared/DateSuggestionPicker'
import { StageProgress } from './StageProgress'
import {
  CONTACT_CREATE_FIELDS,
  COMPANY_CREATE_FIELDS,
  PROJECT_CREATE_FIELDS,
  PROPOSAL_CREATE_FIELDS,
} from '../../config/create-fields'

interface DealDetailProps {
  dealId: string | null
  onClose: () => void
  onDeleted?: () => void
  onSaved?: () => void
}

const DEAL_EDITABLE_FIELDS: EditableField[] = [
  { key: 'sales_stage', label: 'Stage', type: 'singleSelect',
    options: ['Prospecting', 'Qualified', 'Business Development', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] },
  { key: 'deal_value', label: 'Value', type: 'currency' },
  { key: 'probability', label: 'Probability', type: 'singleSelect',
    options: ['Cold', 'Low', '02 Medium', '01 High', '04 FUTURE ROADMAP'] },
  { key: 'engagement_type', label: 'Engagement Type', type: 'multiSelect',
    options: ['Strategy/Consulting', 'Design/Concept Development', 'Production/Fabrication Oversight', 'Opening/Operations Support', 'Executive Producing'] },
  { key: 'quals_type', label: 'Quals Type', type: 'singleSelect',
    options: ['Standard Capabilities Deck', 'Customized Quals', 'Both'] },
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect',
    options: ['Referral', 'Inbound - Website', 'Inbound - LinkedIn', 'Inbound - Conference/Event', 'Outbound Prospecting', 'Past Relationship', 'Other', 'Partnership'] },
  { key: 'referred_by', label: 'Referred By', type: 'text' },
  { key: 'qualifications_sent', label: 'Quals Sent', type: 'checkbox' },
]

/** Status badge for tasks */
function TaskStatusBadge({ status }: { status: string }) {
  const isComplete = status?.toLowerCase().includes('complete') || status?.toLowerCase().includes('done')
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 4,
        opacity: 0.85,
        background: isComplete ? 'rgba(48, 209, 88, 0.10)' : 'rgba(118, 118, 128, 0.10)',
        color: isComplete ? 'var(--color-green)' : 'var(--text-secondary)',
        lineHeight: 1.2,
      }}
    >
      {status || 'Open'}
    </span>
  )
}

export function DealDetail({ dealId, onClose, onDeleted, onSaved }: DealDetailProps) {
  const [deal, setDeal] = useState<Record<string, unknown> | null>(null)
  const [linkedTasks, setLinkedTasks] = useState<Record<string, unknown>[]>([])
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Mount/unmount lifecycle for portal animation
  useEffect(() => {
    if (dealId) {
      setMounted(true)
    } else {
      setVisible(false)
      const t = setTimeout(() => {
        setMounted(false)
        setDeal(null)
        setLinkedTasks([])
      }, 300) // wait for slide-out animation
      return () => clearTimeout(t)
    }
  }, [dealId])

  // Load deal data
  useEffect(() => {
    if (!dealId) return

    setVisible(false)
    setDeal(null)
    setLinkedTasks([])

    let cancelled = false

    async function load() {
      if (!dealId) return

      const [dealRes, tasksRes] = await Promise.all([
        window.electronAPI.opportunities.getById(dealId),
        window.electronAPI.tasks.getAll(),
      ])

      if (cancelled) return

      if (dealRes.success && dealRes.data) {
        setDeal(dealRes.data as Record<string, unknown>)
      }

      if (tasksRes.success && tasksRes.data) {
        const allTasks = tasksRes.data as Record<string, unknown>[]
        const filtered = allTasks.filter(t => {
          const raw = t.sales_opportunities_ids
          if (!raw) return false
          try {
            const ids: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray(ids) && ids.includes(dealId)
          } catch {
            return false
          }
        })
        setLinkedTasks(filtered)
      }

      requestAnimationFrame(() => {
        if (!cancelled) setVisible(true)
      })
    }

    load()
    return () => { cancelled = true }
  }, [dealId])

  // Escape key to close
  useEffect(() => {
    if (!mounted) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mounted, onClose])

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!dealId) return
    await window.electronAPI.opportunities.update(dealId, { [key]: val })
    const res = await window.electronAPI.opportunities.getById(dealId)
    if (res.success && res.data) setDeal(res.data as Record<string, unknown>)
    onSaved?.()
  }, [dealId, onSaved])

  const handleLinkedSave = useCallback(async (key: string, val: unknown) => {
    if (!dealId) return
    await window.electronAPI.opportunities.update(dealId, { [key]: val })
    const res = await window.electronAPI.opportunities.getById(dealId)
    if (res.success && res.data) setDeal(res.data as Record<string, unknown>)
    onSaved?.()
  }, [dealId, onSaved])

  // Trigger slide-in after data loads
  useEffect(() => {
    if (dealId && deal) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [dealId, deal])

  if (!mounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Backdrop — subtle darkening, click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 250ms ease',
        }}
      />

      {/* Slide-over panel */}
      <div
        style={{
          position: 'relative',
          width: 400,
          height: '100%',
          background: 'var(--bg-sheet)',
          borderLeft: '1px solid var(--separator)',
          boxShadow: visible ? '-8px 0 30px rgba(0,0,0,0.15)' : 'none',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.2,0.9,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {deal ? (
          <div className="flex flex-col flex-1 min-h-0" style={{ overflowY: 'auto' }}>
            {/* Hero */}
            <div style={{ padding: '24px 20px 16px' }}>
              {/* Close button */}
              <div className="flex justify-end" style={{ marginBottom: 8 }}>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  ✕
                </button>
              </div>

              {/* Deal name */}
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 4 }}>
                {(deal.opportunity_name as string) || '—'}
              </div>

              {/* Company name */}
              {Boolean(deal.company_name) && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {deal.company_name as string}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                {['Log Activity', 'Email'].map(label => (
                  <button
                    key={label}
                    className="flex-1"
                    style={{
                      padding: '6px 0',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--color-accent)',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'default',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage progress bar */}
            <div style={{ padding: '0 20px 16px' }}>
              <StageProgress currentStage={(deal.sales_stage as string) || ''} />
            </div>

            {/* Grouped container — deal fields */}
            <div style={{ margin: '0 12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {DEAL_EDITABLE_FIELDS.map((field, idx) => (
                <EditableFormRow
                  key={field.key}
                  field={field}
                  value={(deal as Record<string, unknown>)[field.key]}
                  isLast={idx === DEAL_EDITABLE_FIELDS.length - 1}
                  onSave={handleFieldSave}
                />
              ))}
            </div>

            {/* Date fields with suggestion picker */}
            <div style={{ margin: '0 12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              <DateSuggestionPicker
                label="Close Date"
                value={(deal.expected_close_date as string | null) ?? null}
                onSave={async (date) => {
                  await handleFieldSave('expected_close_date', date)
                }}
              />
              <div style={{ height: 1, background: 'var(--separator)', margin: '0 14px' }} />
              <DateSuggestionPicker
                label="Next Meeting"
                value={(deal.next_meeting_date as string | null) ?? null}
                onSave={async (date) => {
                  await handleFieldSave('next_meeting_date', date)
                }}
              />
            </div>

            {/* Related linked records — interactive LinkedRecordPicker */}
            <div style={{ padding: '0 12px 16px' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-secondary)',
                padding: '0 4px 8px',
              }}>
                Related
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
                <LinkedRecordPicker
                  label="Company"
                  entityApi={window.electronAPI.companies}
                  labelField="company_name"
                  value={deal.company_ids}
                  onChange={val => handleLinkedSave('company_ids', val)}
                  createFields={COMPANY_CREATE_FIELDS}
                  createTitle="New Company"
                  createApi={window.electronAPI.companies}
                  placeholder="Search companies..."
                />
                <LinkedRecordPicker
                  label="Contacts"
                  entityApi={window.electronAPI.contacts}
                  labelField="contact_name"
                  labelFallbackFields={['first_name', 'last_name']}
                  value={deal.associated_contact_ids}
                  onChange={val => handleLinkedSave('associated_contact_ids', val)}
                  createFields={CONTACT_CREATE_FIELDS}
                  createTitle="New Contact"
                  createApi={window.electronAPI.contacts}
                  placeholder="Search contacts..."
                />
                <LinkedRecordPicker
                  label="Projects"
                  entityApi={window.electronAPI.projects}
                  labelField="project_name"
                  value={deal.project_ids}
                  onChange={val => handleLinkedSave('project_ids', val)}
                  createFields={PROJECT_CREATE_FIELDS}
                  createTitle="New Project"
                  createApi={window.electronAPI.projects}
                  placeholder="Search projects..."
                />
                <LinkedRecordPicker
                  label="Proposals"
                  entityApi={window.electronAPI.proposals}
                  labelField="proposal_name"
                  value={deal.proposals_ids}
                  onChange={val => handleLinkedSave('proposals_ids', val)}
                  createFields={PROPOSAL_CREATE_FIELDS}
                  createTitle="New Proposal"
                  createDefaults={{ status: 'Draft' }}
                  createApi={window.electronAPI.proposals}
                  placeholder="Search proposals..."
                />
              </div>
            </div>

            {/* Tasks section */}
            <div style={{ padding: '0 12px 16px' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-secondary)',
                padding: '0 4px 8px',
              }}>
                Tasks
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
                {linkedTasks.length === 0 ? (
                  <div style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                  }}>
                    No linked tasks
                  </div>
                ) : (
                  linkedTasks.map((task, i) => (
                    <div
                      key={task.id as string}
                      className="flex items-center justify-between"
                      style={{
                        padding: '10px 14px',
                        minHeight: 36,
                        borderBottom: i < linkedTasks.length - 1 ? '1px solid var(--separator)' : 'none',
                        cursor: 'default',
                      }}
                    >
                      <span
                        className="truncate flex-1"
                        style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', marginRight: 8 }}
                      >
                        {(task.task as string) || '—'}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <TaskStatusBadge status={(task.status as string) || ''} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Delete button */}
            <div className="flex gap-2" style={{ padding: '8px 12px 20px' }}>
              <button
                className="flex-1"
                onClick={() => setShowDelete(true)}
                style={{
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-red)',
                  background: 'transparent',
                  border: '1px solid var(--color-red)',
                  borderRadius: 8,
                  cursor: 'default',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                Delete
              </button>
            </div>

            {deleteError && (
              <div style={{ margin: '0 12px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--color-red)' }}>{deleteError}</span>
                <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text-tertiary)', cursor: 'default' }}>✕</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading...</div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Opportunity"
        message={`Are you sure you want to delete "${(deal?.opportunity_name as string) || 'this opportunity'}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.opportunities.delete(dealId!)
          if (result.success) {
            setShowDelete(false)
            onDeleted?.()
            onClose()
          } else {
            setShowDelete(false)
            setDeleteError(result.error || 'Delete failed — please try again')
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>,
    document.body
  )
}
