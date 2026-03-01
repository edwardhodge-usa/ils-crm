import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

export default function ProposalListPage() {
  const { data: proposals, loading, error } = useEntityList(() => window.electronAPI.proposals.getAll())
  const navigate = useNavigate()

  const columns = [
    { key: 'proposal_name', label: 'Proposal', width: '30%' },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    {
      key: 'proposed_value',
      label: 'Value',
      width: '15%',
      render: (v: unknown) => v ? <span className="text-[var(--color-green)]">${Number(v).toLocaleString()}</span> : <span className="text-[var(--text-placeholder)]">—</span>,
    },
    { key: 'date_sent', label: 'Date Sent', width: '15%' },
    { key: 'valid_until', label: 'Valid Until', width: '15%' },
    {
      key: 'approval_status',
      label: 'Approval',
      width: '10%',
      render: (v: unknown) => v ? <StatusBadge value={v as string} /> : <span className="text-[var(--text-placeholder)]">—</span>,
    },
  ]

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <DataTable
      columns={columns}
      data={proposals}
      onRowClick={(row) => navigate(`/proposals/${row.id}/edit`)}
      searchKeys={['proposal_name', 'status']}
      emptyMessage="No proposals yet."
      actions={
        <PrimaryButton onClick={() => navigate('/proposals/new')}>
          + New Proposal
        </PrimaryButton>
      }
    />
  )
}
