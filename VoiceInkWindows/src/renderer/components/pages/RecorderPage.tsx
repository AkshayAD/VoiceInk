import React, { useState, useEffect } from 'react'
import { Mic, Square, Play, Pause, Save, Settings, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { RecordingButton } from '../features/RecordingButton'
import { AudioLevelMeter } from '../features/AudioLevelMeter'
import { TranscriptionDisplay } from '../features/TranscriptionDisplay'

interface RecorderPageProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

export const RecorderPage: React.FC<RecorderPageProps> = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>([])

  useEffect(() => {
    if (!isRecording || isPaused) return

    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
      setAudioLevel(Math.random() * 100)
      
      // Simulate live transcription updates
      if (Math.random() < 0.1) { // 10% chance per second
        const newSegment = {
          id: Date.now().toString(),
          text: `New transcription segment at ${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`,
          startTime: recordingTime,
          endTime: recordingTime + 3,
          confidence: 0.8 + Math.random() * 0.2,
          isFinal: false
        }
        setTranscriptionSegments(prev => [...prev, newSegment])
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, isPaused, recordingTime])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setIsPaused(false)
    setRecordingTime(0)
    setTranscriptionSegments([])
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setIsPaused(false)
    setAudioLevel(0)
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
  }

  const handleSaveRecording = () => {
    // TODO: Implement save functionality
    console.log('Saving recording...')
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Recorder</h1>
          <p className="text-muted-foreground mt-1">
            Professional voice recording with real-time AI transcription
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings size={16} className="mr-2" />
          Recording Settings
        </Button>
      </div>

      {/* Recording Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recording Control */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-center">Recording Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Recording Button */}
            <div className="flex justify-center">
              <RecordingButton
                isRecording={isRecording && !isPaused}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                size="lg"
              />
            </div>

            {/* Recording Info */}
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </div>
                <div className="flex justify-center gap-2">
                  {isRecording && (
                    <Badge variant={isPaused ? "warning" : "success"}>
                      {isPaused ? "Paused" : "Recording"}
                    </Badge>
                  )}
                  {!isRecording && recordingTime > 0 && (
                    <Badge variant="secondary">
                      Stopped
                    </Badge>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePauseResume}
                  disabled={!isRecording}
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveRecording}
                  disabled={recordingTime === 0}
                >
                  <Save size={16} className="mr-1" />
                  Save
                </Button>
              </div>
            </div>

            {/* Audio Level Meter */}
            <div className="space-y-2">
              <div className="text-sm text-center text-muted-foreground">
                Audio Level
              </div>
              <AudioLevelMeter
                isActive={isRecording && !isPaused}
                level={audioLevel}
                showValue={true}
                className="justify-center"
              />
            </div>
          </CardContent>
        </Card>

        {/* Live Transcription */}
        <div className="lg:col-span-2 h-96 lg:h-auto">
          <TranscriptionDisplay
            segments={transcriptionSegments}
            isLive={isRecording && !isPaused}
            currentTime={recordingTime}
            showTimestamps={true}
            showConfidence={true}
            onCopy={(text) => {
              navigator.clipboard.writeText(text)
              // TODO: Show success toast
            }}
            onEdit={(segmentId, newText) => {
              setTranscriptionSegments(prev =>
                prev.map(seg =>
                  seg.id === segmentId ? { ...seg, text: newText } : seg
                )
              )
            }}
          />
        </div>
      </div>

      {/* Advanced Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Recording Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Audio Device</label>
              <select className="w-full p-2 border rounded-md">
                <option>Default Microphone</option>
                <option>USB Microphone</option>
                <option>Headset Microphone</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <select className="w-full p-2 border rounded-md">
                <option>High (48kHz, 24-bit)</option>
                <option>Standard (44.1kHz, 16-bit)</option>
                <option>Telephone (8kHz, 16-bit)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Auto-save Location</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 p-2 border rounded-md" 
                  value="~/Documents/VoiceInk/"
                  readOnly
                />
                <Button size="sm" variant="outline">
                  Browse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Model Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Transcription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <select className="w-full p-2 border rounded-md">
                <option>Whisper Base (74MB) - Fast</option>
                <option>Whisper Small (244MB) - Balanced</option>
                <option>Whisper Medium (769MB) - Accurate</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <select className="w-full p-2 border rounded-md">
                <option>Auto-detect</option>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Real-time transcription</span>
              <input type="checkbox" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Punctuation enhancement</span>
              <input type="checkbox" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}