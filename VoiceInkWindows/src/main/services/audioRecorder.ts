import { EventEmitter } from 'events'
import * as path from 'path'

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
      
      // Initialize native module callbacks
      this.nativeModule.setLevelCallback((level: number) => {
        this.emit('level', level)
      })
      
      this.nativeModule.setDataCallback((audioData: Float32Array, sampleRate: number) => {
        this.emit('data', audioData, sampleRate)
      })
      
      this.nativeModule.setErrorCallback((error: string) => {
        this.emit('error', new Error(error))
      })
      
    } catch (error) {
      // Fallback to mock implementation
      console.log('⚠️ AudioRecorder: Native module not available, using mock implementation')
      const mockModule = require('./mockAudioRecorder')
      this.mockModule = mockModule.audioRecorder
      this.isUsingNative = false
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