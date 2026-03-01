import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import LinkedList from '../shared/LinkedList'
import LoadingSpinner from '../shared/LoadingSpinner'

type Tab = 'overview' | 'opportunities' | 'tasks' | 'proposals' | 'interactions'

export default function Contact360Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Record<string, unknown> | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [specialtyNames, setSpecialtyNames] = useState<string[]>([])
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const result = await window.electronAPI.contacts.getById(id)
      if (result.success && result.data) {
        setContact(result.data as Record<string, unknown>)
      }

      // Load linked records for tabs + specialties
      const [opps, tasks, proposals, interactions, specialtiesRes] = await Promise.all([
        window.electronAPI.opportunities.getAll(),
        window.electronAPI.tasks.getAll(),
        window.electronAPI.proposals.getAll(),
        window.electronAPI.interactions.getAll(),
        window.electronAPI.specialties.getAll(),
      ])

      const linked: Record<string, Record<string, unknown>[]> = {}

      if (opps.success && opps.data) {
        linked.opportunities = (opps.data as Record<string, unknown>[]).filter(o => {
          const ids = o.associated_contact_ids as string
          return ids && ids.includes(id)
        })
      }

      if (tasks.success && tasks.data) {
        linked.tasks = (tasks.data as Record<string, unknown>[]).filter(t => {
          const ids = t.contacts_ids as string
          return ids && ids.includes(id)
        })
      }

      if (proposals.success && proposals.data) {
        linked.proposals = (proposals.data as Record<string, unknown>[]).filter(p => {
          const ids = p.client_ids as string
          return ids && ids.includes(id)
        })
      }

      if (interactions.success && interactions.data) {
        linked.interactions = (interactions.data as Record<string, unknown>[]).filter(i => {
          const ids = i.contacts_ids as string
          return ids && ids.includes(id)
        })
      }

      setLinkedData(linked)

      // Resolve specialty names from IDs
      if (specialtiesRes.success && specialtiesRes.data && result.data) {
        const contact = result.data as Record<string, unknown>
        try {
          const ids: string[] = JSON.parse((contact.specialties_ids as string) || '[]')
          const allSpecialties = specialtiesRes.data as Record<string, unknown>[]
          const names = allSpecialties
            .filter(s => ids.includes(s.id as string))
            .map(s => s.specialty as string)
            .filter(Boolean)
          setSpecialtyNames(names)
        } catch { /* not valid JSON */ }
      }
    }
    load()
  }, [id])

  if (!contact) return <LoadingSpinner />

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'overview', label: 'Overview', count: 0 },
    { key: 'opportunities', label: 'Opportunities', count: linkedData.opportunities?.length ?? 0 },
    { key: 'tasks', label: 'Tasks', count: linkedData.tasks?.length ?? 0 },
    { key: 'proposals', label: 'Proposals', count: linkedData.proposals?.length ?? 0 },
    { key: 'interactions', label: 'Interactions', count: linkedData.interactions?.length ?? 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/contacts')}
        className="flex items-center gap-1 text-[13px] text-[#0A84FF] hover:text-[#0077ED] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Contacts
      </button>

      {/* Header Card */}
      <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {contact.contact_name as string || 'Unnamed Contact'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5 text-[13px] text-[#98989D]">
              {Boolean(contact.job_title) && <span>{contact.job_title as string}</span>}
              {Boolean(contact.job_title) && Boolean(contact.company) && <span>at</span>}
              {Boolean(contact.company) && (() => {
                let companyId: string | null = null
                try {
                  const ids = JSON.parse(contact.companies_ids as string || '[]')
                  if (Array.isArray(ids) && ids.length > 0) companyId = ids[0]
                } catch { /* not linked */ }
                return companyId ? (
                  <button
                    onClick={() => navigate(`/companies/${companyId}`)}
                    className="text-[#0A84FF] hover:text-[#0077ED] transition-colors"
                  >
                    {contact.company as string}
                  </button>
                ) : (
                  <span className="text-white">{contact.company as string}</span>
                )
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={contact.categorization as string} />
            <button
              onClick={() => navigate(`/contacts/${id}/edit`)}
              className="px-2.5 py-1 text-[12px] text-[#0A84FF] bg-[#0A84FF]/10 rounded-md hover:bg-[#0A84FF]/20 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="px-2.5 py-1 text-[12px] text-[#FF453A] bg-[#FF453A]/10 rounded-md hover:bg-[#FF453A]/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[#3A3A3C]">
          {Boolean(contact.email) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">Email</p>
              <button
                onClick={() => window.electronAPI.shell.openExternal(`mailto:${contact.email as string}`)}
                className="text-[13px] text-[#0A84FF] hover:text-[#0077ED] transition-colors text-left"
              >
                {contact.email as string}
              </button>
            </div>
          )}
          {Boolean(contact.phone) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">Phone</p>
              <button
                onClick={() => window.electronAPI.shell.openExternal(`tel:${contact.phone as string}`)}
                className="text-[13px] text-white hover:text-[#0A84FF] transition-colors text-left"
              >
                {contact.phone as string}
              </button>
            </div>
          )}
          {Boolean(contact.linkedin_url) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">LinkedIn</p>
              <button
                onClick={() => window.electronAPI.shell.openExternal(contact.linkedin_url as string)}
                className="text-[13px] text-[#0A84FF] hover:text-[#0077ED] transition-colors truncate block max-w-full text-left"
              >
                {contact.linkedin_url as string}
              </button>
            </div>
          )}
          {Boolean(contact.industry) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">Industry</p>
              <p className="text-[13px] text-white">{contact.industry as string}</p>
            </div>
          )}
          {Boolean(contact.lead_source) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">Lead Source</p>
              <p className="text-[13px] text-white">{contact.lead_source as string}</p>
            </div>
          )}
          {Boolean(contact.last_contact_date) && (
            <div>
              <p className="text-[11px] text-[#636366] uppercase tracking-wider mb-0.5">Last Contact</p>
              <p className="text-[13px] text-white">{contact.last_contact_date as string}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#3A3A3C] flex gap-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#0A84FF] text-[#0A84FF]'
                : 'border-transparent text-[#98989D] hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#3A3A3C] rounded-full text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Address */}
          {(Boolean(contact.address_line) || Boolean(contact.city)) && (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
              <h3 className="text-[13px] font-medium text-[#98989D] mb-2">Address</h3>
              <p className="text-[13px] text-white">
                {[contact.address_line, contact.city, contact.state, contact.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {/* Notes */}
          {Boolean(contact.notes) && (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
              <h3 className="text-[13px] font-medium text-[#98989D] mb-2">Notes</h3>
              <p className="text-[13px] text-white whitespace-pre-wrap">{contact.notes as string}</p>
            </div>
          )}

          {/* Rate Info */}
          {Boolean(contact.rate_info) && (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
              <h3 className="text-[13px] font-medium text-[#98989D] mb-2">Rate Info</h3>
              <p className="text-[13px] text-white whitespace-pre-wrap">{contact.rate_info as string}</p>
            </div>
          )}

          {/* Specialties */}
          {specialtyNames.length > 0 && (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4 col-span-2">
              <h3 className="text-[13px] font-medium text-[#98989D] mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {specialtyNames.map(name => (
                  <span key={name} className="px-2.5 py-1 bg-[#3A3A3C] rounded-full text-[12px] text-white">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Partner Info */}
          {(Boolean(contact.partner_status) || Boolean(contact.partner_type)) && (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
              <h3 className="text-[13px] font-medium text-[#98989D] mb-2">Partner/Vendor</h3>
              <div className="space-y-1 text-[13px]">
                {Boolean(contact.partner_type) && <p className="text-white">Type: {contact.partner_type as string}</p>}
                {Boolean(contact.partner_status) && <p className="text-white">Status: {contact.partner_status as string}</p>}
                {Boolean(contact.quality_rating) && <p className="text-white">Quality: {contact.quality_rating as string}</p>}
                {Boolean(contact.reliability_rating) && <p className="text-white">Reliability: {contact.reliability_rating as string}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <LinkedList
          items={linkedData.opportunities || []}
          nameKey="opportunity_name"
          statusKey="sales_stage"
          extraKey="deal_value"
          extraLabel="Deal Value"
          extraRender={(v) => v ? `$${Number(v).toLocaleString()}` : null}
          onItemClick={(item) => navigate(`/pipeline/${item.id}/edit`)}
          emptyMessage="No linked opportunities"
        />
      )}

      {activeTab === 'tasks' && (
        <LinkedList
          items={linkedData.tasks || []}
          nameKey="task"
          statusKey="status"
          extraKey="due_date"
          extraLabel="Due"
          onItemClick={(item) => navigate(`/tasks/${item.id}/edit`)}
          emptyMessage="No linked tasks"
        />
      )}

      {activeTab === 'proposals' && (
        <LinkedList
          items={linkedData.proposals || []}
          nameKey="proposal_name"
          statusKey="status"
          onItemClick={(item) => navigate(`/proposals/${item.id}/edit`)}
          emptyMessage="No linked proposals"
        />
      )}

      {activeTab === 'interactions' && (
        <LinkedList
          items={linkedData.interactions || []}
          nameKey="subject"
          statusKey="type"
          extraKey="date"
          extraLabel="Date"
          onItemClick={(item) => navigate(`/interactions/${item.id}/edit`)}
          emptyMessage="No interactions logged yet"
        />
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${contact.contact_name as string}"? This cannot be undone.`}
        onConfirm={async () => {
          try {
            await window.electronAPI.contacts.delete(id!)
            navigate('/contacts')
          } catch {
            // Don't navigate on failure
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
