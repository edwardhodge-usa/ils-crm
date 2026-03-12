import { useState, useEffect, useMemo, useCallback } from 'react'
import PersonList from './PersonList'
import PersonDetail from './PersonDetail'
import { groupByPerson } from '../../utils/portal-helpers'

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupBy = 'company' | 'stage' | 'none'

interface ByPersonViewProps {
  pages: Record<string, unknown>[]
  accessRecords: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  search: string
  onSearchChange: (s: string) => void
  onSwitchToPageView: (pageAddress: string) => void
  reloadAccess: () => void
  view: 'byPage' | 'byPerson'
  onViewChange: (v: 'byPage' | 'byPerson') => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ByPersonView({
  pages,
  accessRecords,
  logs,
  search,
  onSearchChange,
  onSwitchToPageView,
  reloadAccess,
  view,
  onViewChange,
}: ByPersonViewProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<GroupBy>('company')

  // ── Derived data ──────────────────────────────────────────────────────────

  const personMap = useMemo(() => groupByPerson(accessRecords), [accessRecords])

  const selectedRecords = useMemo(
    () => (selectedEmail ? (personMap.get(selectedEmail) ?? []) : []),
    [personMap, selectedEmail],
  )

  // ── Auto-select first person ──────────────────────────────────────────────

  useEffect(() => {
    if (!selectedEmail && personMap.size > 0) {
      setSelectedEmail(personMap.keys().next().value ?? null)
    }
  }, [personMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAccessFieldSave = useCallback(
    async (recordId: string, key: string, value: unknown) => {
      await window.electronAPI.portalAccess.update(recordId, { [key]: value })
      reloadAccess()
    },
    [reloadAccess],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <PersonList
        accessRecords={accessRecords}
        selectedEmail={selectedEmail}
        onSelect={setSelectedEmail}
        search={search}
        onSearchChange={onSearchChange}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        view={view}
        onViewChange={onViewChange}
        onGrantAccess={() => onViewChange('byPage')}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderLeft: '1px solid var(--separator)',
          overflow: 'auto',
        }}
      >
        {selectedEmail && selectedRecords.length > 0 ? (
          <PersonDetail
            email={selectedEmail}
            records={selectedRecords}
            pages={pages}
            logs={logs}
            onAccessFieldSave={handleAccessFieldSave}
            onNavigateToPage={onSwitchToPageView}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              fontSize: 14,
              cursor: 'default',
            }}
          >
            Select a person to view details
          </div>
        )}
      </div>
    </div>
  )
}
