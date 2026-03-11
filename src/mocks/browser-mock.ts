/**
 * Browser mock for window.electronAPI
 * Enables Chrome-based UX review without Electron main process.
 * TEMPORARY — remove after review.
 */

// ─── Sample Data ──────────────────────────────────────────

const contacts = [
  { id: 'rec001', contact_name: 'Sarah Chen', first_name: 'Sarah', last_name: 'Chen', job_title: 'Creative Director', company: 'Artisan Studios', email: 'sarah@artisan.com', phone: '(212) 555-0101', mobile_phone: '(917) 555-0102', linkedin_url: 'https://linkedin.com/in/sarachen', categorization: '01 Client', quality_rating: '5 Stars', specialties_ids: '["recSP01","recSP02"]', event_tags: '["SXSW 2025","CES 2026"]', last_contact_date: '2026-02-28', industry: 'Entertainment', companies_ids: '["recC01"]', interactions_ids: '["recI01"]', tasks_ids: '["recT01"]', sales_opportunities_ids: '["recO01"]', sync_to_contacts: true, lead_source: 'Referral', import_source: null, notes: 'Key creative partner for video production.', office_phone: null, website: 'https://artisan.com', address_line: '123 Broadway', city: 'New York', state: 'NY', country: 'US', postal_code: '10001', imported_contact_name: null, review_notes: null, reason_for_rejection: null, rate_info: null, lead_note: null, lead_score: 85, import_date: null, review_completion_date: null, qualification_status: 'Qualified', onboarding_status: 'Complete', partner_status: null, partner_type: null, proposals_ids: null, imported_contacts_ids: null, projects_ids: '["recPR01"]', projects_partner_vendor_ids: null, portal_access_ids: null, last_interaction_date: '2026-02-28', reliability_rating: '4 Stars' },
  { id: 'rec002', contact_name: 'Marcus Johnson', first_name: 'Marcus', last_name: 'Johnson', job_title: 'VP Marketing', company: 'Luminary Group', email: 'marcus@luminary.co', phone: '(310) 555-0201', mobile_phone: null, linkedin_url: 'https://linkedin.com/in/marcusjohnson', categorization: '02 Prospect', quality_rating: '4 Stars', specialties_ids: '["recSP03"]', event_tags: '["NAB 2026"]', last_contact_date: '2026-02-15', industry: 'Media', companies_ids: '["recC02"]', interactions_ids: '["recI02"]', tasks_ids: '["recT02"]', sales_opportunities_ids: '["recO02"]', sync_to_contacts: true, lead_source: 'Conference', import_source: null, notes: null, office_phone: '(310) 555-0200', website: null, address_line: null, city: 'Los Angeles', state: 'CA', country: 'US', postal_code: '90028', imported_contact_name: null, review_notes: null, reason_for_rejection: null, rate_info: null, lead_note: 'Met at NAB — interested in brand video', lead_score: 62, import_date: null, review_completion_date: null, qualification_status: 'In Progress', onboarding_status: null, partner_status: null, partner_type: null, proposals_ids: '["recPP01"]', imported_contacts_ids: null, projects_ids: null, projects_partner_vendor_ids: null, portal_access_ids: null, last_interaction_date: '2026-02-15', reliability_rating: null },
  { id: 'rec003', contact_name: 'Elena Rivera', first_name: 'Elena', last_name: 'Rivera', job_title: 'Executive Producer', company: 'Catalyst Films', email: 'elena@catalyst.film', phone: null, mobile_phone: '(646) 555-0301', linkedin_url: null, categorization: '01 Client', quality_rating: '5 Stars', specialties_ids: '["recSP01","recSP04"]', event_tags: null, last_contact_date: '2026-03-01', industry: 'Film & TV', companies_ids: '["recC03"]', interactions_ids: '["recI03"]', tasks_ids: null, sales_opportunities_ids: null, sync_to_contacts: true, lead_source: 'Existing Client', import_source: null, notes: 'Long-term partner. Works on documentary projects.', office_phone: null, website: 'https://catalyst.film', address_line: '456 W 42nd St', city: 'New York', state: 'NY', country: 'US', postal_code: '10036', imported_contact_name: null, review_notes: null, reason_for_rejection: null, rate_info: '$5,000/day', lead_note: null, lead_score: 95, import_date: null, review_completion_date: null, qualification_status: 'Qualified', onboarding_status: 'Complete', partner_status: 'Active', partner_type: 'Production Partner', proposals_ids: null, imported_contacts_ids: null, projects_ids: '["recPR02"]', projects_partner_vendor_ids: null, portal_access_ids: null, last_interaction_date: '2026-03-01', reliability_rating: '5 Stars' },
  { id: 'rec004', contact_name: 'David Park', first_name: 'David', last_name: 'Park', job_title: 'Head of Content', company: 'NovaBrand', email: 'david@novabrand.com', phone: '(415) 555-0401', mobile_phone: null, linkedin_url: 'https://linkedin.com/in/davidpark', categorization: '03 Lead', quality_rating: '3 Stars', specialties_ids: null, event_tags: null, last_contact_date: '2026-01-20', industry: 'Technology', companies_ids: '["recC04"]', interactions_ids: null, tasks_ids: '["recT03"]', sales_opportunities_ids: '["recO03"]', sync_to_contacts: true, lead_source: 'Website', import_source: null, notes: null, office_phone: null, website: null, address_line: null, city: 'San Francisco', state: 'CA', country: 'US', postal_code: '94105', imported_contact_name: null, review_notes: null, reason_for_rejection: null, rate_info: null, lead_note: 'Filled out contact form — brand video inquiry', lead_score: 40, import_date: null, review_completion_date: null, qualification_status: null, onboarding_status: null, partner_status: null, partner_type: null, proposals_ids: null, imported_contacts_ids: null, projects_ids: null, projects_partner_vendor_ids: null, portal_access_ids: null, last_interaction_date: '2026-01-20', reliability_rating: null },
  { id: 'rec005', contact_name: 'Aisha Williams', first_name: 'Aisha', last_name: 'Williams', job_title: 'Brand Manager', company: 'Artisan Studios', email: 'aisha@artisan.com', phone: null, mobile_phone: '(917) 555-0501', linkedin_url: null, categorization: '01 Client', quality_rating: '4 Stars', specialties_ids: '["recSP02"]', event_tags: '["SXSW 2025"]', last_contact_date: '2026-02-25', industry: 'Entertainment', companies_ids: '["recC01"]', interactions_ids: null, tasks_ids: null, sales_opportunities_ids: null, sync_to_contacts: true, lead_source: 'Referral', import_source: null, notes: null, office_phone: null, website: null, address_line: null, city: 'New York', state: 'NY', country: 'US', postal_code: '10001', imported_contact_name: null, review_notes: null, reason_for_rejection: null, rate_info: null, lead_note: null, lead_score: 70, import_date: null, review_completion_date: null, qualification_status: 'Qualified', onboarding_status: 'Complete', partner_status: null, partner_type: null, proposals_ids: null, imported_contacts_ids: null, projects_ids: null, projects_partner_vendor_ids: null, portal_access_ids: null, last_interaction_date: '2026-02-25', reliability_rating: '4 Stars' },
]

const companies = [
  { id: 'recC01', company_name: 'Artisan Studios', website: 'https://artisan.com', industry: 'Entertainment', type: 'Client', company_type: 'Agency', company_size: '50-200', annual_revenue: '$10M-50M', city: 'New York', state_region: 'NY', country: 'US', address: '123 Broadway', postal_code: '10001', notes: 'Primary creative partner', company_description: 'Full-service creative agency', founding_year: 2015, created_date: '2025-06-15', lead_source: 'Referral', referred_by: null, naics_code: '541810', contacts_ids: '["rec001","rec005"]', sales_opportunities_ids: '["recO01"]', projects_ids: '["recPR01"]', proposals_ids: null },
  { id: 'recC02', company_name: 'Luminary Group', website: 'https://luminary.co', industry: 'Media', type: 'Prospect', company_type: 'Corporation', company_size: '200-500', annual_revenue: '$50M-100M', city: 'Los Angeles', state_region: 'CA', country: 'US', address: null, postal_code: '90028', notes: null, company_description: 'Media and entertainment conglomerate', founding_year: 2008, created_date: '2026-01-10', lead_source: 'Conference', referred_by: null, naics_code: null, contacts_ids: '["rec002"]', sales_opportunities_ids: '["recO02"]', projects_ids: null, proposals_ids: '["recPP01"]' },
  { id: 'recC03', company_name: 'Catalyst Films', website: 'https://catalyst.film', industry: 'Film & TV', type: 'Client', company_type: 'Production Company', company_size: '10-50', annual_revenue: '$1M-10M', city: 'New York', state_region: 'NY', country: 'US', address: '456 W 42nd St', postal_code: '10036', notes: 'Documentary specialists', company_description: 'Award-winning documentary production company', founding_year: 2012, created_date: '2024-09-01', lead_source: 'Existing Client', referred_by: null, naics_code: '512110', contacts_ids: '["rec003"]', sales_opportunities_ids: null, projects_ids: '["recPR02"]', proposals_ids: null },
  { id: 'recC04', company_name: 'NovaBrand', website: 'https://novabrand.com', industry: 'Technology', type: 'Lead', company_type: 'Startup', company_size: '10-50', annual_revenue: '$1M-10M', city: 'San Francisco', state_region: 'CA', country: 'US', address: null, postal_code: '94105', notes: null, company_description: 'AI-powered brand management platform', founding_year: 2022, created_date: '2026-02-01', lead_source: 'Website', referred_by: null, naics_code: null, contacts_ids: '["rec004"]', sales_opportunities_ids: '["recO03"]', projects_ids: null, proposals_ids: null },
]

const opportunities = [
  { id: 'recO01', opportunity_name: 'Artisan Brand Video Series', deal_value: 75000, sales_stage: '03 Proposal Sent', probability: '02 Medium', expected_close_date: '2026-04-15', company_ids: '["recC01"]', associated_contact_ids: '["rec001"]', engagement_type: '["Video Production","Brand Strategy"]', notes_about: 'Three-part brand story series', quals_type: 'RFP', lead_source: 'Referral', qualifications_sent: true, tasks_ids: '["recT01"]', interactions_ids: '["recI01"]', project_ids: null, proposals_ids: null, probability_value: 50, next_meeting_date: '2026-03-10', contract_milestones: null, loss_notes: null, win_loss_reason: null, referred_by: null },
  { id: 'recO02', opportunity_name: 'Luminary Launch Campaign', deal_value: 120000, sales_stage: '02 Qualified', probability: '01 High', expected_close_date: '2026-05-01', company_ids: '["recC02"]', associated_contact_ids: '["rec002"]', engagement_type: '["Campaign","Video Production"]', notes_about: 'Product launch video campaign — 6 deliverables', quals_type: 'Direct', lead_source: 'Conference', qualifications_sent: false, tasks_ids: '["recT02"]', interactions_ids: '["recI02"]', project_ids: null, proposals_ids: '["recPP01"]', probability_value: 75, next_meeting_date: '2026-03-05', contract_milestones: null, loss_notes: null, win_loss_reason: null, referred_by: null },
  { id: 'recO03', opportunity_name: 'NovaBrand Explainer Video', deal_value: 25000, sales_stage: '01 Prospecting', probability: '03 Low', expected_close_date: '2026-06-30', company_ids: '["recC04"]', associated_contact_ids: '["rec004"]', engagement_type: '["Video Production"]', notes_about: 'Product explainer — initial inquiry', quals_type: null, lead_source: 'Website', qualifications_sent: false, tasks_ids: '["recT03"]', interactions_ids: null, project_ids: null, proposals_ids: null, probability_value: 25, next_meeting_date: null, contract_milestones: null, loss_notes: null, win_loss_reason: null, referred_by: null },
  { id: 'recO04', opportunity_name: 'Catalyst Documentary Trailer', deal_value: 40000, sales_stage: '04 Negotiation', probability: '01 High', expected_close_date: '2026-03-20', company_ids: '["recC03"]', associated_contact_ids: '["rec003"]', engagement_type: '["Documentary","Post-Production"]', notes_about: 'Feature doc trailer edit and delivery', quals_type: 'Direct', lead_source: 'Existing Client', qualifications_sent: true, tasks_ids: null, interactions_ids: '["recI03"]', project_ids: '["recPR02"]', proposals_ids: null, probability_value: 85, next_meeting_date: '2026-03-08', contract_milestones: 'Rough cut Mar 15, Final Mar 25', loss_notes: null, win_loss_reason: null, referred_by: null },
]

const tasks = [
  { id: 'recT01', task: 'Send revised proposal to Artisan Studios', status: '🔵 Not Started', type: 'Send Proposal', priority: '🔴 High', due_date: '2026-03-05', completed_date: null, notes: 'Include updated pricing for 3-part series', sales_opportunities_ids: '["recO01"]', contacts_ids: '["rec001"]', projects_ids: null, proposal_ids: null },
  { id: 'recT02', task: 'Schedule discovery call with Luminary Group', status: '🟡 In Progress', type: 'Schedule Meeting', priority: '🔴 High', due_date: '2026-03-04', completed_date: null, notes: 'Marcus prefers afternoon PST', sales_opportunities_ids: '["recO02"]', contacts_ids: '["rec002"]', projects_ids: null, proposal_ids: null },
  { id: 'recT03', task: 'Research NovaBrand competitors', status: '🔵 Not Started', type: 'Research', priority: '🟡 Medium', due_date: '2026-03-10', completed_date: null, notes: null, sales_opportunities_ids: '["recO03"]', contacts_ids: '["rec004"]', projects_ids: null, proposal_ids: null },
  { id: 'recT04', task: 'Review Catalyst rough cut', status: '🟡 In Progress', type: 'Internal Review', priority: '🔴 High', due_date: '2026-03-15', completed_date: null, notes: 'Focus on pacing in act 2', sales_opportunities_ids: null, contacts_ids: '["rec003"]', projects_ids: '["recPR02"]', proposal_ids: null },
  { id: 'recT05', task: 'Update portfolio website with recent work', status: '🔵 Not Started', type: 'Administrative', priority: '🟢 Low', due_date: '2026-03-20', completed_date: null, notes: null, sales_opportunities_ids: null, contacts_ids: null, projects_ids: null, proposal_ids: null },
  { id: 'recT06', task: 'Follow up with David Park', status: '🔵 Not Started', type: 'Follow-up Email', priority: '🟡 Medium', due_date: '2026-03-07', completed_date: null, notes: 'Check if he reviewed the samples we sent', sales_opportunities_ids: '["recO03"]', contacts_ids: '["rec004"]', projects_ids: null, proposal_ids: null },
]

const projects = [
  { id: 'recPR01', project_name: 'Artisan Brand Story Series', status: 'In Production', engagement_type: '["Video Production","Brand Strategy"]', contract_value: 75000, start_date: '2026-02-01', target_completion: '2026-05-30', actual_completion: null, location: 'New York, NY', description: 'Three-part branded content series telling the Artisan Studios origin story', key_milestones: 'Pre-production complete Feb 28, Shoot Mar 15-20, Post Apr 1-May 15', lessons_learned: null, sales_opportunities_ids: '["recO01"]', client_ids: '["rec001"]', tasks_ids: '["recT01"]', primary_contact_ids: '["rec001"]', contacts_ids: '["rec001","rec005"]' },
  { id: 'recPR02', project_name: 'Catalyst Documentary Feature', status: 'Post-Production', engagement_type: '["Documentary","Post-Production"]', contract_value: 120000, start_date: '2025-09-01', target_completion: '2026-04-30', actual_completion: null, location: 'New York, NY', description: 'Feature-length documentary on urban renewal', key_milestones: 'Rough cut Mar 15, Fine cut Apr 1, Final delivery Apr 30', lessons_learned: 'Archival footage licensing took 3x longer than estimated', sales_opportunities_ids: null, client_ids: '["rec003"]', tasks_ids: '["recT04"]', primary_contact_ids: '["rec003"]', contacts_ids: '["rec003"]' },
]

const proposals = [
  { id: 'recPP01', proposal_name: 'Luminary Launch Campaign — Full Package', status: 'Draft', approval_status: 'Pending Review', version: 'v1.0', template_used: 'Campaign Template', client_feedback: null, performance_metrics: null, notes: '6 deliverables, 3 months', client_ids: '["rec002"]', company_ids: '["recC02"]', related_opportunity_ids: '["recO02"]', tasks_ids: null },
]

const interactions = [
  { id: 'recI01', subject: 'Proposal review call', summary: 'Reviewed initial proposal with Sarah. She wants to expand scope to include social cutdowns. Discussed timeline for March shoot.', next_steps: 'Update proposal with social media package pricing', date: '2026-02-28', type: 'Meeting', direction: 'Outbound', contacts_ids: '["rec001"]', sales_opportunities_ids: '["recO01"]' },
  { id: 'recI02', subject: 'NAB follow-up', summary: 'Followed up from NAB meeting. Marcus confirmed interest in launch campaign. Wants to see our documentary reel.', next_steps: 'Send documentary reel and case studies', date: '2026-02-15', type: 'Email', direction: 'Outbound', contacts_ids: '["rec002"]', sales_opportunities_ids: '["recO02"]' },
  { id: 'recI03', subject: 'Rough cut feedback session', summary: 'Elena reviewed rough cut of act 1. Positive feedback on pacing. Wants more archival footage in transition sequences.', next_steps: 'Source additional archival footage for transitions', date: '2026-03-01', type: 'Virtual Meeting', direction: 'Inbound', contacts_ids: '["rec003"]', sales_opportunities_ids: null },
]

const importedContacts = [
  { id: 'recIC01', imported_contact_name: 'James Morrison', first_name: 'James', last_name: 'Morrison', company: 'Meridian Media', job_title: 'Director of Production', email: 'james@meridian.media', phone: '(305) 555-0601', mobile_phone: null, office_phone: null, other_phone: null, fax: null, linkedin_url: null, website: null, address_line: null, city: 'Miami', state: 'FL', country: 'US', postal_code: '33101', import_date: '2026-03-01', categorization: null, onboarding_status: 'Review', import_source: 'LinkedIn', note: 'Connected at Miami Film Festival', sync_to_contacts: false, specialties_ids: null, related_crm_contact_ids: null, event_tags: null, company_founding_year: null, company_naics_code: null, company_type: null, company_size: null, company_industry: 'Media', company_annual_revenue: null, company_street_address: null, company_street_address_2: null, company_city: 'Miami', company_state: 'FL', company_country: 'US', company_postal_code: '33101', company_description: null, reason_for_rejection: null, review_notes: null, contact_photo_url: null, business_card_image_url: null },
  { id: 'recIC02', imported_contact_name: 'Priya Sharma', first_name: 'Priya', last_name: 'Sharma', company: 'TechVault Inc', job_title: 'CMO', email: 'priya@techvault.io', phone: null, mobile_phone: '(512) 555-0701', office_phone: null, other_phone: null, fax: null, linkedin_url: 'https://linkedin.com/in/priyasharma', website: 'https://techvault.io', address_line: null, city: 'Austin', state: 'TX', country: 'US', postal_code: '78701', import_date: '2026-03-02', categorization: null, onboarding_status: 'Review', import_source: 'Website Form', note: null, sync_to_contacts: false, specialties_ids: null, related_crm_contact_ids: null, event_tags: null, company_founding_year: '2020', company_naics_code: null, company_type: 'Startup', company_size: '50-200', company_industry: 'Technology', company_annual_revenue: '$10M-50M', company_street_address: null, company_street_address_2: null, company_city: 'Austin', company_state: 'TX', company_country: 'US', company_postal_code: '78701', company_description: 'Enterprise data management platform', reason_for_rejection: null, review_notes: null, contact_photo_url: null, business_card_image_url: null },
]

const specialties = [
  { id: 'recSP01', name: 'Video Production', contacts_ids: '["rec001","rec003"]' },
  { id: 'recSP02', name: 'Brand Strategy', contacts_ids: '["rec001","rec005"]' },
  { id: 'recSP03', name: 'Campaign Management', contacts_ids: '["rec002"]' },
  { id: 'recSP04', name: 'Documentary', contacts_ids: '["rec003"]' },
]

const portalAccess = [
  { id: 'recPA01', name: 'Sarah Chen', email: 'sarah@artisan.com', company: 'Artisan Studios', page_address: '/projects/artisan-brand', decision_maker: 'Yes', primary_contact: 'Sarah Chen', position_title: 'Creative Director', industry: 'Entertainment', status: 'Active', lead_source: 'Referral', stage: 'Client', services_interested_in: '["Video Production","Brand Strategy"]', date_added: '2025-12-01', expected_project_start_date: '2026-02-01', follow_up_date: null, notes: null, phone_number: '(212) 555-0101', website: 'https://artisan.com', project_budget: 75000, address: '123 Broadway, New York', contact_ids: '["rec001"]', framer_page_url: 'https://portal.imaginelabstudios.com/projects/artisan-brand' },
  { id: 'recPA02', name: 'Marcus Johnson', email: 'marcus@luminary.co', company: 'Luminary Group', page_address: '/proposals/luminary-launch', decision_maker: 'Yes', primary_contact: 'Marcus Johnson', position_title: 'VP Marketing', industry: 'Media', status: 'Active', lead_source: 'Conference', stage: 'Prospect', services_interested_in: '["Campaign","Video Production"]', date_added: '2026-01-15', expected_project_start_date: '2026-05-01', follow_up_date: '2026-03-10', notes: 'First portal visit — viewed proposal page', phone_number: '(310) 555-0201', website: 'https://luminary.co', project_budget: 120000, address: null, contact_ids: '["rec002"]', framer_page_url: 'https://portal.imaginelabstudios.com/proposals/luminary-launch' },
]

const portalLogs = [
  { id: 'recPL01', auto_id: 1, client_email: 'sarah@artisan.com', client_name: 'Sarah Chen', company: 'Artisan Studios', ip_address: '74.125.xxx.xxx', city: 'New York', region: 'NY', country: 'US', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', clarity_session: null, page_url: '/projects/artisan-brand', timestamp: '2026-03-01T14:30:00Z' },
  { id: 'recPL02', auto_id: 2, client_email: 'marcus@luminary.co', client_name: 'Marcus Johnson', company: 'Luminary Group', ip_address: '66.249.xxx.xxx', city: 'Los Angeles', region: 'CA', country: 'US', user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', clarity_session: null, page_url: '/proposals/luminary-launch', timestamp: '2026-03-02T10:15:00Z' },
  { id: 'recPL03', auto_id: 3, client_email: 'sarah@artisan.com', client_name: 'Sarah Chen', company: 'Artisan Studios', ip_address: '74.125.xxx.xxx', city: 'New York', region: 'NY', country: 'US', user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', clarity_session: null, page_url: '/projects/artisan-brand', timestamp: '2026-03-02T19:45:00Z' },
]

// ─── Dashboard Derived Data ───────────────────────────────

const dashboardStats = {
  totalContacts: contacts.length,
  totalCompanies: companies.length,
  activeOpportunities: opportunities.filter(o => !o.sales_stage?.includes('Closed')).length,
  pipelineValue: opportunities.reduce((s, o) => s + (o.deal_value || 0), 0),
}

const tasksDueToday = tasks.filter(t => t.due_date && t.due_date <= '2026-03-05').map(t => ({
  id: t.id,
  task: t.task,
  due_date: t.due_date,
  priority: t.priority,
  status: t.status,
}))

const followUpAlerts = contacts.filter(c => {
  if (!c.last_contact_date) return true
  const days = Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000)
  return days > 14
}).map(c => ({
  id: c.id,
  contact_name: c.contact_name,
  company: c.company,
  last_contact_date: c.last_contact_date,
  days_since: c.last_contact_date ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000) : null,
}))

const pipelineSnapshot = [
  { sales_stage: '01 Prospecting', count: 1, total_value: 25000 },
  { sales_stage: '02 Qualified', count: 1, total_value: 120000 },
  { sales_stage: '03 Proposal Sent', count: 1, total_value: 75000 },
  { sales_stage: '04 Negotiation', count: 1, total_value: 40000 },
  { sales_stage: '05 Closed Won', count: 0, total_value: 0 },
]

// ─── CRUD Helper ──────────────────────────────────────────

function makeCrud<T extends { id: string }>(data: T[]) {
  const store = [...data]
  return {
    getAll: async () => ({ success: true, data: store }),
    getById: async (id: string) => {
      const item = store.find(r => r.id === id)
      return item ? { success: true, data: item } : { success: false, error: 'Not found' }
    },
    create: async (fields: Record<string, unknown>) => {
      const id = 'rec' + Math.random().toString(36).slice(2, 10)
      const record = { id, ...fields } as T
      store.push(record)
      return { success: true, data: id }
    },
    update: async (id: string, fields: Record<string, unknown>) => {
      const idx = store.findIndex(r => r.id === id)
      if (idx === -1) return { success: false, error: 'Not found' }
      store[idx] = { ...store[idx], ...fields }
      return { success: true }
    },
    delete: async (id: string) => {
      const idx = store.findIndex(r => r.id === id)
      if (idx === -1) return { success: false, error: 'Not found' }
      store.splice(idx, 1)
      return { success: true }
    },
  }
}

// ─── Build Mock API ───────────────────────────────────────

const settings: Record<string, string> = {
  airtable_api_key: 'pat_mock_key_for_review',
  airtable_base_id: 'appYXbUdcmSwBoPFU',
}

const syncTables = [
  { table_name: 'contacts', last_sync_at: '2026-03-03T02:30:00Z', record_count: contacts.length, status: 'idle' as const, error: null },
  { table_name: 'companies', last_sync_at: '2026-03-03T02:30:00Z', record_count: companies.length, status: 'idle' as const, error: null },
  { table_name: 'opportunities', last_sync_at: '2026-03-03T02:30:00Z', record_count: opportunities.length, status: 'idle' as const, error: null },
  { table_name: 'tasks', last_sync_at: '2026-03-03T02:30:00Z', record_count: tasks.length, status: 'idle' as const, error: null },
  { table_name: 'projects', last_sync_at: '2026-03-03T02:30:00Z', record_count: projects.length, status: 'idle' as const, error: null },
  { table_name: 'proposals', last_sync_at: '2026-03-03T02:30:00Z', record_count: proposals.length, status: 'idle' as const, error: null },
  { table_name: 'interactions', last_sync_at: '2026-03-03T02:30:00Z', record_count: interactions.length, status: 'idle' as const, error: null },
  { table_name: 'imported_contacts', last_sync_at: '2026-03-03T02:30:00Z', record_count: importedContacts.length, status: 'idle' as const, error: null },
  { table_name: 'specialties', last_sync_at: '2026-03-03T02:30:00Z', record_count: specialties.length, status: 'idle' as const, error: null },
  { table_name: 'portal_access', last_sync_at: '2026-03-03T02:30:00Z', record_count: portalAccess.length, status: 'idle' as const, error: null },
  { table_name: 'portal_logs', last_sync_at: '2026-03-03T02:30:00Z', record_count: portalLogs.length, status: 'idle' as const, error: null },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(window as any).electronAPI = {
  app: {
    getVersion: async () => ({ success: true, data: '1.0.0-mock' }),
    getPaths: async () => ({ success: true, data: { userData: '/mock/userData', appPath: '/mock/app' } }),
  },
  settings: {
    get: async (key: string) => ({ success: true, data: settings[key] ?? null }),
    set: async (key: string, value: string) => { settings[key] = value; return { success: true } },
  },
  sync: {
    start: async () => ({ success: true }),
    stop: async () => ({ success: true }),
    forceSync: async () => ({ success: true }),
    getStatus: async () => ({ success: true, data: syncTables }),
    onProgress: () => {},
    removeProgressListener: () => {},
  },
  contacts: makeCrud(contacts),
  companies: makeCrud(companies),
  opportunities: makeCrud(opportunities),
  tasks: makeCrud(tasks),
  proposals: makeCrud(proposals),
  projects: makeCrud(projects),
  interactions: makeCrud(interactions),
  importedContacts: {
    ...makeCrud(importedContacts),
    approve: async (id: string) => {
      const ic = importedContacts.find(r => r.id === id)
      if (ic) (ic as any).onboarding_status = 'Approved'
      return { success: true }
    },
    reject: async (id: string, _reason: string) => {
      const ic = importedContacts.find(r => r.id === id)
      if (ic) (ic as any).onboarding_status = 'Rejected'
      return { success: true }
    },
  },
  specialties: {
    getAll: async () => ({ success: true, data: specialties }),
    getById: async (id: string) => {
      const s = specialties.find(r => r.id === id)
      return s ? { success: true, data: s } : { success: false, error: 'Not found' }
    },
  },
  portalAccess: {
    getAll: async () => ({ success: true, data: portalAccess }),
    getById: async (id: string) => {
      const pa = portalAccess.find(r => r.id === id)
      return pa ? { success: true, data: pa } : { success: false, error: 'Not found' }
    },
    create: async (fields: Record<string, unknown>) => {
      const id = 'recPA' + Math.random().toString(36).slice(2, 6)
      portalAccess.push({ id, ...fields } as any)
      return { success: true, data: id }
    },
    update: async (id: string, fields: Record<string, unknown>) => {
      const idx = portalAccess.findIndex(r => r.id === id)
      if (idx === -1) return { success: false, error: 'Not found' }
      portalAccess[idx] = { ...portalAccess[idx], ...fields } as any
      return { success: true }
    },
  },
  portalLogs: {
    getAll: async () => ({ success: true, data: portalLogs }),
    getById: async (id: string) => {
      const pl = portalLogs.find(r => r.id === id)
      return pl ? { success: true, data: pl } : { success: false, error: 'Not found' }
    },
  },
  dashboard: {
    getStats: async () => ({ success: true, data: dashboardStats }),
    getTasksDueToday: async () => ({ success: true, data: tasksDueToday }),
    getFollowUpAlerts: async () => ({ success: true, data: followUpAlerts }),
    getPipelineSnapshot: async () => ({ success: true, data: pipelineSnapshot }),
  },
  search: {
    query: async (term: string) => {
      const lower = term.toLowerCase()
      const results = [
        ...contacts.filter(c => c.contact_name?.toLowerCase().includes(lower)).map(c => ({ type: 'contact', id: c.id, name: c.contact_name })),
        ...companies.filter(c => c.company_name?.toLowerCase().includes(lower)).map(c => ({ type: 'company', id: c.id, name: c.company_name })),
      ]
      return { success: true, data: results }
    },
  },
  shell: {
    openExternal: async (url: string) => { window.open(url, '_blank'); return { success: true } },
  },
  onAccentColor: () => {},
}

console.log('[Browser Mock] window.electronAPI shimmed with sample data for UX review')

export {}
