import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FieldRenderer, type FormFieldDef } from './EntityForm'
import { CREATE_FIELD_REGISTRY } from '../../config/create-fields'

interface SubCreateState {
  entityName: string
  labelField: string
  searchText: string
  /** The field key on the parent form that triggered this sub-create */
  parentFieldKey: string
}

interface CreateRecordSheetProps {
  title: string
  fields: FormFieldDef[]
  defaults?: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => Promise<string | null>
  onClose: () => void
}

function SectionBlock({
  sectionName,
  sectionFields,
  values,
  setValue,
  onLinkedRecordCreate,
}: {
  sectionName: string
  sectionFields: FormFieldDef[]
  values: Record<string, unknown>
  setValue: (key: string, value: unknown) => void
  onLinkedRecordCreate?: (entityName: string, labelField: string, searchText: string) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-secondary)',
        marginBottom: 6,
      }}>
        {sectionName}
      </div>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 10,
        overflow: 'hidden',
      }}>
        {sectionFields.map((field, idx) => (
          <div key={field.key}>
            <div style={{ padding: '0 14px' }}>
              <FieldRenderer
                field={field}
                value={values[field.key]}
                onChange={(v) => setValue(field.key, v)}
                onLinkedRecordCreate={onLinkedRecordCreate}
              />
            </div>
            {idx < sectionFields.length - 1 && (
              <div style={{ height: 1, background: 'var(--separator)', marginLeft: 14 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function groupBySection(fields: FormFieldDef[]): Map<string, FormFieldDef[]> {
  const sections = new Map<string, FormFieldDef[]>()
  for (const field of fields) {
    const section = field.section || 'General'
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(field)
  }
  return sections
}

export default function CreateRecordSheet({
  title,
  fields,
  defaults,
  onSubmit,
  onClose,
}: CreateRecordSheetProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...defaults }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sub-create state (split-pane)
  const [subCreate, setSubCreate] = useState<SubCreateState | null>(null)
  const [subValues, setSubValues] = useState<Record<string, unknown>>({})
  const [subSaving, setSubSaving] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)

  // Escape key: close sub-pane first, then modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (subCreate) {
          setSubCreate(null)
          setSubValues({})
          setSubError(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, subCreate])

  function setValue(key: string, value: unknown) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function setSubValue(key: string, value: unknown) {
    setSubValues(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const id = await onSubmit(values)
      if (id) onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create record'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  // Called by FieldRenderer when user clicks "+ Create" on a linked record
  const handleLinkedRecordCreate = useCallback((entityName: string, labelField: string, searchText: string) => {
    // Find which parent field triggered this
    const parentField = fields.find(f => f.type === 'linkedRecord' && f.entityName === entityName)
    if (!parentField) return

    // Build initial values for the sub-entity
    const initValues: Record<string, unknown> = {}
    if (searchText) {
      if (entityName === 'contacts') {
        const parts = searchText.split(' ')
        initValues.first_name = parts[0] || ''
        initValues.last_name = parts.slice(1).join(' ') || ''
        initValues.contact_name = searchText
      } else {
        initValues[labelField] = searchText
      }
    }

    setSubCreate({ entityName, labelField, searchText, parentFieldKey: parentField.key })
    setSubValues(initValues)
    setSubError(null)
  }, [fields])

  // Confirm the sub-entity creation
  async function handleSubConfirm() {
    if (!subCreate) return
    const api = (window.electronAPI as unknown as Record<string, unknown>)[subCreate.entityName] as
      { create: (v: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }> } | undefined
    if (!api) return

    setSubSaving(true)
    setSubError(null)
    try {
      const res = await api.create(subValues)
      if (!res.success) throw new Error(res.error || 'Failed to create record')
      const newId = res.data as string

      // Link the new record to the parent field
      const currentVal = values[subCreate.parentFieldKey]
      let currentIds: string[] = []
      if (currentVal) {
        if (Array.isArray(currentVal)) currentIds = currentVal as string[]
        else if (typeof currentVal === 'string') {
          try { currentIds = JSON.parse(currentVal) } catch { currentIds = [] }
        }
      }
      setValue(subCreate.parentFieldKey, JSON.stringify([...currentIds, newId]))

      // Close sub-pane
      setSubCreate(null)
      setSubValues({})
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create record'
      setSubError(msg)
    } finally {
      setSubSaving(false)
    }
  }

  const mainSections = groupBySection(fields)

  // Sub-create config from registry
  const subConfig = subCreate ? CREATE_FIELD_REGISTRY[subCreate.entityName] : null
  // Filter out linkedRecord fields from sub-create (no nesting deeper than 2 levels)
  const subFields = subConfig?.fields.filter(f => f.type !== 'linkedRecord') || []
  const subSections = groupBySection(subFields)

  const isExpanded = Boolean(subCreate)

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
    >
      {/* Modal panel — animates width when sub-pane opens */}
      <div
        style={{
          width: isExpanded ? 900 : 520,
          maxHeight: 'calc(100vh - 80px)',
          background: 'var(--bg-sheet)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 250ms ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 12px', borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
            {subConfig && (
              <>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>/</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-accent)' }}>
                  {subConfig.title}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'var(--separator-opaque)', border: 'none',
              fontSize: 12, lineHeight: 1, color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'default', transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--separator-opaque)'}
          >
            ✕
          </button>
        </div>

        {/* Body: main form + optional sub-create pane */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Left pane: main entity form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0,
              borderRight: isExpanded ? '1px solid var(--separator)' : 'none',
              opacity: isExpanded ? 0.6 : 1,
              pointerEvents: isExpanded ? 'none' : 'auto',
              transition: 'opacity 200ms',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {error && (
                <div style={{
                  padding: '8px 12px', marginBottom: 12, borderRadius: 8,
                  background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)',
                  color: 'var(--color-red)', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              {Array.from(mainSections.entries()).map(([sectionName, sectionFields]) => (
                <SectionBlock
                  key={sectionName}
                  sectionName={sectionName}
                  sectionFields={sectionFields}
                  values={values}
                  setValue={setValue}
                  onLinkedRecordCreate={handleLinkedRecordCreate}
                />
              ))}
            </div>

            {/* Footer buttons */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              padding: '12px 20px', borderTop: '1px solid var(--separator)',
              flexShrink: 0,
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '6px 16px', borderRadius: 8,
                  background: 'var(--separator-opaque)', border: 'none',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  cursor: 'default', transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--separator-opaque)'}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '6px 16px', borderRadius: 8,
                  background: 'var(--color-accent)', border: 'none',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-on-accent)',
                  cursor: 'default', transition: 'background 150ms',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>

          {/* Right pane: sub-entity creation */}
          {isExpanded && subConfig && (
            <div style={{
              width: 380, flexShrink: 0,
              display: 'flex', flexDirection: 'column', minHeight: 0,
            }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {subError && (
                  <div style={{
                    padding: '8px 12px', marginBottom: 12, borderRadius: 8,
                    background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)',
                    color: 'var(--color-red)', fontSize: 13,
                  }}>
                    {subError}
                  </div>
                )}

                {Array.from(subSections.entries()).map(([sectionName, sectionFields]) => (
                  <SectionBlock
                    key={sectionName}
                    sectionName={sectionName}
                    sectionFields={sectionFields}
                    values={subValues}
                    setValue={setSubValue}
                  />
                ))}
              </div>

              {/* Sub-pane footer */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 8,
                padding: '12px 20px', borderTop: '1px solid var(--separator)',
                flexShrink: 0,
              }}>
                <button
                  type="button"
                  onClick={() => { setSubCreate(null); setSubValues({}); setSubError(null) }}
                  style={{
                    padding: '6px 16px', borderRadius: 8,
                    background: 'var(--separator-opaque)', border: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                    cursor: 'default', transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--separator-opaque)'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubConfirm}
                  disabled={subSaving}
                  style={{
                    padding: '6px 16px', borderRadius: 8,
                    background: 'var(--color-accent)', border: 'none',
                    fontSize: 13, fontWeight: 500, color: 'var(--text-on-accent)',
                    cursor: 'default', transition: 'background 150ms',
                    opacity: subSaving ? 0.5 : 1,
                  }}
                >
                  {subSaving ? 'Creating...' : `Create ${subConfig.title.replace('New ', '')}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
