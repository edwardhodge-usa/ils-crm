import { useState, useEffect } from 'react'

interface UpdateStatus {
  status: 'available' | 'downloading' | 'ready'
  version?: string
  percent?: number
  message?: string
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    window.electronAPI.updater.onStatus((data) => {
      // Suppress error status — update check failures are non-actionable for the user.
      // The main process still logs the error for debugging.
      if ((data as { status: string }).status === 'error') return
      setUpdate(data as UpdateStatus)
    })
    return () => window.electronAPI.updater.removeStatusListener()
  }, [])

  if (!update) return null

  const messages: Record<string, string> = {
    available: `Update v${update.version} available — downloading...`,
    downloading: `Downloading update... ${Math.round(update.percent || 0)}%`,
    ready: `Update v${update.version} ready`,
  }

  return (
    <div style={{
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: 'var(--color-accent)',
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
