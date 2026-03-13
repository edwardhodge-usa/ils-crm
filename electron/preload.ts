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

  // Logging
  log: {
    error: (msg: string) => ipcRenderer.send('log:error', msg),
  },

  // Auth
  auth: {
    validatePat: (apiKey: string) => ipcRenderer.invoke('auth:validate-pat', apiKey),
    getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
    saveUser: (user: { id: string; name: string; email: string; apiKey: string; baseId: string }) =>
      ipcRenderer.invoke('auth:save-user', user),
    signOut: () => ipcRenderer.invoke('auth:sign-out'),
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

  // Auto-updater
  updater: {
    onStatus: (cb: (status: { status: string; version?: string; percent?: number; message?: string }) => void) => {
      ipcRenderer.on('updater:status', (_e, data) => cb(data))
    },
    install: () => ipcRenderer.invoke('updater:install'),
    removeStatusListener: () => {
      ipcRenderer.removeAllListeners('updater:status')
    },
  },

  // License management
  license: {
    check: (email: string, airtableUserId?: string) =>
      ipcRenderer.invoke('license:check', email, airtableUserId),
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    revoke: () => ipcRenderer.invoke('license:revoke'),
    onRevoked: (cb: () => void) => {
      ipcRenderer.on('license:revoked', () => cb())
    },
    onOfflineLocked: (cb: () => void) => {
      ipcRenderer.on('license:offline-locked', () => cb())
    },
    removeRevokedListener: () => {
      ipcRenderer.removeAllListeners('license:revoked')
    },
    removeOfflineLockedListener: () => {
      ipcRenderer.removeAllListeners('license:offline-locked')
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
  clientPages: makeCrudBridge('clientPages'),

  // Interactions (full CRUD)
  interactions: makeCrudBridge('interactions'),
  specialties: makeReadOnlyBridge('specialties'),
  portalLogs: {
    getAll: () => ipcRenderer.invoke('portalLogs:getAll'),
    delete: (id: string) => ipcRenderer.invoke('portalLogs:delete', id),
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

  // Shell utilities
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Company logo management
  companyLogo: {
    fetch: (companyId: string, website: string) => ipcRenderer.invoke('company:fetch-logo', companyId, website),
    fetchLinkedIn: (companyId: string, linkedInUrl: string) => ipcRenderer.invoke('company:fetch-linkedin-logo', companyId, linkedInUrl),
    upload: (companyId: string, filePath: string) => ipcRenderer.invoke('company:upload-logo', companyId, filePath),
    remove: (companyId: string) => ipcRenderer.invoke('company:remove-logo', companyId),
    selectFile: () => ipcRenderer.invoke('company:select-logo-file'),
  },

  // Contact photo management
  contactPhoto: {
    fetch: (contactId: string, linkedInUrl: string) => ipcRenderer.invoke('contact:fetch-photo', contactId, linkedInUrl),
    upload: (contactId: string, filePath: string) => ipcRenderer.invoke('contact:upload-photo', contactId, filePath),
    remove: (contactId: string) => ipcRenderer.invoke('contact:remove-photo', contactId),
    selectFile: () => ipcRenderer.invoke('contact:select-photo-file'),
  },

  // Framer page health
  framer: {
    checkPageHealth: (slug: string) => ipcRenderer.invoke('framer:checkPageHealth', slug),
  },

  // System appearance
  onAccentColor: (cb: (color: string) => void) => {
    ipcRenderer.on('accent-color', (_e, color) => cb(color))
  },
})
