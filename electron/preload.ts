import { contextBridge, ipcRenderer } from 'electron'

function makeCrudBridge(entity: string) {
  return {
    getAll: () => ipcRenderer.invoke(`${entity}:getAll`),
    getById: (id: string) => ipcRenderer.invoke(`${entity}:getById`, id),
    refresh: (id: string) => ipcRenderer.invoke(`${entity}:refresh`, id),
    create: (fields: Record<string, unknown>) => ipcRenderer.invoke(`${entity}:create`, fields),
    update: (id: string, fields: Record<string, unknown>) => ipcRenderer.invoke(`${entity}:update`, id, fields),
    delete: (id: string) => ipcRenderer.invoke(`${entity}:delete`, id),
  }
}

function makeReadOnlyBridge(entity: string) {
  return {
    getAll: () => ipcRenderer.invoke(`${entity}:getAll`),
    getById: (id: string) => ipcRenderer.invoke(`${entity}:getById`, id),
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },

  // Sync engine
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

  // Entity CRUD
  contacts: makeCrudBridge('contacts'),
  companies: makeCrudBridge('companies'),
  opportunities: makeCrudBridge('opportunities'),
  tasks: makeCrudBridge('tasks'),
  proposals: makeCrudBridge('proposals'),
  projects: makeCrudBridge('projects'),
  portalAccess: makeCrudBridge('portalAccess'),

  // Read-only entities
  interactions: makeReadOnlyBridge('interactions'),
  portalLogs: {
    getAll: () => ipcRenderer.invoke('portalLogs:getAll'),
  },

  // Imported contacts with approve/reject
  importedContacts: {
    ...makeReadOnlyBridge('importedContacts'),
    approve: (id: string) => ipcRenderer.invoke('importedContacts:approve', id),
    reject: (id: string, reason: string) => ipcRenderer.invoke('importedContacts:reject', id, reason),
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
