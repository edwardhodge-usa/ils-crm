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
// Font-size helpers — cooperate with App.tsx startup apply
// ────────────────────────────────────────────────────────────
type FontSize = 'compact' | 'default' | 'large'

const FONT_SIZES: Record<FontSize, { body: string; secondary: string; small: string }> = {
  compact: { body: '13px', secondary: '11px', small: '10px' },
  default: { body: '14px', secondary: '12px', small: '11px' },
  large:   { body: '16px', secondary: '14px', small: '12px' },
}

function getStoredFontSize(): FontSize {
  const stored = localStorage.getItem('font-size')
  if (stored === 'compact' || stored === 'default' || stored === 'large') return stored
  return 'default'
}

function applyFontSize(size: FontSize) {
  const values = FONT_SIZES[size]
  document.documentElement.style.setProperty('--font-body', values.body)
  document.documentElement.style.setProperty('--font-secondary', values.secondary)
  document.documentElement.style.setProperty('--font-small', values.small)
  localStorage.setItem('font-size', size)
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

function PrefRow({ label, children, isLast = false }: { label: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <div
      className="flex items-center justify-between cursor-default"
      style={{
        minHeight: 36,
        padding: '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8,
    }}>
      {children}
    </p>
  )
}

function GroupedContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {children}
    </div>
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
  const [currentUser, setCurrentUser] = useState<{ id: string | null; name: string | null; email: string | null } | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [baseId, setBaseId] = useState('')
  const [originalBaseId, setOriginalBaseId] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    window.electronAPI.auth.getCurrentUser().then(result => {
      if (result.success && result.data) {
        setCurrentUser({ id: result.data.id, name: result.data.name, email: result.data.email })
      }
    })
  }, [])

  useEffect(() => {
    async function load() {
      const keyResult = await window.electronAPI.settings.get('airtable_api_key')
      if (keyResult.success && keyResult.data) {
        setApiKey(keyResult.data)
      }
      const baseResult = await window.electronAPI.settings.get('airtable_base_id')
      if (baseResult.success && baseResult.data) {
        setBaseId(baseResult.data)
        setOriginalBaseId(baseResult.data)
      }
    }
    load()
  }, [])

  const hasChanges = baseId !== originalBaseId

  const handleSave = async () => {
    await window.electronAPI.settings.set('airtable_base_id', baseId)
    setOriginalBaseId(baseId)
    setSaveMessage('Settings saved')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  const handleChangeToken = async () => {
    await window.electronAPI.auth.signOut()
    window.location.reload()
  }

  return (
    <div>
      {/* Your Account */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader>Your Account</SectionHeader>
        <GroupedContainer>
          {/* Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 36,
            padding: '10px 14px',
            borderBottom: '1px solid var(--separator)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flex: 1 }}>Name</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
              {currentUser?.name || '\u2014'}
            </span>
          </div>

          {/* Email */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 36,
            padding: '10px 14px',
            borderBottom: '1px solid var(--separator)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flex: 1 }}>Email</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)' }}>
              {currentUser?.email || '\u2014'}
            </span>
          </div>

          {/* Airtable User ID */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 36,
            padding: '10px 14px',
            borderBottom: '1px solid var(--separator)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flex: 1 }}>Airtable User ID</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>
              {currentUser?.id || '\u2014'}
            </span>
          </div>

          {/* Sign Out */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 36,
            padding: '10px 14px',
          }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', flex: 1 }}>Session</span>
            <button
              onClick={async () => {
                await window.electronAPI.auth.signOut()
                window.location.reload()
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-red)',
                cursor: 'default',
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              Sign Out
            </button>
          </div>
        </GroupedContainer>
      </div>

      <SectionHeader>Airtable Configuration</SectionHeader>

      <GroupedContainer>
        {/* API Key — read-only, masked */}
        <PrefRow label="API Key">
          <div className="flex items-center gap-1.5">
            <span style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              letterSpacing: '0.1em',
            }}>
              {apiKey ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '\u2014'}
            </span>
            <button
              onClick={handleChangeToken}
              className="cursor-default"
              style={{
                padding: '5px 10px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--separator-strong)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontFamily: 'inherit',
                transition: 'background 150ms, color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              Change Token
            </button>
          </div>
        </PrefRow>

        {/* Base ID */}
        <PrefRow label="Base ID" isLast>
          <SettingsInput
            value={baseId}
            onChange={setBaseId}
            placeholder="appXXXXXXXX"
          />
        </PrefRow>
      </GroupedContainer>

      {/* Save */}
      <div style={{ paddingTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="cursor-default disabled:opacity-40"
          style={{
            padding: '6px 16px',
            background: 'var(--color-accent)',
            color: 'var(--text-on-accent)',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            border: 'none',
            fontFamily: 'inherit',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => { if (!hasChanges) return; e.currentTarget.style.background = 'var(--color-accent-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-accent)' }}
        >
          Save Changes
        </button>
        {Boolean(saveMessage) && (
          <span style={{ fontSize: 12, color: 'var(--color-green)' }}>{saveMessage}</span>
        )}
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

      <GroupedContainer>
        {/* Last synced */}
        <PrefRow label="Last Synced">
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {isSyncing
              ? 'Syncing…'
              : lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString()
              : 'Never'}
          </span>
        </PrefRow>

        {/* Force Sync button */}
        <PrefRow label="Force Sync" isLast>
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="cursor-default disabled:opacity-40 flex items-center gap-2"
            style={{
              padding: '6px 16px',
              background: 'var(--color-accent)',
              color: 'var(--text-on-accent)',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              border: 'none',
              fontFamily: 'inherit',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { if (!isSyncing) e.currentTarget.style.background = 'var(--color-accent-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-accent)' }}
          >
            {isSyncing && (
              <svg className="w-3.5 h-3.5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </PrefRow>
      </GroupedContainer>

      {Boolean(syncMessage) && (
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-red)' }}>{syncMessage}</p>
      )}

      {/* Table status */}
      {tables.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader>Table Status</SectionHeader>
          <GroupedContainer>
            {tables.map((t, i) => (
              <div
                key={t.table_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  minHeight: 36,
                  fontSize: 12,
                  borderBottom: i < tables.length - 1 ? '1px solid var(--separator)' : 'none',
                }}
              >
                <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', flex: 1 }}>
                  {t.table_name.replace(/_/g, ' ')}
                </span>
                <span style={{ color: 'var(--text-secondary)', width: 80, textAlign: 'right' }}>
                  {t.record_count} records
                </span>
                <span style={{ color: 'var(--text-secondary)', width: 112, textAlign: 'right' }}>
                  {t.last_sync_at ? new Date(t.last_sync_at).toLocaleTimeString() : 'Never'}
                </span>
                <span style={{
                  marginLeft: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  width: 64,
                  justifyContent: 'flex-end',
                  color: t.status === 'error'
                    ? 'var(--color-red)'
                    : t.status === 'syncing'
                    ? 'var(--color-accent)'
                    : 'var(--color-green)',
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: t.status === 'error'
                      ? 'var(--color-red)'
                      : t.status === 'syncing'
                      ? 'var(--color-accent)'
                      : 'var(--color-green)',
                  }} />
                  {t.status}
                </span>
              </div>
            ))}
          </GroupedContainer>
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
  const [fontSize, setFontSize] = useState<FontSize>(getStoredFontSize)

  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(() => {
    const stored = localStorage.getItem('pipeline-mode')
    if (stored === 'active-opps' || stored === 'active-contracts' || stored === 'combined-total') return stored
    return 'active-opps'
  })

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    applyTheme(mode)
  }

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size)
    applyFontSize(size)
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

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'default', label: 'Default' },
    { value: 'large', label: 'Large' },
  ]

  const pipelineOptions: { value: PipelineMode; label: string }[] = [
    { value: 'active-opps', label: 'Active Opps' },
    { value: 'active-contracts', label: 'Contracts' },
    { value: 'combined-total', label: 'Combined' },
  ]

  return (
    <div>
      <SectionHeader>Display</SectionHeader>

      <GroupedContainer>
        <PrefRow label="Theme">
          <SegmentedControl
            options={themeOptions}
            value={themeMode}
            onChange={handleThemeChange}
          />
        </PrefRow>

        <PrefRow label="Text Size">
          <SegmentedControl
            options={fontSizeOptions}
            value={fontSize}
            onChange={handleFontSizeChange}
          />
        </PrefRow>

        <PrefRow label="Pipeline Widget" isLast>
          <SegmentedControl
            options={pipelineOptions}
            value={pipelineMode}
            onChange={handlePipelineModeChange}
          />
        </PrefRow>
      </GroupedContainer>
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
        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="cursor-default"
                style={{
                  width: 'calc(100% - 16px)',
                  margin: '0 8px',
                  textAlign: 'left',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  fontFamily: 'inherit',
                  transition: 'background 150ms, color 150ms',
                  background: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? 'var(--text-on-accent)' : 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {section.label}
              </button>
            )
          })}
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
