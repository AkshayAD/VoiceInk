/**
 * Advanced Audio Processing Pipeline with Noise Reduction
 * Real-time audio enhancement for better transcription quality
 */

import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

export interface AudioProcessingConfig {
  // Noise reduction settings
  noiseReduction: {
    enabled: boolean
    level: 'light' | 'moderate' | 'aggressive'
    spectralSubtraction: boolean
    adaptiveFiltering: boolean
  }
  
  // Audio enhancement settings
  enhancement: {
    normalizeVolume: boolean
    compressDynamicRange: boolean
    enhanceVoice: boolean
    removeBackground: boolean
  }
  
  // Filtering settings
  filters: {
    highPass: { enabled: boolean, frequency: number }
    lowPass: { enabled: boolean, frequency: number }
    bandPass: { enabled: boolean, lowFreq: number, highFreq: number }
    notch: { enabled: boolean, frequency: number }
  }
  
  // Real-time processing
  realTime: {
    enabled: boolean
    bufferSize: number
    hopSize: number
    windowType: 'hann' | 'hamming' | 'blackman'
  }
}

export interface ProcessingMetrics {
  originalSNR: number // Signal to Noise Ratio
  processedSNR: number
  noiseReductionDB: number
  processingLatency: number
  cpuUsage: number
  qualityScore: number
}

export interface AudioSegment {
  data: Float32Array
  sampleRate: number
  timestamp: number
  duration: number
  channels: number
}

export class AdvancedAudioProcessor extends EventEmitter {
  private config: AudioProcessingConfig
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private isProcessing = false
  private metrics: ProcessingMetrics = {
    originalSNR: 0,
    processedSNR: 0,
    noiseReductionDB: 0,
    processingLatency: 0,
    cpuUsage: 0,
    qualityScore: 0
  }

  constructor(config?: Partial<AudioProcessingConfig>) {
    super()
    this.config = this.mergeConfig(config)
    this.initializeAudioContext()
  }

  /**
   * Merge provided config with defaults
   */
  private mergeConfig(userConfig?: Partial<AudioProcessingConfig>): AudioProcessingConfig {
    const defaultConfig: AudioProcessingConfig = {
      noiseReduction: {
        enabled: true,
        level: 'moderate',
        spectralSubtraction: true,
        adaptiveFiltering: true
      },
      enhancement: {
        normalizeVolume: true,
        compressDynamicRange: true,
        enhanceVoice: true,
        removeBackground: true
      },
      filters: {
        highPass: { enabled: true, frequency: 80 },
        lowPass: { enabled: true, frequency: 8000 },
        bandPass: { enabled: false, lowFreq: 300, highFreq: 3400 },
        notch: { enabled: false, frequency: 50 }
      },
      realTime: {
        enabled: true,
        bufferSize: 4096,
        hopSize: 1024,
        windowType: 'hann'
      }
    }

    return this.deepMerge(defaultConfig, userConfig || {})
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  /**
   * Initialize Web Audio API context
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new AudioContext({
        sampleRate: 44100,
        latencyHint: 'interactive'
      })

      // Load audio worklet for real-time processing
      if (this.config.realTime.enabled) {
        await this.loadAudioWorklet()
      }

      console.log('🎵 Advanced audio processor initialized')
      this.emit('initialized')
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      this.emit('error', error)
    }
  }

  /**
   * Load audio worklet for real-time processing
   */
  private async loadAudioWorklet(): Promise<void> {
    try {
      // Create audio worklet processor code
      const workletCode = this.generateWorkletCode()
      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)

      await this.audioContext!.audioWorklet.addModule(workletUrl)
      
      this.workletNode = new AudioWorkletNode(this.audioContext!, 'advanced-audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2
      })

      // Set up message handling
      this.workletNode.port.onmessage = (event) => {
        this.handleWorkletMessage(event.data)
      }

      console.log('🔧 Audio worklet loaded successfully')
    } catch (error) {
      console.error('Failed to load audio worklet:', error)
      throw error
    }
  }

  /**
   * Generate audio worklet processor code
   */
  private generateWorkletCode(): string {
    return `
class AdvancedAudioProcessorWorklet extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 4096
    this.hopSize = 1024
    this.windowSize = 2048
    this.overlap = this.windowSize - this.hopSize
    this.inputBuffer = new Float32Array(this.bufferSize)
    this.outputBuffer = new Float32Array(this.bufferSize)
    this.fftBuffer = new Float32Array(this.windowSize * 2)
    this.noiseProfile = new Float32Array(this.windowSize)
    this.isLearningNoise = true
    this.frameCount = 0
    
    // Initialize noise learning
    this.learnNoiseFrames = 20 // Learn noise from first 20 frames
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    
    if (input.length === 0) return true
    
    const inputChannel = input[0]
    const outputChannel = output[0]
    
    // Process audio in chunks
    for (let i = 0; i < inputChannel.length; i++) {
      this.inputBuffer[i] = inputChannel[i]
    }
    
    // Apply noise reduction and enhancement
    this.processAudioBuffer(this.inputBuffer, this.outputBuffer)
    
    // Copy processed audio to output
    for (let i = 0; i < outputChannel.length; i++) {
      outputChannel[i] = this.outputBuffer[i]
    }
    
    this.frameCount++
    return true
  }
  
  processAudioBuffer(input, output) {
    // Simple spectral subtraction noise reduction
    if (this.isLearningNoise && this.frameCount < this.learnNoiseFrames) {
      this.updateNoiseProfile(input)
    }
    
    // Apply noise reduction
    this.spectralSubtraction(input, output)
    
    // Apply audio enhancement
    this.enhanceAudio(output)
  }
  
  updateNoiseProfile(input) {
    // Simple noise estimation - would be more sophisticated in real implementation
    for (let i = 0; i < Math.min(input.length, this.noiseProfile.length); i++) {
      this.noiseProfile[i] = Math.max(this.noiseProfile[i], Math.abs(input[i]))
    }
    
    if (this.frameCount >= this.learnNoiseFrames - 1) {
      this.isLearningNoise = false
      this.port.postMessage({ type: 'noise-learning-complete' })
    }
  }
  
  spectralSubtraction(input, output) {
    // Simplified spectral subtraction
    const alpha = 2.0 // Over-subtraction factor
    const beta = 0.01 // Spectral floor
    
    for (let i = 0; i < input.length; i++) {
      const signal = input[i]
      const noise = this.noiseProfile[Math.min(i, this.noiseProfile.length - 1)]
      
      // Spectral subtraction
      const magnitude = Math.abs(signal)
      const reducedMagnitude = Math.max(
        magnitude - alpha * noise,
        beta * magnitude
      )
      
      // Preserve phase, reduce magnitude
      output[i] = signal * (reducedMagnitude / Math.max(magnitude, 1e-10))
    }
  }
  
  enhanceAudio(buffer) {
    // Apply dynamic range compression
    this.compressAudio(buffer)
    
    // Apply voice enhancement
    this.enhanceVoice(buffer)
    
    // Normalize volume
    this.normalizeVolume(buffer)
  }
  
  compressAudio(buffer) {
    const threshold = 0.7
    const ratio = 4.0
    const attack = 0.003
    const release = 0.1
    
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i]
      const magnitude = Math.abs(sample)
      
      if (magnitude > threshold) {
        const excess = magnitude - threshold
        const compressedExcess = excess / ratio
        const compressedMagnitude = threshold + compressedExcess
        buffer[i] = sample * (compressedMagnitude / magnitude)
      }
    }
  }
  
  enhanceVoice(buffer) {
    // Simple voice enhancement using emphasis filter
    const emphasis = 0.97
    let prev = 0
    
    for (let i = 0; i < buffer.length; i++) {
      const current = buffer[i]
      buffer[i] = current - emphasis * prev
      prev = current
    }
  }
  
  normalizeVolume(buffer) {
    // Find peak
    let peak = 0
    for (let i = 0; i < buffer.length; i++) {
      peak = Math.max(peak, Math.abs(buffer[i]))
    }
    
    // Normalize to 0.8 max to avoid clipping
    if (peak > 0.01) {
      const gain = 0.8 / peak
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= gain
      }
    }
  }
}

registerProcessor('advanced-audio-processor', AdvancedAudioProcessorWorklet)
`
  }

  /**
   * Handle messages from audio worklet
   */
  private handleWorkletMessage(data: any): void {
    switch (data.type) {
      case 'noise-learning-complete':
        console.log('🎯 Noise profile learning completed')
        this.emit('noiseProfileReady')
        break
      case 'processing-metrics':
        this.updateMetrics(data.metrics)
        break
    }
  }

  /**
   * Process audio file with advanced algorithms
   */
  async processAudioFile(filePath: string): Promise<{
    processedPath: string
    metrics: ProcessingMetrics
  }> {
    console.log('🎵 Processing audio file:', filePath)
    const startTime = Date.now()

    try {
      // Read audio file
      const audioBuffer = await this.loadAudioFile(filePath)
      
      // Apply noise reduction
      const denoised = await this.applyNoiseReduction(audioBuffer)
      
      // Apply audio enhancement
      const enhanced = await this.applyAudioEnhancement(denoised)
      
      // Apply filters
      const filtered = await this.applyFilters(enhanced)
      
      // Save processed audio
      const processedPath = await this.saveProcessedAudio(filtered, filePath)
      
      // Calculate metrics
      const processingTime = Date.now() - startTime
      this.metrics.processingLatency = processingTime
      this.metrics.qualityScore = this.calculateQualityScore(audioBuffer, filtered)
      
      console.log(`✅ Audio processing completed in ${processingTime}ms`)
      this.emit('processingComplete', { processedPath, metrics: this.metrics })
      
      return { processedPath, metrics: this.metrics }
      
    } catch (error) {
      console.error('Audio processing failed:', error)
      this.emit('processingError', error)
      throw error
    }
  }

  /**
   * Load audio file into AudioBuffer
   */
  private async loadAudioFile(filePath: string): Promise<AudioBuffer> {
    const audioData = await fs.promises.readFile(filePath)
    const arrayBuffer = audioData.buffer.slice(
      audioData.byteOffset,
      audioData.byteOffset + audioData.byteLength
    )
    
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }
    
    return await this.audioContext.decodeAudioData(arrayBuffer)
  }

  /**
   * Apply noise reduction using spectral subtraction
   */
  private async applyNoiseReduction(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    if (!this.config.noiseReduction.enabled) {
      return audioBuffer
    }

    console.log('🔇 Applying noise reduction...')
    
    const processedBuffer = this.audioContext!.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = processedBuffer.getChannelData(channel)
      
      // Apply spectral subtraction
      this.spectralSubtractionDenoising(inputData, outputData)
    }

    return processedBuffer
  }

  /**
   * Spectral subtraction denoising algorithm
   */
  private spectralSubtractionDenoising(input: Float32Array, output: Float32Array): void {
    const frameSize = 1024
    const overlap = frameSize / 2
    const window = this.createHannWindow(frameSize)
    
    // Estimate noise from first 0.5 seconds
    const noiseFrames = Math.floor(0.5 * input.length / frameSize)
    const noiseSpectrum = this.estimateNoiseSpectrum(input, frameSize, noiseFrames)
    
    // Process audio in overlapping frames
    for (let i = 0; i < input.length - frameSize; i += overlap) {
      const frame = input.slice(i, i + frameSize)
      
      // Apply window
      for (let j = 0; j < frameSize; j++) {
        frame[j] *= window[j]
      }
      
      // Apply spectral subtraction
      const processedFrame = this.applySpectralSubtraction(frame, noiseSpectrum)
      
      // Overlap-add
      for (let j = 0; j < frameSize && i + j < output.length; j++) {
        output[i + j] += processedFrame[j] * window[j]
      }
    }
  }

  /**
   * Create Hann window
   */
  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size)
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)))
    }
    return window
  }

  /**
   * Estimate noise spectrum from initial frames
   */
  private estimateNoiseSpectrum(signal: Float32Array, frameSize: number, numFrames: number): Float32Array {
    const spectrum = new Float32Array(frameSize / 2)
    
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * frameSize
      if (start + frameSize > signal.length) break
      
      const frameData = signal.slice(start, start + frameSize)
      const frameSpectrum = this.simpleFFT(frameData)
      
      // Accumulate magnitude spectrum
      for (let i = 0; i < spectrum.length; i++) {
        spectrum[i] += Math.abs(frameSpectrum[i])
      }
    }
    
    // Average
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] /= numFrames
    }
    
    return spectrum
  }

  /**
   * Apply spectral subtraction to a frame
   */
  private applySpectralSubtraction(frame: Float32Array, noiseSpectrum: Float32Array): Float32Array {
    const spectrum = this.simpleFFT(frame)
    const alpha = this.getSubtractionFactor()
    const beta = 0.01 // Spectral floor
    
    // Apply spectral subtraction
    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = Math.abs(spectrum[i])
      const noise = noiseSpectrum[Math.min(i, noiseSpectrum.length - 1)]
      
      const reducedMagnitude = Math.max(
        magnitude - alpha * noise,
        beta * magnitude
      )
      
      // Preserve phase, modify magnitude
      const phase = Math.atan2(spectrum[i], spectrum[i])
      spectrum[i] = reducedMagnitude * Math.cos(phase)
    }
    
    return this.simpleIFFT(spectrum)
  }

  /**
   * Get subtraction factor based on config
   */
  private getSubtractionFactor(): number {
    switch (this.config.noiseReduction.level) {
      case 'light': return 1.5
      case 'moderate': return 2.0
      case 'aggressive': return 3.0
      default: return 2.0
    }
  }

  /**
   * Simple FFT implementation (placeholder - would use optimized FFT library)
   */
  private simpleFFT(signal: Float32Array): Float32Array {
    // This is a simplified placeholder - real implementation would use FFTW or similar
    const result = new Float32Array(signal.length)
    for (let i = 0; i < signal.length; i++) {
      result[i] = signal[i] // Placeholder
    }
    return result
  }

  /**
   * Simple IFFT implementation (placeholder)
   */
  private simpleIFFT(spectrum: Float32Array): Float32Array {
    // This is a simplified placeholder
    const result = new Float32Array(spectrum.length)
    for (let i = 0; i < spectrum.length; i++) {
      result[i] = spectrum[i] // Placeholder
    }
    return result
  }

  /**
   * Apply audio enhancement
   */
  private async applyAudioEnhancement(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    console.log('🎚️ Applying audio enhancement...')
    
    const enhancedBuffer = this.audioContext!.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel)
      const outputData = enhancedBuffer.getChannelData(channel)
      
      // Copy input to output
      outputData.set(inputData)
      
      // Apply enhancements
      if (this.config.enhancement.compressDynamicRange) {
        this.applyDynamicRangeCompression(outputData)
      }
      
      if (this.config.enhancement.enhanceVoice) {
        this.applyVoiceEnhancement(outputData)
      }
      
      if (this.config.enhancement.normalizeVolume) {
        this.normalizeAudioLevel(outputData)
      }
    }

    return enhancedBuffer
  }

  /**
   * Apply dynamic range compression
   */
  private applyDynamicRangeCompression(data: Float32Array): void {
    const threshold = 0.7
    const ratio = 4.0
    
    for (let i = 0; i < data.length; i++) {
      const sample = data[i]
      const magnitude = Math.abs(sample)
      
      if (magnitude > threshold) {
        const excess = magnitude - threshold
        const compressedExcess = excess / ratio
        const compressedMagnitude = threshold + compressedExcess
        data[i] = sample * (compressedMagnitude / magnitude)
      }
    }
  }

  /**
   * Apply voice enhancement (pre-emphasis filter)
   */
  private applyVoiceEnhancement(data: Float32Array): void {
    const emphasis = 0.97
    
    for (let i = data.length - 1; i > 0; i--) {
      data[i] = data[i] - emphasis * data[i - 1]
    }
  }

  /**
   * Normalize audio level
   */
  private normalizeAudioLevel(data: Float32Array): void {
    let peak = 0
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]))
    }
    
    if (peak > 0.01) {
      const gain = 0.8 / peak
      for (let i = 0; i < data.length; i++) {
        data[i] *= gain
      }
    }
  }

  /**
   * Apply frequency filters
   */
  private async applyFilters(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    console.log('🎛️ Applying frequency filters...')
    
    // This would use Web Audio API BiquadFilterNode in real implementation
    // For now, returning the buffer as-is
    return audioBuffer
  }

  /**
   * Save processed audio to file
   */
  private async saveProcessedAudio(audioBuffer: AudioBuffer, originalPath: string): Promise<string> {
    const ext = path.extname(originalPath)
    const basename = path.basename(originalPath, ext)
    const dirname = path.dirname(originalPath)
    const processedPath = path.join(dirname, `${basename}_processed${ext}`)
    
    // Convert AudioBuffer to WAV format (simplified)
    const wavData = this.audioBufferToWav(audioBuffer)
    await fs.promises.writeFile(processedPath, wavData)
    
    return processedPath
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Buffer {
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = length * blockAlign
    const headerSize = 44
    const fileSize = headerSize + dataSize - 8

    const buffer = Buffer.alloc(headerSize + dataSize)
    let offset = 0

    // WAV header
    buffer.write('RIFF', offset); offset += 4
    buffer.writeUInt32LE(fileSize, offset); offset += 4
    buffer.write('WAVE', offset); offset += 4
    buffer.write('fmt ', offset); offset += 4
    buffer.writeUInt32LE(16, offset); offset += 4
    buffer.writeUInt16LE(1, offset); offset += 2
    buffer.writeUInt16LE(numberOfChannels, offset); offset += 2
    buffer.writeUInt32LE(sampleRate, offset); offset += 4
    buffer.writeUInt32LE(byteRate, offset); offset += 4
    buffer.writeUInt16LE(blockAlign, offset); offset += 2
    buffer.writeUInt16LE(bytesPerSample * 8, offset); offset += 2
    buffer.write('data', offset); offset += 4
    buffer.writeUInt32LE(dataSize, offset); offset += 4

    // Audio data
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i]
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF
        buffer.writeInt16LE(intSample, offset)
        offset += 2
      }
    }

    return buffer
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(original: AudioBuffer, processed: AudioBuffer): number {
    // Simplified quality calculation
    let originalRMS = 0
    let processedRMS = 0
    
    const originalData = original.getChannelData(0)
    const processedData = processed.getChannelData(0)
    
    for (let i = 0; i < Math.min(originalData.length, processedData.length); i++) {
      originalRMS += originalData[i] * originalData[i]
      processedRMS += processedData[i] * processedData[i]
    }
    
    originalRMS = Math.sqrt(originalRMS / originalData.length)
    processedRMS = Math.sqrt(processedRMS / processedData.length)
    
    // Quality score based on SNR improvement
    const snrImprovement = 20 * Math.log10(processedRMS / Math.max(originalRMS, 1e-10))
    return Math.max(0, Math.min(100, 50 + snrImprovement * 10))
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(newMetrics: Partial<ProcessingMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics }
    this.emit('metricsUpdated', this.metrics)
  }

  /**
   * Start real-time processing
   */
  async startRealTimeProcessing(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.audioContext || !this.workletNode) {
      throw new Error('Audio processing not initialized')
    }

    console.log('🎵 Starting real-time audio processing')
    this.isProcessing = true

    const source = this.audioContext.createMediaStreamSource(inputStream)
    const destination = this.audioContext.createMediaStreamDestination()

    // Connect audio graph: source -> worklet -> destination
    source.connect(this.workletNode)
    this.workletNode.connect(destination)

    this.emit('realTimeProcessingStarted')
    return destination.stream
  }

  /**
   * Stop real-time processing
   */
  stopRealTimeProcessing(): void {
    if (this.workletNode) {
      this.workletNode.disconnect()
    }
    this.isProcessing = false
    console.log('⏹️ Real-time audio processing stopped')
    this.emit('realTimeProcessingStopped')
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioProcessingConfig>): void {
    this.config = this.deepMerge(this.config, newConfig)
    
    // Send config to worklet
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'config-update',
        config: this.config
      })
    }
    
    console.log('⚙️ Audio processing configuration updated')
    this.emit('configUpdated', this.config)
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProcessingMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioProcessingConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopRealTimeProcessing()
    
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    
    console.log('🧹 Audio processor cleaned up')
    this.emit('cleanup')
  }
}

// Export singleton instance
export const audioProcessor = new AdvancedAudioProcessor()