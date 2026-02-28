import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.companies.getAll()
      if (result.success && result.data) {
        setCompanies(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: 'company_name', label: 'Company', width: '25%' },
    {
      key: 'type',
      label: 'Type',
      width: '15%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'industry', label: 'Industry', width: '18%' },
    { key: 'website', label: 'Website', width: '22%',
      render: (v: unknown) => v ? (
        <span className="text-[#0A84FF] truncate block">{v as string}</span>
      ) : <span className="text-[#48484A]">—</span>,
    },
    { key: 'lead_source', label: 'Lead Source', width: '20%' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={companies}
      onRowClick={(row) => navigate(`/companies/${row.id}`)}
      searchKeys={['company_name', 'industry', 'type']}
      emptyMessage="No companies yet. Sync from Airtable in Settings."
      actions={
        <button
          onClick={() => navigate('/companies/new')}
          className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
        >
          + New Company
        </button>
      }
    />
  )
}
