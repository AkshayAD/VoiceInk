/**
 * Global Hotkey Service
 * Manages keyboard shortcuts for the application
 */

import { globalShortcut, BrowserWindow } from 'electron'
import Store from 'electron-store'

const store = new Store()

interface HotkeyConfig {
  startRecording: string
  stopRecording: string
  pauseRecording: string
  toggleWindow: string
  quickTranscribe: string
  openSettings: string
  exportLast: string
  search: string
}

const DEFAULT_HOTKEYS: HotkeyConfig = {
  startRecording: 'CommandOrControl+Shift+R',
  stopRecording: 'CommandOrControl+Shift+S',
  pauseRecording: 'CommandOrControl+Shift+P',
  toggleWindow: 'CommandOrControl+Shift+V',
  quickTranscribe: 'CommandOrControl+Shift+T',
  openSettings: 'CommandOrControl+,',
  exportLast: 'CommandOrControl+Shift+E',
  search: 'CommandOrControl+F'
}

export class HotkeyService {
  private mainWindow: BrowserWindow | null = null
  private hotkeys: HotkeyConfig
  private isEnabled: boolean = true

  constructor() {
    this.hotkeys = store.get('hotkeys', DEFAULT_HOTKEYS) as HotkeyConfig
    this.isEnabled = store.get('globalHotkeysEnabled', true) as boolean
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Register all global shortcuts
   */
  registerAll() {
    if (!this.isEnabled) {
      console.log('⌨️ Global hotkeys disabled')
      return
    }

    // Unregister all first to avoid conflicts
    this.unregisterAll()

    // Register each hotkey
    Object.entries(this.hotkeys).forEach(([action, accelerator]) => {
      if (accelerator) {
        try {
          const success = globalShortcut.register(accelerator, () => {
            this.handleHotkey(action as keyof HotkeyConfig)
          })
          
          if (success) {
            console.log(`✅ Registered: ${action} -> ${accelerator}`)
          } else {
            console.warn(`⚠️ Failed to register: ${action} -> ${accelerator}`)
          }
        } catch (error) {
          console.error(`❌ Error registering ${action}:`, error)
        }
      }
    })
  }

  /**
   * Unregister all global shortcuts
   */
  unregisterAll() {
    globalShortcut.unregisterAll()
    console.log('🔓 All hotkeys unregistered')
  }

  /**
   * Handle hotkey action
   */
  private handleHotkey(action: keyof HotkeyConfig) {
    if (!this.mainWindow) return

    console.log(`⌨️ Hotkey triggered: ${action}`)

    switch (action) {
      case 'startRecording':
        this.mainWindow.webContents.send('hotkey:startRecording')
        this.showWindowIfHidden()
        break
        
      case 'stopRecording':
        this.mainWindow.webContents.send('hotkey:stopRecording')
        break
        
      case 'pauseRecording':
        this.mainWindow.webContents.send('hotkey:pauseRecording')
        break
        
      case 'toggleWindow':
        this.toggleWindow()
        break
        
      case 'quickTranscribe':
        this.mainWindow.webContents.send('hotkey:quickTranscribe')
        this.showWindowIfHidden()
        break
        
      case 'openSettings':
        this.mainWindow.webContents.send('navigate', '/settings')
        this.showWindowIfHidden()
        break
        
      case 'exportLast':
        this.mainWindow.webContents.send('hotkey:exportLast')
        break
        
      case 'search':
        this.mainWindow.webContents.send('hotkey:search')
        this.showWindowIfHidden()
        break
    }
  }

  /**
   * Show window if hidden
   */
  private showWindowIfHidden() {
    if (!this.mainWindow) return
    
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
    }
    
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    
    this.mainWindow.focus()
  }

  /**
   * Toggle window visibility
   */
  private toggleWindow() {
    if (!this.mainWindow) return
    
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide()
    } else {
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  /**
   * Update a specific hotkey
   */
  updateHotkey(action: keyof HotkeyConfig, accelerator: string) {
    // Validate accelerator
    if (!this.isValidAccelerator(accelerator)) {
      throw new Error(`Invalid accelerator: ${accelerator}`)
    }

    // Check for conflicts
    const conflict = this.findConflict(accelerator, action)
    if (conflict) {
      throw new Error(`Hotkey conflicts with: ${conflict}`)
    }

    // Update and save
    this.hotkeys[action] = accelerator
    store.set('hotkeys', this.hotkeys)
    
    // Re-register all
    this.registerAll()
  }

  /**
   * Get current hotkey configuration
   */
  getHotkeys(): HotkeyConfig {
    return { ...this.hotkeys }
  }

  /**
   * Reset to default hotkeys
   */
  resetToDefaults() {
    this.hotkeys = { ...DEFAULT_HOTKEYS }
    store.set('hotkeys', this.hotkeys)
    this.registerAll()
  }

  /**
   * Enable/disable global hotkeys
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    store.set('globalHotkeysEnabled', enabled)
    
    if (enabled) {
      this.registerAll()
    } else {
      this.unregisterAll()
    }
  }

  /**
   * Check if accelerator is valid
   */
  private isValidAccelerator(accelerator: string): boolean {
    // Basic validation - check for modifier + key
    const parts = accelerator.split('+')
    
    // Must have at least modifier + key
    if (parts.length < 2) return false
    
    // Check for valid modifiers
    const validModifiers = ['Command', 'Control', 'CommandOrControl', 'Alt', 'Shift', 'Super']
    const hasValidModifier = parts.some(part => validModifiers.includes(part))
    
    return hasValidModifier
  }

  /**
   * Find conflicting hotkey
   */
  private findConflict(accelerator: string, excludeAction?: keyof HotkeyConfig): string | null {
    for (const [action, hotkey] of Object.entries(this.hotkeys)) {
      if (action !== excludeAction && hotkey === accelerator) {
        return action
      }
    }
    return null
  }

  /**
   * Check if a hotkey is registered
   */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator)
  }
}

export const hotkeyService = new HotkeyService()