// PipelineWidget — Pipeline Snapshot with indigo gradient bars
// Matches approved mockup: ils-crm-dashboard-v3.html

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

export default function PipelineWidget({ stages }: PipelineWidgetProps) {
  const navigate = useNavigate()
  const maxCount = stages.length > 0 ? Math.max(...stages.map(s => s.count)) : 1

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--separator)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px 10px', borderBottom: '1px solid var(--separator)',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Pipeline Snapshot
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: 1 }}>
            Showing: Active Opportunities
          </div>
        </div>
        <button
          onClick={() => navigate('/pipeline')}
          style={{ fontSize: 13, color: 'var(--color-accent)', cursor: 'default', background: 'none', border: 'none', fontFamily: 'inherit' }}
        >
          Open Pipeline →
        </button>
      </div>

      {/* All rows — no cap */}
      {stages.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center' }}>
          No active opportunities
        </p>
      ) : (
        <div>
          {stages.map((stage, i) => {
            const barPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const isWon = stage.sales_stage === 'Closed Won'
            const isLast = i === stages.length - 1
            return (
              <div
                key={stage.sales_stage}
                className="hover:bg-[var(--bg-hover)]"
                style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '10px 16px', cursor: 'default',
                  borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                  transition: 'background 150ms',
                }}
              >
                <span style={{
                  fontSize: 14, width: 140, flexShrink: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isWon ? 'var(--color-green)' : 'var(--text-primary)',
                }}>
                  {isWon ? 'Won \u2713' : stage.sales_stage}
                </span>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${barPct}%`,
                    background: 'linear-gradient(90deg, #5856D6, #9C99FF)',
                    opacity: isWon ? 0.45 : 1,
                    transition: 'width 400ms cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 26, textAlign: 'right', flexShrink: 0 }}>
                  {stage.count}
                </span>
                <span style={{
                  fontSize: 14, fontWeight: 600, width: 68, textAlign: 'right', flexShrink: 0,
                  color: isWon ? 'var(--color-green)' : 'var(--text-primary)',
                }}>
                  {formatCurrency(stage.total_value)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
