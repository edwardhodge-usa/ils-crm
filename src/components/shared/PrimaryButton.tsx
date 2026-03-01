interface PrimaryButtonProps {
  onClick: () => void
  children: React.ReactNode
}

export default function PrimaryButton({ onClick, children }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-[var(--text-primary)] bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  )
}
