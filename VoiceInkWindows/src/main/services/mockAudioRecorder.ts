import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

export interface AudioDevice {
  id: string
  name: string
  type: 'input' | 'output'
  isDefault: boolean
}

export class MockAudioRecorder extends EventEmitter {
  private isRecording = false
  private isPaused = false
  private recordingStartTime = 0
  private audioBuffer: Float32Array[] = []
  private audioLevel = 0
  private levelInterval: NodeJS.Timeout | null = null
  private currentDevice: AudioDevice | null = null
  
  constructor() {
    super()
  }

  async getAudioDevices(): Promise<AudioDevice[]> {
    // Return mock audio devices
    return [
      { id: 'default', name: 'Default Microphone', type: 'input', isDefault: true },
      { id: 'usb-mic', name: 'USB Microphone', type: 'input', isDefault: false },
      { id: 'headset', name: 'Headset Microphone', type: 'input', isDefault: false }
    ]
  }

  async selectDevice(deviceId: string): Promise<boolean> {
    const devices = await this.getAudioDevices()
    const device = devices.find(d => d.id === deviceId)
    if (device) {
      this.currentDevice = device
      this.emit('device-changed', device)
      return true
    }
    return false
  }

  async startRecording(options: { sampleRate?: number; channels?: number } = {}): Promise<boolean> {
    if (this.isRecording) return false
    
    this.isRecording = true
    this.isPaused = false
    this.recordingStartTime = Date.now()
    this.audioBuffer = []

    // Simulate audio level monitoring
    this.levelInterval = setInterval(() => {
      if (!this.isPaused) {
        // Simulate varying audio levels
        this.audioLevel = Math.random() * 0.7 + 0.1 // Between 0.1 and 0.8
        this.emit('level', this.audioLevel)

        // Simulate audio buffer chunks
        const chunkSize = 4096
        const chunk = new Float32Array(chunkSize)
        for (let i = 0; i < chunkSize; i++) {
          // Generate a simple sine wave with noise
          const t = (Date.now() - this.recordingStartTime) / 1000
          chunk[i] = Math.sin(2 * Math.PI * 440 * t + i / chunkSize) * this.audioLevel
          chunk[i] += (Math.random() - 0.5) * 0.1 // Add noise
        }
        this.audioBuffer.push(chunk)
        this.emit('data', chunk)
      }
    }, 100)

    this.emit('recording-started')
    return true
  }

  async stopRecording(): Promise<Buffer | null> {
    if (!this.isRecording) return null
    
    this.isRecording = false
    this.isPaused = false
    
    if (this.levelInterval) {
      clearInterval(this.levelInterval)
      this.levelInterval = null
    }

    // Combine all audio chunks into a single buffer
    const totalLength = this.audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0)
    const combinedBuffer = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.audioBuffer) {
      combinedBuffer.set(chunk, offset)
      offset += chunk.length
    }

    // Convert to WAV format (simplified)
    const wavBuffer = this.createWavBuffer(combinedBuffer, 44100, 1)
    
    this.emit('recording-stopped', wavBuffer)
    this.audioBuffer = []
    this.audioLevel = 0
    
    return wavBuffer
  }

  pauseRecording(): boolean {
    if (!this.isRecording || this.isPaused) return false
    this.isPaused = true
    this.emit('recording-paused')
    return true
  }

  resumeRecording(): boolean {
    if (!this.isRecording || !this.isPaused) return false
    this.isPaused = false
    this.emit('recording-resumed')
    return true
  }

  getRecordingTime(): number {
    if (!this.isRecording) return 0
    return Math.floor((Date.now() - this.recordingStartTime) / 1000)
  }

  getAudioLevel(): number {
    return this.audioLevel
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  isPausedRecording(): boolean {
    return this.isPaused
  }

  private createWavBuffer(audioData: Float32Array, sampleRate: number, channels: number): Buffer {
    const length = audioData.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // PCM
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true)
    view.setUint16(32, channels * 2, true)
    view.setUint16(34, 16, true) // 16-bit
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return Buffer.from(arrayBuffer)
  }

  async saveRecording(buffer: Buffer, filePath: string): Promise<boolean> {
    try {
      await fs.promises.writeFile(filePath, buffer)
      this.emit('recording-saved', filePath)
      return true
    } catch (error) {
      this.emit('error', error)
      return false
    }
  }
}

// Singleton instance
export const audioRecorder = new MockAudioRecorder()