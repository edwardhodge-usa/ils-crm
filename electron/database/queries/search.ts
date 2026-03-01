// Cross-table search queries

import { getDatabase } from '../init'
import { resultToObjects } from '../utils'

export interface SearchResult {
  type: string
  id: string
  name: string
  subtitle: string | null
}

interface SearchConfig {
  type: string
  table: string
  nameCol: string
  subtitleCol?: string
  searchCols: string[]
}

const SEARCH_CONFIGS: SearchConfig[] = [
  {
    type: 'contact',
    table: 'contacts',
    nameCol: 'contact_name',
    subtitleCol: 'company',
    searchCols: ['contact_name', 'company', 'email'],
  },
  {
    type: 'company',
    table: 'companies',
    nameCol: 'company_name',
    subtitleCol: 'type',
    searchCols: ['company_name'],
  },
  {
    type: 'opportunity',
    table: 'opportunities',
    nameCol: 'opportunity_name',
    subtitleCol: 'sales_stage',
    searchCols: ['opportunity_name'],
  },
  {
    type: 'task',
    table: 'tasks',
    nameCol: 'task',
    subtitleCol: 'status',
    searchCols: ['task'],
  },
  {
    type: 'project',
    table: 'projects',
    nameCol: 'project_name',
    subtitleCol: 'status',
    searchCols: ['project_name'],
  },
  {
    type: 'proposal',
    table: 'proposals',
    nameCol: 'proposal_name',
    subtitleCol: 'status',
    searchCols: ['proposal_name'],
  },
]

const VALID_TABLE = new Set([
  'contacts', 'companies', 'opportunities', 'tasks', 'projects', 'proposals',
])
const VALID_COL = /^[a-z_][a-z0-9_]*$/

export function searchAll(term: string): SearchResult[] {
  if (!term || term.trim().length < 2) return []

  const db = getDatabase()
  const pattern = `%${term}%`
  const results: SearchResult[] = []

  for (const config of SEARCH_CONFIGS) {
    if (!VALID_TABLE.has(config.table)) continue

    const allCols = [...config.searchCols, config.nameCol, ...(config.subtitleCol ? [config.subtitleCol] : [])]
    if (allCols.some(col => !VALID_COL.test(col))) continue

    const selectCols = [
      'id',
      config.nameCol,
      ...(config.subtitleCol ? [config.subtitleCol] : []),
    ]
    const whereClause = config.searchCols
      .map((col) => `${col} LIKE ?`)
      .join(' OR ')
    const params = config.searchCols.map(() => pattern)

    const rows = resultToObjects(
      db.exec(
        `SELECT ${selectCols.join(', ')} FROM ${config.table} WHERE ${whereClause} LIMIT 10`,
        params
      )
    )

    for (const row of rows) {
      results.push({
        type: config.type,
        id: row.id as string,
        name: (row[config.nameCol] as string) || 'Unnamed',
        subtitle: config.subtitleCol
          ? (row[config.subtitleCol] as string | null)
          : null,
      })
    }
  }

  return results
}
