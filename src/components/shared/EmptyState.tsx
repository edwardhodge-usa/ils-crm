export default function EmptyState({
  title,
  message,
}: {
  title: string
  message?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="w-12 h-12 text-[#3A3A3C] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
      <h3 className="text-[15px] font-medium text-[#636366]">{title}</h3>
      {message && <p className="text-[13px] text-[#48484A] mt-1">{message}</p>}
    </div>
  )
}
