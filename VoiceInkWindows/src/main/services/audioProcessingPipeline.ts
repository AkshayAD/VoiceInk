/**
 * Complete audio processing pipeline
 * Connects audio recording → processing → transcription → database
 */

import { EventEmitter } from 'events'
import { geminiService } from './geminiService'
import { transcriptionRepository } from '../database/transcriptionRepository'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'

interface PipelineOptions {
  saveAudio?: boolean
  enhanceText?: boolean
  autoSave?: boolean
  language?: string
  model?: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  enableSpeakerDiarization?: boolean
  enableTimestamps?: boolean
  applicationContext?: {
    name?: string
    path?: string
    url?: string
  }
}

interface ProcessingResult {
  id: string
  transcription: any
  audioFile?: string
  processingTime: number
  saved: boolean
  error?: string
}

class AudioProcessingPipeline extends EventEmitter {
  private audioDir: string
  private isProcessing: boolean = false
  private currentJobId: string | null = null
  private mainWindow: BrowserWindow | null = null
  
  constructor() {
    super()
    
    // Create audio storage directory
    this.audioDir = path.join(process.cwd(), 'audio_files')
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true })
    }
    
    this.setupEventHandlers()
  }
  
  /**
   * Set main window for event forwarding
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }
  
  /**
   * Process audio through the complete pipeline
   */
  async processAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options: PipelineOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const jobId = uuidv4()
    this.currentJobId = jobId
    this.isProcessing = true
    
    const result: ProcessingResult = {
      id: jobId,
      transcription: null,
      processingTime: 0,
      saved: false
    }
    
    try {
      this.emit('pipeline:started', jobId)
      this.updateProgress(jobId, 'saving', 0.1)
      
      // Step 1: Save audio file if requested
      let audioFilePath: string | undefined
      if (options.saveAudio !== false) {
        audioFilePath = await this.saveAudioFile(audioBuffer, mimeType)
        result.audioFile = audioFilePath
        this.updateProgress(jobId, 'saved', 0.2)
      }
      
      // Step 2: Validate audio
      this.updateProgress(jobId, 'validating', 0.3)
      const isValid = this.validateAudio(audioBuffer, mimeType)
      if (!isValid) {
        throw new Error('Invalid audio format or corrupted file')
      }
      
      // Step 3: Transcribe with Gemini
      this.updateProgress(jobId, 'transcribing', 0.4)
      
      const transcriptionOptions = {
        language: options.language,
        enableSpeakerDiarization: options.enableSpeakerDiarization,
        enableTimestamps: options.enableTimestamps,
        model: options.model
      }
      
      let transcriptionResult
      if (audioFilePath) {
        transcriptionResult = await geminiService.transcribeAudioFile(
          audioFilePath,
          transcriptionOptions
        )
      } else {
        // Create temp file for Gemini
        const tempPath = path.join(this.audioDir, `temp-${jobId}.webm`)
        await fs.promises.writeFile(tempPath, audioBuffer)
        transcriptionResult = await geminiService.transcribeAudioFile(
          tempPath,
          transcriptionOptions
        )
        // Clean up temp file
        fs.unlink(tempPath, () => {})
      }
      
      this.updateProgress(jobId, 'transcribed', 0.7)
      
      // Step 4: Enhance text if requested
      if (options.enhanceText && transcriptionResult.text) {
        this.updateProgress(jobId, 'enhancing', 0.75)
        transcriptionResult.text = await this.enhanceText(transcriptionResult.text)
        transcriptionResult.enhanced = true
      }
      
      // Step 5: Save to database if requested
      if (options.autoSave !== false) {
        this.updateProgress(jobId, 'saving_db', 0.85)
        
        const dbRecord = await transcriptionRepository.create({
          text: transcriptionResult.text,
          originalText: transcriptionResult.text,
          audioPath: audioFilePath,
          duration: transcriptionResult.duration,
          model: transcriptionResult.model,
          language: transcriptionResult.language,
          applicationName: options.applicationContext?.name,
          applicationPath: options.applicationContext?.path,
          url: options.applicationContext?.url,
          enhanced: transcriptionResult.enhanced || false,
          wordCount: transcriptionResult.text.split(/\s+/).length
        })
        
        result.saved = true
        transcriptionResult.dbId = dbRecord.id
      }
      
      this.updateProgress(jobId, 'completed', 1.0)
      
      result.transcription = transcriptionResult
      result.processingTime = (Date.now() - startTime) / 1000
      
      this.emit('pipeline:completed', result)
      
      // Send to renderer if window available
      if (this.mainWindow) {
        this.mainWindow.webContents.send('pipeline-completed', result)
      }
      
      return result
      
    } catch (error: any) {
      console.error('Pipeline processing failed:', error)
      
      result.error = error.message
      this.emit('pipeline:error', { jobId, error })
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('pipeline-error', { jobId, error: error.message })
      }
      
      throw error
      
    } finally {
      this.isProcessing = false
      this.currentJobId = null
    }
  }
  
  /**
   * Process audio file directly
   */
  async processAudioFile(
    filePath: string,
    options: PipelineOptions = {}
  ): Promise<ProcessingResult> {
    const audioBuffer = await fs.promises.readFile(filePath)
    const mimeType = this.getMimeTypeFromPath(filePath)
    
    return this.processAudio(audioBuffer, mimeType, {
      ...options,
      saveAudio: false // Already have the file
    })
  }
  
  /**
   * Save audio buffer to file
   */
  private async saveAudioFile(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split('/')[1] || 'webm'
    const filename = `recording-${Date.now()}-${uuidv4().substring(0, 8)}.${extension}`
    const filePath = path.join(this.audioDir, filename)
    
    await fs.promises.writeFile(filePath, audioBuffer)
    
    console.log(`✅ Audio saved: ${filePath}`)
    return filePath
  }
  
  /**
   * Validate audio buffer
   */
  private validateAudio(audioBuffer: Buffer, mimeType: string): boolean {
    // Check size
    if (!audioBuffer || audioBuffer.length === 0) {
      return false
    }
    
    // Check max size (100MB)
    const maxSize = 100 * 1024 * 1024
    if (audioBuffer.length > maxSize) {
      console.warn('Audio file too large:', audioBuffer.length)
      return false
    }
    
    // Check MIME type
    const supportedTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/flac'
    ]
    
    if (!supportedTypes.includes(mimeType)) {
      console.warn('Unsupported audio type:', mimeType)
      return false
    }
    
    return true
  }
  
  /**
   * Enhance transcription text
   */
  private async enhanceText(text: string): Promise<string> {
    // Basic text enhancements
    let enhanced = text
    
    // Fix common transcription issues
    enhanced = enhanced
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => `${p1} ${p2.toUpperCase()}`) // Capitalize after sentence
      .trim()
    
    // Ensure first letter is capitalized
    if (enhanced.length > 0) {
      enhanced = enhanced[0].toUpperCase() + enhanced.slice(1)
    }
    
    // Add period if missing
    if (enhanced.length > 0 && !/[.!?]$/.test(enhanced)) {
      enhanced += '.'
    }
    
    return enhanced
  }
  
  /**
   * Get MIME type from file path
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: { [key: string]: string } = {
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac'
    }
    return mimeTypes[ext] || 'audio/webm'
  }
  
  /**
   * Update processing progress
   */
  private updateProgress(jobId: string, status: string, progress: number) {
    const update = { jobId, status, progress }
    
    this.emit('pipeline:progress', update)
    
    if (this.mainWindow) {
      this.mainWindow.webContents.send('pipeline-progress', update)
    }
  }
  
  /**
   * Setup internal event handlers
   */
  private setupEventHandlers() {
    // Forward Gemini events
    geminiService.on('progress', (progress) => {
      if (this.currentJobId) {
        this.updateProgress(this.currentJobId, 'transcription_progress', 0.4 + (progress.progress * 0.3))
      }
    })
    
    geminiService.on('transcriptionError', (error) => {
      this.emit('transcription:error', error)
    })
  }
  
  /**
   * Get processing status
   */
  getStatus(): any {
    return {
      isProcessing: this.isProcessing,
      currentJobId: this.currentJobId,
      audioDirectory: this.audioDir
    }
  }
  
  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(daysToKeep: number = 7): Promise<number> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    let deletedCount = 0
    
    try {
      const files = await fs.promises.readdir(this.audioDir)
      
      for (const file of files) {
        const filePath = path.join(this.audioDir, file)
        const stats = await fs.promises.stat(filePath)
        
        if (stats.mtimeMs < cutoffTime) {
          await fs.promises.unlink(filePath)
          deletedCount++
        }
      }
      
      console.log(`🗑️ Cleaned up ${deletedCount} old audio files`)
      return deletedCount
      
    } catch (error) {
      console.error('Cleanup failed:', error)
      return 0
    }
  }
  
  /**
   * Get audio file statistics
   */
  async getAudioFileStats(): Promise<any> {
    try {
      const files = await fs.promises.readdir(this.audioDir)
      let totalSize = 0
      let oldestFile: Date | null = null
      let newestFile: Date | null = null
      
      for (const file of files) {
        const filePath = path.join(this.audioDir, file)
        const stats = await fs.promises.stat(filePath)
        
        totalSize += stats.size
        
        if (!oldestFile || stats.mtime < oldestFile) {
          oldestFile = stats.mtime
        }
        
        if (!newestFile || stats.mtime > newestFile) {
          newestFile = stats.mtime
        }
      }
      
      return {
        fileCount: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        oldestFile,
        newestFile,
        directory: this.audioDir
      }
      
    } catch (error) {
      console.error('Failed to get audio stats:', error)
      return null
    }
  }
}

// Export singleton instance
export const audioProcessingPipeline = new AudioProcessingPipeline()