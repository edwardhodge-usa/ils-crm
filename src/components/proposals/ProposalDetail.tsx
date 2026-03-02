import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'

interface ProposalDetailProps {
  proposalId: string | null
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null)
  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!proposalId) {
      setProposal(null)
      setContact(null)
      setCompany(null)
      return
    }

    async function load() {
      setProposal(null)
      setContact(null)
      setCompany(null)

      const proposalRes = await window.electronAPI.proposals.getById(proposalId!)
      if (proposalRes.success && proposalRes.data) {
        const p = proposalRes.data as Record<string, unknown>
        setProposal(p)

        function firstId(idsJson: unknown): string | null {
          if (!idsJson) return null
          try {
            const arr = JSON.parse(idsJson as string)
            return Array.isArray(arr) && arr.length > 0 ? (arr[0] as string) : null
          } catch {
            return null
          }
        }

        const contactId = firstId(p.contact_ids) ?? firstId(p.contacts_ids)
        const companyId = firstId(p.company_ids) ?? firstId(p.companies_ids)

        const noOp = Promise.resolve({ success: false, data: null })
        const [contactRes, companyRes] = await Promise.all([
          contactId ? window.electronAPI.contacts.getById(contactId) : noOp,
          companyId ? window.electronAPI.companies.getById(companyId) : noOp,
        ])

        if (contactRes.success && contactRes.data) {
          setContact(contactRes.data as Record<string, unknown>)
        }
        if (companyRes.success && companyRes.data) {
          setCompany(companyRes.data as Record<string, unknown>)
        }
      }
    }

    load()
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
  const value = proposal.proposed_value ? Number(proposal.proposed_value) : null
  const dateSent = (proposal.date_sent as string | null) ?? null
  const validUntil = (proposal.valid_until as string | null) ?? null
  const notes = (proposal.notes as string | null) ?? null

  const contactName = contact
    ? (contact.contact_name as string) || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null
    : null
  const companyName = company ? (company.company_name as string) || null : null

  const stats = [
    { label: 'Value', value: value ? `$${value.toLocaleString()}` : '—' },
    { label: 'Sent', value: dateSent || '—' },
    { label: 'Expires', value: validUntil || '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {proposalName}
        </div>
        <button
          onClick={() => navigate(`/proposals/${proposalId}/edit`)}
          className="px-2.5 py-1 text-[12px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:opacity-80 transition-opacity cursor-default"
        >
          Edit
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {proposalName}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(status) && <StatusBadge value={status} />}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Linked Contact + Company */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-2">
            Related
          </div>
          {Boolean(contactName) && (
            <div
              className="flex items-center gap-2 py-1.5 border-b border-[var(--separator)] last:border-0 cursor-default hover:bg-[var(--bg-hover)] -mx-4 px-4 transition-colors duration-[150ms]"
              onClick={() => contact && navigate(`/contacts/${contact.id as string}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">Contact</div>
                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{contactName}</div>
              </div>
            </div>
          )}
          {Boolean(companyName) && (
            <div
              className="flex items-center gap-2 py-1.5 cursor-default hover:bg-[var(--bg-hover)] -mx-4 px-4 transition-colors duration-[150ms]"
              onClick={() => company && navigate(`/companies/${company.id as string}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">Company</div>
                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{companyName}</div>
              </div>
            </div>
          )}
          {!contactName && !companyName && (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No linked contact or company</div>
          )}
        </div>

        {/* 4. Notes */}
        {Boolean(notes) && (
          <div className="px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-2">
              Notes
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {notes}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
