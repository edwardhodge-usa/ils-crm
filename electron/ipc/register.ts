// Central IPC handler registration
// Wires up all entity CRUD, settings, sync, dashboard, and search handlers

import { app, ipcMain, BrowserWindow } from 'electron'
import { getAll, getById, getSetting, setSetting, getAllSyncStatuses } from '../database/queries/entities'
import { getDashboardStats, getTasksDueToday, getFollowUpAlerts, getPipelineSnapshot } from '../database/queries/dashboard'
import { searchAll } from '../database/queries/search'
import { fullSync, createRecord, updateRecord, deleteRemoteRecord, refreshRecord, startPolling, stopPolling } from '../airtable/sync-engine'

// ─── Helper: register CRUD for an entity ─────────────────────

function registerEntityCrud(entityName: string, tableName: string) {
  ipcMain.handle(`${entityName}:getAll`, async () => {
    try {
      const data = getAll(tableName)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] ${entityName}:getAll failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:getById`, async (_e, id: string) => {
    try {
      const data = getById(tableName, id)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] ${entityName}:getById(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:refresh`, async (_e, id: string) => {
    try {
      const result = await refreshRecord(tableName, id)
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:refresh(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:create`, async (_e, fields: Record<string, unknown>) => {
    try {
      const result = await createRecord(tableName, fields)
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:create failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:update`, async (_e, id: string, fields: Record<string, unknown>) => {
    try {
      const result = await updateRecord(tableName, id, fields)
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:update(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:delete`, async (_e, id: string) => {
    try {
      const result = await deleteRemoteRecord(tableName, id)
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:delete(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })
}

// ─── Helper: register read-only entity ───────────────────────

function registerReadOnly(entityName: string, tableName: string) {
  ipcMain.handle(`${entityName}:getAll`, async () => {
    try {
      const data = getAll(tableName)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] ${entityName}:getAll failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:getById`, async (_e, id: string) => {
    try {
      const data = getById(tableName, id)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] ${entityName}:getById(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })
}

// ─── Register all handlers ───────────────────────────────────

export function registerAllHandlers(getMainWindow: () => BrowserWindow | null) {
  // Full CRUD entities
  registerEntityCrud('contacts', 'contacts')
  registerEntityCrud('companies', 'companies')
  registerEntityCrud('opportunities', 'opportunities')
  registerEntityCrud('tasks', 'tasks')
  registerEntityCrud('proposals', 'proposals')
  registerEntityCrud('projects', 'projects')
  registerEntityCrud('portalAccess', 'portal_access')

  // Read-only entities
  registerReadOnly('interactions', 'interactions')
  registerReadOnly('portalLogs', 'portal_logs')

  // Imported contacts (read-only + approve/reject)
  registerReadOnly('importedContacts', 'imported_contacts')

  ipcMain.handle('importedContacts:approve', async (_e, id: string) => {
    try {
      const result = await updateRecord('imported_contacts', id, {
        onboarding_status: 'Approved',
      })
      return result
    } catch (error) {
      console.error(`[IPC] importedContacts:approve(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('importedContacts:reject', async (_e, id: string, reason: string) => {
    try {
      const result = await updateRecord('imported_contacts', id, {
        onboarding_status: 'Rejected',
        reason_for_rejection: reason,
      })
      return result
    } catch (error) {
      console.error(`[IPC] importedContacts:reject(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Settings ────────────────────────────────────────────

  ipcMain.handle('settings:get', async (_e, key: string) => {
    try {
      const data = getSetting(key)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] settings:get(${key}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('settings:set', async (_e, key: string, value: string) => {
    try {
      setSetting(key, value)
      return { success: true }
    } catch (error) {
      console.error(`[IPC] settings:set(${key}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Sync ────────────────────────────────────────────────

  ipcMain.handle('sync:start', async () => {
    try {
      const win = getMainWindow()
      startPolling(win)
      return { success: true }
    } catch (error) {
      console.error('[IPC] sync:start failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sync:stop', async () => {
    stopPolling()
    return { success: true }
  })

  ipcMain.handle('sync:forceSync', async () => {
    try {
      const win = getMainWindow()
      const result = await fullSync(win)
      return result
    } catch (error) {
      console.error('[IPC] sync:forceSync failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sync:getStatus', async () => {
    try {
      const data = getAllSyncStatuses()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC] sync:getStatus failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Dashboard ───────────────────────────────────────────

  ipcMain.handle('dashboard:getStats', async () => {
    try {
      const data = getDashboardStats()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC] dashboard:getStats failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('dashboard:getTasksDueToday', async () => {
    try {
      const data = getTasksDueToday()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC] dashboard:getTasksDueToday failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('dashboard:getFollowUpAlerts', async () => {
    try {
      const data = getFollowUpAlerts()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC] dashboard:getFollowUpAlerts failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('dashboard:getPipelineSnapshot', async () => {
    try {
      const data = getPipelineSnapshot()
      return { success: true, data }
    } catch (error) {
      console.error('[IPC] dashboard:getPipelineSnapshot failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Search ──────────────────────────────────────────────

  ipcMain.handle('search:query', async (_e, term: string) => {
    try {
      const data = searchAll(term)
      return { success: true, data }
    } catch (error) {
      console.error(`[IPC] search:query("${term}") failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── App Info ─────────────────────────────────────────────

  ipcMain.handle('app:getVersion', async () => {
    try {
      return { success: true, data: app.getVersion() }
    } catch (error) {
      console.error('[IPC] app:getVersion failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('app:getPaths', async () => {
    try {
      return {
        success: true,
        data: {
          userData: app.getPath('userData'),
          appPath: app.getAppPath(),
        },
      }
    } catch (error) {
      console.error('[IPC] app:getPaths failed:', String(error))
      return { success: false, error: String(error) }
    }
  })
}
