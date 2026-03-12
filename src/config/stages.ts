// Centralized pipeline stage colors — single source of truth
// Previously duplicated across 6+ component files

export const PIPELINE_STAGES = [
  'Prospecting', 'Qualified', 'Business Development',
  'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

interface StageColorConfig {
  /** CSS variable for single-color use (dots, bar charts) */
  cssVar: string
  /** CSS token variables for badge bg/fg (defined in tokens.css) */
  tokenBg: string
  tokenFg: string
  /** Raw hex colors for light and dark mode */
  hex: { light: string; dark: string }
  /** Tinted rgba background for badges */
  bg: string
}

const STAGE_MAP: Record<PipelineStage, StageColorConfig> = {
  'Prospecting': {
    cssVar: 'var(--color-yellow)',
    tokenBg: 'var(--stage-prospecting-bg)', tokenFg: 'var(--stage-prospecting)',
    hex: { light: '#9D8500', dark: '#FFD60A' },
    bg: 'rgba(255,204,0,0.22)',
  },
  'Qualified': {
    cssVar: 'var(--color-orange)',
    tokenBg: 'var(--stage-qualified-bg)', tokenFg: 'var(--stage-qualified)',
    hex: { light: '#A04B00', dark: '#FF9F0A' },
    bg: 'rgba(255,149,0,0.22)',
  },
  'Business Development': {
    cssVar: 'var(--color-purple)',
    tokenBg: 'var(--stage-bizdev-bg)', tokenFg: 'var(--stage-bizdev)',
    hex: { light: '#8944AB', dark: '#BF5AF2' },
    bg: 'rgba(175,82,222,0.22)',
  },
  'Proposal Sent': {
    cssVar: 'var(--color-indigo)',
    tokenBg: 'var(--stage-proposal-bg)', tokenFg: 'var(--stage-proposal)',
    hex: { light: '#3634A3', dark: '#5E5CE6' },
    bg: 'rgba(88,86,214,0.22)',
  },
  'Negotiation': {
    cssVar: 'var(--color-teal)',
    tokenBg: 'var(--stage-negotiation-bg)', tokenFg: 'var(--stage-negotiation)',
    hex: { light: '#0E7A8D', dark: '#40CBE0' },
    bg: 'rgba(48,176,199,0.22)',
  },
  'Closed Won': {
    cssVar: 'var(--color-green)',
    tokenBg: 'var(--stage-won-bg)', tokenFg: 'var(--stage-won)',
    hex: { light: '#248A3D', dark: '#30D158' },
    bg: 'rgba(52,199,89,0.22)',
  },
  'Closed Lost': {
    cssVar: 'var(--color-red)',
    tokenBg: 'var(--stage-lost-bg)', tokenFg: 'var(--stage-lost)',
    hex: { light: '#D70015', dark: '#FF453A' },
    bg: 'rgba(255,59,48,0.22)',
  },
}

const FALLBACK_CSS_VAR = 'var(--color-fill-tertiary)'
const FALLBACK_COLORS = { light: '#636366', dark: '#98989D' }
const FALLBACK_BG = 'rgba(142,142,147,0.20)'

function lookup(stage: string): StageColorConfig | null {
  if (stage in STAGE_MAP) return STAGE_MAP[stage as PipelineStage]
  // Legacy prefixed names (e.g. "01 Prospecting")
  for (const [name, config] of Object.entries(STAGE_MAP)) {
    if (stage.includes(name)) return config
  }
  return null
}

/** Single CSS variable color (for dots, column headers) */
export function stageDotColor(stage: string): string {
  return lookup(stage)?.cssVar ?? FALLBACK_CSS_VAR
}

/** CSS token variables for badge bg/fg (DealCard pattern) */
export function stageBadgeTokens(stage: string): { bg: string; text: string } {
  const c = lookup(stage)
  return c ? { bg: c.tokenBg, text: c.tokenFg } : { bg: FALLBACK_BG, text: FALLBACK_CSS_VAR }
}

/** Bar chart color with legacy prefix fallback (PipelineWidget) */
export function stageBarColor(stage: string): string {
  return lookup(stage)?.cssVar ?? FALLBACK_CSS_VAR
}

/** Full colors for badges needing light/dark mode hex (Company360, CompanyDetail) */
export function stageFullColors(stage: string): { bg: string; fg: string; fgDark: string } {
  const c = lookup(stage)
  return c
    ? { bg: c.bg, fg: c.hex.light, fgDark: c.hex.dark }
    : { bg: FALLBACK_BG, fg: FALLBACK_COLORS.light, fgDark: FALLBACK_COLORS.dark }
}

/** StatusBadge format: { text, textDark, bg } */
export function stageStatusBadgeColors(stage: string): { text: string; textDark: string; bg: string } {
  const c = lookup(stage)
  return c
    ? { text: c.hex.light, textDark: c.hex.dark, bg: c.bg }
    : { text: FALLBACK_COLORS.light, textDark: FALLBACK_COLORS.dark, bg: FALLBACK_BG }
}
