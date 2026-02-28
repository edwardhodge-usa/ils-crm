import { useNavigate } from 'react-router-dom'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'

export default function CompanyListPage() {
  const { data: companies, loading, error } = useEntityList(() => window.electronAPI.companies.getAll())
  const navigate = useNavigate()

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

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[#FF453A] text-[13px]">{error}</div>
  }

  return (
    <DataTable
      columns={columns}
      data={companies}
      onRowClick={(row) => navigate(`/companies/${row.id}`)}
      searchKeys={['company_name', 'industry', 'type']}
      emptyMessage="No companies yet. Sync from Airtable in Settings."
      actions={
        <PrimaryButton onClick={() => navigate('/companies/new')}>
          + New Company
        </PrimaryButton>
      }
    />
  )
}
