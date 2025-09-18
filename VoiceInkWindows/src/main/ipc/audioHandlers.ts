import { ipcMain, BrowserWindow } from 'electron'
import { audioRecorder } from '../services/mockAudioRecorder'
import { transcriptionService } from '../services/mockTranscriptionService'
import * as path from 'path'
import * as fs from 'fs'

export function setupAudioHandlers(mainWindow: BrowserWindow) {
  // Audio Recording Handlers
  ipcMain.handle('audio:getDevices', async () => {
    return await audioRecorder.getAudioDevices()
  })

  ipcMain.handle('audio:selectDevice', async (_, deviceId: string) => {
    return await audioRecorder.selectDevice(deviceId)
  })

  ipcMain.handle('audio:startRecording', async (_, options) => {
    const success = await audioRecorder.startRecording(options)
    if (success) {
      // Set up level monitoring
      audioRecorder.on('level', (level) => {
        mainWindow.webContents.send('audio:level', level)
      })
      
      // Set up data streaming for real-time transcription
      audioRecorder.on('data', (chunk) => {
        mainWindow.webContents.send('audio:data', chunk)
      })
    }
    return success
  })

  ipcMain.handle('audio:stopRecording', async () => {
    const buffer = await audioRecorder.stopRecording()
    if (buffer) {
      // Save to temp file
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const filename = `recording-${Date.now()}.wav`
      const filepath = path.join(tempDir, filename)
      await audioRecorder.saveRecording(buffer, filepath)
      
      return { success: true, filepath, buffer: buffer.toString('base64') }
    }
    return { success: false }
  })

  ipcMain.handle('audio:pauseRecording', async () => {
    return audioRecorder.pauseRecording()
  })

  ipcMain.handle('audio:resumeRecording', async () => {
    return audioRecorder.resumeRecording()
  })

  ipcMain.handle('audio:getRecordingTime', async () => {
    return audioRecorder.getRecordingTime()
  })

  ipcMain.handle('audio:getLevel', async () => {
    return audioRecorder.getAudioLevel()
  })

  ipcMain.handle('audio:isRecording', async () => {
    return audioRecorder.isCurrentlyRecording()
  })

  // Transcription Handlers
  ipcMain.handle('transcription:getModels', async () => {
    return await transcriptionService.getAvailableModels()
  })

  ipcMain.handle('transcription:downloadModel', async (_, modelId: string) => {
    const success = await transcriptionService.downloadModel(modelId)
    
    if (success) {
      // Set up progress monitoring
      transcriptionService.on('download-progress', (progress) => {
        mainWindow.webContents.send('transcription:downloadProgress', progress)
      })
      
      transcriptionService.on('model-downloaded', (model) => {
        mainWindow.webContents.send('transcription:modelDownloaded', model)
      })
    }
    
    return success
  })

  ipcMain.handle('transcription:selectModel', async (_, modelId: string) => {
    return await transcriptionService.selectModel(modelId)
  })

  ipcMain.handle('transcription:transcribe', async (_, audioBuffer: string, options) => {
    try {
      const buffer = Buffer.from(audioBuffer, 'base64')
      
      // Set up real-time progress if requested
      if (options.realtime) {
        transcriptionService.on('transcription-progress', (progress) => {
          mainWindow.webContents.send('transcription:progress', progress)
        })
      }
      
      const result = await transcriptionService.transcribe(buffer, options)
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('transcription:transcribeFile', async (_, filepath: string, options) => {
    try {
      const result = await transcriptionService.transcribeFile(filepath, options)
      return { success: true, result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('transcription:addToQueue', async (_, audioBuffer: string, options) => {
    const buffer = Buffer.from(audioBuffer, 'base64')
    const id = await transcriptionService.addToQueue(buffer, options)
    return id
  })

  ipcMain.handle('transcription:cancelCurrent', async () => {
    return transcriptionService.cancelTranscription()
  })

  ipcMain.handle('transcription:clearQueue', async () => {
    return transcriptionService.clearQueue()
  })

  ipcMain.handle('transcription:getQueueLength', async () => {
    return transcriptionService.getQueueLength()
  })

  ipcMain.handle('transcription:isTranscribing', async () => {
    return transcriptionService.isCurrentlyTranscribing()
  })

  ipcMain.handle('transcription:getCurrentModel', async () => {
    return transcriptionService.getCurrentModel()
  })

  ipcMain.handle('transcription:detectLanguage', async (_, audioBuffer: string) => {
    const buffer = Buffer.from(audioBuffer, 'base64')
    return await transcriptionService.detectLanguage(buffer)
  })

  ipcMain.handle('transcription:enhance', async (_, text: string) => {
    return await transcriptionService.enhanceTranscription(text)
  })

  // Combined workflow: Record and transcribe
  ipcMain.handle('workflow:recordAndTranscribe', async (_, options) => {
    try {
      // Start recording
      await audioRecorder.startRecording(options.recording)
      
      // Wait for specified duration or until stopped
      if (options.duration) {
        await new Promise(resolve => setTimeout(resolve, options.duration * 1000))
        const buffer = await audioRecorder.stopRecording()
        
        if (buffer) {
          // Transcribe immediately
          const result = await transcriptionService.transcribe(buffer, options.transcription)
          return { success: true, result }
        }
      }
      
      return { success: false, error: 'Recording failed' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Real-time transcription workflow
  ipcMain.handle('workflow:startRealtimeTranscription', async (_, options) => {
    try {
      // Start recording
      const recordingStarted = await audioRecorder.startRecording(options.recording)
      if (!recordingStarted) {
        return { success: false, error: 'Failed to start recording' }
      }

      // Set up real-time audio processing
      let audioChunks: Float32Array[] = []
      let chunkTimeout: NodeJS.Timeout | null = null

      const processChunks = async () => {
        if (audioChunks.length > 0) {
          // Combine chunks
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
          const combined = new Float32Array(totalLength)
          let offset = 0
          for (const chunk of audioChunks) {
            combined.set(chunk, offset)
            offset += chunk.length
          }

          // Convert to buffer and transcribe
          const buffer = Buffer.from(combined.buffer)
          const result = await transcriptionService.transcribe(buffer, {
            ...options.transcription,
            realtime: true
          })

          // Send partial result
          mainWindow.webContents.send('workflow:partialTranscription', result)
          
          // Clear processed chunks
          audioChunks = []
        }
      }

      audioRecorder.on('data', (chunk) => {
        audioChunks.push(chunk)
        
        // Process chunks every 2 seconds
        if (chunkTimeout) clearTimeout(chunkTimeout)
        chunkTimeout = setTimeout(processChunks, 2000)
      })

      return { success: true, message: 'Real-time transcription started' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

export function cleanupAudioHandlers() {
  audioRecorder.removeAllListeners()
  transcriptionService.removeAllListeners()
}