import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import StatusBadge from '../shared/StatusBadge'
import { ContactStats } from '../contacts/ContactStats'

interface RfqDetailProps {
  rfqId: string | null
  rfqData?: Record<string, unknown> | null
}

export function RfqDetail({ rfqId, rfqData }: RfqDetailProps) {
  const navigate = useNavigate()
  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!rfqId || !rfqData) {
      setContact(null)
      setCompany(null)
      return
    }

    async function load() {
      setContact(null)
      setCompany(null)

      function firstId(idsJson: unknown): string | null {
        if (!idsJson) return null
        try {
          const arr = JSON.parse(idsJson as string)
          return Array.isArray(arr) && arr.length > 0 ? (arr[0] as string) : null
        } catch {
          return null
        }
      }

      const contactId = firstId(rfqData!.contact_ids) ?? firstId(rfqData!.contacts_ids)
      const companyId = firstId(rfqData!.company_ids) ?? firstId(rfqData!.companies_ids)

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

    load()
  }, [rfqId, rfqData])

  if (!rfqId || !rfqData) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select an RFQ" subtitle="Choose an RFQ from the list to view details" />
      </div>
    )
  }

  const rfqTitle = (rfqData.rfq_name as string) || (rfqData.title as string) || 'Unnamed RFQ'
  const status = (rfqData.status as string | null) ?? null
  const requestDate = (rfqData.request_date as string | null) ?? null
  const responseDeadline = (rfqData.response_deadline as string | null) ?? (rfqData.deadline as string | null) ?? null
  const estimatedValue = rfqData.estimated_value ? Number(rfqData.estimated_value) : null
  const notes = (rfqData.notes as string | null) ?? (rfqData.description as string | null) ?? null

  const contactName = contact
    ? (contact.contact_name as string) || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null
    : null
  const companyName = company ? (company.company_name as string) || null : null

  const stats = [
    { label: 'Request Date', value: requestDate || '—' },
    { label: 'Deadline', value: responseDeadline || '—' },
    { label: 'Est. Value', value: estimatedValue ? `$${estimatedValue.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {rfqTitle}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {rfqTitle}
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
