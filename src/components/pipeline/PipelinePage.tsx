import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../shared/LoadingSpinner'
import PrimaryButton from '../shared/PrimaryButton'
import useEntityList from '../../hooks/useEntityList'
import { KanbanBoard } from './KanbanBoard'
import type { DealItem } from '@/types'

type DealStage = DealItem['stage']

// Map all legacy/extended Airtable stage values to the 5 canonical Kanban stages
const STAGE_MAP: Record<string, DealStage> = {
  // Prospecting bucket
  'Initial Contact': 'Prospecting',
  'Outbound Prospecting': 'Prospecting',
  'Future Client': 'Prospecting',
  'Investment': 'Prospecting',
  // Qualified bucket
  'Qualification': 'Qualified',
  'Meeting Scheduled': 'Qualified',
  // Direct pass-throughs
  'Proposal Sent': 'Proposal Sent',
  'Negotiation': 'Negotiation',
  'Contract Sent': 'Negotiation',
  'Development': 'Negotiation',
  // Win/loss
  'Closed Won': 'Closed Won',
  // Closed Lost is excluded from the board (filtered out below)
}

function toStage(raw: string | null | undefined): DealStage | null {
  if (!raw) return 'Prospecting'
  return STAGE_MAP[raw] ?? null
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

export default function PipelinePage() {
  const { data: rawData, loading, error } = useEntityList(() => window.electronAPI.opportunities.getAll())
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
        value: o.deal_value as number | null,
        probability: (o.probability_value as number | null) ?? null,
        stage,
        daysInStage: null, // not synced from Airtable — formula field not in local DB
      })
    }
    return mapped
  }, [rawData, companyNames])

  if (loading) return <LoadingSpinner />

  if (error) {
    return <div className="flex items-center justify-center h-full text-[var(--color-red)]">{error}</div>
  }

  const activeDeals = deals.filter(d => d.stage !== 'Closed Won')
  const totalValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const wonValue = deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--separator)] flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-[13px] font-semibold text-[var(--text-primary)]">Pipeline</h1>
          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="text-[var(--text-tertiary)]">Active: </span>
              <span className="text-[var(--text-primary)] font-medium">${totalValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Won: </span>
              <span className="text-[var(--color-green)] font-medium">${wonValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">Deals: </span>
              <span className="text-[var(--text-primary)] font-medium">{deals.length}</span>
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
        />
      </div>

      {/* Deal detail slide-in panel (placeholder — Task 7) */}
      {selectedDealId && (
        <div
          className="absolute right-0 top-0 bottom-0 w-[300px] bg-[var(--bg-sheet)] border-l border-[var(--separator)] shadow-xl z-10 flex flex-col"
          style={{ top: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--separator)]">
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">Deal Detail</span>
            <button
              onClick={() => setSelectedDealId(null)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-[16px] leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-[var(--text-tertiary)]">Deal detail coming in Task 7</p>
          </div>
        </div>
      )}
    </div>
  )
}
