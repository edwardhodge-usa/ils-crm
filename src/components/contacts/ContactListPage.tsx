import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import { GroupedSectionHeader } from '../shared/GroupedSectionHeader'
import useEntityList from '../../hooks/useEntityList'
import { ContactRow } from './ContactRow'
import Contact360Page from './Contact360Page'
import type { ContactListItem } from '@/types'

const SPECIALTY_COLORS_RAW = [
  { bg: 'rgba(88,86,214,0.22)', fg: '#3634A3', fgDark: '#5E5CE6' },     // systemIndigo
  { bg: 'rgba(52,199,89,0.22)', fg: '#248A3D', fgDark: '#30D158' },      // systemGreen
  { bg: 'rgba(175,82,222,0.22)', fg: '#8944AB', fgDark: '#BF5AF2' },     // systemPurple
  { bg: 'rgba(255,149,0,0.22)', fg: '#C93400', fgDark: '#FF9F0A' },      // systemOrange
  { bg: 'rgba(48,176,199,0.22)', fg: '#0E7A8D', fgDark: '#40CBE0' },     // systemTeal
  { bg: 'rgba(255,59,48,0.22)', fg: '#D70015', fgDark: '#FF453A' },      // systemRed
  { bg: 'rgba(255,45,85,0.22)', fg: '#D30047', fgDark: '#FF375F' },      // systemPink
  { bg: 'rgba(0,122,255,0.22)', fg: '#0055B3', fgDark: '#409CFF' },      // systemBlue
]

function specialtyColor(name: string): { bg: string; fg: string; fgDark: string } {
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
  const { data: companiesData } = useEntityList(() => window.electronAPI.companies.getAll())
  const navigate = useNavigate()
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'newest'>(() => (localStorage.getItem('sort-contacts') as 'name' | 'company' | 'newest') || 'name')

  const companyLogoMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companiesData) {
      if (c.logo_url) {
        map.set(c.id as string, c.logo_url as string)
      }
    }
    return map
  }, [companiesData])

  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companiesData) {
      if (c.company_name) {
        map.set(c.id as string, c.company_name as string)
      }
    }
    return map
  }, [companiesData])

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

  function getCompanyLogo(contact: Record<string, unknown>, logoMap: Map<string, string>): string | null {
    const companiesIds = contact.companies_ids
    if (!companiesIds) return null
    try {
      const ids = typeof companiesIds === 'string' ? JSON.parse(companiesIds) : companiesIds
      if (Array.isArray(ids) && ids.length > 0) {
        return logoMap.get(ids[0]) || null
      }
    } catch { /* ignore parse errors */ }
    return null
  }

  function getCompanyName(contact: Record<string, unknown>, nameMap: Map<string, string>): string | null {
    const companiesIds = contact.companies_ids
    if (!companiesIds) return null
    try {
      const ids = typeof companiesIds === 'string' ? JSON.parse(companiesIds) : companiesIds
      if (Array.isArray(ids) && ids.length > 0) {
        return nameMap.get(ids[0]) || null
      }
    } catch { /* ignore parse errors */ }
    return null
  }

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
      return `${c.bg}|${c.fg}|${c.fgDark}`
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
      companyName: getCompanyName(row, companyNameMap),
      companyLogoUrl: getCompanyLogo(row, companyLogoMap),
      photoUrl: (row.contact_photo_url as string | null) ?? null,
      qualityRating: parseQualityRating(row.quality_rating as string | null),
      specialtyNames,
      specialtyColors,
      daysSinceContact,
      modifiedAt: (row._airtable_modified_at as string) || null,
    }
  }

  const filteredContacts: ContactListItem[] = useMemo(() => {
    const rawRows = contacts as Record<string, unknown>[]
    let items = rawRows.map(toListItem)
    if (search.trim()) {
      const q = search.toLowerCase()
      // Build a raw-row lookup by id for searching fields not in the list item
      const rawById = new Map<string, Record<string, unknown>>()
      for (const r of rawRows) rawById.set(r.id as string, r)
      items = items.filter(c => {
        const raw = rawById.get(c.id)
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          (c.companyName ?? '').toLowerCase().includes(q) ||
          (c.jobTitle ?? '').toLowerCase().includes(q) ||
          (String(raw?.email ?? '')).toLowerCase().includes(q) ||
          (String(raw?.work_email ?? '')).toLowerCase().includes(q) ||
          (String(raw?.phone ?? '')).toLowerCase().includes(q) ||
          (String(raw?.mobile_phone ?? '')).toLowerCase().includes(q) ||
          (String(raw?.notes ?? '')).toLowerCase().includes(q) ||
          (String(raw?.tags ?? '')).toLowerCase().includes(q) ||
          (String(raw?.industry ?? '')).toLowerCase().includes(q) ||
          (String(raw?.linkedin_url ?? '')).toLowerCase().includes(q) ||
          (String(raw?.city ?? '')).toLowerCase().includes(q) ||
          (String(raw?.state ?? '')).toLowerCase().includes(q) ||
          (String(raw?.lead_source ?? '')).toLowerCase().includes(q) ||
          (String(raw?.categorization ?? '')).toLowerCase().includes(q) ||
          c.specialtyNames.some(s => s.toLowerCase().includes(q))
        )
      })
    }
    const sorted = [...items]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`))
        break
      case 'company':
        sorted.sort((a, b) => (a.companyName ?? '').localeCompare(b.companyName ?? ''))
        break
      case 'newest':
        sorted.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
        break
    }
    return sorted
  }, [contacts, specialtyMap, companyLogoMap, companyNameMap, search, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

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
          <PrimaryButton onClick={() => navigate('/contacts/new')}>
            + New Contact
          </PrimaryButton>
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

        {/* Sort bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </span>
          <select
            value={sortBy}
            onChange={e => { const v = e.target.value as typeof sortBy; setSortBy(v); localStorage.setItem('sort-contacts', v) }}
            style={{
              fontSize: 11, fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none', outline: 'none',
              cursor: 'default',
              textAlign: 'right',
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="company">Company</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[13px] text-[var(--text-secondary)] px-4 text-center">
              {search ? 'No contacts match your search.' : 'No contacts yet. Sync from Airtable in Settings.'}
            </div>
          ) : sortBy === 'company' ? (() => {
            const groups = new Map<string, ContactListItem[]>()
            for (const item of filteredContacts) {
              const key = item.companyName || 'No Company'
              if (!groups.has(key)) groups.set(key, [])
              groups.get(key)!.push(item)
            }
            return Array.from(groups.entries()).map(([label, items]) => (
              <div key={label}>
                <GroupedSectionHeader label={label} count={items.length} />
                {items.map(contact => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    isSelected={selectedId === contact.id}
                    onClick={() => setSelectedId(contact.id)}
                  />
                ))}
              </div>
            ))
          })() : (
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
