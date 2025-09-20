/**
 * Window Detection Service
 * Detects active window and extracts application information
 */

import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ActiveWindow {
  name: string
  title: string
  path?: string
  pid?: number
  url?: string // For browsers
}

export class WindowDetector extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null
  private currentWindow: ActiveWindow | null = null
  private isMonitoring = false

  constructor() {
    super()
  }

  /**
   * Get current active window
   */
  async getActiveWindow(): Promise<ActiveWindow | null> {
    try {
      // PowerShell script to get active window info
      const script = `
        Add-Type @"
        using System;
        using System.Diagnostics;
        using System.Runtime.InteropServices;
        using System.Text;

        public class WindowInfo {
          [DllImport("user32.dll")]
          static extern IntPtr GetForegroundWindow();
          
          [DllImport("user32.dll")]
          static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          
          [DllImport("user32.dll", SetLastError=true)]
          static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

          [DllImport("user32.dll")]
          static extern bool IsWindow(IntPtr hWnd);
          
          public static string GetActiveWindowInfo() {
            IntPtr hwnd = GetForegroundWindow();
            
            // Validate window handle
            if (hwnd == IntPtr.Zero || !IsWindow(hwnd)) {
              return "0|Desktop|Desktop||";
            }
            
            StringBuilder title = new StringBuilder(512);
            GetWindowText(hwnd, title, 512);
            
            uint processId;
            GetWindowThreadProcessId(hwnd, out processId);
            
            try {
              Process process = Process.GetProcessById((int)processId);
              string processName = process.ProcessName;
              string mainModule = "";
              
              try {
                if (process.MainModule != null) {
                  mainModule = process.MainModule.FileName;
                }
              } catch {
                // Access denied for some system processes
              }
              
              return processId + "|" + processName + "|" + title.ToString() + "|" + mainModule;
            } catch (ArgumentException) {
              // Process not found
              return processId + "|ProcessNotFound|" + title.ToString() + "|";
            } catch (Exception ex) {
              return processId + "|Error:" + ex.GetType().Name + "|" + title.ToString() + "|";
            }
          }
        }
"@
        [WindowInfo]::GetActiveWindowInfo()
      `

      const { stdout, stderr } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`)
      
      if (stderr && stderr.trim()) {
        console.warn('PowerShell stderr:', stderr.trim())
      }

      const output = stdout.trim()
      if (!output) {
        return null
      }

      const [pid, name, title, path] = output.split('|')

      // Skip if it's our own VoiceInk app
      if (name && (name.toLowerCase().includes('voiceink') || name.toLowerCase().includes('electron'))) {
        return null
      }

      const window: ActiveWindow = {
        name: name || 'Unknown',
        title: title || '',
        path: path || undefined,
        pid: parseInt(pid) || undefined
      }

      // Try to get browser URL if it's a browser
      if (this.isBrowser(name)) {
        window.url = await this.getBrowserUrl(name, title)
      }

      return window
    } catch (err) {
      console.error('Failed to get active window:', err)
      return null
    }
  }

  /**
   * Start monitoring active window changes
   */
  startMonitoring(interval = 1000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    this.monitoringInterval = setInterval(async () => {
      const window = await this.getActiveWindow()
      
      if (window && (!this.currentWindow || 
          window.name !== this.currentWindow.name || 
          window.title !== this.currentWindow.title)) {
        this.currentWindow = window
        this.emit('window-changed', window)
      }
    }, interval)

    // Get initial window
    this.getActiveWindow().then(window => {
      if (window) {
        this.currentWindow = window
        this.emit('window-changed', window)
      }
    })
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
  }

  /**
   * Check if application is a browser
   */
  private isBrowser(appName: string): boolean {
    const browsers = [
      'chrome', 'firefox', 'msedge', 'edge', 'opera', 'brave', 
      'vivaldi', 'safari', 'iexplore'
    ]
    return browsers.some(browser => 
      appName.toLowerCase().includes(browser)
    )
  }

  /**
   * Try to get browser URL
   */
  private async getBrowserUrl(browserName: string, windowTitle: string): Promise<string | undefined> {
    // For most browsers, the URL is often in the window title
    // This is a simplified approach - more sophisticated methods would use
    // UI Automation or browser-specific APIs

    // Try to extract URL from title (many browsers show "Page Title - URL" or similar)
    const urlMatch = windowTitle.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      return urlMatch[0]
    }

    // Browser-specific URL extraction could be implemented here
    // For example, using UI Automation for Chrome/Edge:
    if (browserName.toLowerCase().includes('chrome') || 
        browserName.toLowerCase().includes('edge')) {
      return await this.getChromeUrl()
    }

    return undefined
  }

  /**
   * Get Chrome/Edge URL using UI Automation
   */
  private async getChromeUrl(): Promise<string | undefined> {
    try {
      // This requires more complex UI Automation
      // For now, return undefined
      // In production, you'd use Windows UI Automation API
      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * Get list of all open windows
   */
  async getAllWindows(): Promise<ActiveWindow[]> {
    try {
      const script = `
        Add-Type @"
        using System;
        using System.Collections.Generic;
        using System.Diagnostics;
        using System.Runtime.InteropServices;
        using System.Text;

        public class WindowEnumerator {
          delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
          
          [DllImport("user32.dll")]
          static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
          
          [DllImport("user32.dll")]
          static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          
          [DllImport("user32.dll")]
          static extern bool IsWindowVisible(IntPtr hWnd);
          
          [DllImport("user32.dll")]
          static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
          
          public static List<string> GetAllWindows() {
            List<string> windows = new List<string>();
            
            EnumWindows((hWnd, lParam) => {
              if (IsWindowVisible(hWnd)) {
                StringBuilder title = new StringBuilder(256);
                GetWindowText(hWnd, title, 256);
                
                if (title.Length > 0) {
                  uint processId;
                  GetWindowThreadProcessId(hWnd, out processId);
                  
                  try {
                    Process process = Process.GetProcessById((int)processId);
                    windows.Add(process.ProcessName + "|" + title.ToString());
                  } catch {
                    // Skip if can't get process info
                  }
                }
              }
              return true;
            }, IntPtr.Zero);
            
            return windows;
          }
        }
"@
        [WindowEnumerator]::GetAllWindows() | ForEach-Object { Write-Output $_ }
      `

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`)
      const lines = stdout.trim().split('\n').filter(line => line.trim())

      return lines.map(line => {
        const [name, title] = line.split('|')
        return {
          name: name || 'Unknown',
          title: title || ''
        }
      })
    } catch (err) {
      console.error('Failed to enumerate windows:', err)
      return []
    }
  }

  /**
   * Focus a specific window
   */
  async focusWindow(windowTitle: string): Promise<boolean> {
    try {
      const script = `
        Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        
        public class WindowFocus {
          [DllImport("user32.dll")]
          static extern bool SetForegroundWindow(IntPtr hWnd);
          
          [DllImport("user32.dll")]
          static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
          
          public static bool FocusWindow(string title) {
            IntPtr hwnd = FindWindow(null, title);
            if (hwnd != IntPtr.Zero) {
              return SetForegroundWindow(hwnd);
            }
            return false;
          }
        }
"@
        [WindowFocus]::FocusWindow("${windowTitle}")
      `

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`)
      return stdout.trim().toLowerCase() === 'true'
    } catch {
      return false
    }
  }

  /**
   * Get current window
   */
  getCurrentWindow(): ActiveWindow | null {
    return this.currentWindow
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopMonitoring()
    this.removeAllListeners()
  }
}