import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import KanbanBoard, { type KanbanColumn } from '../shared/KanbanBoard'
import StatusBadge from '../shared/StatusBadge'

const STAGES = [
  'Initial Contact',
  'Qualification',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Contract Sent',
  'Development',
  'Closed Won',
  'Closed Lost',
]

interface OpportunityCard {
  id: string
  opportunity_name: string
  deal_value: number | null
  company: string | null
  probability: string | null
  sales_stage: string
}

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const result = await window.electronAPI.opportunities.getAll()
      if (result.success && result.data) {
        setOpportunities(
          (result.data as Record<string, unknown>[]).map(o => ({
            id: o.id as string,
            opportunity_name: (o.opportunity_name as string) || 'Unnamed',
            deal_value: o.deal_value as number | null,
            company: o.company as string | null,
            probability: o.probability as string | null,
            sales_stage: (o.sales_stage as string) || 'Initial Contact',
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  const columns: KanbanColumn<OpportunityCard>[] = STAGES.map(stage => ({
    id: stage,
    label: stage,
    items: opportunities.filter(o => o.sales_stage === stage),
  }))

  async function handleMove(itemId: string, _fromColumn: string, toColumn: string) {
    // Optimistic update
    setOpportunities(prev =>
      prev.map(o => (o.id === itemId ? { ...o, sales_stage: toColumn } : o))
    )

    // Push to Airtable
    try {
      await window.electronAPI.opportunities.update(itemId, { sales_stage: toColumn })
    } catch {
      // Revert on failure
      setOpportunities(prev =>
        prev.map(o => (o.id === itemId ? { ...o, sales_stage: _fromColumn } : o))
      )
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#636366] text-[13px]">Loading...</div>
  }

  const totalValue = opportunities
    .filter(o => o.sales_stage !== 'Closed Won' && o.sales_stage !== 'Closed Lost')
    .reduce((sum, o) => sum + (o.deal_value || 0), 0)

  const wonValue = opportunities
    .filter(o => o.sales_stage === 'Closed Won')
    .reduce((sum, o) => sum + (o.deal_value || 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6 text-[13px]">
        <div>
          <span className="text-[#636366]">Active Pipeline: </span>
          <span className="text-white font-medium">${totalValue.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[#636366]">Won: </span>
          <span className="text-[#34C759] font-medium">${wonValue.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[#636366]">Deals: </span>
          <span className="text-white font-medium">{opportunities.length}</span>
        </div>
        </div>
        <button
          onClick={() => navigate('/pipeline/new')}
          className="px-3 py-1.5 text-[13px] text-white bg-[#0A84FF] rounded-md hover:bg-[#0077ED] transition-colors whitespace-nowrap"
        >
          + New Opportunity
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 min-h-0">
        <KanbanBoard
          columns={columns}
          renderCard={(opp) => (
            <div className="bg-[#2C2C2E] rounded-lg border border-[#3A3A3C] p-3 cursor-grab active:cursor-grabbing hover:border-[#48484A] transition-colors">
              <p className="text-[13px] text-white font-medium mb-1 line-clamp-2">
                {opp.opportunity_name}
              </p>
              {Boolean(opp.company) && (
                <p className="text-[11px] text-[#636366] mb-2">{opp.company}</p>
              )}
              <div className="flex items-center justify-between">
                {opp.deal_value ? (
                  <span className="text-[12px] text-[#34C759] font-medium">
                    ${opp.deal_value.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#48484A]">No value</span>
                )}
                {Boolean(opp.probability) && (
                  <StatusBadge value={opp.probability!} />
                )}
              </div>
            </div>
          )}
          onMove={handleMove}
        />
      </div>
    </div>
  )
}
