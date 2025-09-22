// Auto-updater functionality
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, dialog } from 'electron'
import Store from 'electron-store'

interface UpdateSettings {
  autoDownload: boolean
  checkOnStartup: boolean
  includePrerelease: boolean
  notifyOnUpdate: boolean
}

const store = new Store()
let mainWindow: BrowserWindow | null = null

const defaultSettings: UpdateSettings = {
  autoDownload: true,
  checkOnStartup: true,
  includePrerelease: false,
  notifyOnUpdate: true
}

export function setupAutoUpdater(window: BrowserWindow) {
  mainWindow = window

  // Load update settings
  const settings = store.get('updateSettings', defaultSettings) as UpdateSettings

  // Configure auto-updater
  autoUpdater.autoDownload = settings.autoDownload
  autoUpdater.allowPrerelease = settings.includePrerelease

  // Set up event listeners
  setupAutoUpdaterEvents()

  // Register IPC handlers
  setupUpdateIpcHandlers()

  // Check for updates on startup if enabled
  if (settings.checkOnStartup) {
    setTimeout(() => {
      checkForUpdates(false) // Silent check on startup
    }, 5000) // Wait 5 seconds after startup
  }

  console.log('Auto-updater configured')
}

function setupAutoUpdaterEvents() {
  // Update available
  autoUpdater.on('update-available', (info) => {
    console.log('📦 Update available:', info.version)
    
    mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      files: info.files?.map(f => ({ url: f.url, size: f.size }))
    })

    const settings = store.get('updateSettings', defaultSettings) as UpdateSettings
    
    if (settings.notifyOnUpdate) {
      showUpdateNotification(info.version, 'available')
    }
  })

  // No update available
  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ No update available')
    mainWindow?.webContents.send('update:notAvailable', info)
  })

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    console.log(`📥 Download progress: ${progress.percent.toFixed(2)}%`)
    
    mainWindow?.webContents.send('update:downloadProgress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Update downloaded:', info.version)
    
    mainWindow?.webContents.send('update:downloaded', {
      version: info.version,
      releaseDate: info.releaseDate
    })

    const settings = store.get('updateSettings', defaultSettings) as UpdateSettings
    
    if (settings.notifyOnUpdate) {
      showUpdateNotification(info.version, 'downloaded')
    }
  })

  // Error occurred
  autoUpdater.on('error', (error) => {
    console.error('❌ Auto-updater error:', error)
    
    mainWindow?.webContents.send('update:error', {
      message: error.message,
      stack: error.stack
    })
  })

  // Check for updates started
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...')
    mainWindow?.webContents.send('update:checking')
  })
}

function setupUpdateIpcHandlers() {
  // Check for updates manually
  ipcMain.handle('update:check', async () => {
    return checkForUpdates(true)
  })

  // Download update
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Install update and restart
  ipcMain.handle('update:install', async () => {
    try {
      autoUpdater.quitAndInstall()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Get update settings
  ipcMain.handle('update:getSettings', () => {
    return store.get('updateSettings', defaultSettings)
  })

  // Set update settings
  ipcMain.handle('update:setSettings', (_, settings: UpdateSettings) => {
    store.set('updateSettings', settings)
    
    // Apply settings to auto-updater
    autoUpdater.autoDownload = settings.autoDownload
    autoUpdater.allowPrerelease = settings.includePrerelease
    
    return { success: true }
  })

  // Get current version
  ipcMain.handle('update:getCurrentVersion', () => {
    return {
      version: require('../../../package.json').version,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    }
  })
}

async function checkForUpdates(showNoUpdateDialog = false): Promise<any> {
  try {
    const result = await autoUpdater.checkForUpdates()
    
    if (showNoUpdateDialog && !result?.updateInfo) {
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version of VoiceInk.',
        buttons: ['OK']
      })
    }
    
    return {
      success: true,
      updateInfo: result?.updateInfo,
      downloadPromise: result?.downloadPromise
    }
  } catch (error: any) {
    console.error('Failed to check for updates:', error)
    
    if (showNoUpdateDialog) {
      dialog.showMessageBox(mainWindow!, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Failed to check for updates. Please try again later.',
        detail: error.message,
        buttons: ['OK']
      })
    }
    
    return { success: false, error: error.message }
  }
}

function showUpdateNotification(version: string, type: 'available' | 'downloaded') {
  const { Notification } = require('electron')
  
  if (!Notification.isSupported()) return

  let title: string
  let body: string
  
  if (type === 'available') {
    title = 'Update Available'
    body = `VoiceInk v${version} is available for download.`
  } else {
    title = 'Update Ready'
    body = `VoiceInk v${version} has been downloaded and is ready to install.`
  }

  const notification = new Notification({
    title,
    body,
    icon: undefined, // Will use app icon
    silent: false
  })

  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('navigate', '/settings?tab=updates')
    }
  })

  notification.show()
}

export function checkForUpdatesOnDemand() {
  return checkForUpdates(true)
}