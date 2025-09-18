import React, { useState, useEffect } from 'react'
import { Mic, Square, Pause, Play, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface EnhancedRecordingButtonProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTime?: boolean
  onRecordingStart?: () => void
  onRecordingStop?: (duration: number) => void
}

export const EnhancedRecordingButton: React.FC<EnhancedRecordingButtonProps> = ({
  className,
  size = 'lg',
  showTime = true,
  onRecordingStart,
  onRecordingStop
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [pulseAnimation, setPulseAnimation] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isPaused])

  useEffect(() => {
    // Check current recording status
    const checkStatus = async () => {
      const status = await window.electronAPI?.audio?.isRecording()
      if (status !== isRecording) {
        setIsRecording(status || false)
        if (status) {
          const time = await window.electronAPI?.audio?.getRecordingTime()
          setRecordingTime(Math.floor(time || 0))
        }
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 500)
    return () => clearInterval(interval)
  }, [isRecording])

  const handleClick = async () => {
    if (isProcessing) return

    setPulseAnimation(true)
    setTimeout(() => setPulseAnimation(false), 300)

    if (isRecording) {
      setIsProcessing(true)
      
      // Stop recording
      await window.electronAPI?.audio?.stopRecording()
      
      // Get the recording buffer and transcribe
      const result = await window.electronAPI?.workflow?.recordAndTranscribe?.({
        autoTranscribe: true
      })
      
      setIsRecording(false)
      setIsProcessing(false)
      onRecordingStop?.(recordingTime)
      setRecordingTime(0)
    } else {
      // Start recording
      await window.electronAPI?.audio?.startRecording()
      setIsRecording(true)
      setRecordingTime(0)
      onRecordingStart?.()
    }
  }

  const handlePauseResume = async () => {
    if (!isRecording) return

    if (isPaused) {
      await window.electronAPI?.audio?.resumeRecording()
      setIsPaused(false)
    } else {
      await window.electronAPI?.audio?.pauseRecording()
      setIsPaused(true)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
    xl: 32
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative">
        {/* Pulse rings */}
        {isRecording && !isPaused && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" 
                 style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" 
                 style={{ animationDelay: '1s' }} />
          </>
        )}
        
        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={cn(
            sizeClasses[size],
            'rounded-full flex items-center justify-center relative',
            'transition-all duration-300 transform',
            'hover:scale-110 active:scale-95',
            pulseAnimation && 'animate-pulse',
            isProcessing && 'opacity-50 cursor-wait',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50'
              : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/50',
            'shadow-lg hover:shadow-xl'
          )}
        >
          {isProcessing ? (
            <Loader2 className="text-white animate-spin" size={iconSizes[size]} />
          ) : isRecording ? (
            <Square className="text-white" size={iconSizes[size]} />
          ) : (
            <Mic className="text-white" size={iconSizes[size]} />
          )}
        </button>

        {/* Pause/Resume button */}
        {isRecording && !isProcessing && size !== 'sm' && (
          <button
            onClick={handlePauseResume}
            className={cn(
              'absolute -bottom-2 -right-2 w-8 h-8 rounded-full',
              'bg-gray-800 hover:bg-gray-700 flex items-center justify-center',
              'transition-all hover:scale-110',
              'animate-in fade-in slide-in-from-bottom duration-300'
            )}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-white" />
            ) : (
              <Pause className="w-4 h-4 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Recording time */}
      {showTime && isRecording && (
        <div className="text-center animate-in fade-in slide-in-from-bottom duration-300">
          <p className={cn(
            'font-mono font-bold',
            isPaused && 'opacity-50',
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'
          )}>
            {formatTime(recordingTime)}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPaused ? 'Paused' : 'Recording...'}
          </p>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Processing transcription...
        </p>
      )}
    </div>
  )
}