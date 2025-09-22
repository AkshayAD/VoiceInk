/**
 * IPC Handlers
 * Handles communication between main and renderer processes
 */

import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import Store from 'electron-store'
import { AudioRecorder } from '../audio/recorder'
import { WhisperService } from '../whisper/service'
import { WindowDetector } from '../system/window'
import { ClipboardManager } from '../system/clipboard'
import { DatabaseService } from '../database/service'

interface Services {
  audioRecorder: AudioRecorder
  whisperService: WhisperService
  windowDetector: WindowDetector
  clipboardManager: ClipboardManager
  databaseService: DatabaseService
  store: Store
}

export function setupIPC(services: Services) {
  const {
    audioRecorder,
    whisperService,
    windowDetector,
    clipboardManager,
    databaseService,
    store
  } = services

  // === Settings ===
  ipcMain.handle('get-settings', () => {
    return store.store
  })

  ipcMain.handle('update-settings', (event, settings) => {
    Object.entries(settings).forEach(([key, value]) => {
      store.set(key, value)
    })
    return true
  })

  // === Recording ===
  ipcMain.handle('start-recording', async () => {
    try {
      await audioRecorder.startRecording()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('stop-recording', async () => {
    try {
      const audioBuffer = await audioRecorder.stopRecording()
      
      // Start transcription
      const transcription = await whisperService.transcribe(audioBuffer)
      
      // Get active window info
      const activeWindow = await windowDetector.getActiveWindow()
      
      // Save to database
      await databaseService.saveTranscription({
        text: transcription.text,
        model: whisperService.currentModel,
        duration: audioBuffer.duration,
        applicationName: activeWindow?.name,
        applicationPath: activeWindow?.path,
        url: activeWindow?.url
      })
      
      return { 
        success: true, 
        text: transcription.text,
        duration: audioBuffer.duration
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('pause-recording', () => {
    // Implementation for pause if needed
    return { success: true }
  })

  ipcMain.handle('resume-recording', () => {
    // Implementation for resume if needed
    return { success: true }
  })

  ipcMain.handle('get-recording-status', () => {
    return {
      isRecording: audioRecorder.isRecording(),
      audioLevel: audioRecorder.getAudioLevel()
    }
  })

  // === Audio Devices ===
  ipcMain.handle('get-audio-devices', async () => {
    return await audioRecorder.getAudioDevices()
  })

  ipcMain.handle('select-audio-device', async (event, deviceId) => {
    // Implementation for device selection
    return { success: true }
  })

  // === Whisper Models ===
  ipcMain.handle('get-whisper-models', async () => {
    return await whisperService.getAvailableModels()
  })

  ipcMain.handle('load-whisper-model', async (event, modelName) => {
    try {
      await whisperService.loadModel(modelName)
      store.set('selectedModel', modelName)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('download-whisper-model', async (event, modelName) => {
    try {
      await whisperService.loadModel(modelName) // This downloads if needed
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // === Database ===
  ipcMain.handle('get-transcriptions', async (event, options) => {
    return await databaseService.getTranscriptions(options)
  })

  ipcMain.handle('delete-transcription', async (event, id) => {
    await databaseService.deleteTranscription(id)
    return { success: true }
  })

  ipcMain.handle('clear-transcriptions', async () => {
    await databaseService.clearTranscriptions()
    return { success: true }
  })

  ipcMain.handle('get-last-transcription', async () => {
    return await databaseService.getLastTranscription()
  })

  // === Power Mode ===
  ipcMain.handle('get-power-mode-configs', async () => {
    return await databaseService.getPowerModeConfigs()
  })

  ipcMain.handle('save-power-mode-config', async (event, config) => {
    return await databaseService.savePowerModeConfig(config)
  })

  ipcMain.handle('update-power-mode-config', async (event, id, config) => {
    return await databaseService.updatePowerModeConfig(id, config)
  })

  ipcMain.handle('delete-power-mode-config', async (event, id) => {
    await databaseService.deletePowerModeConfig(id)
    return { success: true }
  })

  // === AI Prompts ===
  ipcMain.handle('get-ai-prompts', async (event, category) => {
    return await databaseService.getAIPrompts(category)
  })

  ipcMain.handle('save-ai-prompt', async (event, prompt) => {
    return await databaseService.saveAIPrompt(prompt)
  })

  // === Custom Words & Replacements ===
  ipcMain.handle('get-custom-words', async () => {
    return await databaseService.getCustomWords()
  })

  ipcMain.handle('add-custom-word', async (event, word, phonetic, context) => {
    await databaseService.addCustomWord(word, phonetic, context)
    return { success: true }
  })

  ipcMain.handle('remove-custom-word', async (event, word) => {
    await databaseService.removeCustomWord(word)
    return { success: true }
  })

  ipcMain.handle('get-replacements', async () => {
    return await databaseService.getReplacements()
  })

  ipcMain.handle('add-replacement', async (event, pattern, replacement, isRegex) => {
    await databaseService.addReplacement(pattern, replacement, isRegex)
    return { success: true }
  })

  ipcMain.handle('remove-replacement', async (event, pattern) => {
    await databaseService.removeReplacement(pattern)
    return { success: true }
  })

  // === Clipboard ===
  ipcMain.handle('paste-text', async (event, text, options) => {
    await clipboardManager.pasteText(text, options)
    return { success: true }
  })

  ipcMain.handle('get-clipboard-text', () => {
    return clipboardManager.getText()
  })

  ipcMain.handle('set-clipboard-text', (event, text) => {
    clipboardManager.setText(text)
    return { success: true }
  })

  // === Window Detection ===
  ipcMain.handle('get-active-window', async () => {
    return await windowDetector.getActiveWindow()
  })

  ipcMain.handle('get-all-windows', async () => {
    return await windowDetector.getAllWindows()
  })

  // === Metrics ===
  ipcMain.handle('get-metrics', async (event, days) => {
    return await databaseService.getMetrics(days)
  })

  // === File Operations ===
  ipcMain.handle('export-data', async () => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `voiceink-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (filePath) {
      const data = await databaseService.exportData()
      const { writeFile } = await import('fs/promises')
      await writeFile(filePath, JSON.stringify(data, null, 2))
      return { success: true, path: filePath }
    }

    return { success: false }
  })

  ipcMain.handle('import-data', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (filePaths.length > 0) {
      const { readFile } = await import('fs/promises')
      const data = JSON.parse(await readFile(filePaths[0], 'utf-8'))
      await databaseService.importData(data)
      return { success: true }
    }

    return { success: false }
  })

  // === System ===
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url)
  })

  ipcMain.handle('show-item-in-folder', (event, path) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  ipcMain.handle('minimize-window', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.handle('maximize-window', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
  })

  ipcMain.handle('close-window', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  // === Event Forwarding ===
  // Forward events from services to renderer
  audioRecorder.on('level', (level) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('audio-level', level)
    })
  })

  audioRecorder.on('voice-detected', () => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('voice-detected')
    })
  })

  whisperService.on('transcription-progress', (progress) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription-progress', progress)
    })
  })

  whisperService.on('model-loading', (model) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('model-loading', model)
    })
  })

  whisperService.on('model-loaded', (model) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('model-loaded', model)
    })
  })

  windowDetector.on('window-changed', (window) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('active-window-changed', window)
    })
  })
}