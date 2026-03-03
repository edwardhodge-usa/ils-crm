import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'
import { PencilIcon } from '../shared/icons/PencilIcon'
import { firstId } from '../../utils/linked-records'

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
  const notes = (proposal.notes as string | null) ?? null
  const version = (proposal.version as string | null) ?? null
  const templateUsed = (proposal.template_used as string | null) ?? null
  const approvalStatus = (proposal.approval_status as string | null) ?? null
  const proposedValue = proposal.proposed_value ? Number(proposal.proposed_value) : null

  const contactName = contact
    ? (contact.contact_name as string) || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null
    : null
  const companyName = company ? (company.company_name as string) || null : null

  const stats = [
    { label: 'Version', value: version || '—' },
    { label: 'Template', value: templateUsed || '—' },
    { label: 'Approval', value: approvalStatus || '—' },
  ]

  const infoRows: { label: string; value: string | null; isDropdown?: boolean; isLink?: boolean; linkTo?: string }[] = [
    { label: 'Status', value: status, isDropdown: true },
    { label: 'Value', value: proposedValue ? `$${proposedValue.toLocaleString()}` : null },
    { label: 'Approval', value: approvalStatus, isDropdown: true },
    { label: 'Version', value: version },
    { label: 'Template', value: templateUsed },
  ]

  const visibleInfoRows = infoRows.filter(r => Boolean(r.value))

  const linkedRows: { label: string; value: string | null; linkTo?: string }[] = [
    { label: 'Contact', value: contactName, linkTo: contact ? `/contacts/${contact.id as string}` : undefined },
    { label: 'Company', value: companyName, linkTo: company ? `/companies/${company.id as string}` : undefined },
  ]

  const visibleLinkedRows = linkedRows.filter(r => Boolean(r.value))

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {proposalName}
        </div>
        <button
          onClick={() => navigate(`/proposals/${proposalId}/edit`)}
          title="Edit proposal"
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

        {/* 3. Proposal details — Apple HIG form rows */}
        {visibleInfoRows.length > 0 && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Proposal Info
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden' }}>
              {visibleInfoRows.map((row, idx) => (
                <DetailFormRow
                  key={row.label}
                  label={row.label}
                  value={row.value!}
                  isDropdown={row.isDropdown}
                  isLast={idx === visibleInfoRows.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. Linked Contact + Company */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Related
          </div>
          {visibleLinkedRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>No linked contact or company</div>
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
        {Boolean(notes) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Notes
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', padding: '10px 14px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {notes}
              </div>
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
