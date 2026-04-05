interface EntityAPI {
  getAll: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  getById: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  create: (fields: Record<string, unknown>) => Promise<{ success: boolean; data?: string; error?: string }>
  update: (id: string, fields: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  delete: (id: string) => Promise<{ success: boolean; error?: string }>
  refresh: (id: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
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
  log: {
    error: (msg: string) => void
  }
  auth: {
    validatePat: (apiKey: string) => Promise<{ success: boolean; data?: { id: string; email?: string }; error?: string }>
    getCurrentUser: () => Promise<{ success: boolean; data?: { id: string | null; name: string | null; email: string | null; hasApiKey: boolean }; error?: string }>
    saveUser: (user: { id: string; name: string; email: string; apiKey: string; baseId: string }) => Promise<{ success: boolean; error?: string }>
    signOut: () => Promise<{ success: boolean; error?: string }>
  }
  settings: {
    get: (key: string) => Promise<{ success: boolean; data?: string; error?: string }>
    set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>
    getSecure: (key: string) => Promise<{ success: boolean; data?: string | null; error?: string }>
    setSecure: (key: string, value: string) => Promise<{ success: boolean; error?: string }>
  }
  sync: {
    start: () => Promise<{ success: boolean; error?: string }>
    stop: () => Promise<{ success: boolean }>
    forceSync: () => Promise<{ success: boolean; error?: string }>
    getStatus: () => Promise<{ success: boolean; data?: unknown }>
    onProgress: (cb: (status: unknown) => void) => void
    removeProgressListener: () => void
  }
  updater: {
    onStatus: (cb: (status: { status: string; version?: string; percent?: number; message?: string }) => void) => void
    install: () => Promise<{ success: boolean; error?: string }>
    removeStatusListener: () => void
  }
  contacts: EntityAPI
  companies: EntityAPI
  opportunities: EntityAPI
  tasks: EntityAPI
  proposals: EntityAPI
  projects: EntityAPI
  interactions: EntityAPI
  importedContacts: ReadOnlyEntityAPI & {
    approve: (id: string, editedFields?: Record<string, unknown>) => Promise<{ success: boolean; contactId?: string; error?: string }>
    dismiss: (id: string) => Promise<{ success: boolean; error?: string }>
    reject: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>
  }
  enrichmentQueue: ReadOnlyEntityAPI & {
    approve: (id: string) => Promise<{ success: boolean; error?: string }>
    dismiss: (id: string) => Promise<{ success: boolean; error?: string }>
  }
  specialties: ReadOnlyEntityAPI
  portalAccess: EntityAPI
  clientPages: EntityAPI
  portalLogs: ReadOnlyEntityAPI & {
    delete: (id: string) => Promise<{ success: boolean; error?: string }>
  }
  dashboard: {
    getStats: () => Promise<{ success: boolean; data?: unknown }>
    getTasksDueToday: () => Promise<{ success: boolean; data?: unknown[] }>
    getFollowUpAlerts: () => Promise<{ success: boolean; data?: unknown[] }>
    getPipelineSnapshot: () => Promise<{ success: boolean; data?: unknown }>
  }
  search: {
    query: (term: string) => Promise<{ success: boolean; data?: unknown[] }>
  }
  shell: {
    openExternal: (url: string) => Promise<{ success: boolean }>
  }
  companyLogo: {
    fetch: (companyId: string, website: string) => Promise<{ success: boolean; error?: string }>
    fetchLinkedIn: (companyId: string, linkedInUrl: string) => Promise<{ success: boolean; error?: string }>
    upload: (companyId: string, filePath: string) => Promise<{ success: boolean; error?: string }>
    remove: (companyId: string) => Promise<{ success: boolean; error?: string }>
    selectFile: () => Promise<{ success: boolean; data?: string | null; error?: string }>
  }
  contactPhoto: {
    fetch: (contactId: string, linkedInUrl: string) => Promise<{ success: boolean; error?: string }>
    upload: (contactId: string, filePath: string) => Promise<{ success: boolean; error?: string }>
    remove: (contactId: string) => Promise<{ success: boolean; error?: string }>
    selectFile: () => Promise<{ success: boolean; data?: string | null; error?: string }>
  }
  license: {
    check: (email: string, airtableUserId?: string) => Promise<{ valid: boolean; status: string; message?: string }>
    getStatus: () => Promise<{ lastVerified: number | null; withinGrace: boolean }>
    revoke: () => Promise<{ success: boolean }>
    onRevoked: (cb: () => void) => void
    onOfflineLocked: (cb: () => void) => void
    removeRevokedListener: () => void
    removeOfflineLockedListener: () => void
  }
  gmail: {
    connect: () => Promise<{ success: boolean; error?: string }>
    disconnect: () => Promise<{ success: boolean; error?: string }>
    status: () => Promise<{ success: boolean; data?: { connected: boolean; email?: string }; error?: string }>
    scanNow: () => Promise<{ success: boolean; error?: string }>
    scanFull: () => Promise<{ success: boolean; error?: string }>
    scanStatus: () => Promise<{ success: boolean; data?: { scanning: boolean; lastScan?: string; totalProcessed?: number }; error?: string }>
    scanInterval: (intervalMs: number) => Promise<{ success: boolean; error?: string }>
    validateAnthropicKey: (key: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    onScanProgress: (cb: (progress: unknown) => void) => void
    removeScanProgressListener: () => void
  }
  framer: {
    checkPageHealth: (slug: string) => Promise<{ status: number; ok: boolean; error?: string }>
  }
  onAccentColor: (cb: (color: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
