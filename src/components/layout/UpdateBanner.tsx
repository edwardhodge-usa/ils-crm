import { useState, useEffect } from 'react'

interface UpdateStatus {
  status: string
  version?: string
  percent?: number
  message?: string
}

export default function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.electronAPI.updater.onStatus((data: UpdateStatus) => {
      if (data.status === 'ready') {
        setUpdateReady(true)
      }
    })

    return () => {
      window.electronAPI.updater.removeStatusListener()
    }
  }, [])

  if (!updateReady || dismissed) return null

  return (
    <div style={{
      position: 'relative',
      height: 32,
      background: 'var(--color-accent)',
      color: 'var(--text-on-accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontSize: 13,
      fontWeight: 500,
    }}>
      <span>A new version is available.</span>
      <button
        onClick={() => window.electronAPI.updater.install()}
        style={{
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-accent)',
          background: 'var(--text-on-accent)',
          border: 'none',
          borderRadius: 4,
          cursor: 'default',
        }}
      >
        Restart Now
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          right: 12,
          background: 'none',
          border: 'none',
          color: 'var(--text-on-accent)',
          fontSize: 16,
          cursor: 'default',
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  )
}
