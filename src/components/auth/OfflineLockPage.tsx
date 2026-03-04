import { useState, useEffect } from 'react'

export default function OfflineLockPage() {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.app.getVersion().then((r: { success: boolean; data: string }) => {
      if (r.success) setVersion(r.data)
    })
  }, [])

  return (
    <div className="window-drag" style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-window)',
      cursor: 'default',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 380,
      }}>
        {/* Icon — wifi/connection shape */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255, 149, 0, 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 22,
        }}>
          <span style={{ color: 'var(--color-orange, #FF9500)' }}>&#x26A0;</span>
        </div>

        <h1 style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}>
          Unable to Verify License
        </h1>

        <p style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 6px',
          lineHeight: 1.5,
        }}>
          Please connect to the internet and restart the app.
        </p>

        <p style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}>
          Your data is safe — the app will unlock once connectivity is restored.
        </p>

        {/* Quit button */}
        <div>
          <button
            onClick={() => window.close()}
            style={{
              padding: '8px 32px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--separator)',
              borderRadius: 6,
              cursor: 'default',
            }}
          >
            Quit
          </button>
        </div>

        {/* Version */}
        {version && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            marginTop: 32,
            opacity: 0.6,
          }}>
            v{version}
          </div>
        )}
      </div>
    </div>
  )
}
