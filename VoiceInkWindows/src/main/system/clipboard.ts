/**
 * Clipboard Management
 * Handles clipboard operations and text insertion
 */

import { clipboard, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class ClipboardManager extends EventEmitter {
  private savedClipboard: string | null = null
  private preserveClipboard = false

  constructor() {
    super()
  }

  /**
   * Get current clipboard text
   */
  getText(): string {
    return clipboard.readText()
  }

  /**
   * Set clipboard text
   */
  setText(text: string): void {
    clipboard.writeText(text)
    this.emit('clipboard-changed', text)
  }

  /**
   * Save current clipboard content
   */
  save(): void {
    this.savedClipboard = this.getText()
  }

  /**
   * Restore saved clipboard content
   */
  restore(): void {
    if (this.savedClipboard !== null) {
      this.setText(this.savedClipboard)
      this.savedClipboard = null
    }
  }

  /**
   * Paste text at cursor position
   */
  async pasteText(text: string, options?: PasteOptions): Promise<void> {
    const { 
      preserveClipboard = this.preserveClipboard,
      sendEnter = false,
      delay = 100
    } = options || {}

    // Save current clipboard if needed
    if (preserveClipboard) {
      this.save()
    }

    // Set text to clipboard
    this.setText(text)

    // Small delay to ensure clipboard is set
    await this.sleep(50)

    // Send paste command (Ctrl+V)
    await this.sendPasteCommand()

    // Wait for paste to complete
    await this.sleep(delay)

    // Send Enter if requested
    if (sendEnter) {
      await this.sendEnterKey()
    }

    // Restore clipboard if needed
    if (preserveClipboard) {
      // Delay before restoring to avoid conflicts
      setTimeout(() => this.restore(), 500)
    }
  }

  /**
   * Send paste command using Windows SendInput
   */
  private async sendPasteCommand(): Promise<void> {
    // Use PowerShell to send Ctrl+V
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      
      public class KeyboardSimulator {
        [DllImport("user32.dll", SetLastError = true)]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
        
        const byte VK_CONTROL = 0x11;
        const byte VK_V = 0x56;
        const uint KEYEVENTF_KEYUP = 0x02;
        
        public static void SendCtrlV() {
          // Press Ctrl
          keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
          System.Threading.Thread.Sleep(10);
          
          // Press V
          keybd_event(VK_V, 0, 0, UIntPtr.Zero);
          System.Threading.Thread.Sleep(10);
          
          // Release V
          keybd_event(VK_V, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
          System.Threading.Thread.Sleep(10);
          
          // Release Ctrl
          keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
      }
"@
      [KeyboardSimulator]::SendCtrlV()
    `

    try {
      await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`)
    } catch (err) {
      console.error('Failed to send paste command:', err)
      // Fallback to robot.js or other method if available
    }
  }

  /**
   * Send Enter key
   */
  private async sendEnterKey(): Promise<void> {
    const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      
      public class KeyboardSimulator {
        [DllImport("user32.dll", SetLastError = true)]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
        
        const byte VK_RETURN = 0x0D;
        const uint KEYEVENTF_KEYUP = 0x02;
        
        public static void SendEnter() {
          keybd_event(VK_RETURN, 0, 0, UIntPtr.Zero);
          System.Threading.Thread.Sleep(10);
          keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
      }
"@
      [KeyboardSimulator]::SendEnter()
    `

    try {
      await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`)
    } catch (err) {
      console.error('Failed to send enter key:', err)
    }
  }

  /**
   * Insert text using alternative method (for specific applications)
   */
  async insertTextAlternative(text: string): Promise<void> {
    // This method types out the text character by character
    // Useful for applications that don't support paste
    const script = `
      Add-Type -TypeDefinition @"
      using System;
      using System.Runtime.InteropServices;
      using System.Windows.Forms;
      
      public class TextTyper {
        public static void TypeText(string text) {
          SendKeys.SendWait(text);
        }
      }
"@
      [TextTyper]::TypeText("${text.replace(/"/g, '\\"')}")
    `

    try {
      await execAsync(`powershell -NoProfile -Command "${script}"`)
    } catch (err) {
      console.error('Failed to type text:', err)
    }
  }

  /**
   * Monitor clipboard changes
   */
  startMonitoring(interval = 500): void {
    let lastContent = this.getText()
    
    const checkClipboard = setInterval(() => {
      const currentContent = this.getText()
      if (currentContent !== lastContent) {
        lastContent = currentContent
        this.emit('clipboard-changed', currentContent)
      }
    }, interval)

    // Store interval ID for cleanup
    this.once('stop-monitoring', () => {
      clearInterval(checkClipboard)
    })
  }

  /**
   * Stop monitoring clipboard
   */
  stopMonitoring(): void {
    this.emit('stop-monitoring')
  }

  /**
   * Set preserve clipboard preference
   */
  setPreserveClipboard(preserve: boolean): void {
    this.preserveClipboard = preserve
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    clipboard.clear()
    this.emit('clipboard-cleared')
  }

  /**
   * Check if clipboard has text
   */
  hasText(): boolean {
    return clipboard.readText().length > 0
  }

  /**
   * Get clipboard formats available
   */
  getFormats(): string[] {
    return clipboard.availableFormats()
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopMonitoring()
    this.removeAllListeners()
  }
}

export interface PasteOptions {
  preserveClipboard?: boolean
  sendEnter?: boolean
  delay?: number
}