/**
 * Preload Script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'

// Define the API to expose to renderer
const electronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),

  // Recording
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Audio Devices
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  selectAudioDevice: (deviceId: string) => ipcRenderer.invoke('select-audio-device', deviceId),

  // Whisper Models
  getWhisperModels: () => ipcRenderer.invoke('get-whisper-models'),
  loadWhisperModel: (modelName: string) => ipcRenderer.invoke('load-whisper-model', modelName),
  downloadWhisperModel: (modelName: string) => ipcRenderer.invoke('download-whisper-model', modelName),

  // Database
  getTranscriptions: (options: any) => ipcRenderer.invoke('get-transcriptions', options),
  deleteTranscription: (id: string) => ipcRenderer.invoke('delete-transcription', id),
  clearTranscriptions: () => ipcRenderer.invoke('clear-transcriptions'),
  getLastTranscription: () => ipcRenderer.invoke('get-last-transcription'),

  // Power Mode
  getPowerModeConfigs: () => ipcRenderer.invoke('get-power-mode-configs'),
  savePowerModeConfig: (config: any) => ipcRenderer.invoke('save-power-mode-config', config),
  updatePowerModeConfig: (id: string, config: any) => ipcRenderer.invoke('update-power-mode-config', id, config),
  deletePowerModeConfig: (id: string) => ipcRenderer.invoke('delete-power-mode-config', id),

  // AI Prompts
  getAIPrompts: (category?: string) => ipcRenderer.invoke('get-ai-prompts', category),
  saveAIPrompt: (prompt: any) => ipcRenderer.invoke('save-ai-prompt', prompt),

  // Custom Words & Replacements
  getCustomWords: () => ipcRenderer.invoke('get-custom-words'),
  addCustomWord: (word: string, phonetic?: string, context?: string) => 
    ipcRenderer.invoke('add-custom-word', word, phonetic, context),
  removeCustomWord: (word: string) => ipcRenderer.invoke('remove-custom-word', word),
  getReplacements: () => ipcRenderer.invoke('get-replacements'),
  addReplacement: (pattern: string, replacement: string, isRegex?: boolean) => 
    ipcRenderer.invoke('add-replacement', pattern, replacement, isRegex),
  removeReplacement: (pattern: string) => ipcRenderer.invoke('remove-replacement', pattern),

  // Clipboard
  pasteText: (text: string, options?: any) => ipcRenderer.invoke('paste-text', text, options),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text: string) => ipcRenderer.invoke('set-clipboard-text', text),

  // Window Detection
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  getAllWindows: () => ipcRenderer.invoke('get-all-windows'),

  // Metrics
  getMetrics: (days?: number) => ipcRenderer.invoke('get-metrics', days),

  // File Operations
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),

  // System
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Event Listeners
  onRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('recording-started', callback)
    return () => ipcRenderer.removeListener('recording-started', callback)
  },
  onRecordingStopped: (callback: () => void) => {
    ipcRenderer.on('recording-stopped', callback)
    return () => ipcRenderer.removeListener('recording-stopped', callback)
  },
  onTranscriptionComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('transcription-complete', (event, result) => callback(result))
    return () => ipcRenderer.removeAllListeners('transcription-complete')
  },
  onAudioLevel: (callback: (level: number) => void) => {
    ipcRenderer.on('audio-level', (event, level) => callback(level))
    return () => ipcRenderer.removeAllListeners('audio-level')
  },
  onVoiceDetected: (callback: () => void) => {
    ipcRenderer.on('voice-detected', callback)
    return () => ipcRenderer.removeListener('voice-detected', callback)
  },
  onTranscriptionProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('transcription-progress', (event, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('transcription-progress')
  },
  onModelLoading: (callback: (model: string) => void) => {
    ipcRenderer.on('model-loading', (event, model) => callback(model))
    return () => ipcRenderer.removeAllListeners('model-loading')
  },
  onModelLoaded: (callback: (model: string) => void) => {
    ipcRenderer.on('model-loaded', (event, model) => callback(model))
    return () => ipcRenderer.removeAllListeners('model-loaded')
  },
  onActiveWindowChanged: (callback: (window: any) => void) => {
    ipcRenderer.on('active-window-changed', (event, window) => callback(window))
    return () => ipcRenderer.removeAllListeners('active-window-changed')
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('error', (event, error) => callback(error))
    return () => ipcRenderer.removeAllListeners('error')
  },
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (event, path) => callback(path))
    return () => ipcRenderer.removeAllListeners('navigate')
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI)

// Type definitions for TypeScript
export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electron: ElectronAPI
  }
}