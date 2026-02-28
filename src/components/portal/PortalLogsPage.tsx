import { useState, useEffect } from 'react'
import DataTable from '../shared/DataTable'

export default function PortalLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.portalLogs.getAll()
      if (result.success && result.data) {
        setLogs(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: 'timestamp', label: 'Time', width: '15%' },
    { key: 'client_name', label: 'Client', width: '15%' },
    { key: 'client_email', label: 'Email', width: '18%' },
    { key: 'company', label: 'Company', width: '12%' },
    { key: 'page_url', label: 'Page', width: '15%',
      render: (v: unknown) => v ? (
        <span className="text-[#0A84FF] truncate block">{v as string}</span>
      ) : <span className="text-[#48484A]">—</span>,
    },
    { key: 'city', label: 'City', width: '10%' },
    { key: 'country', label: 'Country', width: '8%' },
    { key: 'clarity_session', label: 'Clarity', width: '7%',
      render: (v: unknown) => v ? (
        <span className="text-[#0A84FF]" title={v as string}>View</span>
      ) : <span className="text-[#48484A]">—</span>,
    },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={logs}
      searchKeys={['client_name', 'client_email', 'company', 'page_url']}
      emptyMessage="No portal logs yet."
    />
  )
}
