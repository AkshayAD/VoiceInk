/**
 * Recording state management
 */

import { create } from 'zustand'
import toast from 'react-hot-toast'

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  transcriptionText: string
  isTranscribing: boolean
  error: string | null
  
  // Recording history
  recentTranscriptions: Transcription[]
  
  // Actions
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  setAudioLevel: (level: number) => void
  setTranscriptionText: (text: string) => void
  addTranscription: (transcription: Transcription) => void
  clearError: () => void
  setupListeners: () => void
}

export interface Transcription {
  id: string
  text: string
  originalText?: string
  duration: number
  timestamp: Date
  applicationName?: string
  enhanced?: boolean
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  // Initial state
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioLevel: 0,
  transcriptionText: '',
  isTranscribing: false,
  error: null,
  recentTranscriptions: [],

  // Actions
  startRecording: async () => {
    try {
      set({ isRecording: true, error: null, duration: 0 })
      await window.electron.startRecording()
      
      // Start duration timer
      const timer = setInterval(() => {
        if (!get().isRecording) {
          clearInterval(timer)
        } else if (!get().isPaused) {
          set(state => ({ duration: state.duration + 0.1 }))
        }
      }, 100)
    } catch (err: any) {
      set({ isRecording: false, error: err.message })
      toast.error('Failed to start recording')
    }
  },

  stopRecording: async () => {
    try {
      set({ isRecording: false, isTranscribing: true })
      const result = await window.electron.stopRecording()
      
      if (result) {
        set({ 
          transcriptionText: result.text,
          isTranscribing: false
        })
        
        // Add to history
        get().addTranscription({
          id: crypto.randomUUID(),
          text: result.text,
          duration: get().duration,
          timestamp: new Date()
        })
        
        toast.success('Transcription complete!')
      }
    } catch (err: any) {
      set({ 
        isRecording: false, 
        isTranscribing: false,
        error: err.message 
      })
      toast.error('Transcription failed')
    }
  },

  pauseRecording: () => {
    set({ isPaused: true })
    window.electron.pauseRecording()
  },

  resumeRecording: () => {
    set({ isPaused: false })
    window.electron.resumeRecording()
  },

  setAudioLevel: (level) => {
    set({ audioLevel: level })
  },

  setTranscriptionText: (text) => {
    set({ transcriptionText: text })
  },

  addTranscription: (transcription) => {
    set(state => ({
      recentTranscriptions: [
        transcription,
        ...state.recentTranscriptions.slice(0, 9) // Keep last 10
      ]
    }))
  },

  clearError: () => {
    set({ error: null })
  },

  setupListeners: () => {
    // Listen for IPC events from main process
    window.electron.onRecordingStarted(() => {
      set({ isRecording: true, duration: 0 })
    })

    window.electron.onRecordingStopped(() => {
      set({ isRecording: false })
    })

    window.electron.onTranscriptionComplete((result: any) => {
      set({ 
        transcriptionText: result.text,
        isTranscribing: false
      })
      
      get().addTranscription({
        id: crypto.randomUUID(),
        text: result.text,
        duration: result.duration || get().duration,
        timestamp: new Date()
      })
    })

    window.electron.onAudioLevel((level: number) => {
      set({ audioLevel: level })
    })

    window.electron.onError((error: string) => {
      set({ error, isRecording: false, isTranscribing: false })
      toast.error(error)
    })
  }
}))