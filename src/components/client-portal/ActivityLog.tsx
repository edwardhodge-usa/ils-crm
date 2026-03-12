import { useMemo } from 'react'
import { extractPageSlug, resolveLookup } from '../../utils/portal-helpers'

// ── Types ────────────────────────────────────────────────────────────────────

interface ActivityLogProps {
  logs: Record<string, unknown>[]
  pageSlug?: string
  personEmail?: string
  limit?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a client_name that may be a JSON array (lookup field) */
function safeClientName(val: unknown): string {
  if (!val) return 'Unknown'
  const resolved = resolveLookup(val)
  return resolved || 'Unknown'
}

/** Relative time display: just now / Xm ago / Xh ago / Xd ago / Xw ago */
function formatRelativeTime(isoDate: unknown): string {
  if (!isoDate) return ''
  const date = new Date(String(isoDate))
  if (isNaN(date.getTime())) return ''

  const now = Date.now()
  const diffMs = now - date.getTime()
  if (diffMs < 0) return 'just now'

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ActivityLog({
  logs,
  pageSlug,
  personEmail,
  limit = 10,
}: ActivityLogProps) {
  const filtered = useMemo(() => {
    let result = logs

    if (pageSlug) {
      result = result.filter(
        log => extractPageSlug(log.page_url as string | null) === pageSlug
      )
    }

    if (personEmail) {
      const email = personEmail.toLowerCase()
      result = result.filter(log => {
        const logEmail = resolveLookup(log.client_email)
        return logEmail?.toLowerCase() === email
      })
    }

    // Sort by timestamp descending
    result = [...result].sort((a, b) => {
      const ta = String(a.timestamp ?? '')
      const tb = String(b.timestamp ?? '')
      return tb.localeCompare(ta)
    })

    return result.slice(0, limit)
  }, [logs, pageSlug, personEmail, limit])

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding: '16px 0',
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--text-tertiary)',
        }}
      >
        No activity yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {filtered.map((log, i) => {
        const name = safeClientName(log.client_name)
        const slug = extractPageSlug(log.page_url as string | null)
        const city = log.city as string | null
        const country = log.country as string | null
        const location = [city, country].filter(Boolean).join(', ')
        const relTime = formatRelativeTime(log.timestamp)

        // Show page slug when we're not already filtering by page
        const showSlug = !pageSlug && slug

        return (
          <div
            key={(log.id as string) ?? i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 0',
              borderBottom:
                i < filtered.length - 1
                  ? '1px solid var(--separator)'
                  : 'none',
              minHeight: 32,
            }}
          >
            {/* Green dot */}
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--color-green)',
                flexShrink: 0,
              }}
            />

            {/* Activity description */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {name}
              </span>
              {' visited '}
              {showSlug && (
                <span style={{ color: 'var(--color-accent)' }}>
                  /{slug}
                </span>
              )}
              {location ? (
                <>
                  {showSlug ? ' ' : ''}
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {location}
                  </span>
                </>
              ) : null}
            </div>

            {/* Relative time */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {relTime}
            </div>
          </div>
        )
      })}
    </div>
  )
}
