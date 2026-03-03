// PipelineWidget — Pipeline Snapshot in grouped container pattern
// Gold standard: bg-secondary, 12px radius, internal header, separator rows

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface PipelineStage {
  sales_stage: string
  count: number
  total_value: number
}

interface PipelineWidgetProps {
  stages: PipelineStage[]
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v.toLocaleString()}`
}

// Map stage names to their token-based colors
const STAGE_BAR_COLORS: Record<string, string> = {
  '01 Prospecting': 'var(--color-teal)',
  '02 Qualified': 'var(--color-indigo)',
  '03 Proposal Sent': 'var(--color-orange)',
  '04 Negotiation': 'var(--color-pink)',
  '05 Closed Won': 'var(--color-green)',
  'Closed Won': 'var(--color-green)',
}

function stageBarColor(stageName: string): string {
  // Try exact match first, then partial
  if (STAGE_BAR_COLORS[stageName]) return STAGE_BAR_COLORS[stageName]
  const lower = stageName.toLowerCase()
  if (lower.includes('prospect')) return 'var(--color-teal)'
  if (lower.includes('qualif')) return 'var(--color-indigo)'
  if (lower.includes('proposal')) return 'var(--color-orange)'
  if (lower.includes('negot')) return 'var(--color-pink)'
  if (lower.includes('won') || lower.includes('closed')) return 'var(--color-green)'
  return 'var(--color-accent)'
}

function PipelineRow({ stage, maxCount, isLast }: { stage: PipelineStage; maxCount: number; isLast: boolean }) {
  const [hovered, setHovered] = useState(false)
  const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
  const isWon = stage.sales_stage.toLowerCase().includes('won') || stage.sales_stage === 'Closed Won'
  const barColor = stageBarColor(stage.sales_stage)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'default',
        borderBottom: isLast ? 'none' : '1px solid var(--separator)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 150ms',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          width: 130,
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: isWon ? 'var(--color-green)' : 'var(--text-primary)',
        }}
      >
        {isWon ? 'Won \u2713' : stage.sales_stage}
      </span>
      <div style={{ flex: 1, height: 6, background: 'var(--separator)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${barPct}%`,
            background: barColor,
            opacity: isWon ? 0.5 : 0.85,
            transition: 'width 400ms cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {stage.count}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          width: 64,
          textAlign: 'right',
          flexShrink: 0,
          color: isWon ? 'var(--color-green)' : 'var(--text-primary)',
        }}
      >
        {formatCurrency(stage.total_value)}
      </span>
    </div>
  )
}

export default function PipelineWidget({ stages }: PipelineWidgetProps) {
  const navigate = useNavigate()
  const maxCount = stages.length > 0 ? Math.max(...stages.map((s) => s.count)) : 1

  return (
    <div
      style={{
        background: 'var(--bg-grouped)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderBottom: '1px solid var(--separator)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
          }}
        >
          Pipeline
        </span>
        <button
          onClick={() => navigate('/pipeline')}
          style={{
            fontSize: 12,
            color: 'var(--color-accent)',
            cursor: 'default',
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
          }}
        >
          Open Pipeline
        </button>
      </div>

      {/* Rows */}
      {stages.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '24px 0', textAlign: 'center' }}>
          No active opportunities
        </p>
      ) : (
        <div>
          {stages.map((stage, i) => (
            <PipelineRow key={stage.sales_stage} stage={stage} maxCount={maxCount} isLast={i === stages.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
