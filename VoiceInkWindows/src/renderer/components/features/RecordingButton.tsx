import React, { useState, useEffect } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface RecordingButtonProps {
  isRecording?: boolean
  onStartRecording?: () => void
  onStopRecording?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isRecording = false,
  onStartRecording,
  onStopRecording,
  size = 'md',
  className,
  disabled = false
}) => {
  const [audioLevel, setAudioLevel] = useState(0)

  // Simulate audio level for visual feedback
  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0)
      return
    }

    const interval = setInterval(() => {
      // Simulate varying audio levels
      setAudioLevel(Math.random() * 100)
    }, 100)

    return () => clearInterval(interval)
  }, [isRecording])

  const handleClick = () => {
    if (disabled) return
    
    if (isRecording) {
      onStopRecording?.()
    } else {
      onStartRecording?.()
    }
  }

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Pulse Animation Ring */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-25 animate-ping" />
      )}
      
      {/* Audio Level Ring */}
      {isRecording && (
        <div 
          className="absolute inset-0 rounded-full border-4 border-red-500 transition-all duration-75"
          style={{
            borderWidth: `${2 + (audioLevel / 100) * 4}px`,
            opacity: 0.3 + (audioLevel / 100) * 0.4
          }}
        />
      )}

      {/* Main Button */}
      <Button
        size="icon"
        variant={isRecording ? "destructive" : "default"}
        className={cn(
          sizeClasses[size],
          "rounded-full transition-all duration-200 hover:scale-105 active:scale-95",
          isRecording && "bg-red-600 hover:bg-red-700",
          disabled && "opacity-50 cursor-not-allowed hover:scale-100"
        )}
        onClick={handleClick}
        disabled={disabled}
      >
        {isRecording ? (
          <Square size={iconSizes[size]} fill="currentColor" />
        ) : (
          <Mic size={iconSizes[size]} />
        )}
      </Button>

      {/* Status Text */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <span className={cn(
          "text-xs font-medium",
          isRecording ? "text-red-500" : "text-muted-foreground"
        )}>
          {isRecording ? "Recording..." : "Press to record"}
        </span>
      </div>
    </div>
  )
}