import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

export default function InteractionsPage() {
  const { data: interactions, loading, error } = useEntityList(() => window.electronAPI.interactions.getAll())
  const navigate = useNavigate()

  const columns = [
    { key: 'subject', label: 'Subject', width: '25%' },
    {
      key: 'type',
      label: 'Type',
      width: '18%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    {
      key: 'direction',
      label: 'Direction',
      width: '15%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    { key: 'date', label: 'Date', width: '12%' },
    { key: 'logged_by', label: 'Logged By', width: '12%' },
    {
      key: 'summary',
      label: 'Summary',
      width: '18%',
      sortable: false,
      render: (v: unknown) => {
        if (!v) return <span className="text-[var(--text-placeholder)]">—</span>
        const text = String(v)
        return <span className="truncate block max-w-[300px]">{text.length > 80 ? text.slice(0, 80) + '…' : text}</span>
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
      data={interactions}
      onRowClick={(row) => navigate(`/interactions/${row.id}/edit`)}
      searchKeys={['subject', 'summary', 'type', 'direction', 'next_steps', 'logged_by', 'contact_name']}
      emptyMessage="No interactions logged yet. Click + Log Interaction to record your first call, email, or meeting."
      actions={
        <PrimaryButton onClick={() => navigate('/interactions/new')}>
          + Log Interaction
        </PrimaryButton>
      }
    />
  )
}
