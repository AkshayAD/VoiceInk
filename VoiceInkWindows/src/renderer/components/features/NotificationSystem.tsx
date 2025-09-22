import React, { useState, useEffect } from 'react'
import { toast, ToastContainer, ToastPosition } from 'react-toastify'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import 'react-toastify/dist/ReactToastify.css'

interface NotificationPreferences {
  position: ToastPosition
  autoClose: number
  hideProgressBar: boolean
  pauseOnHover: boolean
  enableSounds: boolean
  showForRecording: boolean
  showForTranscription: boolean
  showForErrors: boolean
  showForUpdates: boolean
}

const defaultPreferences: NotificationPreferences = {
  position: 'bottom-right',
  autoClose: 5000,
  hideProgressBar: false,
  pauseOnHover: true,
  enableSounds: true,
  showForRecording: true,
  showForTranscription: true,
  showForErrors: true,
  showForUpdates: true
}

export const NotificationSystem: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)

  useEffect(() => {
    // Load preferences
    loadPreferences()

    // Listen for notification requests
    window.electronAPI?.notifications?.onShow?.((notification: any) => {
      showNotification(notification)
    })

    // Listen for system events
    window.electronAPI?.audio?.onLevel?.((level: number) => {
      if (level > 0.8 && preferences.showForRecording) {
        toast.warn('Audio level is very high!', {
          toastId: 'high-audio-level',
          autoClose: 2000
        })
      }
    })

    window.electronAPI?.transcription?.onProgress?.((progress: any) => {
      if (progress.status === 'completed' && preferences.showForTranscription) {
        toast.success('Transcription completed!', {
          icon: <CheckCircle className="w-5 h-5" />
        })
      }
    })

    return () => {
      // Cleanup listeners
    }
  }, [preferences])

  const loadPreferences = async () => {
    try {
      const saved = await window.electronAPI?.settings?.get('notificationPreferences')
      if (saved) {
        setPreferences({ ...defaultPreferences, ...saved })
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  const showNotification = (notification: { 
    title: string
    body: string
    type?: 'success' | 'error' | 'warning' | 'info'
    persistent?: boolean
  }) => {
    const options = {
      autoClose: notification.persistent ? false : preferences.autoClose,
      hideProgressBar: preferences.hideProgressBar,
      pauseOnHover: preferences.pauseOnHover,
      position: preferences.position
    }

    switch (notification.type) {
      case 'success':
        toast.success(notification.body, {
          ...options,
          icon: <CheckCircle className="w-5 h-5" />
        })
        break
      case 'error':
        if (preferences.showForErrors) {
          toast.error(notification.body, {
            ...options,
            icon: <X className="w-5 h-5" />
          })
        }
        break
      case 'warning':
        toast.warn(notification.body, {
          ...options,
          icon: <AlertTriangle className="w-5 h-5" />
        })
        break
      case 'info':
      default:
        toast.info(notification.body, {
          ...options,
          icon: <Info className="w-5 h-5" />
        })
        break
    }

    // Play sound if enabled
    if (preferences.enableSounds) {
      playNotificationSound(notification.type || 'info')
    }
  }

  const playNotificationSound = (type: string) => {
    // Create audio context for notification sounds
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500
      }

      oscillator.frequency.setValueAtTime(frequencies[type as keyof typeof frequencies] || 500, audioContext.currentTime)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  return (
    <ToastContainer
      position={preferences.position}
      autoClose={preferences.autoClose}
      hideProgressBar={preferences.hideProgressBar}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover={preferences.pauseOnHover}
      theme="dark"
      className="!z-[9999]"
    />
  )
}

// Export notification functions for use in other components
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warn(message),
  info: (message: string) => toast.info(message)
}