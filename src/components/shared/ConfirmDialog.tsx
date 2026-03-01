import { useEffect } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  destructive = true,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/35" />
      <div
        className="relative bg-[var(--bg-secondary)] rounded-xl border border-[var(--separator-opaque)] shadow-2xl w-[360px] p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-base text-[var(--text-secondary)] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[var(--text-secondary)] bg-[var(--separator-opaque)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-[var(--text-primary)] rounded-md transition-colors ${
              destructive
                ? 'bg-[var(--color-red)] hover:bg-[var(--color-red)]'
                : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
