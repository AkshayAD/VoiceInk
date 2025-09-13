/**
 * Whisper Service
 * Handles transcription using whisper.cpp
 */

import { EventEmitter } from 'events'
import { join } from 'path'
import { app } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { writeFile, unlink, access } from 'fs/promises'
import { constants } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import fetch from 'electron-fetch'

// Import native whisper binding when available
// This will be replaced with actual native binding
let whisperNative: any = null
try {
  // whisperNative = require('../../native/whisper-binding')
} catch (err) {
  console.log('Native whisper binding not available, using CLI fallback')
}

export interface TranscriptionResult {
  text: string
  segments?: TranscriptionSegment[]
  language?: string
  duration?: number
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

export interface WhisperModel {
  name: string
  size: number // Size in MB
  url?: string
  path?: string
  loaded?: boolean
}

// Available Whisper models
const WHISPER_MODELS: WhisperModel[] = [
  { name: 'tiny.en', size: 39 },
  { name: 'tiny', size: 39 },
  { name: 'base.en', size: 74 },
  { name: 'base', size: 74 },
  { name: 'small.en', size: 244 },
  { name: 'small', size: 244 },
  { name: 'medium.en', size: 769 },
  { name: 'medium', size: 769 },
  { name: 'large-v3', size: 1550 }
]

export class WhisperService extends EventEmitter {
  private modelsDir: string
  private whisperBinPath: string
  private currentModel: string = 'base.en'
  private modelPath: string | null = null
  private transcriptionQueue: TranscriptionTask[] = []
  private isProcessing = false
  private whisperContext: any = null // For native binding

  constructor() {
    super()
    this.modelsDir = join(app.getPath('userData'), 'models')
    this.whisperBinPath = join(app.getAppPath(), 'resources', 'whisper', 'main.exe')
    this.ensureDirectories()
  }

  /**
   * Load a Whisper model
   */
  async loadModel(modelName: string): Promise<void> {
    this.emit('model-loading', modelName)

    try {
      // Check if model exists locally
      const modelPath = join(this.modelsDir, `ggml-${modelName}.bin`)
      
      try {
        await access(modelPath, constants.F_OK)
        this.modelPath = modelPath
        this.currentModel = modelName
      } catch {
        // Model doesn't exist, download it
        await this.downloadModel(modelName)
      }

      // Load model using native binding if available
      if (whisperNative) {
        await this.loadModelNative(modelPath)
      }

      this.emit('model-loaded', modelName)
    } catch (err) {
      this.emit('model-error', err)
      throw err
    }
  }

  /**
   * Download a Whisper model
   */
  private async downloadModel(modelName: string): Promise<void> {
    const model = WHISPER_MODELS.find(m => m.name === modelName)
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`)
    }

    const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelName}.bin`
    const outputPath = join(this.modelsDir, `ggml-${modelName}.bin`)

    this.emit('download-start', { model: modelName, size: model.size })

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`)
      }

      const buffer = await response.buffer()
      await writeFile(outputPath, buffer)

      this.modelPath = outputPath
      this.currentModel = modelName
      this.emit('download-complete', modelName)
    } catch (err) {
      this.emit('download-error', err)
      throw err
    }
  }

  /**
   * Load model using native binding
   */
  private async loadModelNative(modelPath: string): Promise<void> {
    if (!whisperNative) return

    // Free previous context if exists
    if (this.whisperContext) {
      whisperNative.whisper_free(this.whisperContext)
    }

    // Load new model
    this.whisperContext = await whisperNative.whisper_init_from_file(modelPath)
    if (!this.whisperContext) {
      throw new Error('Failed to load model with native binding')
    }
  }

  /**
   * Transcribe audio buffer
   */
  async transcribe(audioBuffer: AudioBuffer): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const task: TranscriptionTask = {
        id: uuidv4(),
        audioBuffer,
        resolve,
        reject
      }

      this.transcriptionQueue.push(task)
      this.processQueue()
    })
  }

  /**
   * Process transcription queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.transcriptionQueue.length === 0) {
      return
    }

    this.isProcessing = true
    const task = this.transcriptionQueue.shift()!

    try {
      let result: TranscriptionResult

      if (whisperNative && this.whisperContext) {
        // Use native binding for transcription
        result = await this.transcribeNative(task.audioBuffer)
      } else {
        // Fallback to CLI
        result = await this.transcribeCLI(task.audioBuffer)
      }

      task.resolve(result)
      this.emit('transcription-complete', result)
    } catch (err) {
      task.reject(err)
      this.emit('transcription-error', err)
    } finally {
      this.isProcessing = false
      // Process next item in queue
      this.processQueue()
    }
  }

  /**
   * Transcribe using native binding
   */
  private async transcribeNative(audioBuffer: AudioBuffer): Promise<TranscriptionResult> {
    if (!whisperNative || !this.whisperContext) {
      throw new Error('Native binding not available')
    }

    // Convert audio buffer to float array
    const floatArray = this.convertToFloat32Array(audioBuffer.data)

    // Set parameters
    const params = whisperNative.whisper_full_default_params()
    params.print_progress = false
    params.print_timestamps = true
    params.language = 'en'
    params.n_threads = 4

    // Run transcription
    const ret = whisperNative.whisper_full(
      this.whisperContext,
      params,
      floatArray,
      floatArray.length
    )

    if (ret !== 0) {
      throw new Error('Transcription failed')
    }

    // Get results
    const n_segments = whisperNative.whisper_full_n_segments(this.whisperContext)
    const segments: TranscriptionSegment[] = []
    let fullText = ''

    for (let i = 0; i < n_segments; i++) {
      const text = whisperNative.whisper_full_get_segment_text(this.whisperContext, i)
      const t0 = whisperNative.whisper_full_get_segment_t0(this.whisperContext, i)
      const t1 = whisperNative.whisper_full_get_segment_t1(this.whisperContext, i)

      segments.push({
        start: t0 / 100,
        end: t1 / 100,
        text: text.trim()
      })

      fullText += text + ' '
    }

    return {
      text: fullText.trim(),
      segments,
      language: 'en',
      duration: audioBuffer.duration
    }
  }

  /**
   * Transcribe using CLI (fallback)
   */
  private async transcribeCLI(audioBuffer: AudioBuffer): Promise<TranscriptionResult> {
    if (!this.modelPath) {
      throw new Error('No model loaded')
    }

    // Save audio to temp file
    const tempDir = app.getPath('temp')
    const audioFile = join(tempDir, `audio-${uuidv4()}.wav`)
    await writeFile(audioFile, audioBuffer.data)

    try {
      return await new Promise((resolve, reject) => {
        // Build whisper.cpp command
        const args = [
          '-m', this.modelPath,
          '-f', audioFile,
          '-l', 'en',
          '-t', '4', // threads
          '--no-timestamps',
          '--print-colors', 'false'
        ]

        const whisperProcess = spawn(this.whisperBinPath, args)
        let output = ''
        let errorOutput = ''

        whisperProcess.stdout.on('data', (data) => {
          output += data.toString()
        })

        whisperProcess.stderr.on('data', (data) => {
          errorOutput += data.toString()
          // Parse progress if needed
          this.parseProgress(data.toString())
        })

        whisperProcess.on('close', (code) => {
          if (code === 0) {
            // Parse output to extract transcription
            const text = this.parseTranscriptionOutput(output)
            resolve({
              text,
              duration: audioBuffer.duration
            })
          } else {
            reject(new Error(`Whisper process failed: ${errorOutput}`))
          }
        })

        whisperProcess.on('error', (err) => {
          reject(err)
        })
      })
    } finally {
      // Clean up temp file
      await unlink(audioFile).catch(() => {})
    }
  }

  /**
   * Convert audio buffer to Float32Array for whisper
   */
  private convertToFloat32Array(buffer: Buffer): Float32Array {
    // Convert 16-bit PCM to float32
    const pcm16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2)
    const float32 = new Float32Array(pcm16.length)

    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0
    }

    return float32
  }

  /**
   * Parse transcription output from CLI
   */
  private parseTranscriptionOutput(output: string): string {
    // Remove whisper.cpp metadata and extract clean text
    const lines = output.split('\n')
    const transcriptionLines = lines.filter(line => {
      // Filter out metadata lines
      return !line.startsWith('[') && 
             !line.includes('whisper_') &&
             !line.includes('system_info') &&
             line.trim().length > 0
    })

    return transcriptionLines.join(' ').trim()
  }

  /**
   * Parse progress from whisper.cpp stderr
   */
  private parseProgress(output: string): void {
    const match = output.match(/progress = \s*(\d+)%/)
    if (match) {
      const progress = parseInt(match[1])
      this.emit('transcription-progress', progress)
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<WhisperModel[]> {
    const models = [...WHISPER_MODELS]
    
    // Check which models are already downloaded
    for (const model of models) {
      const modelPath = join(this.modelsDir, `ggml-${model.name}.bin`)
      try {
        await access(modelPath, constants.F_OK)
        model.path = modelPath
        model.loaded = model.name === this.currentModel
      } catch {
        // Model not downloaded
      }
    }

    return models
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const { mkdir } = await import('fs/promises')
    await mkdir(this.modelsDir, { recursive: true }).catch(() => {})
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.whisperContext && whisperNative) {
      whisperNative.whisper_free(this.whisperContext)
      this.whisperContext = null
    }
    this.removeAllListeners()
  }

  /**
   * Use cloud transcription as fallback (OpenAI Whisper API)
   */
  async transcribeCloud(audioBuffer: AudioBuffer, apiKey: string): Promise<TranscriptionResult> {
    const formData = new FormData()
    const audioBlob = new Blob([audioBuffer.data], { type: 'audio/wav' })
    formData.append('file', audioBlob, 'audio.wav')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const result = await response.json()
    return {
      text: result.text,
      duration: audioBuffer.duration
    }
  }
}

interface TranscriptionTask {
  id: string
  audioBuffer: AudioBuffer
  resolve: (result: TranscriptionResult) => void
  reject: (error: Error) => void
}

interface AudioBuffer {
  data: Buffer
  duration: number
  sampleRate: number
  channels: number
}