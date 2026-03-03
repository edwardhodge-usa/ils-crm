import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../shared/StatusBadge'
import ConfirmDialog from '../shared/ConfirmDialog'
import LinkedList from '../shared/LinkedList'
import LoadingSpinner from '../shared/LoadingSpinner'

type Tab = 'overview' | 'contacts' | 'opportunities' | 'projects'

export default function Company360Page() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Record<string, unknown> | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [linkedData, setLinkedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      const result = await window.electronAPI.companies.getById(id)
      if (result.success && result.data) {
        setCompany(result.data as Record<string, unknown>)
      }

      const [contacts, opps, projects] = await Promise.all([
        window.electronAPI.contacts.getAll(),
        window.electronAPI.opportunities.getAll(),
        window.electronAPI.projects.getAll(),
      ])

      const linked: Record<string, Record<string, unknown>[]> = {}

      function containsId(idsJson: unknown, targetId: string): boolean {
        if (!idsJson) return false
        try {
          const arr = JSON.parse(idsJson as string)
          return Array.isArray(arr) && arr.includes(targetId)
        } catch {
          return false
        }
      }

      if (contacts.success && contacts.data) {
        linked.contacts = (contacts.data as Record<string, unknown>[]).filter(c =>
          containsId(c.companies_ids, id)
        )
      }

      if (opps.success && opps.data) {
        linked.opportunities = (opps.data as Record<string, unknown>[]).filter(o =>
          containsId(o.company_ids, id)
        )
      }

      if (projects.success && projects.data) {
        // Projects don't link directly to companies — find via company's contacts
        const companyContactIds = new Set((linked.contacts || []).map(c => c.id as string))
        linked.projects = (projects.data as Record<string, unknown>[]).filter(p => {
          for (const field of ['client_ids', 'contacts_ids', 'primary_contact_ids']) {
            try {
              const ids = JSON.parse((p[field] as string) || '[]') as string[]
              if (ids.some(cid => companyContactIds.has(cid))) return true
            } catch { /* not valid JSON */ }
          }
          return false
        })
      }

      setLinkedData(linked)
    }
    load()
  }, [id])

  if (!company) return <LoadingSpinner />

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'overview', label: 'Overview', count: 0 },
    { key: 'contacts', label: 'Contacts', count: linkedData.contacts?.length ?? 0 },
    { key: 'opportunities', label: 'Opportunities', count: linkedData.opportunities?.length ?? 0 },
    { key: 'projects', label: 'Projects', count: linkedData.projects?.length ?? 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-1 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Companies
      </button>

      {/* Header Card */}
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {company.company_name as string || 'Unnamed Company'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5 text-[var(--text-secondary)]">
              {Boolean(company.industry) && <span>{company.industry as string}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={company.type as string} />
            <button
              onClick={() => navigate(`/companies/${id}/edit`)}
              className="px-2.5 py-1 text-[var(--color-accent)] bg-[var(--color-accent-translucent)] rounded-md hover:bg-[var(--color-accent)]/20 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="px-2.5 py-1 text-[var(--color-red)] bg-[var(--color-red)]/15 rounded-md hover:bg-[var(--color-red)]/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-[var(--separator-opaque)]">
          {Boolean(company.website) && (
            <div>
              <p className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Website</p>
              <p className="text-[13px] text-[var(--color-accent)] truncate">{company.website as string}</p>
            </div>
          )}
          {Boolean(company.lead_source) && (
            <div>
              <p className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Lead Source</p>
              <p className="text-[13px] text-[var(--text-primary)]">{company.lead_source as string}</p>
            </div>
          )}
          {Boolean(company.company_size) && (
            <div>
              <p className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Size</p>
              <p className="text-[13px] text-[var(--text-primary)]">{company.company_size as string}</p>
            </div>
          )}
          {Boolean(company.annual_revenue) && (
            <div>
              <p className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Annual Revenue</p>
              <p className="text-[13px] text-[var(--text-primary)]">{company.annual_revenue as string}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--separator-opaque)] flex gap-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[var(--separator-opaque)] rounded-full text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {(Boolean(company.address) || Boolean(company.city)) && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">Address</h3>
              <p className="text-[13px] text-[var(--text-primary)]">
                {[company.address, company.city, company.state_region, company.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {Boolean(company.notes) && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">Notes</h3>
              <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap">{company.notes as string}</p>
            </div>
          )}

          {Boolean(company.company_description) && (
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--separator-opaque)] p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-2">Description</h3>
              <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-wrap">{company.company_description as string}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <LinkedList
          items={linkedData.contacts || []}
          nameKey="contact_name"
          statusKey="categorization"
          extraKey="job_title"
          extraLabel="Title"
          onItemClick={(item) => navigate(`/contacts/${item.id}`)}
          emptyMessage="No linked contacts"
        />
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

      {activeTab === 'projects' && (
        <LinkedList
          items={linkedData.projects || []}
          nameKey="project_name"
          statusKey="status"
          onItemClick={(item) => navigate(`/projects/${item.id}/edit`)}
          emptyMessage="No linked projects"
        />
      )}

      {deleteError && (
        <div className="flex items-center justify-between bg-[var(--color-red)]/15 border border-[var(--color-red)]/30 rounded-lg px-4 py-3 text-[var(--color-red)]">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="ml-4 hover:text-[var(--text-primary)] transition-colors">✕</button>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${company.company_name as string}"? This cannot be undone.`}
        onConfirm={async () => {
          const result = await window.electronAPI.companies.delete(id!)
          if (result.success) {
            navigate('/companies')
          } else {
            setShowDelete(false)
            setDeleteError(result.error || 'Delete failed — please try again')
          }
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
