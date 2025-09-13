/**
 * Simple Preload Script
 * Minimal version for Steps 1-5
 */

import { contextBridge } from 'electron'

// Expose simple APIs for testing
const electronAPI = {
  // Test function for verification
  sayHello: () => {
    console.log('Hello from preload!')
    
    // Test native modules
    try {
      const audio = require('../../build/Release/audiorecorder.node')
      const whisper = require('../../build/Release/whisperbinding.node')
      
      console.log('Native modules loaded successfully!')
      
      // Quick test
      const recorder = new audio.AudioRecorder()
      const devices = recorder.getDevices()
      
      const transcriber = new whisper.Whisper()
      transcriber.loadModel('test')
      
      return `Hello World! Native modules working: ${devices.length} audio devices, whisper model loaded: ${transcriber.isLoaded()}`
    } catch (err) {
      console.log('Native modules error:', err.message)
      return 'Hello World from Electron! (Native modules not loaded)'
    }
  },
  
  // Platform info
  platform: process.platform,
  version: process.versions.electron
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type definitions for TypeScript
export type ElectronAPI = typeof electronAPI

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}