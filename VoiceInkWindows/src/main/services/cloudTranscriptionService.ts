import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import fetch from 'node-fetch'
import FormData from 'form-data'

interface TranscriptionProvider {
  name: string
  apiKey: string
  endpoint: string
  model: string
  maxFileSize: number // in MB
  supportedFormats: string[]
}

interface TranscriptionResult {
  text: string
  language: string
  duration: number
  confidence: number
  segments?: TranscriptionSegment[]
  words?: Word[]
  provider: string
  model: string
  processingTime: number
}

interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

interface Word {
  word: string
  start: number
  end: number
  confidence?: number
}

interface TranscriptionOptions {
  language?: string
  translate?: boolean
  timestamps?: boolean
  prompt?: string
  temperature?: number
  provider?: 'openai' | 'azure' | 'google' | 'assemblyai'
}

/**
 * Real transcription service using cloud APIs
 * This actually transcribes audio, unlike the mock service
 */
export class CloudTranscriptionService extends EventEmitter {
  private providers: Map<string, TranscriptionProvider> = new Map()
  private activeProvider: string = 'openai'
  private isTranscribing: boolean = false
  private transcriptionQueue: Array<any> = []

  constructor() {
    super()
    this.initializeProviders()
  }

  /**
   * Initialize cloud providers with API keys from environment or settings
   */
  private initializeProviders() {
    // Google Gemini API (NEW - Best free tier!)
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', {
        name: 'Google Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        maxFileSize: 20, // 20MB for inline, unlimited with Files API
        supportedFormats: ['mp3', 'mp4', 'wav', 'webm', 'm4a', 'flac', 'ogg']
      })
    }

    // OpenAI Whisper API
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', {
        name: 'OpenAI Whisper',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1/audio/transcriptions',
        model: 'whisper-1',
        maxFileSize: 25,
        supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
      })
    }

    // Azure Speech Services
    if (process.env.AZURE_SPEECH_KEY) {
      this.providers.set('azure', {
        name: 'Azure Speech',
        apiKey: process.env.AZURE_SPEECH_KEY,
        endpoint: process.env.AZURE_SPEECH_ENDPOINT || 'https://api.cognitive.microsoft.com/sts/v1.0',
        model: 'latest',
        maxFileSize: 100,
        supportedFormats: ['wav', 'mp3', 'ogg']
      })
    }

    // Google Cloud Speech-to-Text
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      this.providers.set('google', {
        name: 'Google Cloud Speech',
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
        endpoint: 'https://speech.googleapis.com/v1/speech:recognize',
        model: 'latest_long',
        maxFileSize: 10,
        supportedFormats: ['wav', 'flac', 'mp3']
      })
    }

    // AssemblyAI
    if (process.env.ASSEMBLYAI_API_KEY) {
      this.providers.set('assemblyai', {
        name: 'AssemblyAI',
        apiKey: process.env.ASSEMBLYAI_API_KEY,
        endpoint: 'https://api.assemblyai.com/v2/transcript',
        model: 'best',
        maxFileSize: 500,
        supportedFormats: ['mp3', 'mp4', 'wav', 'flac', 'm4a', 'webm']
      })
    }

    // Fallback to free/demo providers if no API keys
    if (this.providers.size === 0) {
      console.warn('⚠️ No transcription API keys found. Using limited demo mode.')
      this.providers.set('demo', {
        name: 'Demo Provider',
        apiKey: 'demo',
        endpoint: 'demo',
        model: 'demo',
        maxFileSize: 5,
        supportedFormats: ['wav', 'webm']
      })
    }
  }

  /**
   * Transcribe audio blob using cloud API
   */
  async transcribe(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (this.isTranscribing) {
      throw new Error('Transcription already in progress')
    }

    this.isTranscribing = true
    const startTime = Date.now()
    
    try {
      this.emit('started')
      
      const provider = this.providers.get(options.provider || this.activeProvider)
      if (!provider) {
        throw new Error(`Provider ${options.provider} not configured`)
      }

      let result: TranscriptionResult

      // Route to appropriate provider
      switch (options.provider || this.activeProvider) {
        case 'gemini':
          result = await this.transcribeWithGemini(audioBlob, options, provider)
          break
        case 'openai':
          result = await this.transcribeWithOpenAI(audioBlob, options, provider)
          break
        case 'azure':
          result = await this.transcribeWithAzure(audioBlob, options, provider)
          break
        case 'google':
          result = await this.transcribeWithGoogle(audioBlob, options, provider)
          break
        case 'assemblyai':
          result = await this.transcribeWithAssemblyAI(audioBlob, options, provider)
          break
        case 'demo':
          result = await this.transcribeWithDemo(audioBlob, options, provider)
          break
        default:
          throw new Error(`Unsupported provider: ${options.provider}`)
      }

      result.processingTime = (Date.now() - startTime) / 1000
      
      this.emit('completed', result)
      return result
      
    } catch (error) {
      console.error('Transcription failed:', error)
      this.emit('error', error)
      throw error
    } finally {
      this.isTranscribing = false
    }
  }

  /**
   * Transcribe using Google Gemini API
   */
  private async transcribeWithGemini(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    const buffer = Buffer.from(await audioBlob.arrayBuffer())
    const base64Audio = buffer.toString('base64')
    
    this.emit('progress', { status: 'uploading', progress: 0.3 })
    
    const requestBody = {
      contents: [{
        parts: [
          {
            text: options.timestamps 
              ? 'Transcribe this audio with timestamps in the format: [MM:SS] text'
              : 'Transcribe this audio accurately. Include all spoken words.'
          },
          {
            inline_data: {
              mime_type: audioBlob.type || 'audio/webm',
              data: base64Audio
            }
          }
        ]
      }],
      generationConfig: {
        temperature: options.temperature || 0.2,
        maxOutputTokens: 8192
      }
    }
    
    this.emit('progress', { status: 'processing', progress: 0.6 })
    
    const response = await fetch(`${provider.endpoint}?key=${provider.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }
    
    const data = await response.json()
    
    this.emit('progress', { status: 'completed', progress: 1.0 })
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Parse timestamps if present
    let segments: TranscriptionSegment[] = []
    if (options.timestamps && text.includes('[')) {
      const lines = text.split('\n')
      segments = lines.map(line => {
        const match = line.match(/\[(\d+):(\d+)\]\s*(.*)/)
        if (match) {
          const minutes = parseInt(match[1])
          const seconds = parseInt(match[2])
          const startTime = minutes * 60 + seconds
          return {
            start: startTime,
            end: startTime + 1,
            text: match[3],
            confidence: 0.95
          }
        }
        return null
      }).filter(Boolean) as TranscriptionSegment[]
    }
    
    return {
      text: text.replace(/\[\d+:\d+\]/g, '').trim(),
      language: options.language || 'en',
      duration: 0,
      confidence: 0.95,
      segments,
      provider: 'gemini',
      model: provider.model,
      processingTime: 0
    }
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithOpenAI(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    const formData = new FormData()
    
    // Convert blob to buffer for form data
    const buffer = Buffer.from(await audioBlob.arrayBuffer())
    formData.append('file', buffer, {
      filename: 'audio.webm',
      contentType: audioBlob.type || 'audio/webm'
    })
    
    formData.append('model', provider.model)
    
    if (options.language) {
      formData.append('language', options.language)
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt)
    }
    
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString())
    }
    
    if (options.timestamps) {
      formData.append('response_format', 'verbose_json')
    }
    
    this.emit('progress', { status: 'uploading', progress: 0.3 })
    
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    })
    
    this.emit('progress', { status: 'processing', progress: 0.6 })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }
    
    const data = await response.json()
    
    this.emit('progress', { status: 'completed', progress: 1.0 })
    
    // Parse response based on format
    if (options.timestamps && data.segments) {
      return {
        text: data.text,
        language: data.language || options.language || 'en',
        duration: data.duration || 0,
        confidence: 0.95, // OpenAI doesn't provide confidence
        segments: data.segments.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text
        })),
        words: data.words || [],
        provider: 'openai',
        model: provider.model,
        processingTime: 0
      }
    } else {
      return {
        text: data.text || '',
        language: data.language || options.language || 'en',
        duration: 0,
        confidence: 0.95,
        provider: 'openai',
        model: provider.model,
        processingTime: 0
      }
    }
  }

  /**
   * Transcribe using Azure Speech Services
   */
  private async transcribeWithAzure(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    // Azure implementation would go here
    // For now, throw not implemented
    throw new Error('Azure provider not yet implemented. Please use OpenAI provider.')
  }

  /**
   * Transcribe using Google Cloud Speech
   */
  private async transcribeWithGoogle(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    // Google implementation would go here
    // For now, throw not implemented
    throw new Error('Google provider not yet implemented. Please use OpenAI provider.')
  }

  /**
   * Transcribe using AssemblyAI
   */
  private async transcribeWithAssemblyAI(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    // First, upload the audio file
    this.emit('progress', { status: 'uploading', progress: 0.2 })
    
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': provider.apiKey,
        'content-type': audioBlob.type || 'audio/webm'
      },
      body: await audioBlob.arrayBuffer()
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio to AssemblyAI')
    }
    
    const { upload_url } = await uploadResponse.json()
    
    // Start transcription
    this.emit('progress', { status: 'processing', progress: 0.4 })
    
    const transcriptResponse = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'authorization': provider.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: options.language,
        word_boost: options.prompt ? [options.prompt] : undefined,
        auto_highlights: true,
        speaker_labels: true
      })
    })
    
    if (!transcriptResponse.ok) {
      throw new Error('Failed to start transcription')
    }
    
    const { id } = await transcriptResponse.json()
    
    // Poll for completion
    let transcript: any
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(`${provider.endpoint}/${id}`, {
        headers: {
          'authorization': provider.apiKey
        }
      })
      
      transcript = await statusResponse.json()
      
      if (transcript.status === 'completed') {
        break
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`)
      }
      
      this.emit('progress', { 
        status: 'processing', 
        progress: Math.min(0.9, 0.4 + (Date.now() - startTime) / 60000) 
      })
    }
    
    this.emit('progress', { status: 'completed', progress: 1.0 })
    
    return {
      text: transcript.text || '',
      language: transcript.language_code || 'en',
      duration: transcript.audio_duration || 0,
      confidence: transcript.confidence || 0.9,
      words: transcript.words || [],
      provider: 'assemblyai',
      model: provider.model,
      processingTime: 0
    }
  }

  /**
   * Demo transcription for testing without API keys
   */
  private async transcribeWithDemo(
    audioBlob: Blob,
    options: TranscriptionOptions,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Return demo transcription
    return {
      text: 'This is a demo transcription. To get real transcriptions, please add an API key for OpenAI, Azure, Google, or AssemblyAI to your environment variables.',
      language: options.language || 'en',
      duration: 5,
      confidence: 1.0,
      provider: 'demo',
      model: 'demo',
      processingTime: 2
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Set active provider
   */
  setActiveProvider(provider: string): void {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} not available`)
    }
    this.activeProvider = provider
    this.emit('providerChanged', provider)
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): TranscriptionProvider | null {
    return this.providers.get(this.activeProvider) || null
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.providers.size > 0
  }

  /**
   * Get implementation type
   */
  getImplementationType(): string {
    if (this.activeProvider === 'demo') {
      return 'Demo Mode (No API Key)'
    }
    return `Cloud API (${this.providers.get(this.activeProvider)?.name || 'Unknown'})`
  }
}

// Export singleton instance
export const cloudTranscriptionService = new CloudTranscriptionService()