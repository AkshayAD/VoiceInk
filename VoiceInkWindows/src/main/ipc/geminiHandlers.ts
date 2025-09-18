import { ipcMain, BrowserWindow } from 'electron'
import { geminiService } from '../services/geminiService'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

const AUDIO_DIR = path.join(process.cwd(), 'audio_files')

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
}

export function setupGeminiHandlers(mainWindow: BrowserWindow) {
  
  // Transcribe audio buffer
  ipcMain.handle('gemini:transcribe', async (event, audioData: ArrayBuffer, mimeType: string, options: any = {}) => {
    try {
      console.log('📝 Transcribing audio with Gemini...')
      
      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(audioData)
      
      // Save to temp file (Gemini needs a file)
      const tempFileName = `temp-${uuidv4()}.${mimeType.split('/')[1] || 'webm'}`
      const tempFilePath = path.join(AUDIO_DIR, tempFileName)
      await fs.promises.writeFile(tempFilePath, buffer)
      
      // Forward events to renderer
      const progressHandler = (progress: any) => {
        mainWindow.webContents.send('transcription-progress', progress)
      }
      
      const startHandler = (id: string) => {
        mainWindow.webContents.send('transcription-started', id)
      }
      
      const errorHandler = (error: any) => {
        mainWindow.webContents.send('transcription-error', error)
      }
      
      // Attach event listeners
      geminiService.on('progress', progressHandler)
      geminiService.on('transcriptionStarted', startHandler)
      geminiService.on('transcriptionError', errorHandler)
      
      // Transcribe
      const result = await geminiService.transcribeAudioFile(tempFilePath, options)
      
      // Clean up event listeners
      geminiService.removeListener('progress', progressHandler)
      geminiService.removeListener('transcriptionStarted', startHandler)
      geminiService.removeListener('transcriptionError', errorHandler)
      
      // Send completion event
      mainWindow.webContents.send('transcription-complete', result)
      
      // Clean up temp file after a delay
      setTimeout(() => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.warn('Failed to delete temp file:', err)
        })
      }, 5000)
      
      return result
      
    } catch (error: any) {
      console.error('Transcription failed:', error)
      mainWindow.webContents.send('transcription-error', error.message)
      throw error
    }
  })
  
  // Transcribe file directly
  ipcMain.handle('gemini:transcribe-file', async (event, filePath: string, options: any = {}) => {
    try {
      console.log('📝 Transcribing file with Gemini:', filePath)
      
      // Set up event forwarding
      const progressHandler = (progress: any) => {
        mainWindow.webContents.send('transcription-progress', progress)
      }
      
      geminiService.on('progress', progressHandler)
      
      const result = await geminiService.transcribeAudioFile(filePath, options)
      
      geminiService.removeListener('progress', progressHandler)
      
      mainWindow.webContents.send('transcription-complete', result)
      
      return result
      
    } catch (error: any) {
      console.error('File transcription failed:', error)
      mainWindow.webContents.send('transcription-error', error.message)
      throw error
    }
  })
  
  // Set Gemini API key
  ipcMain.handle('gemini:set-api-key', async (event, apiKey: string) => {
    try {
      await geminiService.setApiKey(apiKey)
      
      // Save to settings
      const Store = require('electron-store')
      const store = new Store()
      store.set('geminiApiKey', apiKey)
      
      console.log('✅ Gemini API key updated')
      return true
      
    } catch (error: any) {
      console.error('Failed to set API key:', error)
      throw error
    }
  })
  
  // Get available Gemini models
  ipcMain.handle('gemini:get-models', async () => {
    return geminiService.getAvailableModels()
  })
  
  // Select Gemini model
  ipcMain.handle('gemini:select-model', async (event, model: string) => {
    try {
      await geminiService.switchModel(model as any)
      
      mainWindow.webContents.send('model-changed', model)
      
      // Save preference
      const Store = require('electron-store')
      const store = new Store()
      store.set('geminiModel', model)
      
      console.log(`✅ Switched to ${model} model`)
      return true
      
    } catch (error: any) {
      console.error('Failed to switch model:', error)
      throw error
    }
  })
  
  // Get transcription status
  ipcMain.handle('gemini:get-status', async (event, id: string) => {
    return geminiService.getQueueStatus(id)
  })
  
  // Cancel transcription
  ipcMain.handle('gemini:cancel', async (event, id: string) => {
    return geminiService.cancelQueuedTranscription(id)
  })
  
  // Queue transcription
  ipcMain.handle('gemini:queue', async (event, filePath: string, options: any = {}) => {
    try {
      const queueId = await geminiService.queueTranscription(filePath, options)
      
      // Set up completion handler
      const completeHandler = (data: any) => {
        if (data.queueId === queueId) {
          mainWindow.webContents.send('queued-transcription-complete', data)
        }
      }
      
      const failHandler = (data: any) => {
        if (data.queueId === queueId) {
          mainWindow.webContents.send('queued-transcription-failed', data)
        }
      }
      
      geminiService.once('queuedTranscriptionCompleted', completeHandler)
      geminiService.once('queuedTranscriptionFailed', failHandler)
      
      return queueId
      
    } catch (error: any) {
      console.error('Failed to queue transcription:', error)
      throw error
    }
  })
  
  // Get queue items
  ipcMain.handle('gemini:get-queue', async () => {
    return geminiService.getQueueItems()
  })
  
  // Check if service is ready
  ipcMain.handle('gemini:is-ready', async () => {
    return geminiService.isReady()
  })
  
  // Get current model
  ipcMain.handle('gemini:get-current-model', async () => {
    return geminiService.getCurrentModel()
  })
}

export function cleanupGeminiHandlers() {
  // Remove all listeners
  geminiService.removeAllListeners()
}