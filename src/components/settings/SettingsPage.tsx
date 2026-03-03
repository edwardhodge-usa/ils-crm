import { useState, useEffect } from 'react'
import { useSyncStatus } from '../../hooks/useSyncStatus'
type PipelineMode = 'active-opps' | 'active-contracts' | 'combined-total'

// ────────────────────────────────────────────────────────────
// Theme helpers — cooperate with App.tsx mediaQuery listener
// ────────────────────────────────────────────────────────────
type ThemeMode = 'system' | 'light' | 'dark'

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem('theme-mode')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (mode === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // system — honour media query
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  }
  localStorage.setItem('theme-mode', mode)
}

// ────────────────────────────────────────────────────────────
// Section IDs
// ────────────────────────────────────────────────────────────
type SectionId = 'general' | 'sync' | 'appearance' | 'about'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'sync', label: 'Sync' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
]

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--separator)]">
      <span className="text-[13px] text-[var(--text-primary)]">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] mb-3">
      {children}
    </p>
  )
}

function SettingsInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  type?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className="bg-[var(--bg-secondary)] border border-[var(--separator-strong)] rounded-[var(--radius-md)] px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50 w-[260px]"
    />
  )
}

// Segmented control — 3 equal options
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-[var(--bg-secondary)] border border-[var(--separator-strong)] rounded-[var(--radius-md)] p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'px-3 py-1 rounded-[6px] text-[12px] font-medium transition-all duration-150 whitespace-nowrap',
            value === opt.value
              ? 'bg-[var(--color-accent)] text-[var(--text-on-accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Section: General
// ────────────────────────────────────────────────────────────
function GeneralSection() {
  const [apiKey, setApiKey] = useState('')
  const [baseId, setBaseId] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [originalKey, setOriginalKey] = useState('')
  const [originalBaseId, setOriginalBaseId] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    async function load() {
      const keyResult = await window.electronAPI.settings.get('airtable_api_key')
      if (keyResult.success && keyResult.data) {
        setApiKey(keyResult.data)
        setOriginalKey(keyResult.data)
      }
      const baseResult = await window.electronAPI.settings.get('airtable_base_id')
      if (baseResult.success && baseResult.data) {
        setBaseId(baseResult.data)
        setOriginalBaseId(baseResult.data)
      }
    }
    load()
  }, [])

  const hasChanges = apiKey !== originalKey || baseId !== originalBaseId

  const handleSave = async () => {
    await window.electronAPI.settings.set('airtable_api_key', apiKey)
    await window.electronAPI.settings.set('airtable_base_id', baseId)
    setOriginalKey(apiKey)
    setOriginalBaseId(baseId)
    setSaveMessage('Settings saved')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  return (
    <div>
      <SectionHeader>Airtable Configuration</SectionHeader>

      <div className="last:border-b-0">
        {/* API Key */}
        <PrefRow label="API Key">
          <div className="relative flex items-center gap-1.5">
            <SettingsInput
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={setApiKey}
              placeholder="pat…"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--separator-strong)] rounded-[var(--radius-md)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </PrefRow>

        {/* Base ID */}
        <PrefRow label="Base ID">
          <SettingsInput
            value={baseId}
            onChange={setBaseId}
            placeholder="appXXXXXXXX"
          />
        </PrefRow>

        {/* Save */}
        <div className="pt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-1.5 bg-[var(--color-accent)] text-[var(--text-on-accent)] text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
          >
            Save Changes
          </button>
          {Boolean(saveMessage) && (
            <span className="text-[12px] text-[var(--color-green)]">{saveMessage}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Section: Sync
// ────────────────────────────────────────────────────────────
function SyncSection() {
  const { tables, isSyncing, forceSync } = useSyncStatus()
  const [syncMessage, setSyncMessage] = useState('')

  // Derive last synced from most recent table sync
  const lastSyncedAt = tables.reduce<string | null>((latest, t) => {
    if (!t.last_sync_at) return latest
    if (!latest) return t.last_sync_at
    return t.last_sync_at > latest ? t.last_sync_at : latest
  }, null)

  const handleForceSync = async () => {
    const result = await forceSync()
    if (!result.success) {
      setSyncMessage(`Sync failed: ${result.error ?? 'Unknown error'}`)
      setTimeout(() => setSyncMessage(''), 5000)
    }
  }

  return (
    <div>
      <SectionHeader>Sync Status</SectionHeader>

      <div>
        {/* Last synced */}
        <PrefRow label="Last Synced">
          <span className="text-[13px] text-[var(--text-secondary)]">
            {isSyncing
              ? 'Syncing…'
              : lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'Never'}
          </span>
        </PrefRow>

        {/* Force Sync button */}
        <PrefRow label="Force Sync">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-4 py-1.5 bg-[var(--color-accent)] text-[var(--text-on-accent)] text-[13px] font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {isSyncing && (
              <svg className="w-3.5 h-3.5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </PrefRow>

        {Boolean(syncMessage) && (
          <p className="mt-2 text-[12px] text-[var(--color-red)]">{syncMessage}</p>
        )}
      </div>

      {/* Table status */}
      {tables.length > 0 && (
        <div className="mt-6">
          <SectionHeader>Table Status</SectionHeader>
          <div className="rounded-[var(--radius-md)] border border-[var(--separator)] overflow-hidden">
            {tables.map((t, i) => (
              <div
                key={t.table_name}
                className={`flex items-center justify-between px-3 py-2.5 text-[12px] ${
                  i < tables.length - 1 ? 'border-b border-[var(--separator)]' : ''
                }`}
              >
                <span className="text-[var(--text-primary)] capitalize flex-1">
                  {t.table_name.replace(/_/g, ' ')}
                </span>
                <span className="text-[var(--text-tertiary)] w-20 text-right">
                  {t.record_count} records
                </span>
                <span className="text-[var(--text-tertiary)] w-28 text-right">
                  {t.last_sync_at ? new Date(t.last_sync_at).toLocaleTimeString() : 'Never'}
                </span>
                <span
                  className={`ml-3 flex items-center gap-1 w-16 justify-end ${
                    t.status === 'error'
                      ? 'text-[var(--color-red)]'
                      : t.status === 'syncing'
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-green)]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      t.status === 'error'
                        ? 'bg-[var(--color-red)]'
                        : t.status === 'syncing'
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-green)]'
                    }`}
                  />
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Section: Appearance
// ────────────────────────────────────────────────────────────
function AppearanceSection() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme)

  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(() => {
    const stored = localStorage.getItem('pipeline-mode')
    if (stored === 'active-opps' || stored === 'active-contracts' || stored === 'combined-total') return stored
    return 'active-opps'
  })

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    applyTheme(mode)
  }

  const handlePipelineModeChange = (mode: PipelineMode) => {
    setPipelineMode(mode)
    localStorage.setItem('pipeline-mode', mode)
  }

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  const pipelineOptions: { value: PipelineMode; label: string }[] = [
    { value: 'active-opps', label: 'Active Opps' },
    { value: 'active-contracts', label: 'Contracts' },
    { value: 'combined-total', label: 'Combined' },
  ]

  return (
    <div>
      <SectionHeader>Display</SectionHeader>

      <div>
        <PrefRow label="Theme">
          <SegmentedControl
            options={themeOptions}
            value={themeMode}
            onChange={handleThemeChange}
          />
        </PrefRow>

        <PrefRow label="Pipeline Widget">
          <SegmentedControl
            options={pipelineOptions}
            value={pipelineMode}
            onChange={handlePipelineModeChange}
          />
        </PrefRow>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Section: About
// ────────────────────────────────────────────────────────────
function AboutSection() {
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    window.electronAPI.app.getVersion().then((result) => {
      if (result.success && result.data) setVersion(result.data)
    }).catch(() => {
      // Graceful fallback — keep '1.0.0'
    })
  }, [])

  return (
    <div>
      <div className="py-6 flex flex-col items-start gap-1">
        <p className="text-[24px] font-bold text-[var(--text-primary)] leading-tight">ILS CRM</p>
        <p className="text-[13px] text-[var(--text-secondary)]">Version {version}</p>
        <p className="text-[13px] text-[var(--text-tertiary)] mt-2">Built by Imagine Lab Studios</p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main SettingsPage
// ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('general')

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar — 180px fixed */}
      <div className="w-[180px] flex-shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--separator)] flex flex-col py-4 overflow-hidden">
        <p className="px-4 pb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] select-none">
          Settings
        </p>
        <nav className="flex flex-col gap-0.5 px-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={[
                'w-full text-left px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] transition-colors duration-150',
                activeSection === section.id
                  ? 'bg-[var(--color-accent-translucent)] text-[var(--color-accent)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] font-normal',
              ].join(' ')}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content — flex-1 */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-[600px]">
          {activeSection === 'general' && <GeneralSection />}
          {activeSection === 'sync' && <SyncSection />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'about' && <AboutSection />}
        </div>
      </div>
    </div>
  )
}
