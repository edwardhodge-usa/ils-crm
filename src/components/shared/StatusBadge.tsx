/**
 * StatusBadge — renders a status/category label with tinted background.
 * Uses Apple accessible darker text (light mode) and brighter text (dark mode).
 */
import useDarkMode from '../../hooks/useDarkMode'
import { PIPELINE_STAGES, stageStatusBadgeColors } from '@/config/stages'

type BadgeSize = 'sm' | 'md'

// Build pipeline stage entries from centralized config
const pipelineStageColors = Object.fromEntries(
  PIPELINE_STAGES.map(s => [s, stageStatusBadgeColors(s)])
) as Record<string, { text: string; textDark: string; bg: string }>

// Apple color pairs: text (light accessible) / textDark (dark mode bright) / bg
export const colorMap: Record<string, { text: string; textDark: string; bg: string }> = {
  // Task/Proposal status
  'To Do':             { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },
  'In Progress':       { text: '#0055B3',  textDark: '#409CFF',  bg: 'rgba(0,122,255,0.22)' },
  'Waiting':           { text: '#C93400',  textDark: '#FF9F0A',  bg: 'rgba(255,149,0,0.22)' },
  'Completed':         { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'Cancelled':         { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },
  'Draft':             { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },
  'Pending Approval':  { text: '#C93400',  textDark: '#FF9F0A',  bg: 'rgba(255,149,0,0.22)' },
  'Approved':          { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'Rejected':          { text: '#D70015',  textDark: '#FF453A',  bg: 'rgba(255,59,48,0.22)' },
  'Sent to Client':    { text: '#0055B3',  textDark: '#409CFF',  bg: 'rgba(0,122,255,0.22)' },

  // Pipeline stages (canonical) — from centralized config
  ...pipelineStageColors,
  'Development':       stageStatusBadgeColors('Business Development'),
  // Legacy stage names (still in Airtable data)
  'Initial Contact':   { text: '#0E7A8D',  textDark: '#40CBE0',  bg: 'rgba(48,176,199,0.22)' },
  'Qualification':     { text: '#0055B3',  textDark: '#409CFF',  bg: 'rgba(0,122,255,0.22)' },
  'Meeting Scheduled': { text: '#0E7A8D',  textDark: '#40CBE0',  bg: 'rgba(48,176,199,0.22)' },
  'Contract Sent':     { text: '#D30047',  textDark: '#FF375F',  bg: 'rgba(255,45,85,0.22)' },
  'Future Client':     { text: '#0E7A8D',  textDark: '#40CBE0',  bg: 'rgba(48,176,199,0.22)' },

  // Categorization
  'Lead':              { text: '#0055B3',  textDark: '#409CFF',  bg: 'rgba(0,122,255,0.22)' },
  'Customer':          { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'Partner':           { text: '#0E7A8D',  textDark: '#40CBE0',  bg: 'rgba(48,176,199,0.22)' },
  'Vendor':            { text: '#C93400',  textDark: '#FF9F0A',  bg: 'rgba(255,149,0,0.22)' },
  'Talent':            { text: '#8944AB',  textDark: '#BF5AF2',  bg: 'rgba(175,82,222,0.22)' },
  'Other':             { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },
  'Unknown':           { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },

  // Priority
  'High':              { text: '#D70015',  textDark: '#FF453A',  bg: 'rgba(255,59,48,0.22)' },
  'Medium':            { text: '#C93400',  textDark: '#FF9F0A',  bg: 'rgba(255,149,0,0.22)' },
  'Low':               { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },

  // Company type
  'Active Client':     { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'Prospect':          { text: '#0055B3',  textDark: '#409CFF',  bg: 'rgba(0,122,255,0.22)' },
  'Past Client':       { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },

  // Portal
  'Active':            { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'ACTIVE':            { text: '#248A3D',  textDark: '#30D158',  bg: 'rgba(52,199,89,0.22)' },
  'Inactive':          { text: '#D70015',  textDark: '#FF453A',  bg: 'rgba(255,59,48,0.22)' },
  'IN-ACTIVE':         { text: '#D70015',  textDark: '#FF453A',  bg: 'rgba(255,59,48,0.22)' },
  'PENDING':           { text: '#C93400',  textDark: '#FF9F0A',  bg: 'rgba(255,149,0,0.22)' },
  'EXPIRED':           { text: '#636366',  textDark: '#98989D',  bg: 'rgba(142,142,147,0.22)' },
  'REVOKED':           { text: '#D70015',  textDark: '#FF453A',  bg: 'rgba(255,59,48,0.22)' },
}

export const defaultColors = { text: '#636366', textDark: '#98989D', bg: 'rgba(142,142,147,0.20)' }

interface StatusBadgeProps {
  value: string | null | undefined
  size?: BadgeSize
}

export default function StatusBadge({ value, size = 'sm' }: StatusBadgeProps) {
  const isDark = useDarkMode()
  if (!value) return null
  const colors = colorMap[value] || defaultColors
  const fontSize = size === 'sm' ? 11 : 13

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? colors.textDark : colors.text,
        background: colors.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  )
}
