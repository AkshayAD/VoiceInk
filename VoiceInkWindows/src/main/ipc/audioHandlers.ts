import { ipcMain, BrowserWindow } from 'electron'
import { audioRecorder } from '../services/audioRecorder'
import { transcriptionService } from '../services/transcriptionService'
import * as path from 'path'
import * as fs from 'fs'

export function setupAudioHandlers(mainWindow: BrowserWindow) {
  // Audio Recording Handlers
  ipcMain.handle('audio:getDevices', async () => {
    return await audioRecorder.getDevices()
  })

  ipcMain.handle('audio:selectDevice', async (_, deviceId: string) => {
    await audioRecorder.setDevice(deviceId)
    return true
  })

  ipcMain.handle('audio:startRecording', async (_, options) => {
    await audioRecorder.startRecording(options)
    const success = true
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
    const audioData = await audioRecorder.stopRecording()
    if (audioData) {
      // Convert Float32Array to Buffer for compatibility
      const buffer = Buffer.from(audioData.buffer)
      
      // Save to temp file
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const filename = `recording-${Date.now()}.wav`
      const filepath = path.join(tempDir, filename)
      fs.writeFileSync(filepath, buffer)
      
      return { success: true, filepath, buffer: buffer.toString('base64'), audioData }
    }
    return { success: false }
  })

  ipcMain.handle('audio:pauseRecording', async () => {
    await audioRecorder.pauseRecording()
    return true
  })

  ipcMain.handle('audio:resumeRecording', async () => {
    await audioRecorder.resumeRecording()
    return true
  })

  ipcMain.handle('audio:getRecordingTime', async () => {
    const stats = await audioRecorder.getRecordingStats()
    return stats.duration || 0
  })

  ipcMain.handle('audio:getLevel', async () => {
    return await audioRecorder.getVolume()
  })

  ipcMain.handle('audio:isRecording', async () => {
    return audioRecorder.isRecordingActive()
  })

  // Save recording handler for browser-based recording
  ipcMain.handle('audio:save-recording', async (_, data) => {
    try {
      const { audioBuffer, fileName, mimeType, duration, sampleRate } = data
      
      // Create recordings directory
      const recordingsDir = path.join(process.cwd(), 'recordings')
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true })
      }
      
      // Generate file name if not provided
      const finalFileName = fileName || `recording_${Date.now()}.webm`
      const filepath = path.join(recordingsDir, finalFileName)
      
      // Convert ArrayBuffer to Buffer and save
      const buffer = Buffer.from(audioBuffer)
      fs.writeFileSync(filepath, buffer)
      
      console.log(`💾 Audio saved: ${filepath} (${buffer.length} bytes)`)
      
      // Send event to renderer
      mainWindow.webContents.send('audio:recordingSaved', { 
        filepath, 
        size: buffer.length,
        duration,
        mimeType 
      })
      
      return { 
        success: true, 
        filePath: filepath,
        size: buffer.length,
        duration,
        mimeType
      }
    } catch (error: any) {
      console.error('Failed to save recording:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  })

  // Transcription Handlers
  ipcMain.handle('transcription:getModels', async () => {
    return await transcriptionService.getAvailableModels()
  })

  ipcMain.handle('transcription:downloadModel', async (_, modelId: string) => {
    try {
      await transcriptionService.downloadModel(modelId)
      
      // Set up progress monitoring
      transcriptionService.on('modelDownload', (progress) => {
        mainWindow.webContents.send('transcription:downloadProgress', progress)
      })
      
      return true
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('transcription:selectModel', async (_, modelId: string) => {
    try {
      await transcriptionService.loadModel(modelId)
      return true
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('transcription:transcribe', async (_, audioBuffer: string, options) => {
    try {
      // Handle both buffer and Float32Array inputs
      let audioData: Float32Array
      if (typeof audioBuffer === 'string') {
        const buffer = Buffer.from(audioBuffer, 'base64')
        audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
      } else {
        audioData = audioBuffer
      }
      
      // Set up real-time progress if requested
      if (options.realtime) {
        transcriptionService.on('progress', (progress) => {
          mainWindow.webContents.send('transcription:progress', progress)
        })
      }
      
      const result = await transcriptionService.transcribe(audioData, options.sampleRate || 16000, options)
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
    const audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
    const id = await transcriptionService.queueTranscription(audioData, options.sampleRate || 16000, options)
    return id
  })

  ipcMain.handle('transcription:cancelCurrent', async () => {
    // For the new service, we'd need a job ID, but for backwards compatibility
    return true
  })

  ipcMain.handle('transcription:clearQueue', async () => {
    // Clear queue functionality - would need to implement in native service
    return true
  })

  ipcMain.handle('transcription:getQueueLength', async () => {
    const stats = await transcriptionService.getPerformanceStats()
    return stats.queueLength
  })

  ipcMain.handle('transcription:isTranscribing', async () => {
    return transcriptionService.isProcessingActive()
  })

  ipcMain.handle('transcription:getCurrentModel', async () => {
    return await transcriptionService.getCurrentModel()
  })

  ipcMain.handle('transcription:detectLanguage', async (_, audioBuffer: string) => {
    const buffer = Buffer.from(audioBuffer, 'base64')
    const audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
    return await transcriptionService.detectLanguage(audioData, 16000)
  })

  ipcMain.handle('transcription:enhance', async (_, text: string) => {
    // Enhancement would be a separate service or feature
    return text
  })

  // Combined workflow: Record and transcribe
  ipcMain.handle('workflow:recordAndTranscribe', async (_, options) => {
    try {
      // Start recording
      await audioRecorder.startRecording(options.recording)
      
      // Wait for specified duration or until stopped
      if (options.duration) {
        await new Promise(resolve => setTimeout(resolve, options.duration * 1000))
        const audioData = await audioRecorder.stopRecording()
        
        if (audioData) {
          // Transcribe immediately
          const result = await transcriptionService.transcribe(audioData, options.recording?.sampleRate || 16000, options.transcription)
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
      try {
        await audioRecorder.startRecording(options.recording)
      } catch (error) {
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
          const audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
          const result = await transcriptionService.transcribe(audioData, 16000, {
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