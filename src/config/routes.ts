// src/config/routes.ts
export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  newPath?: string // path for "New" action (used by Cmd+N in Layout)
}

export interface NavSection {
  label: string | null
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'CRM',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'grid' },
      { id: 'contacts', label: 'Contacts', path: '/contacts', icon: 'person', newPath: '/contacts/new' },
      { id: 'companies', label: 'Companies', path: '/companies', icon: 'building', newPath: '/companies/new' },
      { id: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: 'chart-bar', newPath: '/pipeline/new' },
    ],
  },
  {
    label: 'Work',
    items: [
      { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'checkbox' },
      { id: 'projects', label: 'Projects', path: '/projects', icon: 'folder', newPath: '/projects/new' },
      { id: 'proposals', label: 'Proposals', path: '/proposals', icon: 'doc-check', newPath: '/proposals/new' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'portal-cms', label: 'Portal CMS', path: '/portal-cms', icon: 'doc' },
      { id: 'interactions', label: 'Interactions', path: '/interactions', icon: 'bubble', newPath: '/interactions/new' },
      { id: 'imported', label: 'Imported Contacts', path: '/imported-contacts', icon: 'inbox' },
    ],
  },
  {
    label: null,
    items: [
      { id: 'portal', label: 'Portal Access', path: '/portal', icon: 'lock' },
    ],
  },
]

// Flat list of all nav items (for Cmd+N, title lookups, etc.)
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items)

// Settings item (not in nav sections, pinned to sidebar bottom)
export const SETTINGS_ROUTE: NavItem = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: 'settings',
}

// Route titles for the top bar
export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/companies': 'Companies',
  '/pipeline': 'Pipeline',
  '/projects': 'Projects',
  '/proposals': 'Proposals',
  '/tasks': 'Tasks',
  '/interactions': 'Interactions',
  '/imported-contacts': 'Imported Contacts',
  '/portal': 'Portal Access',
  '/portal-cms': 'Portal CMS',
  '/portal-logs': 'Portal Logs',
  '/settings': 'Settings',
}

// Routes that support "New" action (Cmd+N)
export const NEW_ROUTES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.filter(item => item.newPath).map(item => [item.path, item.newPath!])
)
