import { useState, useEffect } from 'react'

interface UpdateStatus {
  status: 'available' | 'downloading' | 'ready' | 'error'
  version?: string
  percent?: number
  message?: string
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    window.electronAPI.updater.onStatus((data) => setUpdate(data as UpdateStatus))
    return () => window.electronAPI.updater.removeStatusListener()
  }, [])

  // Auto-dismiss errors after 5s
  useEffect(() => {
    if (update?.status === 'error') {
      const t = setTimeout(() => setUpdate(null), 5000)
      return () => clearTimeout(t)
    }
  }, [update])

  if (!update) return null

  const messages: Record<string, string> = {
    available: `Update v${update.version} available — downloading...`,
    downloading: `Downloading update... ${Math.round(update.percent || 0)}%`,
    ready: `Update v${update.version} ready`,
    error: 'Update check failed',
  }

  return (
    <div style={{
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: update.status === 'error' ? 'var(--color-red)' : 'var(--color-accent)',
      color: 'var(--text-on-accent)',
      fontSize: 12,
      fontWeight: 500,
      cursor: 'default',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <span>{messages[update.status]}</span>
      {update.status === 'ready' && (
        <button
          onClick={() => window.electronAPI.updater.install()}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4,
            color: 'var(--text-on-accent)',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 10px',
            cursor: 'default',
          }}
        >
          Restart Now
        </button>
      )}
    </div>
  )
}
