import { useState } from 'react'

interface OnboardingPageProps {
  onComplete: () => void
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseId, setBaseId] = useState('appYXbUdcmSwBoPFU')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  const canSubmit = name.trim() && email.trim() && apiKey.trim() && baseId.trim() && !isValidating

  async function handleConnect() {
    if (!canSubmit) return
    setError('')
    setIsValidating(true)

    try {
      // Validate the PAT via Airtable whoami
      const result = await window.electronAPI.auth.validatePat(apiKey.trim())
      if (!result.success || !result.data) {
        setError(result.error || 'Invalid token — check your Personal Access Token and try again.')
        setIsValidating(false)
        return
      }

      // Save user identity
      const saveResult = await window.electronAPI.auth.saveUser({
        id: result.data.id,
        name: name.trim(),
        email: email.trim(),
        apiKey: apiKey.trim(),
        baseId: baseId.trim(),
      })

      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save settings.')
        setIsValidating(false)
        return
      }

      // Also save base ID via settings (sync engine reads it from there)
      await window.electronAPI.settings.set('airtable_base_id', baseId.trim())

      onComplete()
    } catch (err) {
      setError(String(err))
      setIsValidating(false)
    }
  }

  // Shared input style
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-primary)',
    background: 'var(--bg-input, var(--bg-tertiary))',
    border: '1px solid var(--separator)',
    borderRadius: 6,
    outline: 'none',
    cursor: 'default',
  }

  return (
    <div
      className="window-drag"
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-window)',
      }}
    >
      <div style={{
        width: 400,
        padding: 32,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            ILS CRM
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Welcome
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>
            Connect your Airtable account to get started
          </div>
        </div>

        {/* Form — grouped container */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          {/* Name */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--separator)' }}>
            <label style={{ display: 'flex', alignItems: 'center', minHeight: 28, cursor: 'default' }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>
                Your Name
              </span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Edward Hodge"
                style={inputStyle}
                autoFocus
              />
            </label>
          </div>

          {/* Email */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--separator)' }}>
            <label style={{ display: 'flex', alignItems: 'center', minHeight: 28, cursor: 'default' }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </label>
          </div>

          {/* PAT */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--separator)' }}>
            <label style={{ display: 'flex', alignItems: 'center', minHeight: 28, cursor: 'default' }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>
                API Token
              </span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="pat..."
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                    cursor: 'default',
                    padding: '2px 4px',
                  }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, paddingLeft: 100 }}>
              Create at airtable.com/create/tokens — needs data.records:read, data.records:write, and schema.bases:read scopes
            </div>
          </div>

          {/* Base ID */}
          <div style={{ padding: '10px 14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', minHeight: 28, cursor: 'default' }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-primary)', width: 100, flexShrink: 0 }}>
                Base ID
              </span>
              <input
                type="text"
                value={baseId}
                onChange={e => setBaseId(e.target.value)}
                style={inputStyle}
              />
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, paddingLeft: 100 }}>
              ILS CRM base ID — don't change unless instructed
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            fontSize: 12,
            color: 'var(--color-red)',
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(255, 59, 48, 0.08)',
            borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-on-accent)',
            background: canSubmit ? 'var(--color-accent)' : 'var(--bg-tertiary)',
            border: 'none',
            borderRadius: 8,
            cursor: 'default',
            opacity: canSubmit ? 1 : 0.5,
            transition: 'background 150ms, opacity 150ms',
          }}
        >
          {isValidating ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
