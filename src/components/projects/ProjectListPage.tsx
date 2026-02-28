import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

export default function ProjectListPage() {
  const [projects, setProjects] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.projects.getAll()
      if (result.success && result.data) {
        setProjects(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { key: 'project_name', label: 'Project', width: '25%' },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'engagement_type', label: 'Engagement', width: '20%' },
    {
      key: 'project_value',
      label: 'Value',
      width: '15%',
      render: (v: unknown) => v ? <span className="text-[#34C759]">${Number(v).toLocaleString()}</span> : <span className="text-[#48484A]">—</span>,
    },
    { key: 'start_date', label: 'Start', width: '12%' },
    { key: 'location', label: 'Location', width: '13%' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={projects}
      onRowClick={(row) => navigate(`/projects/${row.id}/edit`)}
      searchKeys={['project_name', 'status', 'location']}
      emptyMessage="No projects yet."
      actions={
        <button
          onClick={() => navigate('/projects/new')}
          className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
        >
          + New Project
        </button>
      }
    />
  )
}
