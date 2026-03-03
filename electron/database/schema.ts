// SQLite schema for all 11 ILS CRM tables + sync metadata
// Linked record IDs stored as JSON arrays

import type { Database as SqlJsDatabase } from 'sql.js'

export function createSchema(db: SqlJsDatabase): void {
  // ─── Contacts ──────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      contact_name TEXT,
      first_name TEXT,
      last_name TEXT,
      job_title TEXT,
      company TEXT,
      imported_contact_name TEXT,
      address_line TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      postal_code TEXT,
      notes TEXT,
      review_notes TEXT,
      reason_for_rejection TEXT,
      rate_info TEXT,
      lead_note TEXT,
      event_tags TEXT,
      email TEXT,
      phone TEXT,
      mobile_phone TEXT,
      work_phone TEXT,
      linkedin_url TEXT,
      website TEXT,
      lead_score INTEGER,
      last_contact_date TEXT,
      import_date TEXT,
      review_completion_date TEXT,
      qualification_status TEXT,
      lead_source TEXT,
      client_type TEXT,
      industry TEXT,
      import_source TEXT,
      onboarding_status TEXT,
      categorization TEXT,
      quality_rating TEXT,
      reliability_rating TEXT,
      partner_status TEXT,
      partner_type TEXT,
      tags TEXT,
      sync_to_contacts INTEGER DEFAULT 0,
      specialties_ids TEXT,
      proposals_ids TEXT,
      sales_opportunities_ids TEXT,
      imported_contacts_ids TEXT,
      interactions_ids TEXT,
      tasks_ids TEXT,
      projects_ids TEXT,
      companies_ids TEXT,
      projects_partner_vendor_ids TEXT,
      portal_access_ids TEXT,
      last_interaction_date TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Companies ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      company_name TEXT,
      address TEXT,
      city TEXT,
      state_region TEXT,
      country TEXT,
      referred_by TEXT,
      naics_code TEXT,
      company_type TEXT,
      company_size TEXT,
      annual_revenue TEXT,
      postal_code TEXT,
      notes TEXT,
      company_description TEXT,
      website TEXT,
      founding_year INTEGER,
      created_date TEXT,
      type TEXT,
      industry TEXT,
      lead_source TEXT,
      sales_opportunities_ids TEXT,
      projects_ids TEXT,
      contacts_ids TEXT,
      proposals_ids TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Opportunities ────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      opportunity_name TEXT,
      referred_by TEXT,
      notes_about TEXT,
      contract_milestones TEXT,
      loss_notes TEXT,
      deal_value REAL,
      expected_close_date TEXT,
      next_meeting_date TEXT,
      sales_stage TEXT,
      probability TEXT,
      quals_type TEXT,
      lead_source TEXT,
      win_loss_reason TEXT,
      engagement_type TEXT,
      qualifications_sent INTEGER DEFAULT 0,
      company_ids TEXT,
      associated_contact_ids TEXT,
      tasks_ids TEXT,
      interactions_ids TEXT,
      project_ids TEXT,
      proposals_ids TEXT,
      probability_value REAL,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Tasks ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      task TEXT,
      notes TEXT,
      due_date TEXT,
      completed_date TEXT,
      status TEXT,
      type TEXT,
      priority TEXT,
      sales_opportunities_ids TEXT,
      contacts_ids TEXT,
      projects_ids TEXT,
      proposal_ids TEXT,
      assigned_to TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Proposals ─────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      proposal_name TEXT,
      version TEXT,
      client_feedback TEXT,
      performance_metrics TEXT,
      notes TEXT,
      status TEXT,
      template_used TEXT,
      approval_status TEXT,
      client_ids TEXT,
      company_ids TEXT,
      related_opportunity_ids TEXT,
      tasks_ids TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Projects ──────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      project_name TEXT,
      location TEXT,
      description TEXT,
      key_milestones TEXT,
      lessons_learned TEXT,
      contract_value REAL,
      start_date TEXT,
      target_completion TEXT,
      actual_completion TEXT,
      status TEXT,
      engagement_type TEXT,
      sales_opportunities_ids TEXT,
      client_ids TEXT,
      tasks_ids TEXT,
      primary_contact_ids TEXT,
      contacts_ids TEXT,
      project_lead TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Interactions ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      subject TEXT,
      summary TEXT,
      next_steps TEXT,
      date TEXT,
      type TEXT,
      direction TEXT,
      contacts_ids TEXT,
      sales_opportunities_ids TEXT,
      logged_by TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Imported Contacts ─────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS imported_contacts (
      id TEXT PRIMARY KEY,
      imported_contact_name TEXT,
      company TEXT,
      first_name TEXT,
      last_name TEXT,
      job_title TEXT,
      email TEXT,
      event_tags TEXT,
      address_line TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      company_founding_year TEXT,
      company_naics_code TEXT,
      company_type TEXT,
      company_size TEXT,
      company_industry TEXT,
      company_annual_revenue TEXT,
      company_street_address TEXT,
      company_street_address_2 TEXT,
      company_city TEXT,
      company_state TEXT,
      company_country TEXT,
      company_postal_code TEXT,
      postal_code TEXT,
      company_description TEXT,
      note TEXT,
      reason_for_rejection TEXT,
      review_notes TEXT,
      phone TEXT,
      mobile_phone TEXT,
      other_phone TEXT,
      work_phone TEXT,
      office_phone TEXT,
      fax TEXT,
      linkedin_url TEXT,
      website TEXT,
      contact_photo_url TEXT,
      business_card_image_url TEXT,
      import_date TEXT,
      categorization TEXT,
      onboarding_status TEXT,
      import_source TEXT,
      tags TEXT,
      sync_to_contacts INTEGER DEFAULT 0,
      specialties_ids TEXT,
      related_crm_contact_ids TEXT,
      imported_by TEXT,
      assigned_admin TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Specialties ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS specialties (
      id TEXT PRIMARY KEY,
      specialty TEXT,
      imported_contacts_ids TEXT,
      contacts_ids TEXT,
      _airtable_modified_at TEXT
    )
  `)

  // ─── Portal Access ─────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS portal_access (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      page_address TEXT,
      decision_maker TEXT,
      company TEXT,
      address TEXT,
      primary_contact TEXT,
      position_title TEXT,
      industry TEXT,
      notes TEXT,
      phone_number TEXT,
      website TEXT,
      project_budget REAL,
      date_added TEXT,
      expected_project_start_date TEXT,
      follow_up_date TEXT,
      status TEXT,
      lead_source TEXT,
      stage TEXT,
      services_interested_in TEXT,
      contact_ids TEXT,
      framer_page_url TEXT,
      assignee TEXT,
      contact_industry_lookup TEXT,
      contact_tags_lookup TEXT,
      contact_website_lookup TEXT,
      contact_address_line_lookup TEXT,
      contact_city_lookup TEXT,
      contact_state_lookup TEXT,
      contact_country_lookup TEXT,
      _airtable_modified_at TEXT,
      _local_modified_at TEXT,
      _pending_push INTEGER DEFAULT 0
    )
  `)

  // ─── Portal Access: migration for lookup columns ──────
  const portalAccessMigrations = [
    'ALTER TABLE portal_access ADD COLUMN contact_name_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_company_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_email_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_phone_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_job_title_lookup TEXT',
  ]
  for (const sql of portalAccessMigrations) {
    try { db.run(sql) } catch { /* column already exists */ }
  }

  // ─── Field Audit: add missing sync columns ──────────
  const fieldAuditMigrations = [
    'ALTER TABLE tasks ADD COLUMN assigned_to TEXT',
    'ALTER TABLE projects ADD COLUMN project_lead TEXT',
    'ALTER TABLE interactions ADD COLUMN logged_by TEXT',
    'ALTER TABLE imported_contacts ADD COLUMN imported_by TEXT',
    'ALTER TABLE imported_contacts ADD COLUMN assigned_admin TEXT',
    'ALTER TABLE portal_access ADD COLUMN assignee TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_industry_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_tags_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_website_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_address_line_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_city_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_state_lookup TEXT',
    'ALTER TABLE portal_access ADD COLUMN contact_country_lookup TEXT',
  ]
  for (const sql of fieldAuditMigrations) {
    try { db.run(sql) } catch { /* column already exists */ }
  }

  // ─── Portal Logs ───────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS portal_logs (
      id TEXT PRIMARY KEY,
      auto_id INTEGER,
      client_email TEXT,
      client_name TEXT,
      company TEXT,
      ip_address TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      user_agent TEXT,
      clarity_session TEXT,
      page_url TEXT,
      timestamp TEXT,
      _airtable_modified_at TEXT
    )
  `)

  // ─── Sync Metadata ────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_status (
      table_name TEXT PRIMARY KEY,
      last_sync_at TEXT,
      record_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      error TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  // ─── Indexes ───────────────────────────────────────────
  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(contact_name)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_categorization ON contacts(categorization)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_pending ON contacts(_pending_push)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_companies_pending ON companies(_pending_push)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(sales_stage)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_pending ON opportunities(_pending_push)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(_pending_push)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`)

  db.run(`CREATE INDEX IF NOT EXISTS idx_imported_status ON imported_contacts(onboarding_status)`)

  // ─── Default Settings ─────────────────────────────────
  const defaults: [string, string][] = [
    ['airtable_api_key', ''],
    ['airtable_base_id', ''], // Never hardcode — user must configure explicitly in Settings
    ['sync_interval_ms', '60000'],
    ['last_full_sync', ''],
  ]

  for (const [key, defaultValue] of defaults) {
    const result = db.exec(`SELECT value FROM settings WHERE key = '${key.replace(/'/g, "''")}'`)
    if (result.length === 0 || result[0].values.length === 0) {
      db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, defaultValue])
    }
  }

  // Initialize sync_status for all tables
  const tableNames = [
    'contacts', 'companies', 'opportunities', 'tasks', 'proposals',
    'projects', 'interactions', 'imported_contacts', 'specialties',
    'portal_access', 'portal_logs',
  ]
  for (const name of tableNames) {
    db.run('INSERT OR IGNORE INTO sync_status (table_name) VALUES (?)', [name])
  }
}
