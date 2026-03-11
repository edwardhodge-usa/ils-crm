import { useState, useMemo } from 'react'
import LoadingSpinner from '../shared/LoadingSpinner'
import useEntityList from '../../hooks/useEntityList'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract a display string from a value that may be a lookup array */
function resolveLookup(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') {
    // Might be a JSON array from a lookup field stored as text
    if (val.startsWith('[')) {
      try {
        const arr = JSON.parse(val)
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0])
      } catch { /* not JSON, use as-is */ }
    }
    return val
  }
  if (Array.isArray(val) && val.length > 0) return String(val[0])
  return String(val)
}

function formatTimestamp(raw: unknown): string {
  if (!raw) return '—'
  const s = String(raw)
  // Try ISO: YYYY-MM-DDTHH:mm or YYYY-MM-DD
  const dtMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!dtMatch) return s
  const [, y, m, d, h, min] = dtMatch.map(v => (v !== undefined ? Number(v) : undefined))
  const date = new Date(Number(y), Number(m) - 1, Number(d), h ?? 0, min ?? 0)
  if (h !== undefined) {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Log row ──────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: Record<string, unknown> }) {
  const timestamp = formatTimestamp(log.timestamp)
  const clientName = resolveLookup(log.client_name)
  const clientEmail = resolveLookup(log.client_email)
  const company = resolveLookup(log.company)
  const pageUrl = (log.page_url as string | null) ?? null
  const city = (log.city as string | null) ?? null
  const country = (log.country as string | null) ?? null
  const claritySession = (log.clarity_session as string | null) ?? null

  const location = [city, country].filter(Boolean).join(', ') || null

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-[var(--separator)] hover:bg-[var(--bg-hover)] transition-colors duration-[150ms]">

      {/* Timestamp + location */}
      <div className="flex-shrink-0 w-[140px]">
        <div className="text-[12px] text-[var(--text-tertiary)] tabular-nums leading-tight">
          {timestamp}
        </div>
        {Boolean(location) && (
          <div className="text-[11px] text-[var(--text-placeholder)] mt-0.5 leading-tight">
            {location}
          </div>
        )}
      </div>

      {/* Client info */}
      <div className="flex-shrink-0 w-[140px] min-w-0">
        {!clientName && !clientEmail && !company ? (
          <div className="text-[12px] text-[var(--text-tertiary)] italic truncate leading-tight">
            (Unknown visitor)
          </div>
        ) : (
          <>
            {Boolean(clientName) && (
              <div className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                {clientName}
              </div>
            )}
            {Boolean(clientEmail) && (
              <div className="text-[12px] text-[var(--text-tertiary)] truncate mt-0.5 leading-tight">
                {clientEmail}
              </div>
            )}
            {Boolean(company) && !clientName && (
              <div className="text-[12px] text-[var(--text-secondary)] truncate leading-tight">
                {company}
              </div>
            )}
          </>
        )}
      </div>

      {/* Page URL */}
      <div className="flex-1 min-w-0">
        {Boolean(pageUrl) ? (
          <div className="text-[12px] text-[var(--color-accent)] truncate leading-tight">
            {pageUrl}
          </div>
        ) : (
          <span className="text-[var(--text-placeholder)]">—</span>
        )}
      </div>

      {/* Clarity session link */}
      {Boolean(claritySession) && (
        <div className="flex-shrink-0">
          <span
            className="text-[12px] text-[var(--color-accent)] cursor-default hover:underline"
            title={claritySession ?? undefined}
          >
            View
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PortalLogsPage() {
  const { data: logs, loading, error } = useEntityList(() => window.electronAPI.portalLogs.getAll())
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const base = !search.trim()
      ? (logs as Record<string, unknown>[])
      : (logs as Record<string, unknown>[]).filter(l => {
          const q = search.toLowerCase()
          return (
            String(l.client_name ?? '').toLowerCase().includes(q) ||
            String(l.client_email ?? '').toLowerCase().includes(q) ||
            String(l.company ?? '').toLowerCase().includes(q) ||
            String(l.page_url ?? '').toLowerCase().includes(q) ||
            String(l.city ?? '').toLowerCase().includes(q) ||
            String(l.country ?? '').toLowerCase().includes(q) ||
            String(l.region ?? '').toLowerCase().includes(q) ||
            String(l.ip_address ?? '').toLowerCase().includes(q) ||
            String(l.user_agent ?? '').toLowerCase().includes(q)
          )
        })
    // Sort newest first
    return base.sort((a, b) => {
      const ta = String(a.timestamp ?? '')
      const tb = String(b.timestamp ?? '')
      return tb.localeCompare(ta)
    })
  }, [logs, search])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex flex-col h-full w-full">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--separator)] flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search logs…"
          className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <span className="text-[12px] text-[var(--text-tertiary)] tabular-nums flex-shrink-0">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[var(--separator)] bg-[var(--bg-secondary)] flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] w-[140px] flex-shrink-0">
          Time
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] w-[140px] flex-shrink-0">
          Client
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] flex-1">
          Page
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)]">
            {search ? 'No logs match your search.' : 'No portal logs yet.'}
          </div>
        ) : (
          filtered.map((log, i) => (
            <LogRow key={(log.id as string) ?? i} log={log} />
          ))
        )}
      </div>
    </div>
  )
}
