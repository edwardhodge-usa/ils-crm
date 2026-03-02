// ─── Interaction type icon mapping ────────────────────────────────────────────

function typeIcon(type: string | null): string {
  if (!type) return '📝'
  const t = type.toLowerCase()
  if (t.includes('phone') || t.includes('call')) return '📞'
  if (t.includes('meeting') || t.includes('lunch') || t.includes('dinner') || t.includes('conference')) return '👥'
  if (t.includes('email')) return '✉️'
  if (t.includes('virtual')) return '💻'
  if (t.includes('note')) return '📝'
  return '💬'
}

function formatDate(raw: string | null): string {
  if (!raw) return ''
  const [y, m, d] = raw.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InteractionRowProps {
  interaction: {
    id: string
    type: string | null
    date: string | null
    subject: string | null
    summary: string | null
    contact_name: string | null
  }
  isSelected: boolean
  onClick: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InteractionRow({ interaction, isSelected, onClick }: InteractionRowProps) {
  const { type, date, subject, summary, contact_name } = interaction
  const icon = typeIcon(type)
  const displayName = contact_name || subject || '—'
  const preview = summary?.trim() ?? null

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: icon + contact/subject name */}
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] leading-none flex-shrink-0">{icon}</span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
          {displayName}
        </span>
      </div>

      {/* Line 2: date + note preview */}
      <div className="mt-0.5 flex items-start gap-1.5 min-h-[16px]">
        {Boolean(date) && (
          <span className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0 leading-tight">
            {formatDate(date)}
          </span>
        )}
        {Boolean(preview) && (
          <span
            className="text-[12px] text-[var(--text-secondary)] leading-tight overflow-hidden"
            style={{ maxHeight: '45px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {preview}
          </span>
        )}
      </div>
    </div>
  )
}
