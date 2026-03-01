import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

export default function ProjectListPage() {
  const { data: projects, loading, error } = useEntityList(() => window.electronAPI.projects.getAll())
  const navigate = useNavigate()

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
      render: (v: unknown) => v ? <span className="text-[var(--color-green)]">${Number(v).toLocaleString()}</span> : <span className="text-[var(--text-placeholder)]">—</span>,
    },
    { key: 'start_date', label: 'Start', width: '12%' },
    { key: 'location', label: 'Location', width: '13%' },
  ]

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)] text-[13px]">{error}</div>
  }

  return (
    <DataTable
      columns={columns}
      data={projects}
      onRowClick={(row) => navigate(`/projects/${row.id}/edit`)}
      searchKeys={['project_name', 'status', 'location']}
      emptyMessage="No projects yet."
      actions={
        <PrimaryButton onClick={() => navigate('/projects/new')}>
          + New Project
        </PrimaryButton>
      }
    />
  )
}
