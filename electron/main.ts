import { app, BrowserWindow, nativeTheme, systemPreferences } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { registerAllHandlers } from './ipc/register'
import { getSetting } from './database/queries/entities'
import { fullSync, startPolling } from './airtable/sync-engine'
import { buildMenu } from './menu'

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

  createWindow()

  // Auto-update (production only)
  if (!isDev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
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

  // Auto-start sync if API key is configured
  const apiKey = getSetting('airtable_api_key')
  if (apiKey) {
    if (isDev) console.log('[App] API key found, starting initial sync...')
    fullSync(mainWindow).then((result) => {
      if (result.success) {
        if (isDev) console.log('[App] Initial sync complete')
      } else {
        console.error('[App] Initial sync failed:', result.error)
      }
      // Always start polling — don't block on initial sync failure
      startPolling(mainWindow)
    })
  } else {
    if (isDev) console.log('[App] No API key configured, skipping sync')
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
