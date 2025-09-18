import { EventEmitter } from 'events'
import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

interface TranscriptionResult {
  id: string
  text: string
  language: string
  duration: number
  confidence: number
  segments: TranscriptionSegment[]
  speakers?: Speaker[]
  words?: Word[]
  model: string
  processingTime: number
  createdAt: Date
}

interface TranscriptionSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  confidence: number
  speakerId?: string
}

interface Speaker {
  id: string
  label: string
  segments: number[]
}

interface Word {
  word: string
  startTime: number
  endTime: number
  confidence: number
  speakerId?: string
}

interface TranscriptionOptions {
  language?: string
  enableSpeakerDiarization?: boolean
  enableTimestamps?: boolean
  enableWordTimestamps?: boolean
  maxSpeakers?: number
  prompt?: string
  model?: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-pro'
  temperature?: number
}

interface AudioFile {
  path: string
  mimeType: string
  size: number
  duration?: number
}

/**
 * Gemini-powered transcription service
 * Uses Google's Gemini 1.5 models for accurate audio transcription
 */
export class GeminiTranscriptionService extends EventEmitter {
  private genAI: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null
  private isInitialized: boolean = false
  private currentModel: string = 'gemini-2.5-flash'
  private apiKey: string = ''
  private transcriptionQueue: Map<string, any> = new Map()
  private isProcessing: boolean = false

  constructor() {
    super()
    this.initialize()
  }

  /**
   * Initialize Gemini API with API key
   */
  private async initialize() {
    try {
      // Get API key from environment or settings
      this.apiKey = process.env.GEMINI_API_KEY || ''
      
      if (!this.apiKey) {
        console.warn('⚠️ Gemini API key not found. Please set GEMINI_API_KEY environment variable.')
        this.emit('error', new Error('Gemini API key not configured'))
        return
      }

      // Initialize Gemini AI
      this.genAI = new GoogleGenerativeAI(this.apiKey)
      
      // Default to Flash model for cost efficiency
      this.model = this.genAI.getGenerativeModel({ 
        model: this.currentModel,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        }
      })
      
      this.isInitialized = true
      console.log('✅ Gemini AI initialized successfully')
      this.emit('initialized')
      
    } catch (error) {
      console.error('Failed to initialize Gemini:', error)
      this.emit('error', error)
    }
  }

  /**
   * Set API key programmatically
   */
  async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey
    process.env.GEMINI_API_KEY = apiKey
    await this.initialize()
  }

  /**
   * Switch between Gemini models
   */
  async switchModel(modelName: 'gemini-2.0-flash-exp' | 'gemini-1.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-pro') {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized')
    }

    this.currentModel = modelName
    this.model = this.genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    })
    
    console.log(`✅ Switched to ${modelName} model`)
    this.emit('modelChanged', modelName)
  }

  /**
   * Transcribe audio file using Gemini
   */
  async transcribeAudioFile(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini service not initialized. Please set API key.')
    }

    const startTime = Date.now()
    const transcriptionId = uuidv4()
    
    try {
      this.emit('transcriptionStarted', transcriptionId)
      this.isProcessing = true

      // Read audio file
      const audioBuffer = await fs.promises.readFile(filePath)
      const mimeType = this.getMimeType(filePath)
      
      // Validate file size (Gemini limit is ~15MB per file)
      const maxSize = 15 * 1024 * 1024 // 15MB
      if (audioBuffer.length > maxSize) {
        throw new Error(`Audio file too large. Maximum size is 15MB, got ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`)
      }

      // Create prompt for transcription
      const prompt = this.buildTranscriptionPrompt(options)
      
      // Convert audio to Gemini Part
      const audioPart: Part = {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString('base64')
        }
      }

      this.emit('progress', {
        id: transcriptionId,
        status: 'processing',
        progress: 0.3
      })

      // Send to Gemini for transcription
      const result = await this.model.generateContent([prompt, audioPart])
      const response = await result.response
      const transcriptionText = response.text()

      this.emit('progress', {
        id: transcriptionId,
        status: 'parsing',
        progress: 0.7
      })

      // Parse the response
      const parsedResult = this.parseTranscriptionResponse(
        transcriptionText,
        transcriptionId,
        options
      )

      // Add metadata
      parsedResult.model = this.currentModel
      parsedResult.processingTime = (Date.now() - startTime) / 1000
      parsedResult.createdAt = new Date()

      this.emit('progress', {
        id: transcriptionId,
        status: 'completed',
        progress: 1.0
      })

      this.emit('transcriptionCompleted', parsedResult)
      return parsedResult

    } catch (error) {
      console.error('Transcription failed:', error)
      this.emit('transcriptionError', { id: transcriptionId, error })
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Transcribe audio buffer directly
   */
  async transcribeAudioBuffer(
    audioBuffer: Buffer,
    mimeType: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini service not initialized')
    }

    const transcriptionId = uuidv4()
    const startTime = Date.now()

    try {
      // Validate size
      const maxSize = 15 * 1024 * 1024
      if (audioBuffer.length > maxSize) {
        // Need to chunk the audio
        return await this.transcribeLargeAudio(audioBuffer, mimeType, options)
      }

      const prompt = this.buildTranscriptionPrompt(options)
      const audioPart: Part = {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString('base64')
        }
      }

      const result = await this.model.generateContent([prompt, audioPart])
      const response = await result.response
      const transcriptionText = response.text()

      const parsedResult = this.parseTranscriptionResponse(
        transcriptionText,
        transcriptionId,
        options
      )

      parsedResult.model = this.currentModel
      parsedResult.processingTime = (Date.now() - startTime) / 1000
      parsedResult.createdAt = new Date()

      return parsedResult

    } catch (error) {
      console.error('Buffer transcription failed:', error)
      throw error
    }
  }

  /**
   * Handle large audio files by chunking
   */
  private async transcribeLargeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    console.log('📦 Large audio detected, chunking for processing...')
    
    // This would require audio processing library to split properly
    // For now, we'll throw an error
    throw new Error('Audio file too large. Please use recordings under 15MB or ~90 minutes.')
  }

  /**
   * Build the transcription prompt based on options
   */
  private buildTranscriptionPrompt(options: TranscriptionOptions): string {
    const parts = ['Please transcribe this audio file with the following requirements:']
    
    parts.push('- Provide an accurate transcription of all spoken words')
    
    if (options.enableTimestamps) {
      parts.push('- Include timestamps in format [MM:SS] at the start of each segment')
    }
    
    if (options.enableSpeakerDiarization) {
      parts.push(`- Identify different speakers and label them as Speaker 1, Speaker 2, etc.`)
      if (options.maxSpeakers) {
        parts.push(`- There are approximately ${options.maxSpeakers} speakers`)
      }
    }
    
    if (options.enableWordTimestamps) {
      parts.push('- Include word-level timestamps where possible')
    }
    
    if (options.language) {
      parts.push(`- The audio is in ${options.language} language`)
    } else {
      parts.push('- Detect the language automatically')
    }
    
    if (options.prompt) {
      parts.push(`- Context: ${options.prompt}`)
    }
    
    parts.push('- Include confidence scores if uncertain about any sections')
    parts.push('- Format the output as structured JSON with text, segments, and metadata')
    
    parts.push('\nOutput format:')
    parts.push('```json')
    parts.push(JSON.stringify({
      text: "Full transcription text",
      language: "detected or specified language",
      segments: [
        {
          text: "Segment text",
          startTime: 0,
          endTime: 10,
          speaker: "Speaker 1",
          confidence: 0.95
        }
      ],
      speakers: ["Speaker 1", "Speaker 2"],
      duration: "total duration in seconds",
      confidence: "overall confidence 0-1"
    }, null, 2))
    parts.push('```')
    
    return parts.join('\n')
  }

  /**
   * Parse Gemini's transcription response
   */
  private parseTranscriptionResponse(
    responseText: string,
    transcriptionId: string,
    options: TranscriptionOptions
  ): TranscriptionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/)
      
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1])
        
        // Convert to our format
        const segments: TranscriptionSegment[] = (jsonData.segments || []).map((seg: any, index: number) => ({
          id: `${transcriptionId}-seg-${index}`,
          text: seg.text || '',
          startTime: seg.startTime || 0,
          endTime: seg.endTime || 0,
          confidence: seg.confidence || 0.9,
          speakerId: seg.speaker
        }))
        
        const speakers: Speaker[] = jsonData.speakers ? 
          jsonData.speakers.map((name: string, index: number) => ({
            id: `speaker-${index}`,
            label: name,
            segments: segments
              .filter(seg => seg.speakerId === name)
              .map(seg => segments.indexOf(seg))
          })) : []
        
        return {
          id: transcriptionId,
          text: jsonData.text || responseText,
          language: jsonData.language || 'en',
          duration: parseFloat(jsonData.duration) || 0,
          confidence: parseFloat(jsonData.confidence) || 0.9,
          segments,
          speakers: speakers.length > 0 ? speakers : undefined,
          model: this.currentModel,
          processingTime: 0,
          createdAt: new Date()
        }
      }
      
      // Fallback: treat as plain text transcription
      return {
        id: transcriptionId,
        text: responseText.trim(),
        language: options.language || 'en',
        duration: 0,
        confidence: 0.8,
        segments: [{
          id: `${transcriptionId}-seg-0`,
          text: responseText.trim(),
          startTime: 0,
          endTime: 0,
          confidence: 0.8
        }],
        model: this.currentModel,
        processingTime: 0,
        createdAt: new Date()
      }
      
    } catch (error) {
      console.warn('Failed to parse structured response, using plain text:', error)
      
      // Return basic transcription
      return {
        id: transcriptionId,
        text: responseText,
        language: options.language || 'en',
        duration: 0,
        confidence: 0.7,
        segments: [],
        model: this.currentModel,
        processingTime: 0,
        createdAt: new Date()
      }
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: { [key: string]: string } = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.webm': 'audio/webm',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac'
    }
    return mimeTypes[ext] || 'audio/wav'
  }

  /**
   * Queue transcription for batch processing
   */
  async queueTranscription(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<string> {
    const queueId = uuidv4()
    
    this.transcriptionQueue.set(queueId, {
      filePath,
      options,
      status: 'queued',
      createdAt: new Date()
    })
    
    this.emit('transcriptionQueued', queueId)
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue()
    }
    
    return queueId
  }

  /**
   * Process queued transcriptions
   */
  private async processQueue() {
    if (this.transcriptionQueue.size === 0 || this.isProcessing) {
      return
    }
    
    for (const [queueId, job] of this.transcriptionQueue) {
      if (job.status === 'queued') {
        job.status = 'processing'
        
        try {
          const result = await this.transcribeAudioFile(job.filePath, job.options)
          job.status = 'completed'
          job.result = result
          this.emit('queuedTranscriptionCompleted', { queueId, result })
        } catch (error) {
          job.status = 'failed'
          job.error = error
          this.emit('queuedTranscriptionFailed', { queueId, error })
        }
        
        // Remove from queue after processing
        setTimeout(() => {
          this.transcriptionQueue.delete(queueId)
        }, 60000) // Keep for 1 minute for retrieval
      }
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(queueId: string): any {
    return this.transcriptionQueue.get(queueId)
  }

  /**
   * Get all queued items
   */
  getQueueItems(): any[] {
    return Array.from(this.transcriptionQueue.entries()).map(([id, job]) => ({
      id,
      ...job
    }))
  }

  /**
   * Cancel queued transcription
   */
  cancelQueuedTranscription(queueId: string): boolean {
    const job = this.transcriptionQueue.get(queueId)
    if (job && job.status === 'queued') {
      this.transcriptionQueue.delete(queueId)
      this.emit('transcriptionCancelled', queueId)
      return true
    }
    return false
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null
  }

  /**
   * Get current model info
   */
  getCurrentModel(): string {
    return this.currentModel
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-exp', 'gemini-1.5-pro']
  }

  /**
   * Get implementation type
   */
  getImplementationType(): string {
    return `Gemini AI (${this.currentModel})`
  }
}

// Export singleton instance
export const geminiService = new GeminiTranscriptionService()