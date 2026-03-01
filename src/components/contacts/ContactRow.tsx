import { RatingDots } from '@/components/shared'
import type { ContactListItem } from '@/types'

interface ContactRowProps {
  contact: ContactListItem
  isSelected: boolean
  onClick: () => void
}

export function ContactRow({ contact, isSelected, onClick }: ContactRowProps) {
  const {
    firstName, lastName, jobTitle, companyName,
    qualityRating, specialtyNames, daysSinceContact,
  } = contact

  return (
    <div
      onClick={onClick}
      className={`contact-row px-3 py-2.5 cursor-default border-b border-[var(--separator)] transition-colors duration-[150ms] ${
        isSelected
          ? 'contact-row--selected bg-[var(--color-accent-translucent)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {/* Line 1: rating dots + name */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <RatingDots value={qualityRating} size={5} />
        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
          {firstName} {lastName}
        </span>
      </div>

      {/* Line 2: title · company */}
      <div className="text-[11px] text-[var(--text-secondary)] truncate mb-1 leading-tight">
        {jobTitle && companyName
          ? `${jobTitle} · ${companyName}`
          : jobTitle || companyName || ''}
      </div>

      {/* Line 3: specialty tag + days badge */}
      <div className="flex items-center gap-1.5 min-h-[16px]">
        {specialtyNames[0] && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-translucent)] text-[var(--color-accent)] leading-none">
            {specialtyNames[0]}
          </span>
        )}
        {daysSinceContact !== null && daysSinceContact !== undefined && (
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] leading-none tabular-nums">
            {daysSinceContact}d
          </span>
        )}
      </div>
    </div>
  )
}
