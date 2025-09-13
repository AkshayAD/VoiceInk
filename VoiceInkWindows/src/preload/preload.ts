import { contextBridge, ipcRenderer } from 'electron'

// Step 8: Create working preload script
const electronAPI = {
  // IPC communication methods
  ping: () => ipcRenderer.invoke('ping'),
  sendMessage: (message: string) => ipcRenderer.send('test-message', message),
  onTestReply: (callback: (data: string) => void) => {
    ipcRenderer.on('test-reply', (_event, data) => callback(data))
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window management
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Database test
  testDatabase: () => ipcRenderer.invoke('db-test'),
  
  // Remove all listeners for a channel
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type definitions for TypeScript
export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

console.log('Preload script loaded successfully')