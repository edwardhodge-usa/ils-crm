import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { ContactRow } from './ContactRow'
import type { ContactListItem } from '@/types'

const SPECIALTY_COLORS = [
  'bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
  'bg-[var(--color-green)]/20 text-[var(--color-green)]',
  'bg-[var(--color-purple)]/20 text-[var(--color-purple)]',
  'bg-[var(--color-orange)]/20 text-[var(--color-orange)]',
  'bg-[var(--color-teal)]/20 text-[var(--color-teal)]',
  'bg-[var(--color-red)]/20 text-[var(--color-red)]',
  'bg-[var(--color-pink)]/20 text-[var(--color-pink)]',
  'bg-[var(--color-yellow)]/20 text-[var(--color-yellow)]',
]

function specialtyColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xfffff
  return SPECIALTY_COLORS[hash % SPECIALTY_COLORS.length]
}

function parseQualityRating(raw: string | null | undefined): number {
  if (!raw) return 0
  // Airtable rating fields come back as numeric strings like "3" or numbers
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
    }).catch(() => { /* specialtyMap stays empty — specialty cells show no tags */ })
  }, [])

  // Map raw DB rows to ContactListItem
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
    const specialtyColors = specialtyNames.map(name => specialtyColor(name))

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
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--separator)] flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="flex-1 text-[12px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--separator)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <PrimaryButton onClick={() => navigate('/contacts/new')}>
          + New
        </PrimaryButton>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-secondary)]">
            {search ? 'No contacts match your search.' : 'No contacts yet. Sync from Airtable in Settings.'}
          </div>
        ) : (
          filteredContacts.map(contact => (
            <ContactRow
              key={contact.id}
              contact={contact}
              isSelected={selectedId === contact.id}
              onClick={() => {
                setSelectedId(contact.id)
                navigate(`/contacts/${contact.id}`)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
