import { useState, useEffect } from 'react'

interface UseEntityListResult {
  data: Record<string, unknown>[]
  loading: boolean
  error: string | null
  reload: () => void
}

export default function useEntityList(
  apiFn: () => Promise<{ success: boolean; data?: unknown; error?: string }>
): UseEntityListResult {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn()
      if (result.success && result.data) {
        setData(result.data as Record<string, unknown>[])
      } else {
        setError(result.error || 'Failed to load data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { data, loading, error, reload: load }
}
