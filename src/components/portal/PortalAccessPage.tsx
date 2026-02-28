import { useState, useEffect } from 'react'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

export default function PortalAccessPage() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.portalAccess.getAll()
      if (result.success && result.data) {
        setRecords(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: 'name', label: 'Name', width: '18%' },
    { key: 'email', label: 'Email', width: '18%' },
    { key: 'company', label: 'Company', width: '15%' },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    {
      key: 'stage',
      label: 'Stage',
      width: '12%',
      render: (v: unknown) => v ? <StatusBadge value={v as string} /> : <span className="text-[#48484A]">—</span>,
    },
    { key: 'lead_source', label: 'Source', width: '12%' },
    { key: 'date_added', label: 'Added', width: '10%' },
    {
      key: 'page_address',
      label: 'Portal Page',
      width: '5%',
      render: (v: unknown) => v ? (
        <span className="text-[#0A84FF]" title={v as string}>Link</span>
      ) : <span className="text-[#48484A]">—</span>,
    },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={records}
      searchKeys={['name', 'email', 'company']}
      emptyMessage="No portal access records."
    />
  )
}
