import { EventEmitter } from 'events'
import * as path from 'path'
import { MockTranscriptionService } from './mockTranscriptionService'
import { CloudTranscriptionService } from './cloudTranscriptionService'

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
  private cloudModule: CloudTranscriptionService | null = null
  private mockModule: any = null
  private activeImplementation: 'native' | 'cloud' | 'mock' = 'mock'
  private currentModel: string | null = null
  private isProcessing: boolean = false

  constructor() {
    super()
    this.initializeModule()
  }

  private async initializeModule() {
    // Priority 1: Try Cloud Transcription (always works)
    try {
      this.cloudModule = new CloudTranscriptionService()
      if (this.cloudModule.isReady()) {
        this.activeImplementation = 'cloud'
        console.log('✅ TranscriptionService: Using Cloud API implementation')
        console.log(`   Provider: ${this.cloudModule.getImplementationType()}`)
        this.setupCloudEventHandlers()
        return // Cloud is working, we're done
      }
    } catch (error) {
      console.log('⚠️ Cloud transcription not available:', error)
    }

    // Priority 2: Try Native Whisper.cpp
    try {
      const modulePath = path.join(__dirname, '../../build/Release/whisperbinding.node')
      this.nativeModule = require(modulePath)
      this.activeImplementation = 'native'
      console.log('✅ TranscriptionService: Using native Whisper.cpp implementation')
      
      // Initialize native module if it has an initialize method
      if (this.nativeModule && typeof this.nativeModule.initialize === 'function') {
        await this.nativeModule.initialize()
      }
      
      this.setupNativeEventHandlers()
      return // Native is working, we're done
      
    } catch (error) {
      console.log('⚠️ TranscriptionService: Native Whisper.cpp module not available')
      console.log(`   Module path attempted: ${path.join(__dirname, '../../build/Release/whisperbinding.node')}`)
      console.log(`   Error details: ${error instanceof Error ? error.message : error}`)
    }

    // Priority 3: Fallback to Mock (always works)
    console.log('⚠️ TranscriptionService: Using mock implementation (development mode)')
    this.mockModule = new MockTranscriptionService()
    this.activeImplementation = 'mock'
    this.setupMockEventHandlers()
  }

  private setupCloudEventHandlers() {
    if (this.cloudModule) {
      this.cloudModule.on('started', () => this.emit('started'))
      this.cloudModule.on('progress', (progress: any) => this.emit('progress', progress))
      this.cloudModule.on('completed', (result: any) => this.emit('completed', result))
      this.cloudModule.on('error', (error: Error) => this.emit('error', error))
      this.cloudModule.on('providerChanged', (provider: string) => this.emit('providerChanged', provider))
    }
  }

  private setupNativeEventHandlers() {
    if (this.nativeModule) {
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
    switch (this.activeImplementation) {
      case 'cloud':
        // Cloud providers have their own model systems
        return [{
          id: 'openai-whisper-1',
          name: 'OpenAI Whisper',
          description: 'Cloud-based transcription via OpenAI API',
          filename: '',
          url: '',
          size: 0,
          downloaded: true,
          loaded: true,
          isMultilingual: true,
          supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
          speed: 10,
          accuracy: 95,
          memoryUsage: 0
        }]
      case 'native':
        return this.nativeModule?.getAvailableModels() || []
      case 'mock':
        return this.mockModule?.getAvailableModels() || []
      default:
        throw new Error('No transcription module available')
    }
  }

  async getCurrentModel(): Promise<TranscriptionModel | null> {
    switch (this.activeImplementation) {
      case 'cloud':
        const provider = this.cloudModule?.getCurrentProvider()
        return provider ? {
          id: provider.name,
          name: provider.name,
          description: `Cloud provider: ${provider.name}`,
          filename: '',
          url: '',
          size: 0,
          downloaded: true,
          loaded: true,
          isMultilingual: true,
          supportedLanguages: ['en'],
          speed: 10,
          accuracy: 95,
          memoryUsage: 0
        } : null
      case 'native':
        return this.nativeModule?.getCurrentModel() || null
      case 'mock':
        return this.mockModule?.getCurrentModel() || null
      default:
        return null
    }
  }

  async downloadModel(modelId: string): Promise<void> {
    switch (this.activeImplementation) {
      case 'cloud':
        // Cloud models don't need downloading
        this.emit('modelDownload', { modelId, progress: 1.0, status: 'completed' })
        return Promise.resolve()
      case 'native':
        if (this.nativeModule) {
          return new Promise((resolve, reject) => {
            this.nativeModule.downloadModel(modelId, (progress: number, status: string) => {
              this.emit('modelDownload', { modelId, progress, status })
              if (progress >= 1.0) resolve()
            }).catch(reject)
          })
        }
        break
      case 'mock':
        return this.mockModule?.downloadModel(modelId)
      default:
        throw new Error('No transcription module available')
    }
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