import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

const SPECIALTY_COLORS = [
  'bg-[#0A84FF]/20 text-[#0A84FF]',
  'bg-[#34C759]/20 text-[#34C759]',
  'bg-[#BF5AF2]/20 text-[#BF5AF2]',
  'bg-[#FF9F0A]/20 text-[#FF9F0A]',
  'bg-[#5AC8FA]/20 text-[#5AC8FA]',
  'bg-[#FF453A]/20 text-[#FF453A]',
  'bg-[#FF2D55]/20 text-[#FF2D55]',
  'bg-[#FFD60A]/20 text-[#FFD60A]',
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
        if (!v) return <span className="text-[#48484A]">—</span>
        try {
          const ids = JSON.parse(v as string) as string[]
          const names = ids.map(id => specialtyMap[id]).filter(Boolean)
          if (names.length === 0) return <span className="text-[#48484A]">—</span>
          return (
            <div className="flex flex-wrap gap-1">
              {names.slice(0, 2).map(name => (
                <span key={name} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${specialtyColor(name)}`}>
                  {name}
                </span>
              ))}
              {names.length > 2 && (
                <span className="text-[10px] text-[#636366]">+{names.length - 2}</span>
              )}
            </div>
          )
        } catch {
          return <span className="text-[#48484A]">—</span>
        }
      },
    },
    {
      key: 'tags',
      label: 'Tags',
      width: '13%',
      sortable: false,
      render: (v: unknown) => {
        if (!v) return <span className="text-[#48484A]">—</span>
        try {
          const tags = JSON.parse(v as string) as string[]
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-[#3A3A3C] rounded text-[10px] text-[#98989D]">
                  {t}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-[#636366]">+{tags.length - 2}</span>
              )}
            </div>
          )
        } catch {
          return <span className="text-[#48484A]">—</span>
        }
      },
    },
  ]

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[#FF453A] text-[13px]">{error}</div>
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
