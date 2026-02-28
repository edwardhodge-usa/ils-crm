interface PrimaryButtonProps {
  onClick: () => void
  children: React.ReactNode
}

export default function PrimaryButton({ onClick, children }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  )
}
