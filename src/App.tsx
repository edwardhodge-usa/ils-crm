import { useEffect } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import SettingsPage from './components/settings/SettingsPage'
import DashboardPage from './components/dashboard/DashboardPage'
import ContactListPage from './components/contacts/ContactListPage'
import Contact360Page from './components/contacts/Contact360Page'
import ContactForm from './components/contacts/ContactForm'
import CompanyListPage from './components/companies/CompanyListPage'
import Company360Page from './components/companies/Company360Page'
import CompanyForm from './components/companies/CompanyForm'
import TaskListPage from './components/tasks/TaskListPage'
import TasksPage from './components/tasks/TasksPage'
import TaskForm from './components/tasks/TaskForm'
import PipelinePage from './components/pipeline/PipelinePage'
import OpportunityForm from './components/pipeline/OpportunityForm'
import ProposalListPage from './components/proposals/ProposalListPage'
import ProposalForm from './components/proposals/ProposalForm'
import ProjectListPage from './components/projects/ProjectListPage'
import ProjectForm from './components/projects/ProjectForm'
import RfqListPage from './components/rfqs/RfqListPage'
import ContractListPage from './components/contracts/ContractListPage'
import ImportedContactsPage from './components/imported-contacts/ImportedContactsPage'
import InteractionsPage from './components/interactions/InteractionsPage'
import InteractionListPage from './components/interactions/InteractionListPage'
import InteractionForm from './components/interactions/InteractionForm'
import PortalAccessPage from './components/portal/PortalAccessPage'
import PortalLogsPage from './components/portal/PortalLogsPage'
import CommandPalette from './components/layout/CommandPalette'

export default function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    // Apply theme, but only follow the media query when mode is 'system'
    // Settings page writes 'light' | 'dark' | 'system' to localStorage('theme-mode')
    const applySystem = (e: MediaQueryListEvent | MediaQueryList) => {
      const stored = localStorage.getItem('theme-mode')
      if (stored === 'light' || stored === 'dark') return // manual override — ignore OS change
      document.documentElement.classList.toggle('dark', e.matches)
    }

    // Initial apply — honour stored preference if set
    const stored = localStorage.getItem('theme-mode')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // system (or unset)
      document.documentElement.classList.toggle('dark', mq.matches)
    }

    mq.addEventListener('change', applySystem)
    return () => mq.removeEventListener('change', applySystem)
  }, [])

  return (
    <MemoryRouter>
      <CommandPalette />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Contacts */}
          <Route path="/contacts" element={<ContactListPage />} />
          <Route path="/contacts/new" element={<ContactForm />} />
          <Route path="/contacts/:id" element={<Contact360Page />} />
          <Route path="/contacts/:id/edit" element={<ContactForm />} />

          {/* Companies */}
          <Route path="/companies" element={<CompanyListPage />} />
          <Route path="/companies/new" element={<CompanyForm />} />
          <Route path="/companies/:id" element={<Company360Page />} />
          <Route path="/companies/:id/edit" element={<CompanyForm />} />

          {/* Pipeline */}
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/pipeline/new" element={<OpportunityForm />} />
          <Route path="/pipeline/:id/edit" element={<OpportunityForm />} />

          {/* RFQs */}
          <Route path="/rfqs" element={<RfqListPage />} />

          {/* Contracts */}
          <Route path="/contracts" element={<ContractListPage />} />

          {/* Tasks */}
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/list" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id/edit" element={<TaskForm />} />

          {/* Proposals */}
          <Route path="/proposals" element={<ProposalListPage />} />
          <Route path="/proposals/new" element={<ProposalForm />} />
          <Route path="/proposals/:id/edit" element={<ProposalForm />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />

          {/* Imported Contacts */}
          <Route path="/imported-contacts" element={<ImportedContactsPage />} />

          {/* Interactions */}
          <Route path="/interactions" element={<InteractionListPage />} />
          <Route path="/interactions/table" element={<InteractionsPage />} />
          <Route path="/interactions/new" element={<InteractionForm />} />
          <Route path="/interactions/:id/edit" element={<InteractionForm />} />

          {/* Portal */}
          <Route path="/portal" element={<PortalAccessPage />} />
          <Route path="/portal-logs" element={<PortalLogsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}
