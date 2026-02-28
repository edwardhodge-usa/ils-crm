export default function InteractionsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#98989D]">
      <svg className="w-16 h-16 opacity-30 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <h2 className="text-lg font-medium text-[#636366]">Interactions</h2>
      <p className="text-sm text-[#48484A] mt-1 max-w-sm text-center">
        Communication log for calls, emails, and meetings. Future integration with Gmail and Google Calendar will auto-populate this view.
      </p>
    </div>
  )
}
