import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

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

export default function ContactListPage() {
  const { data: contacts, loading, error } = useEntityList(() => window.electronAPI.contacts.getAll())
  const navigate = useNavigate()
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, string>>({})

  useEffect(() => {
    window.electronAPI.specialties.getAll().then(res => {
      if (res.success && res.data) {
        const map: Record<string, string> = {}
        for (const s of res.data as Record<string, unknown>[]) {
          map[s.id as string] = s.specialty as string
        }
        setSpecialtyMap(map)
      }
    }).catch(() => { /* specialtyMap stays empty — specialty cells show "—" */ })
  }, [])

  const columns = [
    { key: 'contact_name', label: 'Name', width: '17%' },
    { key: 'company', label: 'Company', width: '14%' },
    {
      key: 'categorization',
      label: 'Category',
      width: '10%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'email', label: 'Email', width: '18%' },
    { key: 'phone', label: 'Phone', width: '12%' },
    {
      key: 'specialties_ids',
      label: 'Specialties',
      width: '16%',
      sortable: false,
      render: (v: unknown) => {
        if (!v) return <span className="text-[var(--text-placeholder)]">—</span>
        try {
          const ids = JSON.parse(v as string) as string[]
          const names = ids.map(id => specialtyMap[id]).filter(Boolean)
          if (names.length === 0) return <span className="text-[var(--text-placeholder)]">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {names.slice(0, 2).map(name => (
                <span key={name} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${specialtyColor(name)}`}>
                  {name}
                </span>
              ))}
              {names.length > 2 && (
                <span className="text-[10px] text-[var(--text-tertiary)]">+{names.length - 2}</span>
              )}
            </div>
          )
        } catch {
          return <span className="text-[var(--text-placeholder)]">—</span>
        }
      },
    },
    {
      key: 'tags',
      label: 'Tags',
      width: '13%',
      sortable: false,
      render: (v: unknown) => {
        if (!v) return <span className="text-[var(--text-placeholder)]">—</span>
        try {
          const tags = JSON.parse(v as string) as string[]
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-[var(--separator-opaque)] rounded text-[10px] text-[var(--text-secondary)]">
                  {t}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-[var(--text-tertiary)]">+{tags.length - 2}</span>
              )}
            </div>
          )
        } catch {
          return <span className="text-[var(--text-placeholder)]">—</span>
        }
      },
    },
  ]

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <DataTable
      columns={columns}
      data={contacts}
      onRowClick={(row) => navigate(`/contacts/${row.id}`)}
      searchKeys={['contact_name', 'company', 'email', 'categorization']}
      emptyMessage="No contacts yet. Sync from Airtable in Settings."
      actions={
        <PrimaryButton onClick={() => navigate('/contacts/new')}>
          + New Contact
        </PrimaryButton>
      }
    />
  )
}
