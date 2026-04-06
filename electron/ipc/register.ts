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
import { startOAuthFlow, disconnectGmail, isGmailConnected, getConnectedEmail } from '../gmail/oauth'
import { scanNow, scanFull, getScanProgress, setPollingInterval, reclassifyContact } from '../gmail/scanner'

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
  'gmail_client_id',
  'gmail_client_secret',
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

  // Imported contacts (read-only + approve/dismiss/reject)
  registerReadOnly('importedContacts', 'imported_contacts')

  // Enrichment queue (read-only + approve/dismiss)
  registerReadOnly('enrichmentQueue', 'enrichment_queue')

  ipcMain.handle('importedContacts:approve', async (_e, id: string, editedFields?: Record<string, unknown>) => {
    try {
      // 1. Read the imported contact record
      const imported = getById('imported_contacts', id) as Record<string, unknown> | null
      if (!imported) {
        return { success: false, error: 'Imported contact not found' }
      }

      // 2. Determine company ID
      let companyId: string | null = (editedFields?.company_id as string | null) ?? null

      if (!companyId) {
        // Check if the imported record already has a linked company
        const suggestedCompanyIds = imported.suggested_company_ids as string | null
        try {
          if (suggestedCompanyIds) {
            const arr = JSON.parse(suggestedCompanyIds)
            if (Array.isArray(arr) && arr.length > 0) {
              companyId = arr[0]
            }
          }
        } catch { /* ignore */ }
      }

      // Create new company if requested via picker
      const createCompanyName = (editedFields?.create_company_name as string | null)
      if (!companyId && createCompanyName) {
        const relationshipType = (editedFields?.relationship_type ?? imported.relationship_type) as string | null
        const typeMap: Record<string, string> = { 'Client': 'Client', 'Vendor Contact': 'Vendor', 'Partner': 'Partner' }
        const companyType = (relationshipType && typeMap[relationshipType]) || null

        const companyResult = await createRecord('companies', {
          company_name: createCompanyName,
          ...(companyType ? { company_type: companyType } : {}),
        })
        if (companyResult.success && companyResult.id) {
          companyId = companyResult.id
        }
      }

      // Fallback: create from suggested company name (legacy path)
      if (!companyId && !createCompanyName) {
        const suggestedCompanyName = (editedFields?.suggested_company_name ?? imported.suggested_company_name) as string | null
        if (suggestedCompanyName) {
          const companyResult = await createRecord('companies', {
            company_name: suggestedCompanyName,
          })
          if (companyResult.success && companyResult.id) {
            companyId = companyResult.id
          }
        }
      }

      // 3. Build Contact fields from imported data (editedFields override)
      const firstName = (editedFields?.first_name ?? imported.first_name) as string | null
      const lastName = (editedFields?.last_name ?? imported.last_name) as string | null
      const email = (editedFields?.email ?? imported.email) as string | null
      const phone = (editedFields?.phone ?? imported.mobile_phone ?? imported.phone) as string | null
      const jobTitle = (editedFields?.job_title ?? imported.job_title) as string | null
      const relationshipType = (editedFields?.relationship_type ?? imported.relationship_type) as string | null

      const contactFields: Record<string, unknown> = {
        first_name: firstName || null,
        last_name: lastName || null,
        contact_name: [firstName, lastName].filter(Boolean).join(' ') || null,
        email: email || null,
        mobile_phone: phone || null,
        job_title: jobTitle || null,
        categorization: relationshipType ? JSON.stringify([relationshipType]) : null,
        lead_source: 'Other',
      }

      if (companyId) {
        contactFields.companies_ids = JSON.stringify([companyId])
      }

      // 4. Create the Contact record
      const contactResult = await createRecord('contacts', contactFields)

      if (!contactResult.success) {
        return { success: false, error: contactResult.error || 'Failed to create CRM contact' }
      }

      // 5. Update imported contact status to Approved (only if contact was created)
      await updateRecord('imported_contacts', id, {
        onboarding_status: 'Approved',
        related_crm_contact_ids: JSON.stringify([contactResult.id]),
      })

      return { success: true, contactId: contactResult.id }
    } catch (error) {
      console.error(`[IPC] importedContacts:approve(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('importedContacts:dismiss', async (_e, id: string) => {
    try {
      const result = await updateRecord('imported_contacts', id, {
        onboarding_status: 'Dismissed',
      })
      return result
    } catch (error) {
      console.error(`[IPC] importedContacts:dismiss(${id}) failed:`, String(error))
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

  // ─── Enrichment Queue: approve/dismiss ──────────────────────

  // Allowlist of contact fields that enrichment queue items may update
  const ENRICHMENT_FIELDS = new Set([
    'email', 'phone', 'mobile_phone', 'work_phone', 'job_title',
    'first_name', 'last_name', 'linkedin_url', 'address_line',
    'city', 'state', 'country', 'postal_code',
  ])

  ipcMain.handle('enrichmentQueue:approve', async (_e, id: string) => {
    try {
      // Read the enrichment item
      const item = getById('enrichment_queue', id) as Record<string, unknown> | null
      if (!item) {
        return { success: false, error: 'Enrichment queue item not found' }
      }

      const fieldName = item.field_name as string | null
      const suggestedValue = item.suggested_value as string | null
      const contactIdsRaw = item.contact_ids as string | null

      // Find linked contact
      let contactId: string | null = null
      try {
        if (contactIdsRaw) {
          const arr = JSON.parse(contactIdsRaw)
          if (Array.isArray(arr) && arr.length > 0) contactId = arr[0]
        }
      } catch { /* ignore */ }

      // Apply the suggested value to the CRM contact (only if field is in allowlist)
      if (contactId && fieldName && suggestedValue && ENRICHMENT_FIELDS.has(fieldName)) {
        await updateRecord('contacts', contactId, {
          [fieldName]: suggestedValue,
        })
      }

      // Mark enrichment item as approved
      const result = await updateRecord('enrichment_queue', id, {
        status: 'Approved',
      })

      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('sync:progress', { phase: 'complete', tablesCompleted: 0, tablesTotal: 0, recordsPulled: 0 })
      }

      return result
    } catch (error) {
      console.error(`[IPC] enrichmentQueue:approve(${id}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('enrichmentQueue:dismiss', async (_e, id: string) => {
    try {
      const result = await updateRecord('enrichment_queue', id, {
        status: 'Dismissed',
      })
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('sync:progress', { phase: 'complete', tablesCompleted: 0, tablesTotal: 0, recordsPulled: 0 })
      }
      return result
    } catch (error) {
      console.error(`[IPC] enrichmentQueue:dismiss(${id}) failed:`, String(error))
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

  // Secure settings (encrypted via safeStorage)
  ipcMain.handle('settings:getSecure', async (_e, key: string) => {
    const { getSecureSetting } = await import('../gmail/secure-settings')
    return { success: true, data: getSecureSetting(key) }
  })

  ipcMain.handle('settings:setSecure', async (_e, key: string, value: string) => {
    const { setSecureSetting } = await import('../gmail/secure-settings')
    setSecureSetting(key, value)
    return { success: true }
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

  // ─── Gmail ────────────────────────────────────────────────────

  ipcMain.handle('gmail:connect', async () => {
    try {
      const tokens = await startOAuthFlow()
      return { success: true, data: { email: tokens.email } }
    } catch (error) {
      console.error('[IPC] gmail:connect failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:disconnect', async () => {
    try {
      disconnectGmail()
      return { success: true }
    } catch (error) {
      console.error('[IPC] gmail:disconnect failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:status', async () => {
    try {
      return {
        success: true,
        data: {
          connected: isGmailConnected(),
          email: getConnectedEmail(),
        },
      }
    } catch (error) {
      console.error('[IPC] gmail:status failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  // ─── Gmail Scan ──────────────────────────────────────────────────

  ipcMain.handle('gmail:scan-now', async () => {
    try {
      // Fire and forget — scan runs in background, progress via IPC events
      scanNow().catch(err => console.error('[IPC] gmail:scan-now background error:', String(err)))
      return { success: true }
    } catch (error) {
      console.error('[IPC] gmail:scan-now failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:scan-full', async () => {
    try {
      // Fire and forget — scan runs in background, progress via IPC events
      scanFull().catch(err => console.error('[IPC] gmail:scan-full background error:', String(err)))
      return { success: true }
    } catch (error) {
      console.error('[IPC] gmail:scan-full failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:scan-status', async () => {
    try {
      const progress = getScanProgress()
      return { success: true, data: progress }
    } catch (error) {
      console.error('[IPC] gmail:scan-status failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:scan-interval', async (_e, intervalMs: number) => {
    try {
      setPollingInterval(intervalMs)
      return { success: true }
    } catch (error) {
      console.error('[IPC] gmail:scan-interval failed:', String(error))
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('gmail:validateAnthropicKey', async (_e, key: string) => {
    const { validateApiKey } = await import('../gmail/claude-client')
    const valid = await validateApiKey(key)
    return { success: true, data: valid }
  })

  ipcMain.handle('gmail:reclassify', async (_e, contactId: string) => {
    try {
      return await reclassifyContact(contactId)
    } catch (error) {
      console.error(`[IPC] gmail:reclassify(${contactId}) failed:`, String(error))
      return { success: false, error: String(error) }
    }
  })

}
