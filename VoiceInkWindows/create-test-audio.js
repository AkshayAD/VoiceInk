#!/usr/bin/env node
/**
 * Create a simple test audio file for testing transcription
 * This creates a silent WAV file as a placeholder
 */

const fs = require('fs')
const path = require('path')

function createWavHeader(dataSize, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  
  const buffer = Buffer.alloc(44)
  
  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4) // File size - 8
  buffer.write('WAVE', 8)
  
  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk size
  buffer.writeUInt16LE(1, 20) // Audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  
  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  
  return buffer
}

function createTestAudio() {
  const duration = 3 // seconds
  const sampleRate = 16000
  const numSamples = duration * sampleRate
  const dataSize = numSamples * 2 // 16-bit samples
  
  // Create header
  const header = createWavHeader(dataSize, sampleRate)
  
  // Create audio data (silence with some noise)
  const audioData = Buffer.alloc(dataSize)
  for (let i = 0; i < numSamples; i++) {
    // Add very quiet noise
    const sample = Math.floor((Math.random() - 0.5) * 100)
    audioData.writeInt16LE(sample, i * 2)
  }
  
  // Combine header and data
  const wavFile = Buffer.concat([header, audioData])
  
  // Save file
  const outputPath = path.join(__dirname, 'test-audio.wav')
  fs.writeFileSync(outputPath, wavFile)
  
  console.log(`✅ Created test audio file: ${outputPath}`)
  console.log(`   Duration: ${duration} seconds`)
  console.log(`   Sample Rate: ${sampleRate} Hz`)
  console.log(`   File Size: ${wavFile.length} bytes`)
  console.log('\n📝 Note: This is a silent audio file for testing.')
  console.log('   For real transcription testing, record actual speech.')
}

createTestAudio()