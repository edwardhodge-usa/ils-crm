import { useState, useMemo } from 'react'

/**
 * Format a cell value for display. If the value is a JSON-encoded array
 * (common for multi-select fields stored in sql.js), parse it and join
 * the items with commas. Otherwise return the plain string.
 */
function formatCellValue(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str)
      if (Array.isArray(arr)) {
        return arr.join(', ')
      }
    } catch {
      // Not valid JSON — fall through to return raw string
    }
  }
  return str
}

interface Column {
  key: string
  label: string
  width?: string
  sortable?: boolean
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  onRowClick?: (row: Record<string, unknown>) => void
  searchKeys?: string[]
  emptyMessage?: string
  actions?: React.ReactNode
}

export default function DataTable({
  columns,
  data,
  onRowClick,
  searchKeys,
  emptyMessage = 'No records found',
  actions,
}: DataTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    if (!search.trim() || !searchKeys?.length) return data
    const term = search.toLowerCase()
    return data.filter(row =>
      searchKeys.some(key => {
        const val = row[key]
        return val != null && String(val).toLowerCase().includes(term)
      })
    )
  }, [data, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar + actions */}
      {(searchKeys?.length || actions) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {searchKeys && searchKeys.length > 0 ? (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full max-w-sm bg-[#2C2C2E] border border-[#3A3A3C] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#636366] focus:outline-none focus:border-[#0A84FF] transition-colors"
            />
          ) : <div />}
          {actions}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-[#3A3A3C]">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-[#2C2C2E] z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-2.5 text-[#98989D] font-medium border-b border-[#3A3A3C] ${
                    col.sortable !== false ? 'cursor-pointer hover:text-white select-none' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={(row.id as string) || i}
                className={`border-b border-[#3A3A3C] last:border-b-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-[#2C2C2E] transition-colors' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2.5 text-white">
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] != null ? formatCellValue(row[col.key]) : <span className="text-[#48484A]">—</span>)
                    }
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[#636366]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-2 text-[12px] text-[#636366]">
        {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
        {search && ` (filtered from ${data.length})`}
      </div>
    </div>
  )
}
