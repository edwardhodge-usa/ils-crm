// Central IPC handler registration
// Wires up all entity CRUD, settings, sync, dashboard, and search handlers

import { app, ipcMain, BrowserWindow, shell, dialog, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getAll, getById, getSetting, setSetting, getAllSyncStatuses, deleteRecord } from '../database/queries/entities'
import { getDashboardStats, getTasksDueToday, getFollowUpAlerts, getPipelineSnapshot } from '../database/queries/dashboard'
import { searchAll } from '../database/queries/search'
import { fullSync, createRecord, updateRecord, deleteRemoteRecord, refreshRecord, startPolling, stopPolling } from '../airtable/sync-engine'
import { whoami } from '../airtable/client'
import {
  fetchLogoUrl, uploadLogoToAirtable, uploadLocalFile, removeLogoFromAirtable,
  fetchLinkedInCompanyLogo,
  fetchLinkedInPhoto, uploadContactPhotoToAirtable, uploadLocalContactPhoto, removeContactPhotoFromAirtable,
} from '../airtable/logo-service'
import { getDatabase, saveDatabase } from '../database/init'
import { checkLicense, getLastVerifiedTime, isWithinGracePeriod, handleRevocation } from '../airtable/license-check'

// ─── Allowlist: keys the renderer is permitted to write via settings:set ─────
// Omitted intentionally: license_last_verified, license_status, user_id — main-process only

const WRITABLE_SETTINGS = new Set([
  'airtable_api_key',
  'airtable_base_id',
  'user_name',
  'user_email',
  'sync_interval_ms',
  'theme',
  'logo_dev_token',
])

// ─── Helper: register CRUD for an entity ─────────────────────

function registerEntityCrud(entityName: string, tableName: string, getMainWindow: () => BrowserWindow | null) {
  const notifySyncComplete = () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('sync:progress', { phase: 'complete', tablesCompleted: 0, tablesTotal: 0, recordsPulled: 0 })
    }
  }

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
      if (result.success) notifySyncComplete()
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:create failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:update`, async (_e, id: string, fields: Record<string, unknown>) => {
    try {
      const result = await updateRecord(tableName, id, fields)
      if (result.success) notifySyncComplete()
      return result
    } catch (error) {
      console.error(`[IPC] ${entityName}:update(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${entityName}:delete`, async (_e, id: string) => {
    try {
      const result = await deleteRemoteRecord(tableName, id)
      if (result.success) notifySyncComplete()
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
  registerEntityCrud('contacts', 'contacts', getMainWindow)
  registerEntityCrud('companies', 'companies', getMainWindow)
  registerEntityCrud('opportunities', 'opportunities', getMainWindow)
  registerEntityCrud('tasks', 'tasks', getMainWindow)
  registerEntityCrud('proposals', 'proposals', getMainWindow)
  registerEntityCrud('projects', 'projects', getMainWindow)
  registerEntityCrud('portalAccess', 'portal_access', getMainWindow)
  registerEntityCrud('clientPages', 'client_pages', getMainWindow)

  // Interactions (full CRUD)
  registerEntityCrud('interactions', 'interactions', getMainWindow)
  registerReadOnly('specialties', 'specialties')
  registerReadOnly('portalLogs', 'portal_logs')

  ipcMain.handle('portalLogs:delete', async (_e, id: string) => {
    try {
      deleteRecord('portal_logs', id)
      return { success: true }
    } catch (error) {
      console.error(`[IPC] portalLogs:delete(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

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
    if (!WRITABLE_SETTINGS.has(key)) {
      console.warn(`[IPC] settings:set blocked write to restricted key: ${key}`)
      return { success: false, error: 'Setting not writable from renderer' }
    }
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
      startPolling(getMainWindow)
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

  // ─── Shell ───────────────────────────────────────────────

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    const ALLOWED_SCHEMES = ['https://', 'http://', 'mailto:', 'tel:']
    if (!ALLOWED_SCHEMES.some(scheme => url.startsWith(scheme))) {
      console.error('[IPC] shell:openExternal blocked unsafe URL:', url)
      return { success: false, error: 'URL scheme not allowed' }
    }
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error('[IPC] shell:openExternal failed:', String(error))
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

  // ─── Auth ───────────────────────────────────────────────────

  ipcMain.handle('auth:validate-pat', async (_e, apiKey: string) => {
    try {
      const user = await whoami(apiKey)
      return { success: true, data: user }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('auth:get-current-user', async () => {
    try {
      return {
        success: true,
        data: {
          id: getSetting('user_id'),
          name: getSetting('user_name'),
          email: getSetting('user_email'),
          hasApiKey: !!getSetting('airtable_api_key'),
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('auth:save-user', async (_e, user: { id: string; name: string; email: string; apiKey: string; baseId: string }) => {
    try {
      // Validate input shape and values
      if (!user || typeof user !== 'object') {
        return { success: false, error: 'Invalid input' }
      }
      if (typeof user.apiKey !== 'string' || !user.apiKey.startsWith('pat')) {
        return { success: false, error: 'Invalid API key format — must start with "pat"' }
      }
      if (typeof user.baseId !== 'string' || !user.baseId.startsWith('app')) {
        return { success: false, error: 'Invalid base ID format — must start with "app"' }
      }
      if (typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string') {
        return { success: false, error: 'Invalid user data — id, name, and email must be strings' }
      }

      setSetting('user_id', user.id)
      setSetting('user_name', user.name)
      setSetting('user_email', user.email)
      setSetting('airtable_api_key', user.apiKey)
      setSetting('airtable_base_id', user.baseId)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('auth:sign-out', async () => {
    try {
      const db = getDatabase()
      db.run(`DELETE FROM settings WHERE key IN ('user_id', 'user_name', 'user_email', 'airtable_api_key')`)
      saveDatabase()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  // ─── Company Logo Management ─────────────────────────────────

  ipcMain.handle('company:fetch-logo', async (_event, companyId: string, website: string) => {
    try {
      const logoUrl = await fetchLogoUrl(website)
      await uploadLogoToAirtable(companyId, logoUrl)
      return { success: true }
    } catch (error) {
      console.error('[IPC] company:fetch-logo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('company:upload-logo', async (_event, companyId: string, filePath: string) => {
    try {
      await uploadLocalFile(companyId, filePath)
      return { success: true }
    } catch (error) {
      console.error('[IPC] company:upload-logo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('company:remove-logo', async (_event, companyId: string) => {
    try {
      await removeLogoFromAirtable(companyId)
      return { success: true }
    } catch (error) {
      console.error('[IPC] company:remove-logo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('company:select-logo-file', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: 'No focused window' }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null }
      }
      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      console.error('[IPC] company:select-logo-file failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('company:fetch-linkedin-logo', async (_event, companyId: string, linkedInUrl: string) => {
    try {
      const logoUrl = await fetchLinkedInCompanyLogo(linkedInUrl)
      await uploadLogoToAirtable(companyId, logoUrl)
      return { success: true }
    } catch (error) {
      console.error('[IPC] company:fetch-linkedin-logo failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // ─── Contact Photo Management ─────────────────────────────────

  ipcMain.handle('contact:fetch-photo', async (_event, contactId: string, linkedInUrl: string) => {
    try {
      const photoUrl = await fetchLinkedInPhoto(linkedInUrl)
      await uploadContactPhotoToAirtable(contactId, photoUrl)
      return { success: true }
    } catch (error) {
      console.error('[IPC] contact:fetch-photo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('contact:upload-photo', async (_event, contactId: string, filePath: string) => {
    try {
      await uploadLocalContactPhoto(contactId, filePath)
      return { success: true }
    } catch (error) {
      console.error('[IPC] contact:upload-photo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('contact:remove-photo', async (_event, contactId: string) => {
    try {
      await removeContactPhotoFromAirtable(contactId)
      return { success: true }
    } catch (error) {
      console.error('[IPC] contact:remove-photo failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('contact:select-photo-file', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: 'No focused window' }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null }
      }
      return { success: true, data: result.filePaths[0] }
    } catch (error) {
      console.error('[IPC] contact:select-photo-file failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Updater ──────────────────────────────────────────────
  ipcMain.handle('updater:install', async () => {
    try {
      autoUpdater.quitAndInstall()
      return { success: true }
    } catch (error) {
      console.error('[IPC] updater:install failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── License ──────────────────────────────────────────────
  ipcMain.handle('license:check', async (_e, email: string, airtableUserId?: string) => {
    try {
      const result = await checkLicense(email, airtableUserId)
      return result
    } catch (error) {
      console.error('[IPC] license:check failed:', String(error))
      return { valid: false, status: 'error' as const, message: String(error) }
    }
  })

  ipcMain.handle('license:getStatus', async () => {
    try {
      return {
        lastVerified: getLastVerifiedTime(),
        withinGrace: isWithinGracePeriod(),
      }
    } catch (error) {
      console.error('[IPC] license:getStatus failed:', String(error))
      return { lastVerified: null, withinGrace: false }
    }
  })

  ipcMain.handle('license:revoke', async () => {
    try {
      await handleRevocation()
      return { success: true }
    } catch (error) {
      console.error('[IPC] license:revoke failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Framer Page Health ───────────────────────────────────────────────────

  ipcMain.handle('framer:checkPageHealth', async (_event, slug: string) => {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return { status: 0, ok: false, error: 'Invalid slug' }
    }
    const url = `https://www.imaginelabstudios.com/ils-clients/${slug}`
    let headStatus = 0
    let headOk = false
    let headError: string | undefined
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await net.fetch(url, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeout)
      headStatus = response.status
      headOk = response.ok
    } catch (error) {
      headError = String(error)
    }

    return { status: headStatus, ok: headOk, ...(headError ? { error: headError } : {}) }
  })

}
