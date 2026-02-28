import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  type: string
  id: string
  name: string
  subtitle: string | null
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Listen for Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      const res = await window.electronAPI.search.query(query.trim())
      if (res.success && res.data) {
        setResults(res.data as SearchResult[])
        setSelectedIndex(0)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  const navigateToResult = useCallback((result: SearchResult) => {
    setOpen(false)
    switch (result.type) {
      case 'contact':
        navigate(`/contacts/${result.id}`)
        break
      case 'company':
        navigate(`/companies/${result.id}`)
        break
      case 'opportunity':
        navigate('/pipeline')
        break
      case 'task':
        navigate('/tasks')
        break
      case 'project':
        navigate('/projects')
        break
      case 'proposal':
        navigate('/proposals')
        break
      default:
        break
    }
  }, [navigate])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateToResult(results[selectedIndex])
    }
  }

  const typeIcons: Record<string, string> = {
    contact: 'C',
    company: 'Co',
    opportunity: 'O',
    task: 'T',
    project: 'P',
    proposal: 'Pr',
  }

  const typeColors: Record<string, string> = {
    contact: 'bg-[#0A84FF]/20 text-[#0A84FF]',
    company: 'bg-[#BF5AF2]/20 text-[#BF5AF2]',
    opportunity: 'bg-[#34C759]/20 text-[#34C759]',
    task: 'bg-[#FF9F0A]/20 text-[#FF9F0A]',
    project: 'bg-[#64D2FF]/20 text-[#64D2FF]',
    proposal: 'bg-[#FF375F]/20 text-[#FF375F]',
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20%]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Palette */}
      <div
        className="relative w-[520px] bg-[#2C2C2E] rounded-xl border border-[#3A3A3C] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3A3A3C]">
          <svg className="w-4 h-4 text-[#636366] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, companies, deals..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder-[#636366] outline-none"
          />
          <kbd className="text-[10px] text-[#636366] bg-[#3A3A3C] px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto py-1">
            {results.map((result, i) => (
              <button
                key={`${result.type}-${result.id}`}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-[#0A84FF]/15' : 'hover:bg-[#3A3A3C]'
                }`}
                onClick={() => navigateToResult(result)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${typeColors[result.type] || 'bg-[#3A3A3C] text-[#98989D]'}`}>
                  {typeIcons[result.type] || '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white truncate">{result.name}</p>
                  {result.subtitle && (
                    <p className="text-[11px] text-[#636366] truncate">{result.subtitle}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#48484A] capitalize flex-shrink-0">{result.type}</span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[13px] text-[#636366]">No results for "{query}"</p>
          </div>
        )}

        {/* Hint */}
        {!query.trim() && (
          <div className="py-6 text-center">
            <p className="text-[13px] text-[#636366]">Type to search across all records</p>
          </div>
        )}
      </div>
    </div>
  )
}
