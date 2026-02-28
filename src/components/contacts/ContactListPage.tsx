import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

export default function ContactListPage() {
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.contacts.getAll()
      if (result.success && result.data) {
        setContacts(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: 'contact_name', label: 'Name', width: '20%' },
    { key: 'company', label: 'Company', width: '18%' },
    {
      key: 'categorization',
      label: 'Category',
      width: '12%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'email', label: 'Email', width: '20%' },
    { key: 'phone', label: 'Phone', width: '15%' },
    {
      key: 'tags',
      label: 'Tags',
      width: '15%',
      sortable: false,
      render: (v: unknown) => {
        if (!v) return <span className="text-[#48484A]">—</span>
        try {
          const tags = JSON.parse(v as string) as string[]
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-[#3A3A3C] rounded text-[10px] text-[#98989D]">
                  {t}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-[#636366]">+{tags.length - 3}</span>
              )}
            </div>
          )
        } catch {
          return <span className="text-[#48484A]">—</span>
        }
      },
    },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={contacts}
      onRowClick={(row) => navigate(`/contacts/${row.id}`)}
      searchKeys={['contact_name', 'company', 'email', 'categorization']}
      emptyMessage="No contacts yet. Sync from Airtable in Settings."
      actions={
        <button
          onClick={() => navigate('/contacts/new')}
          className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
        >
          + New Contact
        </button>
      }
    />
  )
}
