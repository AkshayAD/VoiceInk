import { EventEmitter } from 'events'
import * as path from 'path'
import * as fs from 'fs'

export interface TranscriptionSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  confidence: number
  isFinal: boolean
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language: string
  duration: number
  model: string
}

export interface WhisperModel {
  id: string
  name: string
  size: number
  sizeLabel: string
  accuracy: string
  speed: string
  downloaded: boolean
  path?: string
}

export class MockTranscriptionService extends EventEmitter {
  private currentModel: WhisperModel | null = null
  private availableModels: WhisperModel[] = [
    {
      id: 'whisper-tiny',
      name: 'Whisper Tiny',
      size: 39 * 1024 * 1024,
      sizeLabel: '39 MB',
      accuracy: 'Good',
      speed: 'Very Fast',
      downloaded: false
    },
    {
      id: 'whisper-base',
      name: 'Whisper Base',
      size: 74 * 1024 * 1024,
      sizeLabel: '74 MB',
      accuracy: 'Very Good',
      speed: 'Fast',
      downloaded: true,
      path: path.join(process.cwd(), 'models', 'whisper-base.bin')
    },
    {
      id: 'whisper-small',
      name: 'Whisper Small',
      size: 244 * 1024 * 1024,
      sizeLabel: '244 MB',
      accuracy: 'Excellent',
      speed: 'Medium',
      downloaded: false
    }
  ]
  
  private isTranscribing = false
  private transcriptionQueue: Array<{ id: string; buffer: Buffer; options: any }> = []
  
  constructor() {
    super()
    // Set default model
    this.currentModel = this.availableModels.find(m => m.downloaded) || null
  }

  async getAvailableModels(): Promise<WhisperModel[]> {
    return this.availableModels
  }

  async downloadModel(modelId: string): Promise<boolean> {
    const model = this.availableModels.find(m => m.id === modelId)
    if (!model || model.downloaded) return false

    // Simulate download progress
    const totalSize = model.size
    let downloaded = 0
    const chunkSize = totalSize / 20 // Download in 20 chunks

    const downloadInterval = setInterval(() => {
      downloaded += chunkSize
      const progress = Math.min((downloaded / totalSize) * 100, 100)
      
      this.emit('download-progress', {
        modelId,
        progress,
        downloaded,
        total: totalSize
      })

      if (progress >= 100) {
        clearInterval(downloadInterval)
        model.downloaded = true
        model.path = path.join(process.cwd(), 'models', `${modelId}.bin`)
        
        // Create a mock model file
        const modelsDir = path.join(process.cwd(), 'models')
        if (!fs.existsSync(modelsDir)) {
          fs.mkdirSync(modelsDir, { recursive: true })
        }
        fs.writeFileSync(model.path, Buffer.from('MOCK_MODEL_DATA'))
        
        this.emit('model-downloaded', model)
      }
    }, 500)

    return true
  }

  async selectModel(modelId: string): Promise<boolean> {
    const model = this.availableModels.find(m => m.id === modelId && m.downloaded)
    if (!model) return false

    this.currentModel = model
    this.emit('model-changed', model)
    return true
  }

  async transcribe(audioBuffer: Buffer, options: {
    language?: string
    realtime?: boolean
    timestamps?: boolean
  } = {}): Promise<TranscriptionResult> {
    if (!this.currentModel) {
      throw new Error('No model selected')
    }

    this.isTranscribing = true
    this.emit('transcription-started')

    // Simulate processing time based on model speed
    const processingTime = this.getProcessingTime(this.currentModel.speed)
    
    // Generate mock transcription segments
    const segments: TranscriptionSegment[] = []
    const sampleTexts = [
      "Welcome to VoiceInk, your personal AI transcription assistant.",
      "This is a demonstration of real-time voice to text conversion.",
      "The system uses advanced neural networks for accurate transcription.",
      "You can speak naturally and the AI will understand your speech.",
      "Multiple languages are supported with automatic detection.",
      "The transcription quality depends on the selected model.",
      "Larger models provide better accuracy but require more processing time."
    ]

    let currentTime = 0
    const numSegments = Math.floor(Math.random() * 3) + 2 // 2-4 segments

    for (let i = 0; i < numSegments; i++) {
      const segmentDuration = Math.random() * 3 + 1 // 1-4 seconds per segment
      const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
      
      const segment: TranscriptionSegment = {
        id: `seg-${Date.now()}-${i}`,
        text: text,
        startTime: currentTime,
        endTime: currentTime + segmentDuration,
        confidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
        isFinal: false
      }

      segments.push(segment)
      currentTime += segmentDuration

      // Emit progress for real-time mode
      if (options.realtime) {
        this.emit('transcription-progress', {
          segment,
          progress: ((i + 1) / numSegments) * 100
        })
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, processingTime / numSegments))
      }
    }

    // Mark all segments as final
    segments.forEach(seg => seg.isFinal = true)

    // Combine all text
    const fullText = segments.map(s => s.text).join(' ')

    const result: TranscriptionResult = {
      text: fullText,
      segments,
      language: options.language || 'en',
      duration: currentTime,
      model: this.currentModel.name
    }

    this.isTranscribing = false
    this.emit('transcription-completed', result)

    return result
  }

  async transcribeFile(filePath: string, options: any = {}): Promise<TranscriptionResult> {
    try {
      const buffer = await fs.promises.readFile(filePath)
      return this.transcribe(buffer, options)
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`)
    }
  }

  async addToQueue(audioBuffer: Buffer, options: any = {}): Promise<string> {
    const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.transcriptionQueue.push({ id, buffer: audioBuffer, options })
    
    this.emit('queued', { id, position: this.transcriptionQueue.length })
    
    // Process queue if not already processing
    if (!this.isTranscribing) {
      this.processQueue()
    }
    
    return id
  }

  private async processQueue() {
    if (this.transcriptionQueue.length === 0 || this.isTranscribing) {
      return
    }

    const item = this.transcriptionQueue.shift()
    if (!item) return

    try {
      const result = await this.transcribe(item.buffer, item.options)
      this.emit('queue-processed', { id: item.id, result })
    } catch (error) {
      this.emit('queue-error', { id: item.id, error })
    }

    // Process next item
    if (this.transcriptionQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100)
    }
  }

  cancelTranscription(): boolean {
    if (!this.isTranscribing) return false
    
    this.isTranscribing = false
    this.emit('transcription-cancelled')
    return true
  }

  clearQueue(): number {
    const count = this.transcriptionQueue.length
    this.transcriptionQueue = []
    this.emit('queue-cleared', count)
    return count
  }

  getQueueLength(): number {
    return this.transcriptionQueue.length
  }

  isCurrentlyTranscribing(): boolean {
    return this.isTranscribing
  }

  getCurrentModel(): WhisperModel | null {
    return this.currentModel
  }

  private getProcessingTime(speed: string): number {
    switch (speed) {
      case 'Very Fast': return 500
      case 'Fast': return 1000
      case 'Medium': return 2000
      case 'Slow': return 3000
      case 'Very Slow': return 5000
      default: return 1500
    }
  }

  // Language detection simulation
  async detectLanguage(audioBuffer: Buffer): Promise<string> {
    // Simulate language detection
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh']
    const detectedLang = languages[0] // Default to English for demo
    
    this.emit('language-detected', detectedLang)
    return detectedLang
  }

  // Post-processing features
  async enhanceTranscription(text: string): Promise<string> {
    // Simulate punctuation and capitalization enhancement
    let enhanced = text
    
    // Add punctuation at end if missing
    if (!/[.!?]$/.test(enhanced)) {
      enhanced += '.'
    }
    
    // Capitalize first letter
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)
    
    // Capitalize after periods
    enhanced = enhanced.replace(/\. ([a-z])/g, (match, p1) => `. ${p1.toUpperCase()}`)
    
    return enhanced
  }
}

// Singleton instance
export const transcriptionService = new MockTranscriptionService()