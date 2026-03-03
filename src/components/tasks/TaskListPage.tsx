import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import FilterTabs from '../shared/FilterTabs'
import useEntityList from '../../hooks/useEntityList'

const STATUS_TABS = ['All', 'To Do', 'In Progress', 'Waiting', 'Completed']

export default function TaskListPage() {
  const { data: tasks, loading, error } = useEntityList(() => window.electronAPI.tasks.getAll())
  const [activeTab, setActiveTab] = useState('All')
  const navigate = useNavigate()

  const filtered = activeTab === 'All'
    ? tasks
    : tasks.filter(t => t.status === activeTab)

  const columns = [
    { key: 'task', label: 'Task', width: '30%' },
    {
      key: 'status',
      label: 'Status',
      width: '14%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      width: '12%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'type', label: 'Type', width: '16%' },
    { key: 'due_date', label: 'Due Date', width: '14%' },
    { key: 'completed_date', label: 'Completed', width: '14%' },
  ]

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: tasks.length }
    STATUS_TABS.forEach(tab => {
      if (tab !== 'All') counts[tab] = tasks.filter(t => t.status === tab).length
    })
    return counts
  }, [tasks])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div className="flex flex-col h-full w-full">
      <FilterTabs
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
      />

      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/tasks/${row.id}/edit`)}
          searchKeys={['task', 'type']}
          emptyMessage={activeTab === 'All' ? 'No tasks yet.' : `No ${activeTab.toLowerCase()} tasks.`}
          actions={
            <PrimaryButton onClick={() => navigate('/tasks/new')}>
              + New Task
            </PrimaryButton>
          }
        />
      </div>
    </div>
  )
}
