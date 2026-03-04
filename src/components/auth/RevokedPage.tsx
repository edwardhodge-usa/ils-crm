import { useState, useEffect } from 'react'

export default function RevokedPage() {
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
        {/* Icon — lock/shield shape */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255, 59, 48, 0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 22,
        }}>
          {/* Simple lock icon using Unicode */}
          <span style={{ color: 'var(--color-red)' }}>&#x1F512;</span>
        </div>

        <h1 style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}>
          Access Revoked
        </h1>

        <p style={{
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 6px',
          lineHeight: 1.5,
        }}>
          Your access to ILS CRM has been revoked.
        </p>

        <p style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}>
          If you believe this is an error, contact your administrator.
        </p>

        {/* Email link */}
        <button
          onClick={() => window.electronAPI.shell.openExternal('mailto:admin@imaginelabstudios.com')}
          style={{
            display: 'inline-block',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-accent)',
            background: 'none',
            border: 'none',
            cursor: 'default',
            padding: 0,
            marginBottom: 24,
          }}
        >
          admin@imaginelabstudios.com
        </button>

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
