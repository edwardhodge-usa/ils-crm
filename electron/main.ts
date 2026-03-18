import { app, BrowserWindow, ipcMain, nativeTheme, systemPreferences } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { registerAllHandlers } from './ipc/register'
import { getSetting } from './database/queries/entities'
import { fullSync, startPolling } from './airtable/sync-engine'
import { checkLicense, setLastVerifiedTime, isWithinGracePeriod, handleRevocation } from './airtable/license-check'
import { buildMenu } from './menu'
import { UPDATER_TOKEN } from './updater-token'

// Silently ignore EPIPE errors on stdout/stderr (happens when launched without a terminal)
process.stdout?.on('error', () => {})
process.stderr?.on('error', () => {})

process.on('uncaughtException', (err) => {
  console.error('[MAIN] Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[MAIN] Unhandled rejection:', reason)
})

const isDev = !!process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function getSystemAccentColor(): string {
  if (process.platform !== 'darwin') return '#007AFF'
  const color = systemPreferences.getAccentColor()
  return `#${color.slice(0, 6)}`
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 22 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    roundedCorners: true,
    hasShadow: true,
    tabbingIdentifier: 'main',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Build native menu bar
  buildMenu(mainWindow)

  // Sync vibrancy with system appearance
  nativeTheme.on('updated', () => {
    mainWindow?.setVibrancy(nativeTheme.shouldUseDarkColors ? 'dark' : 'sidebar')
  })

  // Send accent color to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('accent-color', getSystemAccentColor())
  })

  // Listen for accent color changes
  if (process.platform === 'darwin') {
    systemPreferences.subscribeNotification(
      'AppleColorPreferencesChangedNotification',
      () => mainWindow?.webContents.send('accent-color', getSystemAccentColor()),
    )
  }

  if (isDev) console.log(`[App] isDev=true, VITE_DEV_SERVER_URL=${process.env.VITE_DEV_SERVER_URL}`)
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open DevTools in dev mode (detached window) — uncomment when needed
  // mainWindow.webContents.once('did-finish-load', () => {
  //   if (isDev) {
  //     mainWindow?.webContents.openDevTools({ mode: 'detach' })
  //   }
  // })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Initialize database before creating window
  await initDatabase()
  if (isDev) console.log('[App] Database initialized')

  // Register all entity/sync/dashboard/search IPC handlers (after DB init)
  registerAllHandlers(() => mainWindow)

  // Forward renderer errors to main process console
  ipcMain.on('log:error', (_event, msg: string) => {
    console.error('[Renderer]', msg)
  })

  createWindow()

  // Re-create window when dock icon clicked and all windows are closed.
  // Must be registered inside whenReady() — registering at module scope
  // causes "Cannot create BrowserWindow before app is ready" on cold launch.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Auto-update (production only, private GitHub repo requires token)
  if (!isDev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    // Private repo: set token both ways for compatibility
    process.env.GH_TOKEN = UPDATER_TOKEN
    autoUpdater.requestHeaders = { Authorization: `token ${UPDATER_TOKEN}` }
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('updater:status', { status: 'available', version: info.version })
    })
    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow?.webContents.send('updater:status', { status: 'downloading', percent: progressObj.percent })
    })
    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('updater:status', { status: 'ready', version: info.version })
    })
    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err.message)
      mainWindow?.webContents.send('updater:status', { status: 'error', message: err.message })
    })

    // Re-check every 4 hours
    setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000)
  }

  // ─── License check + sync startup ─────────────────────────
  const userEmail = getSetting('user_email')
  const apiKey = getSetting('airtable_api_key')

  if (userEmail && apiKey) {
    // Validate license before starting sync
    const license = await checkLicense(userEmail, getSetting('user_id') || undefined)

    if (license.valid) {
      setLastVerifiedTime()
      if (isDev) console.log('[App] License valid, starting sync...')

      fullSync(mainWindow).then((result) => {
        if (result.success) {
          if (isDev) console.log('[App] Initial sync complete')
        } else {
          console.error('[App] Initial sync failed:', result.error)
        }
        startPolling(() => mainWindow)
      })
    } else if (license.status === 'error') {
      // Network error — check grace period
      if (isWithinGracePeriod()) {
        if (isDev) console.log('[App] License check failed (network), within grace period — proceeding')
        fullSync(mainWindow).then((result) => {
          if (result.success) {
            if (isDev) console.log('[App] Initial sync complete')
          } else {
            console.error('[App] Initial sync failed:', result.error)
          }
          startPolling(() => mainWindow)
        })
      } else {
        // Grace period expired — lock the app (no data deletion)
        if (isDev) console.log('[App] License check failed, grace period expired — locking app')
        mainWindow?.webContents.send('license:offline-locked')
      }
    } else {
      // Revoked, suspended, or not-found — revoke access
      console.error(`[App] License not active: ${license.status}`)
      await handleRevocation()
      mainWindow?.webContents.send('license:revoked')
    }
  } else if (apiKey && !userEmail) {
    // Legacy: has API key but no email — start sync normally (shouldn't happen)
    if (isDev) console.log('[App] API key found but no email, starting sync...')
    fullSync(mainWindow).then((result) => {
      if (result.success) {
        if (isDev) console.log('[App] Initial sync complete')
      } else {
        console.error('[App] Initial sync failed:', result.error)
      }
      startPolling(() => mainWindow)
    })
  } else {
    if (isDev) console.log('[App] No API key configured, skipping sync')
  }

  // ─── Periodic license re-check every 2 hours ──────────
  setInterval(async () => {
    const email = getSetting('user_email')
    if (!email) return // not onboarded yet

    const license = await checkLicense(email, getSetting('user_id') || undefined)

    if (license.valid) {
      setLastVerifiedTime()
    } else if (license.status === 'error') {
      // Network error — grace period still active, do nothing
      if (!isWithinGracePeriod()) {
        mainWindow?.webContents.send('license:offline-locked')
      }
    } else {
      // Revoked mid-session
      console.error(`[App] License revoked mid-session: ${license.status}`)
      await handleRevocation()
      mainWindow?.webContents.send('license:revoked')
    }
  }, 2 * 60 * 60 * 1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
