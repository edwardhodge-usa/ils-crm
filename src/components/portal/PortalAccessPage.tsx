import { useState, useMemo, useEffect } from 'react'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import { EmptyState } from '../shared/EmptyState'
import useEntityList from '../../hooks/useEntityList'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: unknown): string {
  if (!raw) return ''
  const s = String(raw)
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return s
  const [, y, m, d] = match.map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function resolvedName(row: Record<string, unknown>): string {
  return (
    (row.name as string | null) ||
    (row.contact_name_lookup as string | null) ||
    '—'
  )
}

function resolvedEmail(row: Record<string, unknown>): string | null {
  return (
    (row.email as string | null) ||
    (row.contact_email_lookup as string | null) ||
    null
  )
}

function resolvedCompany(row: Record<string, unknown>): string | null {
  return (
    (row.company as string | null) ||
    (row.contact_company_lookup as string | null) ||
    null
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────

interface PortalRowProps {
  record: Record<string, unknown>
  isSelected: boolean
  onClick: () => void
}

function PortalAccessRow({ record, isSelected, onClick }: PortalRowProps) {
  const name = resolvedName(record)
  const status = (record.status as string | null) ?? null

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: name */}
      <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
        {name}
      </div>

      {/* Line 2: status badge */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[16px]">
        {Boolean(status) && (
          <span className="text-[10px]">
            <StatusBadge value={status} />
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailProps {
  record: Record<string, unknown> | null
  logs: Record<string, unknown>[]
}

function PortalAccessDetail({ record, logs }: DetailProps) {
  if (!record) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState
          title="Select a record"
          subtitle="Choose a portal access record from the list to view details"
        />
      </div>
    )
  }

  const name = resolvedName(record)
  const email = resolvedEmail(record)
  const company = resolvedCompany(record)
  const status = (record.status as string | null) ?? null
  const stage = (record.stage as string | null) ?? null
  const leadSource = (record.lead_source as string | null) ?? null
  const dateAdded = record.date_added ?? null
  const pageAddress = (record.page_address as string | null) ?? null
  const assignee = (record.assignee as string | null) ?? null
  const contactIndustry = (record.contact_industry_lookup as string | null) ?? null
  const contactTags = (record.contact_tags_lookup as string | null) ?? null
  const contactWebsite = (record.contact_website_lookup as string | null) ?? null
  const contactJobTitle = (record.contact_job_title_lookup as string | null) ?? null
  // Combine address parts into one line
  const contactAddress = [
    record.contact_address_line_lookup,
    record.contact_city_lookup,
    record.contact_state_lookup,
    record.contact_country_lookup,
  ].filter(Boolean).join(', ') || null

  // Filter logs related to this record by email match (best available join key)
  const relatedLogs = email
    ? logs.filter(l =>
        (l.client_email as string | null)?.toLowerCase() === email.toLowerCase()
      )
    : []

  const logCount = relatedLogs.length

  // Most recent activity: logs sorted descending by timestamp
  const lastLog = relatedLogs
    .filter(l => l.timestamp)
    .sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')))
    [0] ?? null

  const lastActivity = lastLog
    ? (() => {
        const ts = String(lastLog.timestamp ?? '')
        const match = ts.match(/^(\d{4}-\d{2}-\d{2})/)
        return match ? formatDate(match[1]) : ts
      })()
    : null

  const fields: Array<{ label: string; value: string | null }> = [
    { label: 'Email', value: email },
    { label: 'Company', value: company },
    { label: 'Job Title', value: contactJobTitle },
    { label: 'Industry', value: contactIndustry },
    { label: 'Tags', value: contactTags },
    { label: 'Website', value: contactWebsite },
    { label: 'Address', value: contactAddress },
    { label: 'Lead Source', value: leadSource },
    { label: 'Assignee', value: assignee },
    { label: 'Added', value: formatDate(dateAdded) || null },
    { label: 'Portal Page', value: pageAddress },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <div className="text-[12px] text-[var(--text-tertiary)] truncate">
          {name}
        </div>
        {Boolean(status) && <StatusBadge value={status} />}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero block */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
            {name}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {Boolean(status) && <StatusBadge value={status} />}
            {Boolean(stage) && <StatusBadge value={stage} />}
          </div>
        </div>

        {/* Activity stats strip */}
        <div className="flex border-b border-[var(--separator)]">
          <div className="flex-1 px-4 py-3 text-center border-r border-[var(--separator)]">
            <div className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums">
              {logCount}
            </div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              Portal Visits
            </div>
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              {lastActivity ?? '—'}
            </div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              Last Activity
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 py-3 border-b border-[var(--separator)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">
            Details
          </div>
          <div className="space-y-1.5">
            {fields.map(({ label, value }) =>
              value ? (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-[12px] text-[var(--text-tertiary)] w-[80px] flex-shrink-0 pt-px">
                    {label}
                  </span>
                  <span className="text-[12px] text-[var(--text-primary)] flex-1 min-w-0 break-words">
                    {value}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Recent portal log entries */}
        {relatedLogs.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">
              Recent Visits
            </div>
            {relatedLogs.slice(0, 5).map((log, i) => {
              const ts = String(log.timestamp ?? '')
              const dateStr = (() => {
                const m = ts.match(/^(\d{4}-\d{2}-\d{2})/)
                return m ? formatDate(m[1]) : ts
              })()
              const page = (log.page_url as string | null) ?? null
              const city = (log.city as string | null) ?? null

              return (
                <div
                  key={i}
                  className="py-1.5 border-b border-[var(--separator)] last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">
                      {dateStr}
                    </span>
                    {Boolean(city) && (
                      <span className="text-[12px] text-[var(--text-tertiary)] truncate">
                        {city}
                      </span>
                    )}
                  </div>
                  {Boolean(page) && (
                    <div className="text-[12px] text-[var(--color-accent)] truncate mt-0.5">
                      {page}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortalAccessPage() {
  const { data: records, loading, error } = useEntityList(() => window.electronAPI.portalAccess.getAll())
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Load portal logs once for activity data
  useEffect(() => {
    window.electronAPI.portalLogs.getAll().then(res => {
      if (res.success && res.data) {
        setLogs(res.data as Record<string, unknown>[])
      }
    }).catch(() => { /* logs stay empty */ })
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return records as Record<string, unknown>[]
    const q = search.toLowerCase()
    return (records as Record<string, unknown>[]).filter(r =>
      resolvedName(r).toLowerCase().includes(q) ||
      String(resolvedEmail(r) ?? '').toLowerCase().includes(q) ||
      String(resolvedCompany(r) ?? '').toLowerCase().includes(q)
    )
  }, [records, search])

  const selected = filtered.find(r => r.id === selectedId) ?? null

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 240px fixed */}
      <div className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--separator)] flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search portal access…"
            className="w-full text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No records match your search.' : 'No portal access records.'}
            </div>
          ) : (
            filtered.map(record => (
              <PortalAccessRow
                key={record.id as string}
                record={record}
                isSelected={selectedId === (record.id as string)}
                onClick={() => setSelectedId(record.id as string)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 */}
      <PortalAccessDetail record={selected} logs={logs} />
    </div>
  )
}
