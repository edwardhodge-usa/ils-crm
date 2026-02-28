import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'

export default function ProposalListPage() {
  const [proposals, setProposals] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.proposals.getAll()
      if (result.success && result.data) {
        setProposals(result.data as Record<string, unknown>[])
      }
      setLoading(false)
    }
    load()
  }, [])

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
      render: (v: unknown) => v ? <span className="text-[#34C759]">${Number(v).toLocaleString()}</span> : <span className="text-[#48484A]">—</span>,
    },
    { key: 'date_sent', label: 'Date Sent', width: '15%' },
    { key: 'valid_until', label: 'Valid Until', width: '15%' },
    {
      key: 'approval_status',
      label: 'Approval',
      width: '10%',
      render: (v: unknown) => v ? <StatusBadge value={v as string} /> : <span className="text-[#48484A]">—</span>,
    },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  return (
    <DataTable
      columns={columns}
      data={proposals}
      onRowClick={(row) => navigate(`/proposals/${row.id}/edit`)}
      searchKeys={['proposal_name', 'status']}
      emptyMessage="No proposals yet."
      actions={
        <button
          onClick={() => navigate('/proposals/new')}
          className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
        >
          + New Proposal
        </button>
      }
    />
  )
}
