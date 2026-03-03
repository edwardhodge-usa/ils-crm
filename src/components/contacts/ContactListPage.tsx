import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import useEntityList from '../../hooks/useEntityList'
import { ContactRow } from './ContactRow'
import Contact360Page from './Contact360Page'
import type { ContactListItem } from '@/types'

const SPECIALTY_COLORS_RAW = [
  { bg: 'rgba(88,86,214,0.10)', fg: '#5856D6' },
  { bg: 'rgba(52,199,89,0.10)', fg: '#34C759' },
  { bg: 'rgba(175,82,222,0.10)', fg: '#AF52DE' },
  { bg: 'rgba(255,149,0,0.10)', fg: '#FF9500' },
  { bg: 'rgba(90,200,250,0.10)', fg: '#5AC8FA' },
  { bg: 'rgba(255,59,48,0.10)', fg: '#FF3B30' },
  { bg: 'rgba(255,45,85,0.10)', fg: '#FF2D55' },
  { bg: 'rgba(255,204,0,0.10)', fg: '#FFCC00' },
]

function specialtyColor(name: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xfffff
  return SPECIALTY_COLORS_RAW[hash % SPECIALTY_COLORS_RAW.length]
}

function parseQualityRating(raw: string | null | undefined): number {
  if (!raw) return 0
  const n = parseInt(raw as string, 10)
  return isNaN(n) ? 0 : Math.min(5, Math.max(0, n))
}

export default function ContactListPage() {
  const { data: contacts, loading, error } = useEntityList(() => window.electronAPI.contacts.getAll())
  const navigate = useNavigate()
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.electronAPI.specialties.getAll().then(res => {
      if (res.success && res.data) {
        const map: Record<string, string> = {}
        for (const s of res.data as Record<string, unknown>[]) {
          map[s.id as string] = s.specialty as string
        }
        setSpecialtyMap(map)
      }
    }).catch(() => {})
  }, [])

  function toListItem(row: Record<string, unknown>): ContactListItem {
    const specialtyIds: string[] = (() => {
      try {
        const raw = row.specialties_ids as string | null
        return raw ? (JSON.parse(raw) as string[]) : []
      } catch {
        return []
      }
    })()

    const specialtyNames = specialtyIds.map(id => specialtyMap[id]).filter(Boolean)
    const specialtyColors = specialtyNames.map(name => {
      const c = specialtyColor(name)
      return `${c.bg}|${c.fg}`
    })

    const daysSinceContact: number | null = (() => {
      const raw = row.days_since_contact ?? row.days_since_last_contact
      if (raw === null || raw === undefined || raw === '') return null
      const n = Number(raw)
      return isNaN(n) ? null : n
    })()

    return {
      id: row.id as string,
      firstName: (row.first_name as string | null) ?? '',
      lastName: (row.last_name as string | null) ?? '',
      jobTitle: (row.job_title as string | null) ?? null,
      companyName: (row.company as string | null) ?? null,
      qualityRating: parseQualityRating(row.quality_rating as string | null),
      specialtyNames,
      specialtyColors,
      daysSinceContact,
    }
  }

  const filteredContacts: ContactListItem[] = (contacts as Record<string, unknown>[])
    .map(toListItem)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.companyName ?? '').toLowerCase().includes(q) ||
        (c.jobTitle ?? '').toLowerCase().includes(q)
      )
    })

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full w-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* List pane — 300px */}
      <div className="w-[300px] flex-shrink-0 flex flex-col h-full border-r border-[var(--separator)]">

        {/* Header: title + add button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px 10px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Contacts
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {filteredContacts.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/contacts/new')}
            style={{
              fontSize: 18, fontWeight: 400, lineHeight: 1,
              width: 26, height: 26, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'default',
              color: 'var(--color-accent)', fontFamily: 'inherit',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            +
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            style={{
              width: '100%', fontSize: 12, padding: '6px 12px',
              borderRadius: 9999, border: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No contacts match your search.' : 'No contacts yet. Sync from Airtable in Settings.'}
            </div>
          ) : (
            filteredContacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isSelected={selectedId === contact.id}
                onClick={() => setSelectedId(contact.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel — flex-1 (embedded Contact360) */}
      <Contact360Page
        contactId={selectedId}
        onDeleted={() => setSelectedId(null)}
      />
    </div>
  )
}
