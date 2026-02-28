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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-[#2C2C2E] rounded-xl border border-[#3A3A3C] shadow-2xl w-[360px] p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
        <p className="text-[13px] text-[#98989D] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] text-[#98989D] bg-[#3A3A3C] rounded-md hover:bg-[#48484A] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-[13px] text-white rounded-md transition-colors ${
              destructive
                ? 'bg-[#FF453A] hover:bg-[#FF6961]'
                : 'bg-[#0A84FF] hover:bg-[#0077ED]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
