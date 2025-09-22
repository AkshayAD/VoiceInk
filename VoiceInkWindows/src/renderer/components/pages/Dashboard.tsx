import React, { useState, useEffect } from 'react'
import { Mic, Clock, FileText, Zap, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { RecordingButton } from '../features/RecordingButton'
import { AudioLevelMeter } from '../features/AudioLevelMeter'
import { TranscriptionDisplay } from '../features/TranscriptionDisplay'
import { cn } from '../../lib/utils'

interface DashboardProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

interface UsageStats {
  totalRecordings: number
  totalTime: number
  wordsTranscribed: number
  accuracy: number
}

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [usageStats] = useState<UsageStats>({
    totalRecordings: 157,
    totalTime: 14520, // seconds
    wordsTranscribed: 45623,
    accuracy: 94.2
  })

  // Simulate recording timer
  useEffect(() => {
    if (!isRecording) return

    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1)
      setAudioLevel(Math.random() * 80 + 20) // Simulate audio input
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  const handleStartRecording = () => {
    setIsRecording(true)
    setRecordingTime(0)
    // TODO: Call actual recording API
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setAudioLevel(0)
    // TODO: Call actual stop recording API
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

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your voice transcription activity and performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText size={16} />
              Total Recordings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalRecordings}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp size={12} className="inline mr-1" />
              +12 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock size={16} />
              Total Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(usageStats.totalTime)}</div>
            <p className="text-xs text-muted-foreground">
              4.2 hours this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity size={16} />
              Words Transcribed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.wordsTranscribed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              1,234 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap size={16} />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.accuracy}%</div>
            <p className="text-xs text-muted-foreground">
              <Badge variant="success" className="text-xs">
                Excellent
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Recording Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic size={20} />
              Quick Record
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* Recording Button */}
            <div className="flex justify-center">
              <RecordingButton
                isRecording={isRecording}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                size="lg"
              />
            </div>

            {/* Recording Info */}
            <div className="space-y-4">
              {isRecording && (
                <div className="space-y-2">
                  <div className="text-lg font-mono font-bold text-red-500">
                    {formatTime(recordingTime)}
                  </div>
                  <AudioLevelMeter
                    isActive={isRecording}
                    level={audioLevel}
                    className="justify-center"
                  />
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.('recorder')}
                >
                  Advanced Recorder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.('settings')}
                >
                  Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Transcription */}
        <div className="h-96">
          <TranscriptionDisplay
            isLive={isRecording}
            segments={[
              // Mock data for demonstration
              {
                id: '1',
                text: 'Welcome to VoiceInk, your AI-powered voice transcription assistant.',
                startTime: 0,
                endTime: 3,
                confidence: 0.95,
                isFinal: true
              },
              {
                id: '2', 
                text: 'This is a demonstration of real-time transcription capabilities.',
                startTime: 3,
                endTime: 6,
                confidence: 0.89,
                isFinal: true
              }
            ]}
            showTimestamps={true}
            showConfidence={true}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { time: '2 minutes ago', action: 'Transcribed meeting notes', duration: '15:32' },
              { time: '1 hour ago', action: 'Voice memo recorded', duration: '3:45' },
              { time: '3 hours ago', action: 'Dictated email draft', duration: '8:21' },
              { time: 'Yesterday', action: 'Lecture transcription', duration: '45:18' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <Badge variant="outline">
                  {item.duration}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}