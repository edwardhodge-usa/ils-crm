import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { KanbanBoard } from './KanbanBoard'
import { DealDetail } from './DealDetail'
import { PIPELINE_STAGES } from '@/config/stages'
import type { DealItem } from '@/types'

type DealStage = DealItem['stage']

// All 11 Airtable stage names are now canonical — no mapping needed.
// Stage names in the app match Airtable exactly (verified 2026-03-12).
const VALID_STAGES = new Set<string>(PIPELINE_STAGES)

function toStage(raw: string | null | undefined): DealStage | null {
  if (!raw) return null
  return VALID_STAGES.has(raw) ? (raw as DealStage) : null
}

function resolveLinkedName(idsJson: unknown, nameMap: Map<string, string>): string | null {
  if (!idsJson) return null
  try {
    const ids = typeof idsJson === 'string' ? JSON.parse(idsJson) : idsJson
    if (Array.isArray(ids) && ids.length > 0) {
      return nameMap.get(ids[0]) ?? null
    }
  } catch { /* not valid JSON */ }
  return null
}

function resolveLinkedLogo(idsField: unknown, logoMap: Map<string, string>): string | null {
  if (!idsField) return null
  try {
    const ids = typeof idsField === 'string' ? JSON.parse(idsField) : idsField
    if (Array.isArray(ids) && ids.length > 0) {
      return logoMap.get(ids[0]) || null
    }
  } catch { /* ignore */ }
  return null
}

export default function PipelinePage() {
  const { data: rawData, loading, error, reload } = useEntityList(() => window.electronAPI.opportunities.getAll())
  const { data: companiesData } = useEntityList(() => window.electronAPI.companies.getAll())
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const navigate = useNavigate()

  const companyNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companiesData) {
      map.set(c.id as string, c.company_name as string)
    }
    return map
  }, [companiesData])

  const companyLogos = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companiesData) {
      if (c.logo_url) {
        map.set(c.id as string, c.logo_url as string)
      }
    }
    return map
  }, [companiesData])

  const deals: DealItem[] = useMemo(() => {
    const mapped: DealItem[] = []
    for (const o of rawData) {
      const stage = toStage(o.sales_stage as string | null)
      // Exclude Closed Lost and any unmapped stages
      if (!stage) continue

      mapped.push({
        id: o.id as string,
        dealName: (o.opportunity_name as string) || 'Unnamed',
        companyName: resolveLinkedName(o.company_ids, companyNames),
        companyLogoUrl: resolveLinkedLogo(o.company_ids, companyLogos),
        value: o.deal_value as number | null,
        probability: (o.probability_value as number | null) ?? null,
        stage,
        daysInStage: null, // not synced from Airtable — formula field not in local DB
      })
    }
    return mapped
  }, [rawData, companyNames, companyLogos])

  async function handleMove(dealId: string, toStage: string) {
    // Stage names now match Airtable exactly — save directly
    await window.electronAPI.opportunities.update(dealId, { sales_stage: toStage })
    reload()
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
  const totalValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const wonValue = deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '10px 16px', borderBottom: '1px solid var(--separator)' }}
      >
        <div className="flex items-center gap-6">
          <h1 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Pipeline</h1>
          <div className="flex items-center gap-5">
            <div>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>Active </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>${totalValue.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>Won </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green)' }}>${wonValue.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>Deals </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{deals.length}</span>
            </div>
          </div>
        </div>
        <PrimaryButton onClick={() => navigate('/pipeline/new')}>
          + New Deal
        </PrimaryButton>
      </div>

      {/* Kanban board — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanBoard
          deals={deals}
          selectedDealId={selectedDealId}
          onSelectDeal={(id) => setSelectedDealId(prev => prev === id ? null : id)}
          onMove={handleMove}
        />
      </div>

      {/* Deal detail slide-in panel */}
      <DealDetail dealId={selectedDealId} onClose={() => setSelectedDealId(null)} onDeleted={() => { setSelectedDealId(null); reload() }} onSaved={reload} />
    </div>
  )
}
