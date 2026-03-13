// ── Types ────────────────────────────────────────────────────────────────────

interface FramerSyncBannerProps {
  visible: boolean
  onDismiss: () => void
}

// ── Warning colors (intentional exception — no CSS var for warning orange) ──

const WARNING = {
  bg: 'rgba(255,165,0,0.08)',
  border: '1px solid rgba(255,165,0,0.15)',
  text: 'rgba(255,165,0,0.9)',
  buttonBg: 'rgba(255,165,0,0.15)',
  dismiss: 'rgba(255,165,0,0.6)',
} as const

// ── Component ────────────────────────────────────────────────────────────────

export default function FramerSyncBanner({ visible, onDismiss }: FramerSyncBannerProps) {
  if (!visible) return null

  const handleOpenFramer = () => {
    window.electronAPI?.shell?.openExternal?.('https://framer.com/projects/ImagineLab-Front-Page--qq2NfIkO8OdMKvVMZXJR-8RBFW?node=uzKrlTPBU')
  }

  return (
    <div
      style={{
        margin: '12px 20px',
        padding: '10px 14px',
        background: WARNING.bg,
        border: WARNING.border,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Warning icon */}
      <span
        style={{
          fontSize: 15,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        &#9888;
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: WARNING.text,
          lineHeight: 1.3,
        }}
      >
        Page edited — Changes need to be published in Framer
      </span>

      {/* Open Framer button */}
      <button
        onClick={handleOpenFramer}
        style={{
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: WARNING.text,
          background: WARNING.buttonBg,
          border: 'none',
          borderRadius: 6,
          cursor: 'default',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Open Framer
      </button>

      {/* Dismiss X */}
      <button
        onClick={onDismiss}
        style={{
          padding: '2px 4px',
          fontSize: 14,
          lineHeight: 1,
          color: WARNING.dismiss,
          background: 'none',
          border: 'none',
          borderRadius: 4,
          cursor: 'default',
          flexShrink: 0,
        }}
        dangerouslySetInnerHTML={{ __html: '&#10005;' }}
      />
    </div>
  )
}
