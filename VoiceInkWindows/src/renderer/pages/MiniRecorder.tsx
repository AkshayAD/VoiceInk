import React, { useState, useEffect, useRef } from 'react'
import { Mic, Square, X, Maximize2, Volume2 } from 'lucide-react'
import { cn } from '../lib/utils'

export const MiniRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0 })

  useEffect(() => {
    // Check recording status
    const checkStatus = async () => {
      const status = await window.electronAPI?.audio?.isRecording()
      setIsRecording(status || false)
      
      if (status) {
        const time = await window.electronAPI?.audio?.getRecordingTime()
        setRecordingTime(time || 0)
      }
    }

    const interval = setInterval(checkStatus, 100)

    // Listen for audio levels
    window.electronAPI?.audio?.onLevel?.((level: number) => {
      setAudioLevel(level)
    })

    return () => clearInterval(interval)
  }, [])

  const handleRecord = async () => {
    if (isRecording) {
      await window.electronAPI?.audio?.stopRecording()
      const audioBuffer = await window.electronAPI?.audio?.getRecordingBuffer?.()
      if (audioBuffer) {
        await window.electronAPI?.transcription?.addToQueue(audioBuffer)
      }
    } else {
      await window.electronAPI?.audio?.startRecording()
    }
    setIsRecording(!isRecording)
  }

  const handleClose = () => {
    window.electronAPI?.window?.closeMiniRecorder()
  }

  const handleMaximize = () => {
    // Switch to main window
    window.electronAPI?.window?.closeMiniRecorder()
    window.location.href = '#/recorder'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    window.moveTo(window.screenX + deltaX, window.screenY + deltaY)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div 
      className={cn(
        "w-full h-full bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50",
        "shadow-2xl flex flex-col p-4 select-none",
        isDragging && "cursor-move"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">VoiceInk Mini</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleMaximize}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <Maximize2 className="w-3 h-3 text-gray-400" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-600 rounded transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Recording Button */}
        <button
          onClick={handleRecord}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all",
            "transform hover:scale-110 active:scale-95",
            isRecording 
              ? "bg-red-500 hover:bg-red-600 animate-pulse" 
              : "bg-indigo-500 hover:bg-indigo-600"
          )}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>

        {/* Recording Time */}
        {isRecording && (
          <div className="mt-4 text-center animate-in fade-in duration-300">
            <p className="text-2xl font-mono text-white">
              {formatTime(recordingTime)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Recording...</p>
          </div>
        )}

        {/* Audio Level Indicator */}
        <div className="w-full mt-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-gray-400" />
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-400">
          Model: base.en
        </span>
        <span className="text-xs text-gray-400">
          {isRecording ? 'Recording' : 'Ready'}
        </span>
      </div>
    </div>
  )
}