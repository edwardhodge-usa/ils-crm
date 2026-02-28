import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { registerAllHandlers } from './ipc/register'
import { getSetting } from './database/queries/entities'
import { fullSync, startPolling } from './airtable/sync-engine'

const isDev = !!process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 22 },
    backgroundColor: '#1C1C1E',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) console.log(`[App] isDev=true, VITE_DEV_SERVER_URL=${process.env.VITE_DEV_SERVER_URL}`)
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Always open DevTools in dev mode (detached window)
  mainWindow.webContents.once('did-finish-load', () => {
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

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

  // Auto-start sync if API key is configured
  const apiKey = getSetting('airtable_api_key')
  if (apiKey) {
    if (isDev) console.log('[App] API key found, starting initial sync...')
    fullSync(mainWindow).then((result) => {
      if (result.success) {
        if (isDev) console.log('[App] Initial sync complete')
        startPolling(mainWindow)
      } else {
        console.error('[App] Initial sync failed:', result.error)
      }
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
