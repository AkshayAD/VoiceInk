/**
 * Global Hotkey Management
 * Handles system-wide keyboard shortcuts
 */

import { globalShortcut, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'

export interface HotkeyConfig {
  toggleRecording: string
  toggleMiniRecorder: string
  pasteLastTranscription: string
  [key: string]: string
}

export class HotkeyManager extends EventEmitter {
  private registeredHotkeys: Map<string, string> = new Map()
  private enabled = true

  constructor() {
    super()
  }

  /**
   * Register a global hotkey
   */
  register(action: string, accelerator: string, callback: () => void): boolean {
    // Unregister previous hotkey for this action if exists
    this.unregister(action)

    try {
      const success = globalShortcut.register(accelerator, () => {
        if (this.enabled) {
          callback()
          this.emit('hotkey-triggered', { action, accelerator })
        }
      })

      if (success) {
        this.registeredHotkeys.set(action, accelerator)
        console.log(`Registered hotkey: ${action} -> ${accelerator}`)
        return true
      } else {
        console.error(`Failed to register hotkey: ${accelerator}`)
        return false
      }
    } catch (err) {
      console.error(`Error registering hotkey ${accelerator}:`, err)
      return false
    }
  }

  /**
   * Unregister a global hotkey
   */
  unregister(action: string): void {
    const accelerator = this.registeredHotkeys.get(action)
    if (accelerator) {
      globalShortcut.unregister(accelerator)
      this.registeredHotkeys.delete(action)
      console.log(`Unregistered hotkey: ${action}`)
    }
  }

  /**
   * Register all hotkeys from config
   */
  registerAll(config: HotkeyConfig, callbacks: Record<string, () => void>): void {
    for (const [action, accelerator] of Object.entries(config)) {
      const callback = callbacks[action]
      if (callback && accelerator) {
        this.register(action, accelerator, callback)
      }
    }
  }

  /**
   * Unregister all hotkeys
   */
  unregisterAll(): void {
    for (const action of this.registeredHotkeys.keys()) {
      this.unregister(action)
    }
  }

  /**
   * Update a hotkey
   */
  update(action: string, newAccelerator: string, callback: () => void): boolean {
    this.unregister(action)
    return this.register(action, newAccelerator, callback)
  }

  /**
   * Check if a hotkey is registered
   */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator)
  }

  /**
   * Enable/disable hotkeys
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.emit('enabled-changed', enabled)
  }

  /**
   * Get all registered hotkeys
   */
  getRegistered(): Map<string, string> {
    return new Map(this.registeredHotkeys)
  }

  /**
   * Validate accelerator format
   */
  static validateAccelerator(accelerator: string): boolean {
    // Basic validation for accelerator format
    const parts = accelerator.split('+').map(p => p.trim())
    const validModifiers = ['Command', 'Cmd', 'Control', 'Ctrl', 'Alt', 'Option', 'Shift', 'Super']
    const validKeys = [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      'Space', 'Tab', 'Enter', 'Return', 'Escape', 'Esc', 'Backspace', 'Delete',
      'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown'
    ]

    if (parts.length < 2) return false // Need at least modifier + key

    // Check if all but last are valid modifiers
    for (let i = 0; i < parts.length - 1; i++) {
      if (!validModifiers.includes(parts[i])) {
        return false
      }
    }

    // Check if last part is a valid key
    return validKeys.includes(parts[parts.length - 1])
  }

  /**
   * Get suggested hotkeys
   */
  static getSuggestions(): string[] {
    return [
      'Alt+Space',
      'Ctrl+Alt+R',
      'Ctrl+Shift+Space',
      'Alt+Shift+R',
      'Ctrl+Alt+V',
      'F9',
      'Ctrl+F9',
      'Alt+F9'
    ]
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.unregisterAll()
    this.removeAllListeners()
  }
}