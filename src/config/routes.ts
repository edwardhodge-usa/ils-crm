export interface RouteConfig {
  path: string
  label: string
  icon?: string
  newPath?: string  // path for "New" action
}

export const NAV_ITEMS: RouteConfig[] = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/contacts', label: 'Contacts', icon: 'Users', newPath: '/contacts/new' },
  { path: '/companies', label: 'Companies', icon: 'Building2', newPath: '/companies/new' },
  { path: '/pipeline', label: 'Pipeline', icon: 'Kanban', newPath: '/pipeline/new' },
  { path: '/tasks', label: 'Tasks', icon: 'CheckSquare', newPath: '/tasks/new' },
  { path: '/proposals', label: 'Proposals', icon: 'FileText', newPath: '/proposals/new' },
  { path: '/projects', label: 'Projects', icon: 'FolderKanban', newPath: '/projects/new' },
  { path: '/interactions', label: 'Interactions', icon: 'MessageSquare', newPath: '/interactions/new' },
  { path: '/imported-contacts', label: 'Imported Contacts', icon: 'UserPlus' },
  { path: '/portal', label: 'Portal Access', icon: 'Shield' },
  { path: '/portal-logs', label: 'Portal Logs', icon: 'ScrollText' },
]

export const SETTINGS_ROUTE: RouteConfig = { path: '/settings', label: 'Settings', icon: 'Settings' }

export const ROUTE_TITLES: Record<string, string> = Object.fromEntries(
  [...NAV_ITEMS, SETTINGS_ROUTE].map(item => [item.path, item.label])
)

export const NEW_ROUTES: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.filter(item => item.newPath).map(item => [item.path, item.newPath!])
)
