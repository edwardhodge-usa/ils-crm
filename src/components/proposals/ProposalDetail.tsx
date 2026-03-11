import { useState, useEffect, useCallback } from 'react'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import LinkedRecordPicker from '../shared/LinkedRecordPicker'
import {
  CONTACT_CREATE_FIELDS,
  COMPANY_CREATE_FIELDS,
  OPPORTUNITY_CREATE_FIELDS,
} from '../../config/create-fields'
import { parseIds } from '../../utils/linked-records'

const PROPOSAL_EDITABLE_FIELDS: EditableField[] = [
  { key: 'status', label: 'Status', type: 'singleSelect',
    options: ['Draft', 'Pending Approval', 'Approved', 'Sent to Client', 'Closed Won', 'Closed Lost', 'Submitted', 'In Review', 'Rejected'] },
  { key: 'proposed_value', label: 'Value', type: 'currency' },
  { key: 'approval_status', label: 'Approval', type: 'singleSelect',
    options: ['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Pending', 'Under Review'] },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'template_used', label: 'Template', type: 'singleSelect',
    options: ['Basic', 'Detailed', 'Custom', 'Standard Template', 'Custom Template', 'Marketing Template', 'IT Template', 'Service Template', 'Design Template', 'Security Template', 'Strategy Template', 'HR Template', 'Event Template'] },
  { key: 'created_by', label: 'Created By', type: 'readonly' },
]

interface ProposalDetailProps {
  proposalId: string | null
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!proposalId) {
      setProposal(null)
      return
    }

    let cancelled = false

    async function load() {
      setProposal(null)
      const proposalRes = await window.electronAPI.proposals.getById(proposalId!)
      if (cancelled) return
      if (proposalRes.success && proposalRes.data) {
        setProposal(proposalRes.data as Record<string, unknown>)
      }

      // Background refresh from Airtable for latest data
      window.electronAPI.proposals.refresh(proposalId!).then(freshRes => {
        if (!cancelled && freshRes.success && freshRes.data) {
          setProposal(freshRes.data as Record<string, unknown>)
        }
      })
    }

    load()
    return () => { cancelled = true }
  }, [proposalId])

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!proposalId) return
    await window.electronAPI.proposals.update(proposalId, { [key]: val })
    const res = await window.electronAPI.proposals.getById(proposalId)
    if (res.success && res.data) setProposal(res.data as Record<string, unknown>)
  }, [proposalId])

  const handleLinkedSave = useCallback(async (key: string, val: unknown) => {
    if (!proposalId) return
    const updates: Record<string, unknown> = { [key]: val }

    // Auto-populate company from the linked client contact
    if (key === 'client_ids') {
      const contactIds = parseIds(val)
      if (contactIds.length > 0) {
        const contactRes = await window.electronAPI.contacts.getById(contactIds[0])
        if (contactRes.success && contactRes.data) {
          const contact = contactRes.data as Record<string, unknown>
          const companyIds = parseIds(contact.companies_ids)
          if (companyIds.length > 0) {
            updates.company_ids = JSON.stringify(companyIds)
          }
        }
      }
    }

    await window.electronAPI.proposals.update(proposalId, updates)
    const res = await window.electronAPI.proposals.getById(proposalId)
    if (res.success && res.data) setProposal(res.data as Record<string, unknown>)
  }, [proposalId])

  if (!proposalId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a proposal" subtitle="Choose a proposal from the list to view details" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <div className="flex items-center justify-center h-full">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>
        </div>
      </div>
    )
  }

  const proposalName = (proposal.proposal_name as string) || 'Unnamed Proposal'
  const status = (proposal.status as string | null) ?? null
  const proposedValue = proposal.proposed_value ? Number(proposal.proposed_value) : null

  const stats = [
    { label: 'Version', value: (proposal.version as string) || '—' },
    { label: 'Template', value: (proposal.template_used as string) || '—' },
    { label: 'Approval', value: (proposal.approval_status as string) || '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {proposalName}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 18px' }}>

        {/* 1. Hero block */}
        <div style={{ padding: '18px 0 14px', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {proposalName}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(status) && <StatusBadge value={status} />}
            {Boolean(proposedValue) && (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-green)' }}>
                ${proposedValue!.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Proposal details — inline-editable form rows */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Proposal Info
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            {PROPOSAL_EDITABLE_FIELDS.map((field, idx) => (
              <EditableFormRow
                key={field.key}
                field={field}
                value={(proposal as Record<string, unknown>)[field.key]}
                isLast={idx === PROPOSAL_EDITABLE_FIELDS.length - 1}
                onSave={handleFieldSave}
              />
            ))}
          </div>
        </div>

        {/* 4. Linked Records — interactive LinkedRecordPicker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Related
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <LinkedRecordPicker
              label="Client (Contact)"
              entityApi={window.electronAPI.contacts}
              labelField="contact_name"
              labelFallbackFields={['first_name', 'last_name']}
              secondaryField="company"
              value={proposal.client_ids}
              onChange={val => handleLinkedSave('client_ids', val)}
              createFields={CONTACT_CREATE_FIELDS}
              createTitle="New Contact"
              createApi={window.electronAPI.contacts}
              placeholder="Search contacts..."
            />
            <LinkedRecordPicker
              label="Company"
              entityApi={window.electronAPI.companies}
              labelField="company_name"
              value={proposal.company_ids}
              onChange={val => handleLinkedSave('company_ids', val)}
              createFields={COMPANY_CREATE_FIELDS}
              createTitle="New Company"
              createApi={window.electronAPI.companies}
              placeholder="Search companies..."
            />
            <LinkedRecordPicker
              label="Opportunity"
              entityApi={window.electronAPI.opportunities}
              labelField="opportunity_name"
              value={proposal.related_opportunity_ids}
              onChange={val => handleLinkedSave('related_opportunity_ids', val)}
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
              field={{ key: 'notes', label: 'Notes', type: 'textarea' }}
              value={proposal.notes}
              isLast
              onSave={handleFieldSave}
            />
          </div>
        </div>

        {/* 6. Client Feedback */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Client Feedback
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'client_feedback', label: 'Client Feedback', type: 'textarea' }}
              value={proposal.client_feedback}
              isLast
              onSave={handleFieldSave}
            />
          </div>
        </div>

        {/* 7. Performance Metrics */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Performance Metrics
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
            <EditableFormRow
              field={{ key: 'performance_metrics', label: 'Performance Metrics', type: 'textarea' }}
              value={proposal.performance_metrics}
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
