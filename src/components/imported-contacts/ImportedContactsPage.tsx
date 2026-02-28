import { useState, useMemo } from 'react'
import DataTable from '../shared/DataTable'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import LoadingSpinner from '../shared/LoadingSpinner'
import FilterTabs from '../shared/FilterTabs'
import useEntityList from '../../hooks/useEntityList'

const STATUS_TABS = ['All', 'Review', 'Approved', 'Rejected', 'Needs Info', 'Duplicate']

export default function ImportedContactsPage() {
  const { data: contacts, loading, error, reload } = useEntityList(() => window.electronAPI.importedContacts.getAll())
  const [activeTab, setActiveTab] = useState('All')
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const filtered = activeTab === 'All'
    ? contacts
    : contacts.filter(c => c.onboarding_status === activeTab)

  const columns = [
    { key: 'contact_name', label: 'Name', width: '22%' },
    {
      key: 'onboarding_status',
      label: 'Status',
      width: '13%',
      render: (v: unknown) => <StatusBadge value={v as string} />,
    },
    {
      key: 'categorization',
      label: 'Category',
      width: '12%',
      render: (v: unknown) => v ? <StatusBadge value={v as string} /> : <span className="text-[#48484A]">—</span>,
    },
    { key: 'email', label: 'Email', width: '18%' },
    { key: 'company', label: 'Company', width: '15%' },
    { key: 'import_source', label: 'Source', width: '10%' },
    { key: 'import_date', label: 'Imported', width: '10%' },
  ]

  async function handleAction() {
    if (!selected || !action) return
    const id = selected.id as string
    if (action === 'approve') {
      await window.electronAPI.importedContacts.approve(id)
    } else {
      await window.electronAPI.importedContacts.reject(id, 'Rejected via CRM app')
    }
    setSelected(null)
    setAction(null)
    reload()
  }

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: contacts.length }
    STATUS_TABS.forEach(tab => {
      if (tab !== 'All') counts[tab] = contacts.filter(c => c.onboarding_status === tab).length
    })
    return counts
  }, [contacts])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[#FF453A] text-[13px]">{error}</div>
  }

  return (
    <div className="flex flex-col h-full">
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
          onRowClick={(row) => {
            setSelected(row)
          }}
          searchKeys={['contact_name', 'email', 'company']}
          emptyMessage={activeTab === 'All' ? 'No imported contacts.' : `No ${activeTab.toLowerCase()} contacts.`}
        />
      </div>

      {/* Review panel */}
      {selected && (
        <div className="mt-4 bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-white">{selected.contact_name as string || 'Unnamed'}</h3>
              <div className="flex gap-4 mt-1 text-[13px] text-[#98989D]">
                {Boolean(selected.email) && <span>{selected.email as string}</span>}
                {Boolean(selected.company) && <span>{selected.company as string}</span>}
                {Boolean(selected.job_title) && <span>{selected.job_title as string}</span>}
              </div>
              {Boolean(selected.notes) && (
                <p className="mt-2 text-[13px] text-[#636366]">{selected.notes as string}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setAction('approve') }}
                className="px-3 py-1.5 text-[13px] text-white bg-[#34C759] rounded-md hover:bg-[#30B350] transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => { setAction('reject') }}
                className="px-3 py-1.5 text-[13px] text-white bg-[#FF453A] rounded-md hover:bg-[#FF6961] transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 text-[13px] text-[#98989D] bg-[#3A3A3C] rounded-md hover:bg-[#48484A] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={action !== null}
        title={action === 'approve' ? 'Approve Contact' : 'Reject Contact'}
        message={`${action === 'approve' ? 'Approve' : 'Reject'} "${selected?.contact_name as string}"?`}
        confirmLabel={action === 'approve' ? 'Approve' : 'Reject'}
        destructive={action === 'reject'}
        onConfirm={handleAction}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}
