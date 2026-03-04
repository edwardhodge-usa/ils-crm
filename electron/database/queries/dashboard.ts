// Dashboard aggregation queries

import { getDatabase } from '../init'
import { resultToObjects } from '../utils'

export function getDashboardStats(): Record<string, unknown> {
  const db = getDatabase()

  const contactCount = db.exec(`SELECT COUNT(*) as n FROM contacts`)[0]?.values[0][0] ?? 0
  const companyCount = db.exec(`SELECT COUNT(*) as n FROM companies`)[0]?.values[0][0] ?? 0
  const opportunityCount = db.exec(`SELECT COUNT(*) as n FROM opportunities WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')`)[0]?.values[0][0] ?? 0
  const taskCount = db.exec(`SELECT COUNT(*) as n FROM tasks WHERE status NOT IN ('Completed', 'Cancelled')`)[0]?.values[0][0] ?? 0

  const totalPipelineValue = db.exec(
    `SELECT COALESCE(SUM(deal_value), 0) as total FROM opportunities WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')`
  )[0]?.values[0][0] ?? 0

  const wonValue = db.exec(
    `SELECT COALESCE(SUM(deal_value), 0) as total FROM opportunities WHERE sales_stage = 'Closed Won'`
  )[0]?.values[0][0] ?? 0

  return {
    contactCount,
    companyCount,
    activeOpportunities: opportunityCount,
    activeTasks: taskCount,
    totalPipelineValue,
    wonValue,
  }
}

export function getTasksDueToday(): Record<string, unknown>[] {
  const db = getDatabase()
  // Tasks due today + overdue (up to 7 days back)
  const result = db.exec(
    `SELECT * FROM tasks
     WHERE date(due_date) <= date('now')
       AND date(due_date) >= date('now', '-7 days')
       AND status NOT IN ('Completed', 'Cancelled')
     ORDER BY due_date ASC, priority DESC`
  )
  return resultToObjects(result)
}

export function getFollowUpAlerts(): Record<string, unknown>[] {
  const db = getDatabase()
  // Contacts not contacted in 14+ days (any categorization that isn't archived)
  const result = db.exec(
    `SELECT id, contact_name, company, email, phone, last_contact_date, categorization, contact_photo_url
     FROM contacts
     WHERE last_contact_date IS NOT NULL
       AND last_contact_date != ''
       AND julianday('now') - julianday(last_contact_date) > 14
       AND (categorization IS NULL OR categorization NOT IN ('Archived', 'Rejected'))
     ORDER BY last_contact_date ASC
     LIMIT 20`
  )
  return resultToObjects(result)
}

export function getPipelineSnapshot(): Record<string, unknown>[] {
  const db = getDatabase()
  const result = db.exec(
    `SELECT sales_stage,
            COUNT(*) as count,
            COALESCE(SUM(deal_value), 0) as total_value
     FROM opportunities
     WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
     GROUP BY sales_stage
     ORDER BY count DESC`
  )
  return resultToObjects(result)
}
