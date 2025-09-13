/**
 * Main App Component
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from './stores/appStore'
import { useRecordingStore } from './stores/recordingStore'

// Layout components
import { MainLayout } from './components/layout/MainLayout'
import { TitleBar } from './components/layout/TitleBar'

// Pages
import { Dashboard } from './pages/Dashboard'
import { TranscriptionHistory } from './pages/TranscriptionHistory'
import { Settings } from './pages/Settings'
import { AudioModels } from './pages/AudioModels'
import { PowerMode } from './pages/PowerMode'
import { MiniRecorder } from './pages/MiniRecorder'

export default function App() {
  const { theme, initialize } = useStore()
  const { setupListeners } = useRecordingStore()

  useEffect(() => {
    // Initialize app
    initialize()
    
    // Setup IPC listeners
    setupListeners()

    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Check if we're in mini recorder mode
  const isMiniRecorder = window.location.hash === '#/mini-recorder'

  if (isMiniRecorder) {
    return <MiniRecorder />
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Custom title bar */}
      <TitleBar />
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <MainLayout>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history" element={<TranscriptionHistory />} />
              <Route path="/models" element={<AudioModels />} />
              <Route path="/power-mode" element={<PowerMode />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </AnimatePresence>
        </MainLayout>
      </div>
    </div>
  )
}