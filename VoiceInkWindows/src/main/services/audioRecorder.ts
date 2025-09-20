import { EventEmitter } from 'events'
import * as path from 'path'
import { MockAudioRecorder } from './mockAudioRecorder'

interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
}

interface RecordingOptions {
  deviceId?: string
  sampleRate?: number
  channels?: number
  bitDepth?: number
  enableVAD?: boolean
  enableAGC?: boolean
  enableNoiseSuppression?: boolean
}

class AudioRecorder extends EventEmitter {
  private nativeModule: any = null
  private mockModule: any = null
  private isUsingNative: boolean = false
  private isRecording: boolean = false

  constructor() {
    super()
    this.initializeModule()
  }

  private async initializeModule() {
    try {
      // Try to load the native WASAPI module
      const modulePath = path.join(__dirname, '../../build/Release/audiorecorder.node')
      this.nativeModule = require(modulePath)
      this.isUsingNative = true
      console.log('✅ AudioRecorder: Using native WASAPI implementation')
      
      // Initialize native module if it has an init method
      if (this.nativeModule && typeof this.nativeModule.initialize === 'function') {
        await this.nativeModule.initialize()
      }
      
      // Set up event callbacks if available
      if (this.nativeModule.setLevelCallback && typeof this.nativeModule.setLevelCallback === 'function') {
        this.nativeModule.setLevelCallback((level: number, peak: number) => {
          this.emit('level', level)
          this.emit('peak', peak)
        })
      }
      
      if (this.nativeModule.setDataCallback && typeof this.nativeModule.setDataCallback === 'function') {
        this.nativeModule.setDataCallback((audioData: Float32Array, sampleRate: number, timestamp: number) => {
          this.emit('data', audioData, sampleRate, timestamp)
        })
      }
      
      if (this.nativeModule.setErrorCallback && typeof this.nativeModule.setErrorCallback === 'function') {
        this.nativeModule.setErrorCallback((error: string) => {
          this.emit('error', new Error(error))
        })
      }
      
    } catch (error) {
      // Fallback to mock implementation
      console.log('⚠️ AudioRecorder: Native WASAPI module not available, falling back to mock implementation')
      console.log(`   Module path attempted: ${path.join(__dirname, '../../build/Release/audiorecorder.node')}`)
      console.log(`   Error details: ${error instanceof Error ? error.message : error}`)
      this.mockModule = new MockAudioRecorder()
      this.setupMockEventHandlers()
      this.isUsingNative = false
    }
  }

  private setupMockEventHandlers() {
    if (this.mockModule) {
      // Forward mock events to this recorder
      this.mockModule.on('level', (level: number) => this.emit('level', level))
      this.mockModule.on('data', (data: Float32Array) => this.emit('data', data))
      this.mockModule.on('started', () => this.emit('started'))
      this.mockModule.on('stopped', (data: Float32Array) => this.emit('stopped', data))
      this.mockModule.on('paused', () => this.emit('paused'))
      this.mockModule.on('resumed', () => this.emit('resumed'))
      this.mockModule.on('error', (error: Error) => this.emit('error', error))
    }
  }

  async getDevices(): Promise<AudioDevice[]> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getDevices()
    } else if (this.mockModule) {
      return this.mockModule.getDevices()
    }
    throw new Error('No audio recording module available')
  }

  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress')
    }

    const defaultOptions = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      enableVAD: true,
      enableAGC: true,
      enableNoiseSuppression: true,
      ...options
    }

    try {
      if (this.isUsingNative && this.nativeModule) {
        await this.nativeModule.startRecording(defaultOptions)
      } else if (this.mockModule) {
        await this.mockModule.startRecording(defaultOptions)
      } else {
        throw new Error('No audio recording module available')
      }
      
      this.isRecording = true
      this.emit('started')
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async stopRecording(): Promise<Float32Array> {
    if (!this.isRecording) {
      throw new Error('No recording in progress')
    }

    try {
      let audioData: Float32Array
      
      if (this.isUsingNative && this.nativeModule) {
        audioData = await this.nativeModule.stopRecording()
      } else if (this.mockModule) {
        audioData = await this.mockModule.stopRecording()
      } else {
        throw new Error('No audio recording module available')
      }
      
      this.isRecording = false
      this.emit('stopped', audioData)
      return audioData
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  async pauseRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress')
    }

    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.pauseRecording()
    } else if (this.mockModule) {
      await this.mockModule.pauseRecording()
    }
    
    this.emit('paused')
  }

  async resumeRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress')
    }

    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.resumeRecording()
    } else if (this.mockModule) {
      await this.mockModule.resumeRecording()
    }
    
    this.emit('resumed')
  }

  async setDevice(deviceId: string): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.setDevice(deviceId)
    } else if (this.mockModule) {
      await this.mockModule.setDevice(deviceId)
    }
  }

  async getVolume(): Promise<number> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getVolume()
    } else if (this.mockModule) {
      return this.mockModule.getVolume()
    }
    return 0.5
  }

  async setVolume(volume: number): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.setVolume(volume)
    } else if (this.mockModule) {
      await this.mockModule.setVolume(volume)
    }
  }

  isRecordingActive(): boolean {
    return this.isRecording
  }

  isNativeImplementation(): boolean {
    return this.isUsingNative
  }

  getImplementationType(): string {
    return this.isUsingNative ? 'WASAPI (Native)' : 'Mock'
  }

  // Advanced features (mainly available in native implementation)
  async enableVoiceActivityDetection(enabled: boolean): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.enableVAD(enabled)
    }
  }

  async enableAutomaticGainControl(enabled: boolean): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.enableAGC(enabled)
    }
  }

  async enableNoiseSuppression(enabled: boolean): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.enableNoiseSuppression(enabled)
    }
  }

  async enableEchoCancellation(enabled: boolean): Promise<void> {
    if (this.isUsingNative && this.nativeModule) {
      await this.nativeModule.enableEchoCancellation(enabled)
    }
  }

  async getRecordingStats(): Promise<any> {
    if (this.isUsingNative && this.nativeModule) {
      return this.nativeModule.getRecordingStats()
    }
    return {
      duration: 0,
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      bufferSize: 0
    }
  }
}

// Export singleton instance
export const audioRecorder = new AudioRecorder()