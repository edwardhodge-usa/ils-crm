import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'
import { StageBadge } from '../shared/StageBadge'
import { ContactStats } from '../contacts/ContactStats'
import ConfirmDialog from '../shared/ConfirmDialog'
import type { Stage } from '../shared/StageBadge'

interface CompanyDetailProps {
  companyId: string | null
  onDeleted?: () => void
}

export function CompanyDetail({ companyId, onDeleted }: CompanyDetailProps) {
  const navigate = useNavigate()
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([])
  const [opps, setOpps] = useState<Record<string, unknown>[]>([])
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      setCompany(null)
      setContacts([])
      setOpps([])
      return
    }

    async function load() {
      setCompany(null)
      setContacts([])
      setOpps([])

      const [companyRes, contactsRes, oppsRes] = await Promise.all([
        window.electronAPI.companies.getById(companyId!),
        window.electronAPI.contacts.getAll(),
        window.electronAPI.opportunities.getAll(),
      ])

      if (companyRes.success && companyRes.data) {
        setCompany(companyRes.data as Record<string, unknown>)
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
          containsId(c.companies_ids, companyId!)
        )
        setContacts(linked)
      }

      if (oppsRes.success && oppsRes.data) {
        const linked = (oppsRes.data as Record<string, unknown>[]).filter(o =>
          containsId(o.company_ids, companyId!)
        )
        setOpps(linked)
      }
    }

    load()
  }, [companyId])

  if (!companyId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState title="Select a company" subtitle="Choose a company from the list to view details" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <div className="flex items-center justify-center h-full">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>
        </div>
      </div>
    )
  }

  const companyName = (company.company_name as string) || 'Unnamed Company'
  const industry = (company.industry as string | null) ?? null
  const type = (company.type as string | null) ?? null
  const categoryLabel = industry || type || null
  const location = [company.city, company.state_region, company.country].filter(Boolean).join(', ') || null

  const openOpps = opps.filter(o => o.sales_stage !== 'Closed Won' && o.sales_stage !== 'Closed Lost')
  const totalOppValue = opps.reduce((sum, o) => sum + (Number(o.deal_value) || 0), 0)

  const stats = [
    { label: 'Contacts', value: contacts.length },
    { label: 'Open Opps', value: openOpps.length },
    { label: 'Total Value', value: totalOppValue > 0 ? `$${totalOppValue.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[11px] text-[var(--text-tertiary)] truncate">
          {companyName}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/companies/${companyId}/edit`)}
            className="px-2.5 py-1 text-[11px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:opacity-80 transition-opacity cursor-default"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-2.5 py-1 text-[11px] font-medium text-[var(--color-red)] bg-[var(--color-red)]/15 rounded-md hover:bg-[var(--color-red)]/20 transition-colors cursor-default"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {companyName}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(categoryLabel) && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] leading-none">
                {categoryLabel}
              </span>
            )}
            {Boolean(location) && (
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {location}
              </span>
            )}
          </div>
        </div>

        {/* 2. Stats strip */}
        <ContactStats stats={stats} />

        {/* 3. Linked Contacts */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Contacts
          </div>
          {contacts.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No linked contacts</div>
          ) : (
            <>
              {contacts.slice(0, 5).map(c => {
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
                      <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {name}
                      </div>
                      {Boolean(title) && (
                        <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                          {title}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {contacts.length > 5 && (
                <div className="text-[11px] text-[var(--color-accent)] mt-1.5 cursor-default hover:underline"
                  onClick={() => navigate(`/companies/${companyId}`)}>
                  View all {contacts.length} contacts
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. Open Opportunities */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-label)] mb-2">
            Open Opportunities
          </div>
          {openOpps.length === 0 ? (
            <div className="text-[12px] text-[var(--text-tertiary)] italic">No open opportunities</div>
          ) : (
            openOpps.slice(0, 3).map(o => (
              <div
                key={o.id as string}
                className="px-3 py-2 rounded-lg bg-[var(--bg-card)] mb-1.5 cursor-default hover:bg-[var(--bg-hover)] transition-colors duration-[150ms]"
                onClick={() => navigate(`/pipeline/${o.id as string}/edit`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] font-medium text-[var(--text-primary)] leading-tight flex-1 truncate">
                    {(o.opportunity_name as string) || '—'}
                  </div>
                  {Boolean(o.sales_stage) && (
                    <StageBadge stage={o.sales_stage as Stage} />
                  )}
                </div>
                <div className="text-[13px] font-bold text-[var(--text-primary)] mt-0.5">
                  {o.deal_value ? `$${Number(o.deal_value).toLocaleString()}` : '—'}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Error banner */}
      {deleteError && (
        <div className="flex items-center justify-between bg-[var(--color-red)]/15 border border-[var(--color-red)]/30 px-4 py-3 text-[var(--color-red)] flex-shrink-0">
          <span className="text-[12px]">{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="ml-4 hover:text-[var(--text-primary)] transition-colors cursor-default">✕</button>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${companyName}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.companies.delete(companyId!)
          if (result.success) {
            onDeleted?.()
          } else {
            setShowDelete(false)
            setDeleteError(result.error || 'Delete failed — please try again')
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
