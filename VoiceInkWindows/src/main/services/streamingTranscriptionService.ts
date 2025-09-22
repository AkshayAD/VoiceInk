/**
 * Real-time Transcription Streaming Service with WebSocket
 * Provides continuous, low-latency transcription with streaming updates
 */

import { EventEmitter } from 'events'
import WebSocket from 'ws'
import { geminiService } from './geminiService'

export interface StreamingConfig {
  // Connection settings
  endpoint?: string
  apiKey: string
  
  // Audio settings
  sampleRate: number
  channels: number
  encoding: 'linear16' | 'opus' | 'webm'
  
  // Streaming settings
  chunkSize: number // bytes
  chunkInterval: number // ms
  enableInterimResults: boolean
  enableVAD: boolean // Voice Activity Detection
  
  // Language and model settings
  language: string
  model: string
  enablePunctuation: boolean
  enableSpeakerDiarization: boolean
  
  // Real-time settings
  maxLatency: number // ms
  bufferSize: number
  autoReconnect: boolean
  heartbeatInterval: number
}

export interface StreamingResult {
  id: string
  text: string
  confidence: number
  isFinal: boolean
  startTime: number
  endTime: number
  alternatives?: Alternative[]
  speakerId?: string
  words?: WordInfo[]
}

export interface Alternative {
  text: string
  confidence: number
}

export interface WordInfo {
  word: string
  startTime: number
  endTime: number
  confidence: number
  speakerId?: string
}

export interface StreamingSession {
  id: string
  startTime: Date
  isActive: boolean
  config: StreamingConfig
  results: StreamingResult[]
  stats: StreamingStats
}

export interface StreamingStats {
  totalDuration: number
  audioSent: number // bytes
  resultsReceived: number
  avgLatency: number
  errorCount: number
  reconnectCount: number
  finalResultCount: number
  interimResultCount: number
}

export class StreamingTranscriptionService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: StreamingConfig | null = null
  private session: StreamingSession | null = null
  private audioBuffer: Buffer[] = []
  private isConnected = false
  private isStreaming = false
  private heartbeatTimer: NodeJS.Timeout | null = null
  private vadEnabled = false
  private lastActivityTime = 0
  private sessionId = ''

  constructor() {
    super()
  }

  /**
   * Start streaming session
   */
  async startSession(config: StreamingConfig): Promise<string> {
    this.config = {
      endpoint: 'wss://speech.googleapis.com/v1/speech:streamingrecognize',
      chunkSize: 4096,
      chunkInterval: 100,
      enableInterimResults: true,
      enableVAD: true,
      maxLatency: 1000,
      bufferSize: 8192,
      autoReconnect: true,
      heartbeatInterval: 30000,
      enablePunctuation: true,
      enableSpeakerDiarization: false,
      ...config
    }

    this.sessionId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.session = {
      id: this.sessionId,
      startTime: new Date(),
      isActive: true,
      config: this.config,
      results: [],
      stats: {
        totalDuration: 0,
        audioSent: 0,
        resultsReceived: 0,
        avgLatency: 0,
        errorCount: 0,
        reconnectCount: 0,
        finalResultCount: 0,
        interimResultCount: 0
      }
    }

    await this.connect()
    
    console.log(`🎤 Streaming session started: ${this.sessionId}`)
    this.emit('sessionStarted', this.session)
    
    return this.sessionId
  }

  /**
   * Connect to streaming service
   */
  private async connect(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not set')
    }

    return new Promise((resolve, reject) => {
      try {
        // For Google Speech-to-Text API
        const wsUrl = `${this.config.endpoint}?key=${this.config.apiKey}`
        
        this.ws = new WebSocket(wsUrl)
        
        this.ws.on('open', () => {
          console.log('🔗 WebSocket connected')
          this.isConnected = true
          this.initializeStream()
          this.startHeartbeat()
          resolve()
        })

        this.ws.on('message', (data) => {
          this.handleMessage(data)
        })

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          this.session!.stats.errorCount++
          this.emit('error', error)
          
          if (this.config!.autoReconnect && !this.isConnected) {
            setTimeout(() => this.reconnect(), 1000)
          }
          reject(error)
        })

        this.ws.on('close', (code, reason) => {
          console.log(`🔌 WebSocket closed: ${code} - ${reason}`)
          this.isConnected = false
          this.stopHeartbeat()
          
          if (this.config!.autoReconnect && this.session?.isActive) {
            setTimeout(() => this.reconnect(), 2000)
          }
          
          this.emit('disconnected', { code, reason })
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Initialize streaming configuration
   */
  private initializeStream(): void {
    if (!this.ws || !this.config) return

    const initMessage = {
      streamingConfig: {
        config: {
          encoding: this.config.encoding.toUpperCase(),
          sampleRateHertz: this.config.sampleRate,
          audioChannelCount: this.config.channels,
          languageCode: this.config.language,
          model: this.config.model,
          enableAutomaticPunctuation: this.config.enablePunctuation,
          enableSpeakerDiarization: this.config.enableSpeakerDiarization,
          useEnhanced: true,
          maxAlternatives: 3
        },
        interimResults: this.config.enableInterimResults,
        singleUtterance: false
      }
    }

    this.ws.send(JSON.stringify(initMessage))
    console.log('🎛️ Streaming configuration sent')
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: Buffer | string): void {
    try {
      const message = JSON.parse(data.toString())
      
      if (message.error) {
        console.error('Streaming error:', message.error)
        this.session!.stats.errorCount++
        this.emit('error', new Error(message.error.message))
        return
      }

      if (message.results && message.results.length > 0) {
        const result = message.results[0]
        this.processResult(result)
      }

    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }

  /**
   * Process transcription result
   */
  private processResult(result: any): void {
    if (!this.session) return

    const streamingResult: StreamingResult = {
      id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: result.alternatives[0]?.transcript || '',
      confidence: result.alternatives[0]?.confidence || 0,
      isFinal: result.isFinal || false,
      startTime: result.resultEndTime ? parseFloat(result.resultEndTime.replace('s', '')) * 1000 : 0,
      endTime: Date.now(),
      alternatives: result.alternatives?.slice(1).map((alt: any) => ({
        text: alt.transcript,
        confidence: alt.confidence
      })),
      words: result.alternatives[0]?.words?.map((word: any) => ({
        word: word.word,
        startTime: parseFloat(word.startTime.replace('s', '')) * 1000,
        endTime: parseFloat(word.endTime.replace('s', '')) * 1000,
        confidence: word.confidence || 0,
        speakerId: word.speakerTag ? `speaker-${word.speakerTag}` : undefined
      }))
    }

    // Update statistics
    this.session.stats.resultsReceived++
    if (streamingResult.isFinal) {
      this.session.stats.finalResultCount++
    } else {
      this.session.stats.interimResultCount++
    }

    // Calculate latency
    const latency = Date.now() - (streamingResult.startTime || Date.now())
    this.session.stats.avgLatency = (this.session.stats.avgLatency + latency) / 2

    // Add to session results
    if (streamingResult.isFinal) {
      this.session.results.push(streamingResult)
    }

    console.log(`📝 ${streamingResult.isFinal ? 'Final' : 'Interim'} result: ${streamingResult.text.substring(0, 50)}...`)
    
    this.emit('result', streamingResult)
    
    if (streamingResult.isFinal) {
      this.emit('finalResult', streamingResult)
    } else {
      this.emit('interimResult', streamingResult)
    }
  }

  /**
   * Send audio data to streaming service
   */
  async sendAudio(audioData: Buffer): Promise<void> {
    if (!this.isConnected || !this.ws || !this.session) {
      console.warn('Cannot send audio: not connected')
      return
    }

    try {
      // Add to buffer for batching
      this.audioBuffer.push(audioData)
      this.session.stats.audioSent += audioData.length

      // Send in chunks if buffer is large enough
      if (this.getTotalBufferSize() >= this.config!.chunkSize) {
        await this.flushAudioBuffer()
      }

      // Voice Activity Detection
      if (this.config!.enableVAD) {
        this.detectVoiceActivity(audioData)
      }

    } catch (error) {
      console.error('Failed to send audio:', error)
      this.session.stats.errorCount++
      this.emit('error', error)
    }
  }

  /**
   * Get total buffer size
   */
  private getTotalBufferSize(): number {
    return this.audioBuffer.reduce((total, chunk) => total + chunk.length, 0)
  }

  /**
   * Flush audio buffer to WebSocket
   */
  private async flushAudioBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0 || !this.ws) return

    const combinedBuffer = Buffer.concat(this.audioBuffer)
    this.audioBuffer = []

    const audioMessage = {
      audioContent: combinedBuffer.toString('base64')
    }

    this.ws.send(JSON.stringify(audioMessage))
    
    // Update voice activity timestamp
    this.lastActivityTime = Date.now()
  }

  /**
   * Detect voice activity (simplified VAD)
   */
  private detectVoiceActivity(audioData: Buffer): void {
    // Simple energy-based VAD
    let energy = 0
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i)
      energy += sample * sample
    }
    
    const avgEnergy = energy / (audioData.length / 2)
    const threshold = 1000000 // Adjustable threshold
    
    const hasVoice = avgEnergy > threshold
    
    if (hasVoice) {
      this.lastActivityTime = Date.now()
      if (!this.vadEnabled) {
        this.vadEnabled = true
        this.emit('voiceActivityStarted')
      }
    } else {
      // Check for silence timeout
      const silenceDuration = Date.now() - this.lastActivityTime
      if (silenceDuration > 2000 && this.vadEnabled) { // 2 seconds of silence
        this.vadEnabled = false
        this.emit('voiceActivityEnded')
      }
    }
  }

  /**
   * Start periodic audio buffer flushing
   */
  startStreaming(): void {
    if (this.isStreaming || !this.config) return

    this.isStreaming = true
    
    const flushInterval = setInterval(() => {
      if (!this.isStreaming) {
        clearInterval(flushInterval)
        return
      }
      
      if (this.audioBuffer.length > 0) {
        this.flushAudioBuffer()
      }
    }, this.config.chunkInterval)

    console.log('🎵 Audio streaming started')
    this.emit('streamingStarted')
  }

  /**
   * Stop streaming
   */
  stopStreaming(): void {
    if (!this.isStreaming) return

    this.isStreaming = false
    
    // Flush remaining audio
    if (this.audioBuffer.length > 0) {
      this.flushAudioBuffer()
    }

    console.log('⏹️ Audio streaming stopped')
    this.emit('streamingStopped')
  }

  /**
   * End session
   */
  async endSession(): Promise<void> {
    if (!this.session) return

    this.stopStreaming()
    this.session.isActive = false
    this.session.stats.totalDuration = Date.now() - this.session.startTime.getTime()

    if (this.ws) {
      this.ws.close(1000, 'Session ended')
    }

    console.log(`🏁 Streaming session ended: ${this.sessionId}`)
    this.emit('sessionEnded', this.session)

    // Clean up
    this.ws = null
    this.config = null
    this.audioBuffer = []
    this.stopHeartbeat()
  }

  /**
   * Reconnect to service
   */
  private async reconnect(): Promise<void> {
    if (!this.config || !this.session?.isActive) return

    console.log('🔄 Attempting to reconnect...')
    this.session.stats.reconnectCount++

    try {
      await this.connect()
      
      if (this.isStreaming) {
        this.startStreaming()
      }
      
      console.log('✅ Reconnected successfully')
      this.emit('reconnected')
      
    } catch (error) {
      console.error('Reconnection failed:', error)
      
      // Retry after longer delay
      if (this.session.isActive) {
        setTimeout(() => this.reconnect(), 5000)
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (!this.config?.heartbeatInterval) return

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping()
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): StreamingSession | null {
    return this.session
  }

  /**
   * Get session statistics
   */
  getSessionStats(): StreamingStats | null {
    return this.session?.stats || null
  }

  /**
   * Update configuration during session
   */
  updateConfig(updates: Partial<StreamingConfig>): void {
    if (!this.config) return

    this.config = { ...this.config, ...updates }
    
    // Reinitialize if connected
    if (this.isConnected) {
      this.initializeStream()
    }

    console.log('⚙️ Streaming configuration updated')
    this.emit('configUpdated', this.config)
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean
    isStreaming: boolean
    sessionActive: boolean
    lastActivity: number
  } {
    return {
      isConnected: this.isConnected,
      isStreaming: this.isStreaming,
      sessionActive: this.session?.isActive || false,
      lastActivity: this.lastActivityTime
    }
  }

  /**
   * Create fallback streaming using Gemini
   */
  async createGeminiStreamingSession(config: Partial<StreamingConfig>): Promise<string> {
    console.log('🤖 Creating Gemini-based streaming session')
    
    const sessionId = await this.startSession({
      endpoint: 'gemini-fallback',
      apiKey: config.apiKey || '',
      sampleRate: 44100,
      channels: 1,
      encoding: 'linear16',
      language: 'en-US',
      model: 'gemini-2.5-flash',
      ...config
    })

    // Set up Gemini-based processing
    this.setupGeminiStreaming()
    
    return sessionId
  }

  /**
   * Setup Gemini-based streaming fallback
   */
  private setupGeminiStreaming(): void {
    let audioChunks: Buffer[] = []
    let lastProcessTime = 0
    
    const processInterval = setInterval(() => {
      if (!this.isStreaming || audioChunks.length === 0) return
      
      const now = Date.now()
      if (now - lastProcessTime < 3000) return // Process every 3 seconds
      
      lastProcessTime = now
      
      // Combine audio chunks
      const combinedAudio = Buffer.concat(audioChunks)
      audioChunks = []
      
      // Process with Gemini (simplified)
      this.processAudioWithGemini(combinedAudio)
        .catch(error => {
          console.error('Gemini processing error:', error)
          this.emit('error', error)
        })
      
    }, 1000)

    this.on('audioData', (data: Buffer) => {
      if (this.config?.endpoint === 'gemini-fallback') {
        audioChunks.push(data)
      }
    })

    this.on('sessionEnded', () => {
      clearInterval(processInterval)
    })
  }

  /**
   * Process audio with Gemini API
   */
  private async processAudioWithGemini(audioData: Buffer): Promise<void> {
    try {
      // Convert audio buffer to base64
      const base64Audio = audioData.toString('base64')
      
      // Create temporary file for Gemini processing
      const tempFile = `/tmp/streaming_audio_${Date.now()}.wav`
      await require('fs').promises.writeFile(tempFile, audioData)
      
      // Use existing Gemini service
      const result = await geminiService.transcribeAudioFile(tempFile, {
        language: this.config?.language,
        enableSpeakerDiarization: this.config?.enableSpeakerDiarization
      })

      // Convert to streaming result format
      const streamingResult: StreamingResult = {
        id: result.id,
        text: result.text,
        confidence: result.confidence,
        isFinal: true,
        startTime: Date.now() - 3000,
        endTime: Date.now(),
        words: result.words
      }

      this.processResult({ 
        alternatives: [{ transcript: result.text, confidence: result.confidence }],
        isFinal: true
      })

      // Clean up temp file
      require('fs').promises.unlink(tempFile).catch(() => {})
      
    } catch (error) {
      console.error('Gemini streaming processing failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const streamingTranscription = new StreamingTranscriptionService()