/**
 * Real-time Transcription Service
 * Processes audio chunks in real-time for live transcription
 */

import { EventEmitter } from 'events'
import { geminiService } from './geminiService'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'

interface RealtimeOptions {
  chunkDuration?: number // seconds
  overlapDuration?: number // seconds
  language?: string
  model?: string
}

interface TranscriptionChunk {
  id: string
  text: string
  startTime: number
  endTime: number
  isFinal: boolean
  confidence: number
}

export class RealtimeTranscriptionService extends EventEmitter {
  private isActive: boolean = false
  private sessionId: string = ''
  private audioChunks: Buffer[] = []
  private processedChunks: Map<string, TranscriptionChunk> = new Map()
  private chunkTimer: NodeJS.Timeout | null = null
  private totalDuration: number = 0
  private options: RealtimeOptions = {}
  private tempDir: string

  constructor() {
    super()
    this.tempDir = path.join(process.cwd(), 'temp', 'realtime')
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  /**
   * Start real-time transcription session
   */
  async startSession(options: RealtimeOptions = {}): Promise<string> {
    if (this.isActive) {
      throw new Error('Real-time session already active')
    }

    this.sessionId = uuidv4()
    this.isActive = true
    this.audioChunks = []
    this.processedChunks.clear()
    this.totalDuration = 0
    this.options = {
      chunkDuration: options.chunkDuration || 5, // 5 seconds default
      overlapDuration: options.overlapDuration || 0.5, // 0.5 second overlap
      language: options.language || 'auto',
      model: options.model || 'gemini-2.5-flash'
    }

    console.log(`🎙️ Started real-time transcription session: ${this.sessionId}`)
    this.emit('sessionStarted', this.sessionId)
    
    // Start processing timer
    this.startChunkProcessing()
    
    return this.sessionId
  }

  /**
   * Add audio data to the session
   */
  addAudioData(audioBuffer: Buffer, sampleRate: number = 16000) {
    if (!this.isActive) {
      console.warn('No active real-time session')
      return
    }

    this.audioChunks.push(audioBuffer)
    
    // Calculate duration
    const duration = audioBuffer.length / (sampleRate * 2) // 16-bit audio
    this.totalDuration += duration

    this.emit('audioReceived', {
      sessionId: this.sessionId,
      duration: this.totalDuration,
      chunkCount: this.audioChunks.length
    })
  }

  /**
   * Process accumulated audio chunks
   */
  private startChunkProcessing() {
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer)
    }

    this.chunkTimer = setInterval(async () => {
      if (this.audioChunks.length > 0) {
        await this.processChunks()
      }
    }, (this.options.chunkDuration! * 1000))
  }

  /**
   * Process current audio chunks
   */
  private async processChunks() {
    if (this.audioChunks.length === 0) return

    const chunkId = uuidv4()
    const startTime = this.totalDuration - (this.audioChunks.length * this.options.chunkDuration!)
    
    try {
      // Combine audio chunks
      const combinedBuffer = Buffer.concat(this.audioChunks)
      
      // Save to temp file for Gemini
      const tempFile = path.join(this.tempDir, `chunk-${chunkId}.webm`)
      fs.writeFileSync(tempFile, combinedBuffer)

      // Transcribe with Gemini
      this.emit('chunkProcessing', {
        sessionId: this.sessionId,
        chunkId,
        startTime
      })

      const result = await geminiService.transcribeAudioFile(tempFile, {
        language: this.options.language,
        model: this.options.model as any,
        enableTimestamps: true
      })

      // Create transcription chunk
      const chunk: TranscriptionChunk = {
        id: chunkId,
        text: result.text,
        startTime,
        endTime: this.totalDuration,
        isFinal: false,
        confidence: result.confidence || 0.9
      }

      this.processedChunks.set(chunkId, chunk)

      // Emit partial transcription
      this.emit('partialTranscription', {
        sessionId: this.sessionId,
        chunk,
        totalText: this.getCombinedText()
      })

      // Clean up temp file
      fs.unlink(tempFile, () => {})

      // Keep overlap for context
      if (this.options.overlapDuration! > 0) {
        const overlapSamples = Math.floor(this.options.overlapDuration! * 16000 * 2)
        const lastChunk = this.audioChunks[this.audioChunks.length - 1]
        const overlapBuffer = lastChunk.slice(-overlapSamples)
        this.audioChunks = [overlapBuffer]
      } else {
        this.audioChunks = []
      }

    } catch (error) {
      console.error('Failed to process chunk:', error)
      this.emit('chunkError', {
        sessionId: this.sessionId,
        chunkId,
        error
      })
    }
  }

  /**
   * Get combined text from all chunks
   */
  private getCombinedText(): string {
    const chunks = Array.from(this.processedChunks.values())
      .sort((a, b) => a.startTime - b.startTime)
      .map(chunk => chunk.text)
    
    return chunks.join(' ')
  }

  /**
   * Finalize and stop the session
   */
  async stopSession(): Promise<any> {
    if (!this.isActive) {
      throw new Error('No active session to stop')
    }

    // Process remaining chunks
    if (this.audioChunks.length > 0) {
      await this.processChunks()
    }

    // Stop processing timer
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer)
      this.chunkTimer = null
    }

    // Mark all chunks as final
    this.processedChunks.forEach(chunk => {
      chunk.isFinal = true
    })

    const finalResult = {
      sessionId: this.sessionId,
      duration: this.totalDuration,
      text: this.getCombinedText(),
      chunks: Array.from(this.processedChunks.values()),
      chunkCount: this.processedChunks.size
    }

    this.isActive = false
    this.sessionId = ''
    
    console.log(`🛑 Stopped real-time session. Processed ${finalResult.chunkCount} chunks`)
    this.emit('sessionStopped', finalResult)

    // Clean up temp directory
    this.cleanupTempFiles()

    return finalResult
  }

  /**
   * Clean up temporary files
   */
  private cleanupTempFiles() {
    fs.readdir(this.tempDir, (err, files) => {
      if (err) return
      
      files.forEach(file => {
        if (file.startsWith('chunk-')) {
          fs.unlink(path.join(this.tempDir, file), () => {})
        }
      })
    })
  }

  /**
   * Get current session status
   */
  getSessionStatus() {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      duration: this.totalDuration,
      chunkCount: this.processedChunks.size,
      text: this.getCombinedText()
    }
  }

  /**
   * Cancel current session without processing
   */
  cancelSession() {
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer)
      this.chunkTimer = null
    }

    this.isActive = false
    this.sessionId = ''
    this.audioChunks = []
    this.processedChunks.clear()
    
    this.cleanupTempFiles()
    this.emit('sessionCancelled')
  }
}

export const realtimeTranscriptionService = new RealtimeTranscriptionService()