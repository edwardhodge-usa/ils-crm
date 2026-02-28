import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface UseEntityFormOptions {
  entityApi: {
    getById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    refresh?: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    create: (fields: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>
    update: (id: string, fields: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }
  basePath: string
  defaults?: Record<string, unknown>
}

interface UseEntityFormResult {
  id: string | undefined
  isNew: boolean
  initialValues: Record<string, unknown> | null
  loading: boolean
  error: string | null
  handleSave: (values: Record<string, unknown>) => Promise<void>
  handleCancel: () => void
}

export default function useEntityForm({ entityApi, basePath, defaults }: UseEntityFormOptions): UseEntityFormResult {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const [initialValues, setInitialValues] = useState<Record<string, unknown> | null>(
    isNew ? (defaults || {}) : null
  )
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      setLoading(true)
      // Pull latest from Airtable before editing (falls back to local cache if offline)
      const loadFn = entityApi.refresh ?? entityApi.getById
      loadFn(id)
        .then(result => {
          if (result.success && result.data) {
            setInitialValues(result.data as Record<string, unknown>)
          } else {
            const msg = result.error || 'Record not found'
            console.error(`[Form] Failed to load record ${id}:`, msg)
            setError(msg)
          }
        })
        .catch(err => {
          const msg = err instanceof Error ? err.message : 'Failed to load record'
          console.error(`[Form] Failed to load record ${id}:`, msg)
          setError(msg)
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      // Only send fields the user actually changed (dirty tracking)
      // This prevents overwriting newer Airtable values with stale local data
      const changedFields: Record<string, unknown> = {}
      for (const key of Object.keys(values)) {
        if (values[key] !== initialValues?.[key]) {
          changedFields[key] = values[key]
        }
      }

      if (Object.keys(changedFields).length === 0) {
        // Nothing changed — just navigate back
        navigate(basePath)
        return
      }

      const result = await entityApi.update(id, changedFields)
      if (!result.success) {
        const msg = result.error || 'Failed to update'
        console.error(`[Form] Save failed (update ${id}):`, msg)
        throw new Error(msg)
      }
    } else {
      const result = await entityApi.create(values)
      if (!result.success) {
        const msg = result.error || 'Failed to create'
        console.error('[Form] Save failed (create):', msg)
        throw new Error(msg)
      }
    }
    navigate(basePath)
  }

  function handleCancel() {
    navigate(basePath)
  }

  return { id, isNew, initialValues, loading, error, handleSave, handleCancel }
}
