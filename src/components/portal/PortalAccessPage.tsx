import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import LoadingSpinner from '../shared/LoadingSpinner'
import useEntityList from '../../hooks/useEntityList'

export default function PortalAccessPage() {
  const { data: records, loading, error } = useEntityList(() => window.electronAPI.portalAccess.getAll())

  const columns = [
    {
      key: 'name',
      label: 'Name',
      width: '18%',
      render: (v: unknown, row: Record<string, unknown>) =>
        (v as string) || (row.contact_name_lookup as string) || <span className="text-[#48484A]">—</span>,
    },
    {
      key: 'email',
      label: 'Email',
      width: '18%',
      render: (v: unknown, row: Record<string, unknown>) =>
        (v as string) || (row.contact_email_lookup as string) || <span className="text-[#48484A]">—</span>,
    },
    {
      key: 'company',
      label: 'Company',
      width: '15%',
      render: (v: unknown, row: Record<string, unknown>) =>
        (v as string) || (row.contact_company_lookup as string) || <span className="text-[#48484A]">—</span>,
    },
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

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[#FF453A] text-[13px]">{error}</div>
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
