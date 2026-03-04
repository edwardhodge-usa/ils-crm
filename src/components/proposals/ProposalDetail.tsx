import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { EditableFormRow, type EditableField } from '../shared/EditableFormRow'
import { firstId } from '../../utils/linked-records'

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
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null)
  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [opportunity, setOpportunity] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!proposalId) {
      setProposal(null)
      setContact(null)
      setCompany(null)
      setOpportunity(null)
      return
    }

    async function load() {
      setProposal(null)
      setContact(null)
      setCompany(null)
      setOpportunity(null)

      const proposalRes = await window.electronAPI.proposals.getById(proposalId!)
      if (proposalRes.success && proposalRes.data) {
        const p = proposalRes.data as Record<string, unknown>
        setProposal(p)

        const contactId = firstId(p.contact_ids) ?? firstId(p.contacts_ids)
        const companyId = firstId(p.company_ids) ?? firstId(p.companies_ids)
        const oppId = firstId(p.related_opportunity_ids)

        const noOp = Promise.resolve({ success: false, data: null })
        const [contactRes, companyRes, oppRes] = await Promise.all([
          contactId ? window.electronAPI.contacts.getById(contactId) : noOp,
          companyId ? window.electronAPI.companies.getById(companyId) : noOp,
          oppId ? window.electronAPI.opportunities.getById(oppId) : noOp,
        ])

        if (contactRes.success && contactRes.data) {
          setContact(contactRes.data as Record<string, unknown>)
        }
        if (companyRes.success && companyRes.data) {
          setCompany(companyRes.data as Record<string, unknown>)
        }
        if (oppRes.success && oppRes.data) {
          setOpportunity(oppRes.data as Record<string, unknown>)
        }
      }
    }

    load()
  }, [proposalId])

  const handleFieldSave = useCallback(async (key: string, val: unknown) => {
    if (!proposalId) return
    await window.electronAPI.proposals.update(proposalId, { [key]: val })
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

  const contactName = contact
    ? (contact.contact_name as string) || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null
    : null
  const companyName = company ? (company.company_name as string) || null : null

  const stats = [
    { label: 'Version', value: (proposal.version as string) || '—' },
    { label: 'Template', value: (proposal.template_used as string) || '—' },
    { label: 'Approval', value: (proposal.approval_status as string) || '—' },
  ]

  const oppName = opportunity ? (opportunity.opportunity_name as string) || null : null

  const linkedRows: { label: string; value: string | null; linkTo?: string }[] = [
    { label: 'Contact', value: contactName, linkTo: contact ? `/contacts/${contact.id as string}` : undefined },
    { label: 'Company', value: companyName, linkTo: company ? `/companies/${company.id as string}` : undefined },
    { label: 'Opportunity', value: oppName, linkTo: opportunity ? `/pipeline/${opportunity.id as string}/edit` : undefined },
  ]

  const visibleLinkedRows = linkedRows.filter(r => Boolean(r.value))

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

        {/* 4. Linked Contact + Company */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Related
          </div>
          {visibleLinkedRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>No linked contact or company</div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {visibleLinkedRows.map((row, idx) => (
                <div
                  key={row.label}
                  className="cursor-default"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', minHeight: 36,
                    borderBottom: idx < visibleLinkedRows.length - 1 ? '1px solid var(--separator)' : undefined,
                    transition: 'background 150ms',
                  }}
                  onClick={() => row.linkTo && navigate(row.linkTo)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flexShrink: 0, marginRight: 12 }}>
                    {row.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 400,
                      color: row.linkTo ? 'var(--color-accent)' : 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.value}
                    </span>
                    {Boolean(row.linkTo) && (
                      <span style={{ fontSize: 14, color: 'var(--text-tertiary)', flexShrink: 0 }}>›</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
