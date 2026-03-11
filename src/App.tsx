import { useState, useEffect } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import OnboardingPage from './components/onboarding/OnboardingPage'
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
import ErrorBoundary from './components/shared/ErrorBoundary'
import UpdateBanner from './components/layout/UpdateBanner'
import RevokedPage from './components/auth/RevokedPage'
import OfflineLockPage from './components/auth/OfflineLockPage'

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'revoked' | 'offline-locked' | 'onboarding' | 'ready'>('loading')

  // Theme initialization (runs regardless of auth state)
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

    // Apply font size preference + UI scale
    const storedSize = localStorage.getItem('font-size')
    if (storedSize === 'compact' || storedSize === 'default' || storedSize === 'large') {
      const sizes: Record<string, { body: string; secondary: string; small: string }> = {
        compact: { body: '13px', secondary: '11px', small: '10px' },
        default: { body: '14px', secondary: '12px', small: '11px' },
        large:   { body: '16px', secondary: '14px', small: '12px' },
      }
      const scales: Record<string, string> = { compact: '0.93', default: '1', large: '1.07' }
      const v = sizes[storedSize]
      document.documentElement.style.setProperty('--font-body', v.body)
      document.documentElement.style.setProperty('--font-secondary', v.secondary)
      document.documentElement.style.setProperty('--font-small', v.small)
      document.documentElement.style.setProperty('--ui-scale', scales[storedSize])
    }

    mq.addEventListener('change', applySystem)
    return () => mq.removeEventListener('change', applySystem)
  }, [])

  // Check auth state on mount
  useEffect(() => {
    window.electronAPI.auth.getCurrentUser().then(result => {
      if (result.success && result.data?.hasApiKey === true) {
        setAppState('ready')
      } else {
        setAppState('onboarding')
      }
    })
  }, [])

  // Listen for license revocation / offline lock events from main process
  useEffect(() => {
    window.electronAPI.license.onRevoked(() => {
      setAppState('revoked')
    })
    window.electronAPI.license.onOfflineLocked(() => {
      setAppState('offline-locked')
    })

    return () => {
      window.electronAPI.license.removeRevokedListener()
      window.electronAPI.license.removeOfflineLockedListener()
    }
  }, [])

  // Forward uncaught renderer errors to main process
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      window.electronAPI?.log?.error(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`)
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      window.electronAPI?.log?.error(`Unhandled rejection: ${event.reason}`)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  // Loading state — blank window with matching background
  if (appState === 'loading') {
    return <div style={{ width: '100%', height: '100vh', background: 'var(--bg-window)' }} />
  }

  // Revoked — license has been revoked
  if (appState === 'revoked') {
    return <RevokedPage />
  }

  // Offline locked — grace period expired without verification
  if (appState === 'offline-locked') {
    return <OfflineLockPage />
  }

  // Not authenticated — show onboarding
  if (appState === 'onboarding') {
    return (
      <OnboardingPage onComplete={() => {
        setAppState('ready')
        // Trigger initial sync after onboarding
        window.electronAPI.sync.forceSync()
        window.electronAPI.sync.start()
      }} />
    )
  }

  // Ready — normal app
  return (
    <ErrorBoundary>
      <UpdateBanner />
      <MemoryRouter>
        <CommandPalette />
        <Routes>
          <Route element={<Layout onSignOut={async () => {
            await window.electronAPI.license.revoke()
            setAppState('onboarding')
          }} />}>
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
    </ErrorBoundary>
  )
}
