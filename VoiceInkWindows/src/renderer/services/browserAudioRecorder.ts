/**
 * Browser-based audio recorder using Web Audio API
 * This runs in the renderer process and captures real audio from the microphone
 */

// Simple EventEmitter implementation for browser
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return
    this.events[event] = this.events[event].filter(l => l !== listener)
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return
    this.events[event].forEach(listener => listener(...args))
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event]
    } else {
      this.events = {}
    }
  }
}

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
  channelCount?: number
  mimeType?: string
}

interface AudioData {
  blob: Blob
  duration: number
  sampleRate: number
  mimeType: string
  size: number
}

export class BrowserAudioRecorder extends EventEmitter {
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  
  private isRecording: boolean = false
  private isPaused: boolean = false
  private audioChunks: Blob[] = []
  private startTime: number = 0
  private pausedDuration: number = 0
  private lastPauseTime: number = 0
  
  private levelUpdateInterval: NodeJS.Timeout | null = null
  private currentLevel: number = 0
  private peakLevel: number = 0

  constructor() {
    super()
    this.checkBrowserSupport()
  }

  /**
   * Check browser support for required APIs
   */
  private checkBrowserSupport(): boolean {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
    const hasAudioContext = typeof (window.AudioContext || (window as any).webkitAudioContext) !== 'undefined'
    
    if (!hasGetUserMedia) {
      console.error('getUserMedia is not supported in this browser')
      return false
    }
    
    if (!hasMediaRecorder) {
      console.error('MediaRecorder is not supported in this browser')
      return false
    }
    
    if (!hasAudioContext) {
      console.error('AudioContext is not supported in this browser')
      return false
    }
    
    return true
  }

  /**
   * Get available audio input devices
   */
  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      // Request permission first
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      tempStream.getTracks().forEach(track => track.stop())
      
      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.substring(0, 6)}`,
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
   * Start recording audio
   */
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    try {
      // Set up audio constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          sampleRate: options.sampleRate || 16000,
          channelCount: options.channelCount || 1,
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
        }
      }

      // Get audio stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Set up audio context for analysis
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioContextClass({
        sampleRate: options.sampleRate || 16000
      })
      
      // Create analyser node for level monitoring
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.8
      
      // Connect stream to analyser
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.source.connect(this.analyser)
      
      // Create script processor for real-time audio processing
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isPaused) {
          this.processAudioData(event)
        }
      }
      this.analyser.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.audioContext.destination)
      
      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType(options.mimeType)
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000
      })
      
      // Handle data availability
      this.audioChunks = []
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          this.emit('dataAvailable', event.data)
        }
      }
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        const duration = this.getRecordingDuration()
        
        const audioData: AudioData = {
          blob: audioBlob,
          duration,
          sampleRate: options.sampleRate || 16000,
          mimeType,
          size: audioBlob.size
        }
        
        this.emit('recordingComplete', audioData)
        this.cleanup()
      }
      
      // Start recording
      this.mediaRecorder.start(1000) // Collect data every second
      this.isRecording = true
      this.isPaused = false
      this.startTime = Date.now()
      this.pausedDuration = 0
      
      // Start level monitoring
      this.startLevelMonitoring()
      
      this.emit('recordingStarted')
      console.log('🎤 Recording started with real microphone')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      this.emit('error', error)
      this.cleanup()
      throw error
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<AudioData> {
    if (!this.isRecording) {
      throw new Error('Not recording')
    }

    return new Promise((resolve, reject) => {
      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          // Set up handler for when recording stops
          const mimeType = this.mediaRecorder.mimeType
          const sampleRate = this.audioContext?.sampleRate || 16000
          
          this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: mimeType })
            const duration = this.getRecordingDuration()
            
            const audioData: AudioData = {
              blob: audioBlob,
              duration,
              sampleRate,
              mimeType,
              size: audioBlob.size
            }
            
            this.cleanup()
            this.isRecording = false
            this.isPaused = false
            
            this.emit('recordingComplete', audioData)
            resolve(audioData)
          }
          
          // Stop recording
          this.mediaRecorder.stop()
          this.stopLevelMonitoring()
          
        } else {
          reject(new Error('MediaRecorder not active'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.isRecording || this.isPaused) {
      throw new Error('Cannot pause - not recording or already paused')
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause()
      this.isPaused = true
      this.lastPauseTime = Date.now()
      this.stopLevelMonitoring()
      this.emit('recordingPaused')
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (!this.isRecording || !this.isPaused) {
      throw new Error('Cannot resume - not paused')
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume()
      this.isPaused = false
      this.pausedDuration += Date.now() - this.lastPauseTime
      this.startLevelMonitoring()
      this.emit('recordingResumed')
    }
  }

  /**
   * Process audio data in real-time
   */
  private processAudioData(event: AudioProcessingEvent): void {
    const inputData = event.inputBuffer.getChannelData(0)
    
    // Calculate RMS for level
    let sum = 0
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i]
    }
    const rms = Math.sqrt(sum / inputData.length)
    const level = Math.min(1, rms * 10)
    
    // Update peak level
    if (level > this.peakLevel) {
      this.peakLevel = level
    }
    
    this.currentLevel = level
    
    // Emit audio buffer for real-time processing
    this.emit('audioData', {
      samples: inputData,
      sampleRate: this.audioContext?.sampleRate || 16000,
      timestamp: Date.now()
    })
  }

  /**
   * Start monitoring audio levels
   */
  private startLevelMonitoring(): void {
    this.stopLevelMonitoring()
    
    this.levelUpdateInterval = setInterval(() => {
      if (this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
        this.analyser.getByteFrequencyData(dataArray)
        
        // Calculate average level
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        const normalizedLevel = average / 255
        
        this.currentLevel = normalizedLevel
        this.emit('level', normalizedLevel)
      }
    }, 50) // Update every 50ms
  }

  /**
   * Stop monitoring audio levels
   */
  private stopLevelMonitoring(): void {
    if (this.levelUpdateInterval) {
      clearInterval(this.levelUpdateInterval)
      this.levelUpdateInterval = null
    }
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(preferred?: string): string {
    if (preferred && MediaRecorder.isTypeSupported(preferred)) {
      return preferred
    }
    
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav',
      'audio/aac'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    return 'audio/webm' // Default fallback
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.isRecording) {
      return 0
    }
    
    const totalTime = Date.now() - this.startTime - this.pausedDuration
    return totalTime / 1000
  }

  /**
   * Get current audio level (0-1)
   */
  getAudioLevel(): number {
    return this.currentLevel
  }

  /**
   * Get peak audio level since recording started
   */
  getPeakLevel(): number {
    return this.peakLevel
  }

  /**
   * Check if currently recording
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
   * Clean up resources
   */
  private cleanup(): void {
    // Stop level monitoring
    this.stopLevelMonitoring()
    
    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    
    // Disconnect audio nodes
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect()
      this.scriptProcessor = null
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
    
    // Clear recorder
    this.mediaRecorder = null
    this.audioChunks = []
    this.currentLevel = 0
  }

  /**
   * Save audio blob to file
   */
  async saveAudioFile(audioBlob: Blob, fileName?: string): Promise<string> {
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      
      // Generate file name if not provided
      const finalFileName = fileName || `recording_${Date.now()}.webm`
      
      // Send to main process for saving
      const result = await (window as any).electronAPI.audio.saveRecording({
        audioBuffer: arrayBuffer,
        fileName: finalFileName,
        mimeType: audioBlob.type
      })
      
      if (result.success) {
        console.log('Audio file saved:', result.filePath)
        return result.filePath
      } else {
        throw new Error(result.error || 'Failed to save audio file')
      }
    } catch (error) {
      console.error('Failed to save audio file:', error)
      throw error
    }
  }

  /**
   * Convert blob to WAV format for better compatibility
   */
  async convertToWav(audioBlob: Blob): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Create WAV from audio buffer
    const wavBuffer = this.audioBufferToWav(audioBuffer)
    return new Blob([wavBuffer], { type: 'audio/wav' })
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels: Float32Array[] = []
    let offset = 0
    let pos = 0

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true)
      pos += 2
    }
    
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true)
      pos += 4
    }

    // RIFF identifier
    setUint32(0x46464952) // "RIFF"
    setUint32(length - 8) // file length - 8
    setUint32(0x45564157) // "WAVE"

    // Format chunk identifier
    setUint32(0x20746d66) // "fmt "
    setUint32(16) // chunk length
    setUint16(1) // PCM format
    setUint16(buffer.numberOfChannels)
    setUint32(buffer.sampleRate)
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels) // byte rate
    setUint16(buffer.numberOfChannels * 2) // block align
    setUint16(16) // bits per sample

    // Data chunk identifier
    setUint32(0x61746164) // "data"
    setUint32(length - pos - 4) // chunk length

    // Write interleaved data
    const channelData = []
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channelData.push(buffer.getChannelData(i))
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i][offset]))
        view.setInt16(pos, sample * 0x7FFF, true)
        pos += 2
      }
      offset++
    }

    return arrayBuffer
  }
}

// Export singleton instance
export const browserAudioRecorder = new BrowserAudioRecorder()