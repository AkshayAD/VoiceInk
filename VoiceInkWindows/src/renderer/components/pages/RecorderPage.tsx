import React, { useState, useEffect, useRef } from 'react'
import { Mic, Square, Play, Pause, Save, Settings, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { RecordingButton } from '../features/RecordingButton'
import { AudioLevelMeter } from '../features/AudioLevelMeter'
import { EnhancedTranscriptionDisplay } from '../features/EnhancedTranscriptionDisplay'
import { AudioWaveform } from '../features/AudioWaveform'
import { LanguageSelector } from '../ui/LanguageSelector'
import { BrowserAudioRecorder } from '../../services/browserAudioRecorder'

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
  const [audioDevices, setAudioDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto')
  const [audioData, setAudioData] = useState<number[]>([])
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  
  const audioRecorderRef = useRef<BrowserAudioRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio recorder
  useEffect(() => {
    audioRecorderRef.current = new BrowserAudioRecorder()
    
    // Set up event listeners
    audioRecorderRef.current.on('recordingStarted', () => {
      console.log('📹 Recording started event received')
    })
    
    audioRecorderRef.current.on('recordingComplete', (audioData) => {
      console.log('✅ Recording complete:', {
        duration: audioData.duration,
        size: audioData.size,
        mimeType: audioData.mimeType
      })
      // Save audio data
      saveAudioRecording(audioData)
    })
    
    audioRecorderRef.current.on('audioLevel', (level) => {
      setAudioLevel(level * 100)
      // Add to waveform data
      setAudioData(prev => {
        const newData = [...prev, level * 100]
        // Keep only last 100 samples for performance
        return newData.slice(-100)
      })
    })
    
    audioRecorderRef.current.on('error', (error) => {
      console.error('Recording error:', error)
      // TODO: Show error toast
    })
    
    // Load audio devices
    loadAudioDevices()
    
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.removeAllListeners()
      }
    }
  }, [])
  
  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording, isPaused])
  
  const loadAudioDevices = async () => {
    try {
      if (audioRecorderRef.current) {
        const devices = await audioRecorderRef.current.getAudioDevices()
        setAudioDevices(devices)
        if (devices.length > 0 && !selectedDevice) {
          setSelectedDevice(devices[0].deviceId)
        }
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        console.error('Audio recorder not initialized')
        return
      }
      
      console.log('🎤 Starting recording with device:', selectedDevice)
      
      // Start actual recording
      await audioRecorderRef.current.startRecording({
        deviceId: selectedDevice,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        mimeType: 'audio/webm'
      })
      
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      setTranscriptionSegments([])
    } catch (error) {
      console.error('Failed to start recording:', error)
      // TODO: Show error toast
    }
  }

  const handleStopRecording = async () => {
    try {
      if (!audioRecorderRef.current) {
        console.error('Audio recorder not initialized')
        return
      }
      
      console.log('🛑 Stopping recording...')
      
      // Stop actual recording
      const audioData = await audioRecorderRef.current.stopRecording()
      console.log('Recording stopped, audio data:', audioData)
      
      setIsRecording(false)
      setIsPaused(false)
      setAudioLevel(0)
    } catch (error) {
      console.error('Failed to stop recording:', error)
      // TODO: Show error toast
    }
  }

  const handlePauseResume = () => {
    try {
      if (!audioRecorderRef.current || !isRecording) return
      
      if (isPaused) {
        audioRecorderRef.current.resumeRecording()
        setIsPaused(false)
      } else {
        audioRecorderRef.current.pauseRecording()
        setIsPaused(true)
      }
    } catch (error) {
      console.error('Failed to pause/resume:', error)
    }
  }

  const handleSaveRecording = () => {
    // This will be called automatically when recording stops
    console.log('Manual save requested')
  }
  
  const saveAudioRecording = async (audioData: any) => {
    try {
      console.log('💾 Saving audio recording...')
      
      // Convert blob to array buffer
      const arrayBuffer = await audioData.blob.arrayBuffer()
      
      // Send to main process via IPC
      const result = await (window as any).electronAPI.audio.saveRecording({
        audioBuffer: arrayBuffer,
        mimeType: audioData.mimeType,
        duration: audioData.duration,
        sampleRate: audioData.sampleRate
      })
      
      console.log('Audio saved:', result)
      
      // Start transcription if saved successfully
      if (result.success && result.filePath) {
        startTranscription(result.filePath)
      }
    } catch (error) {
      console.error('Failed to save recording:', error)
    }
  }
  
  const startTranscription = async (filePath: string) => {
    try {
      console.log('🎯 Starting transcription for:', filePath)
      
      // Call Gemini transcription via IPC
      const transcriptionResult = await (window as any).electronAPI.transcription.transcribe(filePath, {
        language: 'auto',
        enableTimestamps: true,
        model: 'gemini-2.5-flash'
      })
      
      console.log('Transcription result:', transcriptionResult)
      
      // Update UI with transcription
      if (transcriptionResult.segments) {
        setTranscriptionSegments(transcriptionResult.segments)
      }
    } catch (error) {
      console.error('Transcription failed:', error)
    }
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
        <div className="flex items-center gap-4">
          <LanguageSelector
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            variant="compact"
            className="w-48"
          />
          <Button variant="outline" size="sm">
            <Settings size={16} className="mr-2" />
            Recording Settings
          </Button>
        </div>
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

            {/* Audio Visualization */}
            <div className="space-y-2">
              <div className="text-sm text-center text-muted-foreground">
                Audio Visualization
              </div>
              <AudioWaveform
                audioData={audioData}
                isRecording={isRecording && !isPaused}
                height={80}
                style="bars"
                color="#3b82f6"
              />
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
          <EnhancedTranscriptionDisplay
            result={transcriptionResult}
            segments={transcriptionSegments}
            isLive={isRecording && !isPaused}
            currentTime={recordingTime}
            onSegmentClick={(segment) => {
              console.log('Segment clicked:', segment)
              // Jump to timestamp if audio player is available
            }}
            onSpeakerClick={(speakerId) => {
              console.log('Speaker clicked:', speakerId)
              // Filter by speaker
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
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
                {audioDevices.length === 0 && (
                  <option disabled>No audio devices found</option>
                )}
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