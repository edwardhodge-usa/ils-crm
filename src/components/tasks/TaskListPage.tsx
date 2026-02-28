import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

const STATUS_TABS = ['All', 'To Do', 'In Progress', 'Waiting', 'Completed']

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.tasks.getAll()
      if (result.success && result.data) {
        setTasks(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

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

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map(tab => {
          const count = tab === 'All'
            ? tasks.length
            : tasks.filter(t => t.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#0A84FF]/15 text-[#0A84FF]'
                  : 'text-[#98989D] hover:bg-[#3A3A3C]'
              }`}
            >
              {tab}
              <span className="ml-1 text-[10px] opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/tasks/${row.id}/edit`)}
          searchKeys={['task', 'type']}
          emptyMessage={activeTab === 'All' ? 'No tasks yet.' : `No ${activeTab.toLowerCase()} tasks.`}
          actions={
            <button
              onClick={() => navigate('/tasks/new')}
              className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
            >
              + New Task
            </button>
          }
        />
      </div>
    </div>
  )
}
