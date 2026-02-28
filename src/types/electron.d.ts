interface EntityAPI {
  getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  getById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  create: (fields: Record<string, unknown>) => Promise<{ success: boolean; data?: string; error?: string }>
  update: (id: string, fields: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  delete: (id: string) => Promise<{ success: boolean; error?: string }>
}

interface ReadOnlyEntityAPI {
  getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  getById?: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
}

interface ElectronAPI {
  app: {
    getVersion: () => Promise<{ success: boolean; data: string }>
    getPaths: () => Promise<{ success: boolean; data: { userData: string; appPath: string } }>
  }
  settings: {
    get: (key: string) => Promise<{ success: boolean; data?: string; error?: string }>
    set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>
  }
  sync: {
    start: () => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean }>
    forceSync: () => Promise<{ success: boolean; error?: string }>
    getStatus: () => Promise<{ success: boolean; data?: unknown }>
    onProgress: (cb: (status: unknown) => void) => void
    removeProgressListener: () => void
  }
  contacts: EntityAPI
  companies: EntityAPI
  opportunities: EntityAPI
  tasks: EntityAPI
  proposals: EntityAPI
  projects: EntityAPI
  interactions: ReadOnlyEntityAPI
  importedContacts: ReadOnlyEntityAPI & {
    approve: (id: string) => Promise<{ success: boolean; error?: string }>
    reject: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>
  }
  portalAccess: Omit<EntityAPI, 'delete'>
  portalLogs: ReadOnlyEntityAPI
  dashboard: {
    getStats: () => Promise<{ success: boolean; data?: unknown }>
    getTasksDueToday: () => Promise<{ success: boolean; data?: unknown[] }>
    getFollowUpAlerts: () => Promise<{ success: boolean; data?: unknown[] }>
    getPipelineSnapshot: () => Promise<{ success: boolean; data?: unknown }>
  }
  search: {
    query: (term: string) => Promise<{ success: boolean; data?: unknown[] }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
