import { app, shell, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupAudioHandlers, cleanupAudioHandlers } from './ipc/audioHandlers'
import Store from 'electron-store'
import * as fs from 'fs'
import * as path from 'path'

const store = new Store()
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Step 6: IPC Communication Handlers
ipcMain.handle('ping', () => {
  console.log('Main: Received ping from renderer')
  return 'pong from main process'
})

ipcMain.on('test-message', (event, arg) => {
  console.log('Main: Received test message:', arg)
  event.reply('test-reply', `Echo: ${arg}`)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Step 10: Window Management Handlers
ipcMain.on('window-minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (window) window.minimize()
})

ipcMain.on('window-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  }
})

ipcMain.on('window-close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (window) window.close()
})

// Database handlers for Step 7
ipcMain.handle('db-test', async () => {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Test database connection by creating a test transcription
    const testTranscription = await prisma.transcription.create({
      data: {
        text: 'Test transcription from IPC',
        model: 'test-model',
        language: 'en',
        wordCount: 4
      }
    })
    
    // Count total transcriptions
    const count = await prisma.transcription.count()
    
    // Clean up
    await prisma.transcription.delete({
      where: { id: testTranscription.id }
    })
    
    await prisma.$disconnect()
    
    return { 
      success: true, 
      message: 'Database connection successful',
      testId: testTranscription.id,
      totalCount: count
    }
  } catch (error: any) {
    console.error('Database test error:', error)
    return { success: false, error: error.message }
  }
})

// Settings handlers
ipcMain.handle('settings:get', async (_, key: string) => {
  return store.get(key)
})

ipcMain.handle('settings:set', async (_, key: string, value: any) => {
  store.set(key, value)
  return true
})

ipcMain.handle('settings:getAll', async () => {
  return store.store
})

ipcMain.handle('settings:reset', async () => {
  store.clear()
  return true
})

// File operations
ipcMain.handle('file:save', async (_, filepath: string, content: any) => {
  try {
    await fs.promises.writeFile(filepath, content)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('file:load', async (_, filepath: string) => {
  try {
    const content = await fs.promises.readFile(filepath, 'utf8')
    return { success: true, content }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('file:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.filePaths[0] || null
})

ipcMain.handle('file:selectFile', async (_, filters?: any) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: filters || []
  })
  return result.filePaths[0] || null
})

// Clipboard operations
ipcMain.handle('clipboard:writeText', async (_, text: string) => {
  clipboard.writeText(text)
  return true
})

ipcMain.handle('clipboard:readText', async () => {
  return clipboard.readText()
})

ipcMain.handle('clipboard:writeRTF', async (_, rtf: string) => {
  clipboard.writeRTF(rtf)
  return true
})

// System operations
ipcMain.handle('system:showInFolder', async (_, filepath: string) => {
  shell.showItemInFolder(filepath)
  return true
})

ipcMain.handle('system:openExternal', async (_, url: string) => {
  await shell.openExternal(url)
  return true
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.voiceink.windows')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  console.log('App ready, creating window...')
  createWindow()

  // Setup audio and transcription handlers after window is created
  if (mainWindow) {
    setupAudioHandlers(mainWindow)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  cleanupAudioHandlers()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }