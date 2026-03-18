import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import EntityForm, { type EntityFormHandle, type FormFieldDef } from '../shared/EntityForm'
import useEntityForm from '../../hooks/useEntityForm'
import { normalizeUrl } from '../../utils/normalize-url'

const FIELDS: FormFieldDef[] = [
  // Basic Info
  { key: 'first_name', label: 'First Name', type: 'text', section: 'Basic Info' },
  { key: 'last_name', label: 'Last Name', type: 'text', section: 'Basic Info' },
  { key: 'job_title', label: 'Job Title', type: 'text', section: 'Basic Info' },
  { key: 'categorization', label: 'Categorization', type: 'multiSelect', section: 'Basic Info',
    options: ['Lead', 'Customer', 'Partner', 'Vendor', 'Talent', 'Other', 'Unknown', 'VIP', 'Investor', 'Speaker', 'Press', 'Influencer', 'Board Member', 'Advisor'] },
  { key: 'companies_ids', label: 'Company', type: 'linkedRecord', section: 'Basic Info',
    entityName: 'companies', labelField: 'company_name' },

  // Contact Details
  { key: 'email', label: 'Email', type: 'email', section: 'Contact Details' },
  { key: 'mobile_phone', label: 'Mobile Phone', type: 'phone', section: 'Contact Details' },
  { key: 'office_phone', label: 'Office Phone', type: 'phone', section: 'Contact Details' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url', section: 'Contact Details' },
  { key: 'website', label: 'Website', type: 'url', section: 'Contact Details' },

  // Address
  { key: 'address_line', label: 'Address', type: 'text', section: 'Address' },
  { key: 'city', label: 'City', type: 'text', section: 'Address' },
  { key: 'state', label: 'State', type: 'text', section: 'Address' },
  { key: 'country', label: 'Country', type: 'text', section: 'Address' },
  { key: 'postal_code', label: 'Postal Code', type: 'text', section: 'Address' },

  // CRM
  { key: 'lead_source', label: 'Lead Source', type: 'singleSelect', section: 'CRM',
    options: ['Referral', 'Website', 'Inbound', 'Outbound', 'Event', 'Social Media', 'Other', 'LinkedIn', 'Cold Call'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'CRM',
    options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Real Estate', 'Consulting', 'Other', 'Hospitality', 'Logistics', 'Fitness', 'Legal', 'Media', 'Design', 'Venture Capital', 'Retail', 'Entertainment'] },
  { key: 'lead_score', label: 'Lead Score', type: 'number', section: 'CRM' },
  { key: 'last_contact_date', label: 'Last Contact Date', type: 'date', section: 'CRM' },
  { key: 'event_tags', label: 'Event Tags', type: 'multiSelect', section: 'CRM', variant: 'dropdown',
    options: ['IAAPA 2025', 'SATE 2025', 'LDI 2025', 'Soho Holloway', 'LA LGBT', 'EEE 2026'], allowCreate: true },
  { key: 'qualification_status', label: 'Qualification Status', type: 'singleSelect', section: 'CRM',
    options: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Nurturing'] },
  { key: 'onboarding_status', label: 'Onboarding Status', type: 'singleSelect', section: 'CRM',
    options: ['Not Started', 'In Progress', 'Completed', 'On Hold'] },
  { key: 'import_source', label: 'Import Source', type: 'singleSelect', section: 'CRM',
    options: ['Apple Contacts', 'LinkedIn', 'CSV Import', 'Manual Entry', 'Business Card', 'Email Signature'] },

  // Partner/Vendor
  { key: 'partner_type', label: 'Partner Type', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['Fabricator', 'AV/Lighting', 'Scenic/Set Builder', 'Architect', 'Interior Designer', 'Graphic Designer', 'F&B Consultant', 'Tech/Interactive', 'Operations Consultant', 'Production Company', 'Freelancer/Individual', 'Other'] },
  { key: 'partner_status', label: 'Partner Status', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['Active - Preferred', 'Active', 'Inactive', 'Do Not Use'] },
  { key: 'quality_rating', label: 'Quality Rating', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['\u2B50\u2B50\u2B50\u2B50\u2B50 Excellent', '\u2B50\u2B50\u2B50\u2B50 Good', '\u2B50\u2B50\u2B50 Average', '\u2B50\u2B50 Below Average', '\u2B50 Poor'] },
  { key: 'reliability_rating', label: 'Reliability Rating', type: 'singleSelect', section: 'Partner/Vendor',
    options: ['\u2B50\u2B50\u2B50\u2B50\u2B50 Excellent', '\u2B50\u2B50\u2B50\u2B50 Good', '\u2B50\u2B50\u2B50 Average', '\u2B50\u2B50 Below Average', '\u2B50 Poor'] },

  // Notes
  { key: 'notes', label: 'Notes', type: 'textarea', section: 'Notes' },
  { key: 'rate_info', label: 'Rate Info', type: 'textarea', section: 'Notes' },
  { key: 'lead_note', label: 'Lead Note', type: 'textarea', section: 'Notes' },
]

// Company fields for create form in right pane
const COMPANY_CREATE_FIELDS: FormFieldDef[] = [
  { key: 'company_name', label: 'Company Name', type: 'text', required: true, section: 'Basic Info' },
  { key: 'type', label: 'Type', type: 'singleSelect', section: 'Basic Info',
    options: ['Prospect', 'Active Client', 'Past Client', 'Partner', 'Vendor', 'Other'] },
  { key: 'industry', label: 'Industry', type: 'singleSelect', section: 'Basic Info',
    options: ['Hospitality', 'Entertainment/Attractions', 'Corporate/Brand', 'Retail', 'Real Estate/Development', 'F&B', 'Technology', 'Other'] },
  { key: 'website', label: 'Website', type: 'url', section: 'Contact' },
  { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url', section: 'Contact' },
]

type PaneMode = 'closed' | 'browse' | 'create'

export default function ContactForm() {
  const { isNew, initialValues, loading, error, handleSave, handleCancel } = useEntityForm({
    entityApi: window.electronAPI.contacts,
    basePath: '/contacts',
  })
  const formRef = useRef<EntityFormHandle>(null)

  // Wrap handleSave to auto-compute contact_name from first_name + last_name
  const handleSaveWithContactName = useCallback(async (values: Record<string, unknown>) => {
    const contactName = [values.first_name, values.last_name].filter(Boolean).join(' ')
    await handleSave({ ...values, contact_name: contactName || null })
  }, [handleSave])

  // Right pane state
  const [paneMode, setPaneMode] = useState<PaneMode>('closed')
  const [companySearch, setCompanySearch] = useState('')
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [createValues, setCreateValues] = useState<Record<string, unknown>>({})
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch companies
  const refreshCompanies = useCallback(() => {
    window.electronAPI.companies.getAll().then(res => {
      if (!res.success || !res.data) return
      setCompanies((res.data as Array<Record<string, unknown>>).map(r => ({
        id: String(r.id || ''),
        name: String(r.company_name || ''),
      })).filter(r => r.id && r.name))
    })
  }, [])

  useEffect(() => { refreshCompanies() }, [refreshCompanies])

  useEffect(() => {
    if (paneMode === 'browse' && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [paneMode])

  const filtered = useMemo(() => {
    if (!companySearch.trim()) return companies
    const q = companySearch.toLowerCase()
    return companies.filter(c => c.name.toLowerCase().includes(q))
  }, [companies, companySearch])

  function handleSelectCompany(companyId: string) {
    if (!formRef.current) return
    formRef.current.setFieldValue('companies_ids', JSON.stringify([companyId]))
    setPaneMode('closed')
    setCompanySearch('')
  }

  function handleLinkedRecordOpen(fieldKey: string) {
    if (fieldKey !== 'companies_ids') return // only company field uses the pane
    setPaneMode('browse')
    setCompanySearch('')
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      // Auto-prepend https:// to URL fields missing a protocol
      const normalized = { ...createValues }
      for (const f of COMPANY_CREATE_FIELDS) {
        if (f.type === 'url' && typeof normalized[f.key] === 'string') {
          normalized[f.key] = normalizeUrl(normalized[f.key] as string)
        }
      }
      const res = await window.electronAPI.companies.create(normalized)
      if (res.success && res.data) {
        const newId = res.data as string
        refreshCompanies()
        if (formRef.current) {
          formRef.current.setFieldValue('companies_ids', JSON.stringify([newId]))
        }
        setPaneMode('closed')
        setCreateValues({})
      } else {
        setCreateError(res.error || 'Failed to create company')
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create company')
    } finally {
      setCreating(false)
    }
  }

  if (loading || initialValues === null) {
    return <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">Loading...</div>
  }
  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Contact form */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <EntityForm
          ref={formRef}
          fields={FIELDS}
          initialValues={initialValues}
          onSave={handleSaveWithContactName}
          onCancel={handleCancel}
          title="Contact"
          isNew={isNew}
          onLinkedRecordOpen={handleLinkedRecordOpen}
        />
      </div>

      {/* Right: Company browser/create pane */}
      {paneMode !== 'closed' && (
        <div style={{
          width: 340, flexShrink: 0,
          borderLeft: '1px solid var(--separator)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-window)',
          overflow: 'hidden',
        }}>
          {paneMode === 'browse' && (
            <>
              {/* Pane header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Select Company
                </span>
                <button
                  type="button"
                  onClick={() => setPaneMode('closed')}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'var(--separator-opaque)', border: 'none',
                    fontSize: 12, color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Search + Add button */}
              <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  placeholder="Search companies..."
                  style={{
                    flex: 1, fontSize: 13, color: 'var(--text-primary)',
                    background: 'var(--bg-input)', border: 'none', borderRadius: 6,
                    padding: '5px 10px', height: 28, outline: 'none', cursor: 'default',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setPaneMode('create'); setCreateValues({}) }}
                  style={{
                    padding: '0 12px', height: 28, borderRadius: 6,
                    background: 'var(--color-accent)', border: 'none',
                    fontSize: 12, fontWeight: 500, color: 'var(--text-on-accent)',
                    cursor: 'default', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  + Add
                </button>
              </div>

              {/* Company list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                {filtered.length === 0 && (
                  <div style={{ padding: '16px 8px', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    No companies found
                  </div>
                )}
                {filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCompany(c.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 6,
                      fontSize: 13, color: 'var(--text-primary)',
                      background: 'transparent', border: 'none',
                      cursor: 'default', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {paneMode === 'create' && (
            <>
              {/* Create header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--separator)', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPaneMode('browse')}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      fontSize: 13, color: 'var(--color-accent)', cursor: 'default',
                    }}
                  >
                    Back
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    New Company
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaneMode('closed')}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'var(--separator-opaque)', border: 'none',
                    fontSize: 12, color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Create form */}
              <form onSubmit={handleCreateCompany} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {COMPANY_CREATE_FIELDS.map(f => (
                    <div key={f.key} style={{
                      display: 'flex', alignItems: 'center', minHeight: 36, gap: 12,
                      borderBottom: '1px solid var(--separator)', padding: '4px 0',
                    }}>
                      <label style={{ fontSize: 13, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>
                        {f.label}
                      </label>
                      {f.type === 'singleSelect' ? (
                        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                          <select
                            value={(createValues[f.key] as string) || ''}
                            onChange={e => setCreateValues(p => ({ ...p, [f.key]: e.target.value || null }))}
                            style={{
                              appearance: 'none' as const, width: '100%',
                              fontSize: 13, color: 'var(--text-primary)',
                              background: 'var(--bg-input)', border: 'none', borderRadius: 6,
                              padding: '5px 24px 5px 10px', height: 28,
                              outline: 'none', cursor: 'default', textAlign: 'right' as const,
                            }}
                          >
                            <option value="">-- Select --</option>
                            {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>&#x2303;</span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={(createValues[f.key] as string) || ''}
                          onChange={e => setCreateValues(p => ({ ...p, [f.key]: e.target.value || null }))}
                          placeholder={f.label}
                          required={f.required}
                          style={{
                            flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)',
                            background: 'var(--bg-input)', border: 'none', borderRadius: 6,
                            padding: '5px 10px', height: 28, outline: 'none', cursor: 'default',
                            textAlign: 'right' as const,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Error */}
                {createError && (
                  <div style={{
                    margin: '0 16px 8px', padding: '8px 10px', borderRadius: 6,
                    background: 'rgba(255,59,48,0.12)', fontSize: 12, color: 'var(--color-red)',
                  }}>
                    {createError}
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', gap: 8,
                  padding: '12px 16px', borderTop: '1px solid var(--separator)', flexShrink: 0,
                }}>
                  <button
                    type="button"
                    onClick={() => setPaneMode('browse')}
                    style={{
                      padding: '6px 14px', borderRadius: 6,
                      background: 'var(--separator-opaque)', border: 'none',
                      fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', cursor: 'default',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      padding: '6px 14px', borderRadius: 6,
                      background: 'var(--color-accent)', border: 'none',
                      fontSize: 13, fontWeight: 500, color: 'var(--text-on-accent)', cursor: 'default',
                      opacity: creating ? 0.5 : 1,
                    }}
                  >
                    {creating ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
