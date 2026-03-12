import { useMemo } from 'react'
import {
  groupByPerson,
  resolvedPortalName,
  resolvedPortalCompany,
} from '../../utils/portal-helpers'

// ─── Types ──────────────────────────────────────────────────────────────────────

type GroupBy = 'company' | 'stage' | 'none'

interface PersonListProps {
  accessRecords: Record<string, unknown>[]
  selectedEmail: string | null
  onSelect: (email: string) => void
  search: string
  onSearchChange: (s: string) => void
  groupBy: GroupBy
  onGroupByChange: (g: GroupBy) => void
  view: 'byPage' | 'byPerson'
  onViewChange: (v: 'byPage' | 'byPerson') => void
  onGrantAccess?: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0A84FF', '#30D158', '#FF9F0A', '#BF5AF2',
  '#FF375F', '#40CBE0', '#5E5CE6', '#FF453A',
]

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface PersonEntry {
  email: string
  name: string
  company: string | null
  stage: string | null
  pageCount: number
  records: Record<string, unknown>[]
}

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'stage', label: 'Stage' },
  { value: 'none', label: 'None' },
]

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PersonList({
  accessRecords,
  selectedEmail,
  onSelect,
  search,
  onSearchChange,
  groupBy,
  onGroupByChange,
  view,
  onViewChange,
  onGrantAccess,
}: PersonListProps) {
  // Build unique person entries from grouped access records
  const people = useMemo<PersonEntry[]>(() => {
    const grouped = groupByPerson(accessRecords)
    const entries: PersonEntry[] = []
    for (const [email, records] of grouped) {
      const name = resolvedPortalName(records[0])
      const company = resolvedPortalCompany(records[0])
      const stage = (records[0].stage as string | null) || null
      entries.push({ email, name, company, stage, pageCount: records.length, records })
    }
    return entries
  }, [accessRecords])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return people
    const q = search.trim().toLowerCase()
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.company && p.company.toLowerCase().includes(q)),
    )
  }, [people, search])

  // Group the filtered list
  const grouped = useMemo<Map<string, PersonEntry[]>>(() => {
    if (groupBy === 'none') {
      const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      const map = new Map<string, PersonEntry[]>()
      map.set('__flat__', sorted)
      return map
    }

    const map = new Map<string, PersonEntry[]>()
    for (const p of filtered) {
      const key =
        groupBy === 'company'
          ? p.company || 'No Company'
          : p.stage || 'No Stage'
      const existing = map.get(key)
      if (existing) {
        existing.push(p)
      } else {
        map.set(key, [p])
      }
    }

    // Sort groups alphabetically, but push "No ..." to end
    const sorted = new Map<string, PersonEntry[]>(
      [...map.entries()].sort(([a], [b]) => {
        const aIsNo = a.startsWith('No ')
        const bIsNo = b.startsWith('No ')
        if (aIsNo && !bIsNo) return 1
        if (!aIsNo && bIsNo) return -1
        return a.localeCompare(b)
      }),
    )

    // Sort people within each group by name
    for (const [, entries] of sorted) {
      entries.sort((a, b) => a.name.localeCompare(b.name))
    }

    return sorted
  }, [filtered, groupBy])

  return (
    <div
      style={{
        width: 260,
        minWidth: 260,
        borderRight: '1px solid var(--separator)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-sidebar)',
      }}
    >
      {/* View toggle — By Page / By Person */}
      <div
        style={{
          display: 'flex',
          margin: '12px 12px 8px',
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          padding: 2,
        }}
      >
        <button
          onClick={() => onViewChange('byPage')}
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 12,
            fontWeight: view === 'byPage' ? 600 : 500,
            border: 'none',
            borderRadius: 6,
            cursor: 'default',
            transition: 'all 0.15s',
            color: view === 'byPage' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            background: view === 'byPage' ? 'var(--color-accent)' : 'transparent',
          }}
        >
          By Page
        </button>
        <button
          onClick={() => onViewChange('byPerson')}
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 12,
            fontWeight: view === 'byPerson' ? 600 : 500,
            border: 'none',
            borderRadius: 6,
            cursor: 'default',
            transition: 'all 0.15s',
            color: view === 'byPerson' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
            background: view === 'byPerson' ? 'var(--color-accent)' : 'transparent',
          }}
        >
          By Person
        </button>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search people..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          margin: '4px 12px 8px',
          padding: '6px 10px',
          background: 'var(--bg-input)',
          border: '1px solid var(--separator)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 12,
          outline: 'none',
        }}
      />

      {/* Group-by bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          margin: '0 12px 8px',
          fontSize: 11,
          color: 'var(--text-tertiary)',
        }}
      >
        <span style={{ marginRight: 2 }}>Group:</span>
        {GROUP_BY_OPTIONS.map((opt) => (
          <span
            key={opt.value}
            onClick={() => onGroupByChange(opt.value)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'default',
              fontWeight: groupBy === opt.value ? 500 : 400,
              background: groupBy === opt.value ? 'var(--bg-tertiary)' : 'transparent',
              color: groupBy === opt.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            {opt.label}
          </span>
        ))}
      </div>

      {/* Person list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 8px',
        }}
      >
        {[...grouped.entries()].map(([groupKey, entries], groupIdx) => (
          <div key={groupKey}>
            {/* Group header — only when not flat list */}
            {groupKey !== '__flat__' && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 0.5,
                  color: 'var(--text-tertiary)',
                  padding: '12px 10px 6px',
                  borderTop: groupIdx > 0 ? '1px solid var(--separator)' : 'none',
                }}
              >
                {groupKey}
              </div>
            )}

            {entries.map((person) => {
              const isSelected = person.email === selectedEmail
              const color = hashColor(person.name)

              return (
                <div
                  key={person.email}
                  onClick={() => onSelect(person.email)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'default',
                    marginBottom: 1,
                    gap: 10,
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                      background: isSelected
                        ? 'rgba(255,255,255,0.2)'
                        : `${color}22`,
                      color: isSelected ? 'var(--text-on-accent)' : color,
                    }}
                  >
                    {initials(person.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: 'nowrap' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isSelected ? 'var(--text-on-accent)' : 'var(--text-primary)',
                      }}
                    >
                      {person.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        whiteSpace: 'nowrap' as const,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isSelected
                          ? 'rgba(255,255,255,0.7)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      {person.email}
                    </div>
                  </div>

                  {/* Page count badge */}
                  <div
                    style={{
                      fontSize: 10,
                      padding: '2px 7px',
                      borderRadius: 4,
                      flexShrink: 0,
                      fontWeight: 500,
                      background: isSelected
                        ? 'rgba(255,255,255,0.2)'
                        : 'var(--bg-tertiary)',
                      color: isSelected
                        ? 'var(--text-on-accent)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {person.pageCount}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {filtered.length === 0 && (
          <div
            style={{
              padding: '20px 10px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-tertiary)',
            }}
          >
            No people found
          </div>
        )}
      </div>

      {/* + Grant Access button */}
      <button
        onClick={onGrantAccess}
        style={{
          margin: '8px 12px 12px',
          padding: '7px 0',
          background: 'var(--color-accent-translucent)',
          color: 'var(--color-accent-text)',
          border: 'none',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'default',
          textAlign: 'center',
        }}
      >
        + Grant Access
      </button>
    </div>
  )
}
