import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../shared/EmptyState'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (!raw) return '—'
  const [y, m, d] = raw.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InteractionDetailProps {
  interactionId: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InteractionDetail({ interactionId }: InteractionDetailProps) {
  const navigate = useNavigate()
  const [interaction, setInteraction] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!interactionId) {
      setInteraction(null)
      return
    }
    setInteraction(null)
    window.electronAPI.interactions.getById(interactionId).then(res => {
      if (res.success && res.data) {
        setInteraction(res.data as Record<string, unknown>)
      }
    })
  }, [interactionId])

  // ── Empty / loading states ──────────────────────────────────────────────────

  if (!interactionId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <EmptyState
          title="Select an interaction"
          subtitle="Choose an interaction from the list to view details"
        />
      </div>
    )
  }

  if (!interaction) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">
        <div className="flex items-center justify-center h-full">
          <div className="text-[12px] text-[var(--text-tertiary)]">Loading…</div>
        </div>
      </div>
    )
  }

  // ── Field extraction ────────────────────────────────────────────────────────

  const type        = (interaction.type         as string | null) ?? null
  const date        = (interaction.date         as string | null) ?? null
  const subject     = (interaction.subject      as string | null) ?? null
  const summary     = (interaction.summary      as string | null) ?? null
  const next_steps  = (interaction.next_steps   as string | null) ?? null
  const duration    = (interaction.duration     as string | null) ?? null
  const contactName = (interaction.contact_name as string | null) ??
                      (interaction.contact      as string | null) ?? null

  const icon    = typeIcon(type)
  const dateStr = formatDate(date)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-window)] border-l border-[var(--separator)]">

      {/* Top bar */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-[var(--separator)] flex-shrink-0">
        <button
          onClick={() => navigate(`/interactions/${interactionId}/edit`)}
          className="px-2.5 py-1 text-[12px] font-medium text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:opacity-80 transition-opacity cursor-default"
        >
          Edit
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero: type icon + label + date */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--separator)]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[24px] leading-none">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold text-[var(--text-primary)] leading-tight">
                {type ?? 'Interaction'}
              </div>
              {Boolean(subject) && subject !== type && (
                <div className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">
                  {subject}
                </div>
              )}
            </div>
          </div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1">
            {dateStr}
          </div>
        </div>

        {/* Contact chip */}
        {Boolean(contactName) && (
          <div className="px-4 py-3 border-b border-[var(--separator)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-1.5">
              Contact
            </div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)] leading-none">
              <span className="text-[10px]">👤</span>
              {contactName}
            </span>
          </div>
        )}

        {/* Duration (if present) */}
        {Boolean(duration) && (
          <div className="px-4 py-3 border-b border-[var(--separator)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-1">
              Duration
            </div>
            <div className="text-[13px] text-[var(--text-primary)]">
              {duration}
            </div>
          </div>
        )}

        {/* Summary / Notes */}
        {Boolean(summary) && (
          <div className="px-4 py-3 border-b border-[var(--separator)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-1.5">
              Summary
            </div>
            <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          </div>
        )}

        {/* Next steps */}
        {Boolean(next_steps) && (
          <div className="px-4 py-3 border-b border-[var(--separator)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--text-secondary)] mb-1.5">
              Next Steps
            </div>
            <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {next_steps}
            </div>
          </div>
        )}

        {/* New Follow-up Task button */}
        <div className="px-4 py-4">
          <button
            onClick={() => navigate('/tasks/new')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/40 rounded-lg hover:bg-[var(--color-accent-translucent)] transition-colors duration-[150ms] cursor-default"
          >
            <span>+</span>
            New Follow-up Task
          </button>
        </div>

      </div>
    </div>
  )
}
