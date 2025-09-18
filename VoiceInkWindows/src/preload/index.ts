/**
 * Preload Script
 * Exposes safe APIs to the renderer process
 * Updated to support real audio recording and Gemini transcription
 */

import { contextBridge, ipcRenderer } from 'electron'

// Define the API to expose to renderer
const electronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),

  // Audio Recording (Updated for real implementation)
  startRecording: (options?: any) => ipcRenderer.invoke('audio:start-recording', options),
  stopRecording: () => ipcRenderer.invoke('audio:stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('audio:pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('audio:resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('audio:get-recording-status'),
  
  // Audio Processing
  saveAudioFile: (audioBlob: ArrayBuffer, mimeType: string) => 
    ipcRenderer.invoke('audio:save-file', audioBlob, mimeType),
  processAudioBlob: (audioBlob: ArrayBuffer, mimeType: string) => 
    ipcRenderer.invoke('audio:process-blob', audioBlob, mimeType),

  // Audio Devices
  getAudioDevices: () => ipcRenderer.invoke('audio:get-devices'),
  selectAudioDevice: (deviceId: string) => ipcRenderer.invoke('audio:select-device', deviceId),
  testAudioDevice: (deviceId: string) => ipcRenderer.invoke('audio:test-device', deviceId),

  // Gemini Transcription (New)
  transcribeAudio: (audioData: ArrayBuffer, mimeType: string, options?: any) => 
    ipcRenderer.invoke('gemini:transcribe', audioData, mimeType, options),
  transcribeFile: (filePath: string, options?: any) => 
    ipcRenderer.invoke('gemini:transcribe-file', filePath, options),
  setGeminiApiKey: (apiKey: string) => ipcRenderer.invoke('gemini:set-api-key', apiKey),
  getGeminiModels: () => ipcRenderer.invoke('gemini:get-models'),
  selectGeminiModel: (model: string) => ipcRenderer.invoke('gemini:select-model', model),
  getTranscriptionStatus: (id: string) => ipcRenderer.invoke('gemini:get-status', id),
  cancelTranscription: (id: string) => ipcRenderer.invoke('gemini:cancel', id),
  
  // Whisper Models (Legacy - kept for compatibility)
  getWhisperModels: () => ipcRenderer.invoke('get-whisper-models'),
  loadWhisperModel: (modelName: string) => ipcRenderer.invoke('load-whisper-model', modelName),
  downloadWhisperModel: (modelName: string) => ipcRenderer.invoke('download-whisper-model', modelName),

  // Database (Updated for real data)
  getTranscriptions: (options?: any) => ipcRenderer.invoke('db:get-transcriptions', options),
  saveTranscription: (transcription: any) => ipcRenderer.invoke('db:save-transcription', transcription),
  updateTranscription: (id: string, updates: any) => ipcRenderer.invoke('db:update-transcription', id, updates),
  deleteTranscription: (id: string) => ipcRenderer.invoke('db:delete-transcription', id),
  clearTranscriptions: () => ipcRenderer.invoke('db:clear-transcriptions'),
  getLastTranscription: () => ipcRenderer.invoke('db:get-last-transcription'),
  searchTranscriptions: (query: string) => ipcRenderer.invoke('db:search-transcriptions', query),

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

  // Export/Import (Updated for real functionality)
  exportTranscriptions: (format: string, ids?: string[]) => 
    ipcRenderer.invoke('export:transcriptions', format, ids),
  exportToDocx: (transcriptionIds: string[]) => ipcRenderer.invoke('export:docx', transcriptionIds),
  exportToPdf: (transcriptionIds: string[]) => ipcRenderer.invoke('export:pdf', transcriptionIds),
  exportToSrt: (transcriptionId: string) => ipcRenderer.invoke('export:srt', transcriptionId),
  exportToVtt: (transcriptionId: string) => ipcRenderer.invoke('export:vtt', transcriptionId),
  importTranscriptions: (filePath: string) => ipcRenderer.invoke('import:transcriptions', filePath),

  // Clipboard
  pasteText: (text: string, options?: any) => ipcRenderer.invoke('paste-text', text, options),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text: string) => ipcRenderer.invoke('set-clipboard-text', text),

  // Window Detection
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  getAllWindows: () => ipcRenderer.invoke('get-all-windows'),

  // Metrics (Updated for real data)
  getMetrics: (days?: number) => ipcRenderer.invoke('metrics:get', days),
  updateMetrics: (metrics: any) => ipcRenderer.invoke('metrics:update', metrics),
  getUsageStats: () => ipcRenderer.invoke('metrics:usage-stats'),

  // File Operations
  selectFile: (options?: any) => ipcRenderer.invoke('file:select', options),
  saveFile: (data: any, options?: any) => ipcRenderer.invoke('file:save', data, options),
  openFile: (path: string) => ipcRenderer.invoke('file:open', path),

  // System
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Event Listeners (Updated for real events)
  onRecordingStarted: (callback: () => void) => {
    ipcRenderer.on('recording-started', callback)
    return () => ipcRenderer.removeListener('recording-started', callback)
  },
  onRecordingStopped: (callback: (data: any) => void) => {
    ipcRenderer.on('recording-stopped', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('recording-stopped')
  },
  onRecordingPaused: (callback: () => void) => {
    ipcRenderer.on('recording-paused', callback)
    return () => ipcRenderer.removeListener('recording-paused', callback)
  },
  onRecordingResumed: (callback: () => void) => {
    ipcRenderer.on('recording-resumed', callback)
    return () => ipcRenderer.removeListener('recording-resumed', callback)
  },
  onTranscriptionStarted: (callback: (id: string) => void) => {
    ipcRenderer.on('transcription-started', (event, id) => callback(id))
    return () => ipcRenderer.removeAllListeners('transcription-started')
  },
  onTranscriptionComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('transcription-complete', (event, result) => callback(result))
    return () => ipcRenderer.removeAllListeners('transcription-complete')
  },
  onTranscriptionProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('transcription-progress', (event, progress) => callback(progress))
    return () => ipcRenderer.removeAllListeners('transcription-progress')
  },
  onTranscriptionError: (callback: (error: any) => void) => {
    ipcRenderer.on('transcription-error', (event, error) => callback(error))
    return () => ipcRenderer.removeAllListeners('transcription-error')
  },
  onAudioLevel: (callback: (level: number) => void) => {
    ipcRenderer.on('audio-level', (event, level) => callback(level))
    return () => ipcRenderer.removeAllListeners('audio-level')
  },
  onAudioData: (callback: (data: any) => void) => {
    ipcRenderer.on('audio-data', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('audio-data')
  },
  onDevicesChanged: (callback: (devices: any[]) => void) => {
    ipcRenderer.on('devices-changed', (event, devices) => callback(devices))
    return () => ipcRenderer.removeAllListeners('devices-changed')
  },
  onModelChanged: (callback: (model: string) => void) => {
    ipcRenderer.on('model-changed', (event, model) => callback(model))
    return () => ipcRenderer.removeAllListeners('model-changed')
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