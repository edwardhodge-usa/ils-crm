import { useState, useEffect } from 'react'
import { useSyncStatus } from '../../hooks/useSyncStatus'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [baseId, setBaseId] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const { tables, isSyncing, forceSync, startSync, stopSync } = useSyncStatus()

  useEffect(() => {
    async function loadSettings() {
      const keyResult = await window.electronAPI.settings.get('airtable_api_key')
      if (keyResult.success && keyResult.data) setApiKey(keyResult.data)

      const baseResult = await window.electronAPI.settings.get('airtable_base_id')
      if (baseResult.success && baseResult.data) setBaseId(baseResult.data)
    }
    loadSettings()
  }, [])

  const handleSaveApiKey = async () => {
    await window.electronAPI.settings.set('airtable_api_key', apiKey)
    setSaveMessage('API key saved')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  const handleForceSync = async () => {
    const result = await forceSync()
    if (!result.success) {
      setSaveMessage(`Sync failed: ${result.error}`)
      setTimeout(() => setSaveMessage(''), 4000)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Airtable Configuration */}
      <section>
        <h2 className="text-[15px] font-semibold text-white mb-4">Airtable Configuration</h2>
        <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4 space-y-4">
          <div>
            <label className="block text-[13px] text-[#98989D] mb-1.5">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="pat..."
                className="flex-1 bg-[#1C1C1E] border border-[#3A3A3C] rounded-md px-3 py-2 text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#0A84FF] transition-colors"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2 bg-[#3A3A3C] rounded-md text-[12px] text-[#98989D] hover:bg-[#48484A] transition-colors"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-[#0A84FF] rounded-md text-[13px] text-white font-medium hover:bg-[#0077ED] transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] text-[#98989D] mb-1.5">Base ID</label>
            <input
              type="text"
              value={baseId}
              readOnly
              className="w-full bg-[#1C1C1E] border border-[#3A3A3C] rounded-md px-3 py-2 text-[13px] text-[#636366] cursor-not-allowed"
            />
          </div>

          {saveMessage && (
            <p className={`text-[12px] ${saveMessage.includes('failed') ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </section>

      {/* Sync Controls */}
      <section>
        <h2 className="text-[15px] font-semibold text-white mb-4">Sync</h2>
        <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing || !apiKey}
              className="px-4 py-2 bg-[#0A84FF] rounded-md text-[13px] text-white font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Force Sync Now'}
            </button>
            <button
              onClick={startSync}
              disabled={!apiKey}
              className="px-4 py-2 bg-[#3A3A3C] rounded-md text-[13px] text-[#98989D] hover:bg-[#48484A] hover:text-white transition-colors disabled:opacity-40"
            >
              Start Auto-Sync
            </button>
            <button
              onClick={stopSync}
              className="px-4 py-2 bg-[#3A3A3C] rounded-md text-[13px] text-[#98989D] hover:bg-[#48484A] hover:text-white transition-colors"
            >
              Stop
            </button>
          </div>

          {isSyncing && (
            <div className="flex items-center gap-2 text-[12px] text-[#0A84FF]">
              <svg className="w-3.5 h-3.5 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Syncing...
            </div>
          )}
        </div>
      </section>

      {/* Sync Status per Table */}
      <section>
        <h2 className="text-[15px] font-semibold text-white mb-4">Table Status</h2>
        <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#3A3A3C]">
                <th className="text-left px-4 py-2 text-[#98989D] font-medium">Table</th>
                <th className="text-left px-4 py-2 text-[#98989D] font-medium">Records</th>
                <th className="text-left px-4 py-2 text-[#98989D] font-medium">Last Sync</th>
                <th className="text-left px-4 py-2 text-[#98989D] font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.table_name} className="border-b border-[#3A3A3C] last:border-b-0">
                  <td className="px-4 py-2 text-white capitalize">{t.table_name.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2 text-[#98989D]">{t.record_count}</td>
                  <td className="px-4 py-2 text-[#98989D]">
                    {t.last_sync_at
                      ? new Date(t.last_sync_at).toLocaleTimeString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 ${
                      t.status === 'error' ? 'text-[#FF3B30]' :
                      t.status === 'syncing' ? 'text-[#0A84FF]' :
                      'text-[#34C759]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.status === 'error' ? 'bg-[#FF3B30]' :
                        t.status === 'syncing' ? 'bg-[#0A84FF]' :
                        'bg-[#34C759]'
                      }`} />
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tables.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[#636366]">
                    No sync data yet. Configure API key and sync.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* App Info */}
      <section>
        <h2 className="text-[15px] font-semibold text-white mb-4">About</h2>
        <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-4">
          <p className="text-[13px] text-[#98989D]">ILS CRM Desktop App v0.1.0</p>
          <p className="text-[12px] text-[#636366] mt-1">ImagineLab Studios</p>
        </div>
      </section>
    </div>
  )
}
