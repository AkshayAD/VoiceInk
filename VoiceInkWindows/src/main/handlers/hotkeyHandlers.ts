// Global hotkey management
import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import Store from 'electron-store'

interface HotkeyConfig {
  recordToggle: string
  openMini: string
  pauseResume: string
  stopRecording: string
}

const store = new Store()
let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null

const defaultHotkeys: HotkeyConfig = {
  recordToggle: 'CommandOrControl+Shift+R',
  openMini: 'CommandOrControl+Shift+M',
  pauseResume: 'CommandOrControl+Shift+P',
  stopRecording: 'CommandOrControl+Shift+S'
}

export function registerHotkeyHandlers(window: BrowserWindow) {
  mainWindow = window

  // Load saved hotkeys or use defaults
  const hotkeys = store.get('hotkeys', defaultHotkeys) as HotkeyConfig

  // Register initial hotkeys
  registerGlobalHotkeys(hotkeys)

  // IPC handlers for hotkey management
  ipcMain.handle('hotkeys:get', () => {
    return store.get('hotkeys', defaultHotkeys)
  })

  ipcMain.handle('hotkeys:set', async (_, newHotkeys: HotkeyConfig) => {
    // Unregister old hotkeys
    unregisterAllHotkeys()
    
    // Register new hotkeys
    const success = registerGlobalHotkeys(newHotkeys)
    
    if (success) {
      store.set('hotkeys', newHotkeys)
      return { success: true }
    } else {
      // Rollback to old hotkeys if registration failed
      registerGlobalHotkeys(hotkeys)
      return { success: false, error: 'Failed to register hotkeys' }
    }
  })

  ipcMain.handle('hotkeys:test', async (_, accelerator: string) => {
    try {
      // Test if accelerator is valid by trying to register it temporarily
      const testKey = 'test-hotkey'
      const success = globalShortcut.register(accelerator, () => {})
      
      if (success) {
        globalShortcut.unregister(accelerator)
        return { valid: true }
      } else {
        return { valid: false, error: 'Accelerator already in use or invalid' }
      }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  })

  ipcMain.handle('hotkeys:reset', () => {
    unregisterAllHotkeys()
    registerGlobalHotkeys(defaultHotkeys)
    store.set('hotkeys', defaultHotkeys)
    return defaultHotkeys
  })
}

function registerGlobalHotkeys(hotkeys: HotkeyConfig): boolean {
  try {
    // Record toggle hotkey
    globalShortcut.register(hotkeys.recordToggle, async () => {
      console.log('Global hotkey: Toggle recording')
      
      const isRecording = await getRecordingStatus()
      if (isRecording) {
        mainWindow?.webContents.send('hotkey:stopRecording')
      } else {
        mainWindow?.webContents.send('hotkey:startRecording')
      }
    })

    // Open mini recorder hotkey
    globalShortcut.register(hotkeys.openMini, () => {
      console.log('Global hotkey: Open mini recorder')
      mainWindow?.webContents.send('hotkey:openMini')
    })

    // Pause/Resume hotkey
    globalShortcut.register(hotkeys.pauseResume, () => {
      console.log('Global hotkey: Pause/Resume')
      mainWindow?.webContents.send('hotkey:pauseResume')
    })

    // Stop recording hotkey
    globalShortcut.register(hotkeys.stopRecording, () => {
      console.log('Global hotkey: Stop recording')
      mainWindow?.webContents.send('hotkey:stopRecording')
    })

    console.log('✅ Global hotkeys registered successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to register global hotkeys:', error)
    return false
  }
}

function unregisterAllHotkeys() {
  globalShortcut.unregisterAll()
  console.log('🗑️ All global hotkeys unregistered')
}

async function getRecordingStatus(): Promise<boolean> {
  try {
    // This would normally check the actual recording status
    // For now, we'll simulate it
    return false
  } catch {
    return false
  }
}

export function setMiniWindow(window: BrowserWindow | null) {
  miniWindow = window
}

export function cleanupHotkeys() {
  unregisterAllHotkeys()
}