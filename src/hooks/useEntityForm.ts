import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface UseEntityFormOptions {
  entityApi: {
    getById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
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
      entityApi.getById(id)
        .then(result => {
          if (result.success && result.data) {
            setInitialValues(result.data as Record<string, unknown>)
          } else {
            setError(result.error || 'Record not found')
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to load record')
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  async function handleSave(values: Record<string, unknown>) {
    if (id) {
      const result = await entityApi.update(id, values)
      if (!result.success) throw new Error(result.error || 'Failed to update')
    } else {
      const result = await entityApi.create(values)
      if (!result.success) throw new Error(result.error || 'Failed to create')
    }
    navigate(basePath)
  }

  function handleCancel() {
    navigate(basePath)
  }

  return { id, isNew, initialValues, loading, error, handleSave, handleCancel }
}
