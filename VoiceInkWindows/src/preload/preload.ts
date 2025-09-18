import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Step 8: Create working preload script with audio/transcription APIs
const electronAPI = {
  // Original IPC communication methods
  ping: () => ipcRenderer.invoke('ping'),
  sendMessage: (message: string) => ipcRenderer.send('test-message', message),
  onTestReply: (callback: (data: string) => void) => {
    ipcRenderer.on('test-reply', (_event, data) => callback(data))
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window management
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    unmaximize: () => ipcRenderer.send('window-unmaximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-isMaximized'),
    onStateChanged: (callback: () => void) => {
      ipcRenderer.on('window-state-changed', callback)
    },
    offStateChanged: (callback: () => void) => {
      ipcRenderer.removeListener('window-state-changed', callback)
    },
    // Mini recorder window
    openMiniRecorder: () => ipcRenderer.invoke('window-openMiniRecorder'),
    closeMiniRecorder: () => ipcRenderer.invoke('window-closeMiniRecorder'),
    toggleMiniRecorder: () => ipcRenderer.invoke('window-toggleMiniRecorder')
  },
  
  // Legacy window management (for backward compatibility)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onMaximized: (callback: () => void) => {
    ipcRenderer.on('window-maximized', callback)
  },
  onUnmaximized: (callback: () => void) => {
    ipcRenderer.on('window-unmaximized', callback)
  },
  
  // Database test
  testDatabase: () => ipcRenderer.invoke('db-test'),
  
  // Audio Recording APIs
  audio: {
    getDevices: () => ipcRenderer.invoke('audio:getDevices'),
    selectDevice: (deviceId: string) => ipcRenderer.invoke('audio:selectDevice', deviceId),
    startRecording: (options?: any) => ipcRenderer.invoke('audio:startRecording', options),
    stopRecording: () => ipcRenderer.invoke('audio:stopRecording'),
    pauseRecording: () => ipcRenderer.invoke('audio:pauseRecording'),
    resumeRecording: () => ipcRenderer.invoke('audio:resumeRecording'),
    getRecordingTime: () => ipcRenderer.invoke('audio:getRecordingTime'),
    getLevel: () => ipcRenderer.invoke('audio:getLevel'),
    isRecording: () => ipcRenderer.invoke('audio:isRecording'),
    onLevel: (callback: (level: number) => void) => {
      ipcRenderer.on('audio:level', (_event, level) => callback(level))
    },
    onData: (callback: (data: Float32Array) => void) => {
      ipcRenderer.on('audio:data', (_event, data) => callback(data))
    }
  },
  
  // Transcription APIs
  transcription: {
    getModels: () => ipcRenderer.invoke('transcription:getModels'),
    downloadModel: (modelId: string) => ipcRenderer.invoke('transcription:downloadModel', modelId),
    selectModel: (modelId: string) => ipcRenderer.invoke('transcription:selectModel', modelId),
    transcribe: (audioBuffer: string, options?: any) => 
      ipcRenderer.invoke('transcription:transcribe', audioBuffer, options),
    transcribeFile: (filepath: string, options?: any) => 
      ipcRenderer.invoke('transcription:transcribeFile', filepath, options),
    addToQueue: (audioBuffer: string, options?: any) => 
      ipcRenderer.invoke('transcription:addToQueue', audioBuffer, options),
    cancelCurrent: () => ipcRenderer.invoke('transcription:cancelCurrent'),
    clearQueue: () => ipcRenderer.invoke('transcription:clearQueue'),
    getQueueLength: () => ipcRenderer.invoke('transcription:getQueueLength'),
    isTranscribing: () => ipcRenderer.invoke('transcription:isTranscribing'),
    getCurrentModel: () => ipcRenderer.invoke('transcription:getCurrentModel'),
    detectLanguage: (audioBuffer: string) => 
      ipcRenderer.invoke('transcription:detectLanguage', audioBuffer),
    enhance: (text: string) => ipcRenderer.invoke('transcription:enhance', text),
    onProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('transcription:progress', (_event, progress) => callback(progress))
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('transcription:downloadProgress', (_event, progress) => callback(progress))
    },
    onModelDownloaded: (callback: (model: any) => void) => {
      ipcRenderer.on('transcription:modelDownloaded', (_event, model) => callback(model))
    }
  },
  
  // Workflow APIs (combined operations)
  workflow: {
    recordAndTranscribe: (options: any) => 
      ipcRenderer.invoke('workflow:recordAndTranscribe', options),
    startRealtimeTranscription: (options: any) => 
      ipcRenderer.invoke('workflow:startRealtimeTranscription', options),
    onPartialTranscription: (callback: (result: any) => void) => {
      ipcRenderer.on('workflow:partialTranscription', (_event, result) => callback(result))
    }
  },
  
  // Settings & Storage
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    reset: () => ipcRenderer.invoke('settings:reset')
  },
  
  // File operations
  file: {
    save: (filepath: string, content: any) => 
      ipcRenderer.invoke('file:save', filepath, content),
    load: (filepath: string) => ipcRenderer.invoke('file:load', filepath),
    export: (format: string, content: any, options?: any) => 
      ipcRenderer.invoke('file:export', format, content, options),
    selectDirectory: () => ipcRenderer.invoke('file:selectDirectory'),
    selectFile: (filters?: any) => ipcRenderer.invoke('file:selectFile', filters)
  },
  
  // Clipboard operations
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    writeRTF: (rtf: string) => ipcRenderer.invoke('clipboard:writeRTF', rtf)
  },
  
  // System operations
  system: {
    getHotkeys: () => ipcRenderer.invoke('system:getHotkeys'),
    registerHotkey: (accelerator: string, callback: () => void) => 
      ipcRenderer.invoke('system:registerHotkey', accelerator, callback),
    unregisterHotkey: (accelerator: string) => 
      ipcRenderer.invoke('system:unregisterHotkey', accelerator),
    showInFolder: (filepath: string) => ipcRenderer.invoke('system:showInFolder', filepath),
    openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url)
  },
  
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

console.log('Preload script loaded with audio/transcription APIs')