import { useState } from 'react'

interface PageCardProps {
  page: Record<string, unknown>
  dateAdded: string
  onNavigate: () => void
}

const SECTION_LABELS: { key: string; label: string }[] = [
  { key: 'show_header', label: 'Header' },
  { key: 'show_practical_magic', label: 'PM' },
  { key: 'show_highlights', label: 'Highlights' },
  { key: 'show_360_video', label: '360' },
  { key: 'show_full_length', label: 'Full' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PageCard({ page, dateAdded, onNavigate }: PageCardProps) {
  const [hovered, setHovered] = useState(false)

  const title = (page.client_name as string) || 'Untitled Page'
  const slug = page.page_address as string | null
  const urlPath = slug ? `/ils-clients/${slug}` : ''

  const activeSections = SECTION_LABELS.filter(s => {
    const val = page[s.key]
    return val === 1 || val === true || val === '1'
  })

  return (
    <div
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 10,
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-secondary)',
        cursor: 'default',
        transition: 'background 150ms',
      }}
    >
      {/* Accent dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          flexShrink: 0,
        }}
      />

      {/* Center column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>

        {Boolean(urlPath) && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {urlPath}
          </div>
        )}

        {activeSections.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
            {activeSections.map(s => (
              <span
                key={s.key}
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: date + chevron */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
          {formatDate(dateAdded)}
        </span>
        <span style={{ fontSize: 16, color: 'var(--text-tertiary)', lineHeight: 1 }}>
          {'\u203A'}
        </span>
      </div>
    </div>
  )
}
