import { useState, useEffect, useCallback } from 'react'

interface SyncTableStatus {
  table_name: string
  last_sync_at: string | null
  record_count: number
  status: string
  error: string | null
}

interface SyncProgress {
  phase: 'pulling' | 'pushing' | 'complete' | 'error'
  table?: string
  tablesCompleted: number
  tablesTotal: number
  recordsPulled: number
  error?: string
}

export function useSyncStatus() {
  const [tables, setTables] = useState<SyncTableStatus[]>([])
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshStatus = useCallback(async () => {
    try {
      const result = await window.electronAPI.sync.getStatus()
      if (result.success && result.data) {
        setTables(result.data as SyncTableStatus[])
      }
    } catch {
      // Ignore errors during status refresh
    }
  }, [])

  useEffect(() => {
    refreshStatus()

    window.electronAPI.sync.onProgress((data) => {
      const p = data as SyncProgress
      setProgress(p)
      setIsSyncing(p.phase === 'pulling' || p.phase === 'pushing')

      if (p.phase === 'complete' || p.phase === 'error') {
        refreshStatus()
        setTimeout(() => setIsSyncing(false), 500)
      }

      if (p.phase === 'complete') {
        window.dispatchEvent(new Event('sync-complete'))
      }
    })

    return () => {
      window.electronAPI.sync.removeProgressListener()
    }
  }, [refreshStatus])

  const forceSync = useCallback(async () => {
    setIsSyncing(true)
    const result = await window.electronAPI.sync.forceSync()
    // Don't set isSyncing=false here — the progress listener handles it
    // when it receives phase='complete', preventing double-set flicker
    return result
  }, [])

  const startSync = useCallback(async () => {
    await window.electronAPI.sync.start()
  }, [])

  const stopSync = useCallback(async () => {
    await window.electronAPI.sync.stop()
  }, [])

  return {
    tables,
    progress,
    isSyncing,
    forceSync,
    startSync,
    stopSync,
    refreshStatus,
  }
}
