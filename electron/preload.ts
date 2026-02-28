import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
  },

  // Settings (will be implemented in Phase 2-3)
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },

  // Sync engine (will be implemented in Phase 2-3)
  sync: {
    start: () => ipcRenderer.invoke('sync:start'),
    stop: () => ipcRenderer.invoke('sync:stop'),
    forceSync: () => ipcRenderer.invoke('sync:forceSync'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    onProgress: (cb: (status: unknown) => void) => {
      ipcRenderer.on('sync:progress', (_e, data) => cb(data))
    },
    removeProgressListener: () => {
      ipcRenderer.removeAllListeners('sync:progress')
    },
  },

  // Entity CRUD (will be implemented per-table in Phase 2-4)
  contacts: {
    getAll: () => ipcRenderer.invoke('contacts:getAll'),
    getById: (id: string) => ipcRenderer.invoke('contacts:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('contacts:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('contacts:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('contacts:delete', id),
  },

  companies: {
    getAll: () => ipcRenderer.invoke('companies:getAll'),
    getById: (id: string) => ipcRenderer.invoke('companies:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('companies:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('companies:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('companies:delete', id),
  },

  opportunities: {
    getAll: () => ipcRenderer.invoke('opportunities:getAll'),
    getById: (id: string) => ipcRenderer.invoke('opportunities:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('opportunities:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('opportunities:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('opportunities:delete', id),
  },

  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getById: (id: string) => ipcRenderer.invoke('tasks:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('tasks:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('tasks:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  },

  proposals: {
    getAll: () => ipcRenderer.invoke('proposals:getAll'),
    getById: (id: string) => ipcRenderer.invoke('proposals:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('proposals:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('proposals:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('proposals:delete', id),
  },

  projects: {
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    getById: (id: string) => ipcRenderer.invoke('projects:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('projects:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('projects:update', id, fields),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
  },

  interactions: {
    getAll: () => ipcRenderer.invoke('interactions:getAll'),
    getById: (id: string) => ipcRenderer.invoke('interactions:getById', id),
  },

  importedContacts: {
    getAll: () => ipcRenderer.invoke('importedContacts:getAll'),
    getById: (id: string) => ipcRenderer.invoke('importedContacts:getById', id),
    approve: (id: string) => ipcRenderer.invoke('importedContacts:approve', id),
    reject: (id: string, reason: string) => ipcRenderer.invoke('importedContacts:reject', id, reason),
  },

  portalAccess: {
    getAll: () => ipcRenderer.invoke('portalAccess:getAll'),
    getById: (id: string) => ipcRenderer.invoke('portalAccess:getById', id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke('portalAccess:create', fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke('portalAccess:update', id, fields),
  },

  portalLogs: {
    getAll: () => ipcRenderer.invoke('portalLogs:getAll'),
  },

  // Dashboard aggregations
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getTasksDueToday: () => ipcRenderer.invoke('dashboard:getTasksDueToday'),
    getFollowUpAlerts: () => ipcRenderer.invoke('dashboard:getFollowUpAlerts'),
    getPipelineSnapshot: () => ipcRenderer.invoke('dashboard:getPipelineSnapshot'),
  },

  // Global search
  search: {
    query: (term: string) => ipcRenderer.invoke('search:query', term),
  },
})
