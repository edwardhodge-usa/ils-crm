import StatusBadge from './StatusBadge'

export default function LinkedList({
  items,
  nameKey,
  statusKey,
  extraKey,
  extraLabel,
  extraRender,
  onItemClick,
  emptyMessage,
}: {
  items: Record<string, unknown>[]
  nameKey: string
  statusKey: string
  extraKey?: string
  extraLabel?: string
  extraRender?: (v: unknown) => string | null
  onItemClick?: (item: Record<string, unknown>) => void
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-[#636366] py-8 text-center">{emptyMessage}</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={(item.id as string) || i}
          className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-3 flex items-center justify-between cursor-pointer hover:bg-[#3A3A3C] transition-colors"
          onClick={() => onItemClick?.(item)}
        >
          <div>
            <p className="text-[13px] text-white font-medium">{item[nameKey] as string || 'Unnamed'}</p>
            {extraKey && extraLabel && (
              <p className="text-[11px] text-[#636366] mt-0.5">
                {extraLabel}: {extraRender ? extraRender(item[extraKey]) : (item[extraKey] as string) || '—'}
              </p>
            )}
          </div>
          <StatusBadge value={item[statusKey] as string} />
        </div>
      ))}
    </div>
  )
}
