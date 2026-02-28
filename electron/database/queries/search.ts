// Cross-table search queries

import { getDatabase } from '../init'

interface QueryResult {
  columns: string[]
  values: unknown[][]
}

function resultToObjects(result: QueryResult[]): Record<string, unknown>[] {
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj
  })
}

export interface SearchResult {
  type: string
  id: string
  name: string
  subtitle: string | null
}

export function searchAll(term: string): SearchResult[] {
  if (!term || term.trim().length < 2) return []

  const db = getDatabase()
  const pattern = `%${term}%`
  const results: SearchResult[] = []

  // Contacts
  const contacts = db.exec(
    `SELECT id, contact_name, company FROM contacts
     WHERE contact_name LIKE ? OR company LIKE ? OR email LIKE ?
     LIMIT 10`,
    [pattern, pattern, pattern]
  )
  for (const row of resultToObjects(contacts)) {
    results.push({
      type: 'contact',
      id: row.id as string,
      name: (row.contact_name as string) || 'Unnamed',
      subtitle: row.company as string | null,
    })
  }

  // Companies
  const companies = db.exec(
    `SELECT id, company_name, type FROM companies
     WHERE company_name LIKE ?
     LIMIT 10`,
    [pattern]
  )
  for (const row of resultToObjects(companies)) {
    results.push({
      type: 'company',
      id: row.id as string,
      name: (row.company_name as string) || 'Unnamed',
      subtitle: row.type as string | null,
    })
  }

  // Opportunities
  const opps = db.exec(
    `SELECT id, opportunity_name, sales_stage FROM opportunities
     WHERE opportunity_name LIKE ?
     LIMIT 10`,
    [pattern]
  )
  for (const row of resultToObjects(opps)) {
    results.push({
      type: 'opportunity',
      id: row.id as string,
      name: (row.opportunity_name as string) || 'Unnamed',
      subtitle: row.sales_stage as string | null,
    })
  }

  // Tasks
  const tasks = db.exec(
    `SELECT id, task, status FROM tasks
     WHERE task LIKE ?
     LIMIT 10`,
    [pattern]
  )
  for (const row of resultToObjects(tasks)) {
    results.push({
      type: 'task',
      id: row.id as string,
      name: (row.task as string) || 'Unnamed',
      subtitle: row.status as string | null,
    })
  }

  // Projects
  const projects = db.exec(
    `SELECT id, project_name, status FROM projects
     WHERE project_name LIKE ?
     LIMIT 10`,
    [pattern]
  )
  for (const row of resultToObjects(projects)) {
    results.push({
      type: 'project',
      id: row.id as string,
      name: (row.project_name as string) || 'Unnamed',
      subtitle: row.status as string | null,
    })
  }

  // Proposals
  const proposals = db.exec(
    `SELECT id, proposal_name, status FROM proposals
     WHERE proposal_name LIKE ?
     LIMIT 10`,
    [pattern]
  )
  for (const row of resultToObjects(proposals)) {
    results.push({
      type: 'proposal',
      id: row.id as string,
      name: (row.proposal_name as string) || 'Unnamed',
      subtitle: row.status as string | null,
    })
  }

  return results
}
