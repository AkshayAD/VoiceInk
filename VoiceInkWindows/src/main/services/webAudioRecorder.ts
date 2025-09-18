import { EventEmitter } from 'events'

interface AudioDevice {
  deviceId: string
  label: string
  kind: string
  groupId: string
}

interface RecordingOptions {
  deviceId?: string
  sampleRate?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

/**
 * Real audio recorder using Web Audio API
 * This actually works, unlike the WASAPI implementation
 */
export class WebAudioRecorder extends EventEmitter {
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private isRecording: boolean = false
  private isPaused: boolean = false
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private audioLevel: number = 0
  private levelInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  /**
   * Get available audio input devices (real devices!)
   */
  async getDevices(): Promise<AudioDevice[]> {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop())
        })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 8)}`,
          kind: device.kind,
          groupId: device.groupId
        }))

      this.emit('devicesLoaded', audioInputs)
      return audioInputs
    } catch (error) {
      console.error('Failed to get audio devices:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Start recording real audio
   */
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    try {
      // Configure audio constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          sampleRate: options.sampleRate || 16000,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true
        }
      }

      // Get real audio stream from microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Create audio context for analysis
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: options.sampleRate || 16000
      })
      
      // Create analyser for audio levels
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.microphone.connect(this.analyser)
      
      // Setup MediaRecorder for capturing audio
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      })
      
      // Handle audio data
      this.audioChunks = []
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          this.emit('data', event.data)
        }
      }
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        this.emit('stopped', audioBlob)
      }
      
      // Start recording
      this.mediaRecorder.start(1000) // Collect data every second
      this.isRecording = true
      this.isPaused = false
      this.startTime = Date.now()
      
      // Start monitoring audio levels
      this.startLevelMonitoring()
      
      this.emit('started')
      console.log('🎤 Started recording real audio')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    if (!this.isRecording) {
      throw new Error('Not recording')
    }

    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder!.mimeType 
          })
          
          // Clean up
          this.cleanup()
          
          this.isRecording = false
          this.isPaused = false
          
          this.emit('stopped', audioBlob)
          resolve(audioBlob)
        }
        
        this.mediaRecorder.stop()
      } else {
        const audioBlob = new Blob(this.audioChunks)
        this.cleanup()
        this.isRecording = false
        resolve(audioBlob)
      }
    })
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<void> {
    if (!this.isRecording || this.isPaused) {
      throw new Error('Cannot pause')
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      this.isPaused = true
      this.stopLevelMonitoring()
      this.emit('paused')
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<void> {
    if (!this.isRecording || !this.isPaused) {
      throw new Error('Cannot resume')
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      this.isPaused = false
      this.startLevelMonitoring()
      this.emit('resumed')
    }
  }

  /**
   * Get current audio level (0-1)
   */
  getAudioLevel(): number {
    if (!this.analyser || !this.isRecording) {
      return 0
    }

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)
    
    // Calculate RMS
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / bufferLength)
    
    // Normalize to 0-1
    return Math.min(1, rms / 128)
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording) {
      return 0
    }
    return (Date.now() - this.startTime) / 1000
  }

  /**
   * Convert blob to Float32Array for processing
   */
  async blobToFloat32Array(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Get the first channel
    return audioBuffer.getChannelData(0)
  }

  /**
   * Check if recording is active
   */
  isRecordingActive(): boolean {
    return this.isRecording
  }

  /**
   * Check if recording is paused
   */
  isRecordingPaused(): boolean {
    return this.isPaused
  }

  /**
   * Get implementation type
   */
  getImplementationType(): string {
    return 'Web Audio API (Real)'
  }

  // Private methods

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    return 'audio/webm' // Default fallback
  }

  private startLevelMonitoring(): void {
    this.stopLevelMonitoring()
    
    this.levelInterval = setInterval(() => {
      const level = this.getAudioLevel()
      this.audioLevel = level
      this.emit('level', level)
    }, 100) // Update every 100ms
  }

  private stopLevelMonitoring(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval)
      this.levelInterval = null
    }
  }

  private cleanup(): void {
    // Stop level monitoring
    this.stopLevelMonitoring()
    
    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    
    // Clear references
    this.mediaRecorder = null
    this.analyser = null
    this.microphone = null
    this.audioChunks = []
  }
}

// Export singleton instance
export const webAudioRecorder = new WebAudioRecorder()