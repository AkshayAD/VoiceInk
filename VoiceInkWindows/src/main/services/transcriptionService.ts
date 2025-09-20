import { EventEmitter } from 'events'
import * as path from 'path'
import { MockTranscriptionService } from './mockTranscriptionService'

interface TranscriptionModel {
  id: string
  name: string
  description: string
  filename: string
  url: string
  size: number
  downloaded: boolean
  loaded: boolean
  isMultilingual: boolean
  supportedLanguages: string[]
  speed: number
  accuracy: number
  memoryUsage: number
}

interface TranscriptionSegment {
  startTime: number
  endTime: number
  text: string
  confidence: number
  wordConfidences: number[]
  words: string[]
  wordStartTimes: number[]
  wordEndTimes: number[]
  speakerId: number
  language: string
  probability: number
}

interface TranscriptionResult {
  text: string
  language: string
  duration: number
  confidence: number
  segmentCount: number
  segments: TranscriptionSegment[]
  languageProbabilities: { [key: string]: number }
  hasMultipleSpeakers: boolean
  speakerCount: number
  processingTime: number
}

interface TranscriptionOptions {
  language?: string
  enableTimestamps?: boolean
  enableConfidenceScores?: boolean
  enableSpeakerDiarization?: boolean
  enableLanguageDetection?: boolean
  enablePunctuation?: boolean
  enableCapitalization?: boolean
  temperature?: number
  beamSize?: number
  initialPrompt?: string
  enableGPU?: boolean
}

class TranscriptionService extends EventEmitter {
  private nativeModule: any = null
  private mockModule: any = null
  private isUsingNative: boolean = false
  private currentModel: string | null = null
  private isProcessing: boolean = false

  constructor() {
    super()
    this.initializeModule()
  }

  private async initializeModule() {
    try {
      // Try to load the native Whisper module
      const modulePath = path.join(__dirname, '../../build/Release/whisperbinding.node')
      this.nativeModule = require(modulePath)
      this.isUsingNative = true
      console.log('✅ TranscriptionService: Using native Whisper.cpp implementation')
      
      // Initialize native module if it has an initialize method
      if (this.nativeModule && typeof this.nativeModule.initialize === 'function') {
        await this.nativeModule.initialize()
      }
      
      // Setup callbacks if available
      if (this.nativeModule.setProgressCallback && typeof this.nativeModule.setProgressCallback === 'function') {
        this.nativeModule.setProgressCallback((progress: any) => {
          this.emit('progress', progress)
        })
      }
      
      if (this.nativeModule.setPartialResultCallback && typeof this.nativeModule.setPartialResultCallback === 'function') {
        this.nativeModule.setPartialResultCallback((jobId: string, result: TranscriptionResult) => {
          this.emit('partialResult', jobId, result)
        })
      }
      
      if (this.nativeModule.setModelDownloadCallback && typeof this.nativeModule.setModelDownloadCallback === 'function') {
        this.nativeModule.setModelDownloadCallback((modelId: string, progress: number, status: string) => {
          this.emit('modelDownload', { modelId, progress, status })
        })
      }
      
    } catch (error) {
      // Fallback to mock implementation
      console.log('⚠️ TranscriptionService: Native Whisper.cpp module not available, falling back to mock implementation')
      console.log(`   Module path attempted: ${path.join(__dirname, '../../build/Release/whisperbinding.node')}`)
      console.log(`   Error details: ${error instanceof Error ? error.message : error}`)
      this.mockModule = new MockTranscriptionService()
      this.setupMockEventHandlers()
      this.isUsingNative = false
    }
  }

  private setupMockEventHandlers() {
    if (this.mockModule) {
      // Forward mock events to this service
      this.mockModule.on('progress', (progress: any) => this.emit('progress', progress))
      this.mockModule.on('modelDownload', (data: any) => this.emit('modelDownload', data))
      this.mockModule.on('started', () => this.emit('started'))
      this.mockModule.on('completed', (result: any) => this.emit('completed', result))
      this.mockModule.on('error', (error: Error) => this.emit('error', error))
    }
  }

  async getAvailableModels(): Promise<TranscriptionModel[]> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getAvailableModels()
    } else if (this.mockModule) {
      return this.mockModule.getAvailableModels()
    }
    throw new Error('No transcription module available')
  }

  async getCurrentModel(): Promise<TranscriptionModel | null> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getCurrentModel()
    } else if (this.mockModule) {
      return this.mockModule.getCurrentModel()
    }
    return null
  }

  async downloadModel(modelId: string): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      return new Promise((resolve, reject) => {
        this.nativeModule.downloadModel(modelId, (progress: number, status: string) => {
          this.emit('modelDownload', { modelId, progress, status })
          if (progress >= 1.0) resolve()
        }).catch(reject)
      })
    } else if (this.mockModule) {
      return this.mockModule.downloadModel(modelId)
    }
    throw new Error('No transcription module available')
  }

  async loadModel(modelId: string): Promise<void> {
    try {
      if (this.isUsingNative && this.nativeModule) {
        await this.nativeModule.loadModel(modelId)
      } else if (this.mockModule) {
        await this.mockModule.loadModel(modelId)
      } else {
        throw new Error('No transcription module available')
      }
      
      this.currentModel = modelId
      this.emit('modelLoaded', modelId)
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async unloadModel(): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.unloadModel()
    } else if (this.mockModule) {
      await this.mockModule.unloadModel()
    }
    
    this.currentModel = null
    this.emit('modelUnloaded')
  }

  async transcribe(audioData: Float32Array, sampleRate: number, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    if (this.isProcessing) {
      throw new Error('Transcription already in progress')
    }

    if (!this.currentModel) {
      throw new Error('No model loaded. Load a model first.')
    }

    const defaultOptions: TranscriptionOptions = {
      language: 'auto',
      enableTimestamps: true,
      enableConfidenceScores: true,
      enableSpeakerDiarization: false,
      enableLanguageDetection: true,
      enablePunctuation: true,
      enableCapitalization: true,
      temperature: 0.0,
      beamSize: 1,
      enableGPU: true,
      ...options
    }

    try {
      this.isProcessing = true
      this.emit('started')
      
      let result: TranscriptionResult
      
      if (this.isUsingNative && this.nativeModule) {
        result = await this.nativeModule.transcribeBuffer(audioData, audioData.length, sampleRate, defaultOptions)
      } else if (this.mockModule) {
        result = await this.mockModule.transcribe(audioData, sampleRate, defaultOptions)
      } else {
        throw new Error('No transcription module available')
      }
      
      this.isProcessing = false
      this.emit('completed', result)
      return result
      
    } catch (error) {
      this.isProcessing = false
      this.emit('error', error)
      throw error
    }
  }

  async transcribeFile(filePath: string, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    if (!this.currentModel) {
      throw new Error('No model loaded. Load a model first.')
    }

    const defaultOptions: TranscriptionOptions = {
      language: 'auto',
      enableTimestamps: true,
      enableConfidenceScores: true,
      enableSpeakerDiarization: false,
      enableLanguageDetection: true,
      enablePunctuation: true,
      enableCapitalization: true,
      temperature: 0.0,
      beamSize: 1,
      enableGPU: true,
      ...options
    }

    try {
      this.emit('started')
      
      let result: TranscriptionResult
      
      if (this.isUsingNative && this.nativeModule) {
        result = await this.nativeModule.transcribeFile(filePath, defaultOptions)
      } else if (this.mockModule) {
        result = await this.mockModule.transcribeFile(filePath, defaultOptions)
      } else {
        throw new Error('No transcription module available')
      }
      
      this.emit('completed', result)
      return result
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  // Queue-based transcription for batch processing
  async queueTranscription(audioData: Float32Array, sampleRate: number, options: TranscriptionOptions = {}): Promise<string> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.queueTranscription(audioData, audioData.length, sampleRate, options)
    } else if (this.mockModule) {
      // Mock implementation doesn't have queue, so process immediately
      const result = await this.transcribe(audioData, sampleRate, options)
      return `job_${Date.now()}`
    }
    throw new Error('No transcription module available')
  }

  async getTranscriptionProgress(jobId: string): Promise<any> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getTranscriptionProgress(jobId)
    }
    // Mock implementation returns completed status
    return {
      id: jobId,
      status: 'COMPLETED',
      progress: 1.0,
      currentPhase: 'Completed',
      elapsedTime: 1.0,
      estimatedRemainingTime: 0
    }
  }

  async cancelTranscription(jobId: string): Promise<boolean> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.cancelTranscription(jobId)
    }
    return true
  }

  // Streaming transcription
  async startStreamingTranscription(options: TranscriptionOptions = {}): Promise<string> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.startStreamingTranscription(options)
    } else if (this.mockModule) {
      return this.mockModule.startStreaming(options)
    }
    throw new Error('No transcription module available')
  }

  async addAudioChunk(streamId: string, audioData: Float32Array, sampleRate: number): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.addAudioChunk(streamId, audioData, audioData.length, sampleRate)
    } else if (this.mockModule) {
      await this.mockModule.addAudioChunk(streamId, audioData, sampleRate)
    }
  }

  async getStreamingResult(streamId: string, partial: boolean = true): Promise<TranscriptionResult> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getStreamingResult(streamId, partial)
    } else if (this.mockModule) {
      return this.mockModule.getStreamingResult(streamId, partial)
    }
    throw new Error('No transcription module available')
  }

  async stopStreamingTranscription(streamId: string): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.stopStreamingTranscription(streamId)
    } else if (this.mockModule) {
      await this.mockModule.stopStreaming(streamId)
    }
  }

  // Language detection
  async detectLanguage(audioData: Float32Array, sampleRate: number): Promise<string> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.detectLanguage(audioData, audioData.length, sampleRate)
    } else if (this.mockModule) {
      return this.mockModule.detectLanguage(audioData, sampleRate)
    }
    return 'en'
  }

  async getLanguageProbabilities(audioData: Float32Array, sampleRate: number): Promise<{ [key: string]: number }> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getLanguageProbabilities(audioData, audioData.length, sampleRate)
    } else if (this.mockModule) {
      return this.mockModule.getLanguageProbabilities(audioData, sampleRate)
    }
    return { en: 0.95, es: 0.03, fr: 0.02 }
  }

  async getSupportedLanguages(): Promise<string[]> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getSupportedLanguages()
    } else if (this.mockModule) {
      return this.mockModule.getSupportedLanguages()
    }
    return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
  }

  // GPU support
  async isGPUAvailable(): Promise<boolean> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.isGPUAvailable()
    }
    return false // Mock doesn't have GPU
  }

  async getAvailableGPUDevices(): Promise<string[]> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getAvailableGPUDevices()
    }
    return []
  }

  async setGPUDevice(deviceIndex: number): Promise<boolean> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.setGPUDevice(deviceIndex)
    }
    return false
  }

  // Performance and monitoring
  async getPerformanceStats(): Promise<any> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getPerformanceStats()
    }
    return {
      averageProcessingTime: 1.2,
      averageRealTimeFactor: 0.3,
      totalTranscriptions: 0,
      failedTranscriptions: 0,
      totalAudioDuration: 0,
      totalProcessingTime: 0,
      memoryUsage: 150,
      gpuUtilization: 0,
      activeThreads: 1,
      queueLength: 0
    }
  }

  async resetPerformanceStats(): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.resetPerformanceStats()
    }
  }

  // Status checks
  isModelLoaded(): boolean {
    return this.currentModel !== null
  }

  isProcessingActive(): boolean {
    return this.isProcessing
  }

  isNativeImplementation(): boolean {
    return this.isUsingNative
  }

  getImplementationType(): string {
    return this.isUsingNative ? 'Whisper.cpp (Native)' : 'Mock'
  }

  getCurrentModelId(): string | null {
    return this.currentModel
  }

  // Error handling
  getLastError(): string {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getLastError()
    }
    return ''
  }

  hasError(): boolean {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.hasError()
    }
    return false
  }

  clearError(): void {
    if (this.isUsingNative && this.nativeModule) {
      this.nativeModule.clearError()
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService()