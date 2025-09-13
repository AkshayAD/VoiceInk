/**
 * Global app state management using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppSettings {
  theme: 'light' | 'dark'
  alwaysOnTop: boolean
  startMinimized: boolean
  launchAtLogin: boolean
  autoPaste: boolean
  autoSendEnter: boolean
  preserveClipboard: boolean
  selectedModel: string
  apiKeys: {
    openai?: string
    anthropic?: string
  }
  hotkeys: {
    toggleRecording: string
    toggleMiniRecorder: string
    pasteLastTranscription: string
  }
}

interface AppState extends AppSettings {
  isInitialized: boolean
  
  // Actions
  initialize: () => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => void
  setTheme: (theme: 'light' | 'dark') => void
  setModel: (model: string) => void
  setApiKey: (provider: 'openai' | 'anthropic', key: string) => void
  updateHotkey: (action: keyof AppSettings['hotkeys'], key: string) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      theme: 'dark',
      alwaysOnTop: false,
      startMinimized: false,
      launchAtLogin: false,
      autoPaste: true,
      autoSendEnter: false,
      preserveClipboard: false,
      selectedModel: 'base.en',
      apiKeys: {},
      hotkeys: {
        toggleRecording: 'Alt+Space',
        toggleMiniRecorder: 'Alt+Shift+R',
        pasteLastTranscription: 'Alt+Shift+V'
      },

      // Actions
      initialize: async () => {
        // Load settings from main process
        const settings = await window.electron.getSettings()
        set({ ...settings, isInitialized: true })
      },

      updateSettings: (settings) => {
        set(settings)
        // Sync with main process
        window.electron.updateSettings(settings)
      },

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
        window.electron.updateSettings({ theme })
      },

      setModel: (model) => {
        set({ selectedModel: model })
        window.electron.updateSettings({ selectedModel: model })
      },

      setApiKey: (provider, key) => {
        const apiKeys = { ...get().apiKeys, [provider]: key }
        set({ apiKeys })
        window.electron.updateSettings({ apiKeys })
      },

      updateHotkey: (action, key) => {
        const hotkeys = { ...get().hotkeys, [action]: key }
        set({ hotkeys })
        window.electron.updateSettings({ hotkeys })
      }
    }),
    {
      name: 'voiceink-settings',
      partialize: (state) => ({
        theme: state.theme,
        alwaysOnTop: state.alwaysOnTop,
        startMinimized: state.startMinimized,
        launchAtLogin: state.launchAtLogin,
        autoPaste: state.autoPaste,
        autoSendEnter: state.autoSendEnter,
        preserveClipboard: state.preserveClipboard,
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
        hotkeys: state.hotkeys
      })
    }
  )
)