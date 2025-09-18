import React, { useState, useEffect } from 'react'
import { Activity, Mic, FileText, Clock, TrendingUp, Download, Play, Pause } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RecordingButton } from '../components/features/RecordingButton'
import { TranscriptionDisplay } from '../components/features/TranscriptionDisplay'
import { AudioLevelMeter } from '../components/features/AudioLevelMeter'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'

interface DashboardStats {
  totalSessions: number
  recordingTime: number // in seconds
  wordsTranscribed: number
  avgDuration: number // in seconds
}

interface RecentActivity {
  id: string
  title: string
  timestamp: string
  duration: number
  wordCount: number
  status: 'completed' | 'processing' | 'error'
}

export const EnhancedDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    recordingTime: 0,
    wordsTranscribed: 0,
    avgDuration: 0
  })
  
  const [recentTranscription, setRecentTranscription] = useState<{
    text: string
    timestamp: string
    duration: number
  } | null>(null)
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [activeModel, setActiveModel] = useState<string>('base.en')

  useEffect(() => {
    // Load dashboard data
    const loadDashboardData = async () => {
      // In real implementation, this would fetch from database
      setStats({
        totalSessions: 247,
        recordingTime: 66600, // 18.5 hours
        wordsTranscribed: 42300,
        avgDuration: 272 // 4:32
      })

      setRecentActivities([
        {
          id: '1',
          title: 'Team Standup Meeting',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          duration: 900,
          wordCount: 1250,
          status: 'completed'
        },
        {
          id: '2',
          title: 'Product Design Review',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          duration: 1800,
          wordCount: 3200,
          status: 'completed'
        },
        {
          id: '3',
          title: 'Client Call Notes',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          duration: 2400,
          wordCount: 4100,
          status: 'processing'
        }
      ])
    }

    loadDashboardData()

    // Listen for recording status
    const checkRecordingStatus = async () => {
      const status = await window.electronAPI?.audio?.isRecording()
      setIsRecording(status || false)
      
      if (status) {
        const time = await window.electronAPI?.audio?.getRecordingTime()
        setRecordingTime(time || 0)
      }
    }

    const interval = setInterval(checkRecordingStatus, 100)

    // Listen for audio levels
    window.electronAPI?.audio?.onLevel?.((level: number) => {
      setAudioLevel(level)
    })

    // Listen for new transcriptions
    window.electronAPI?.transcription?.onProgress?.((progress: any) => {
      if (progress.status === 'completed' && progress.result) {
        setRecentTranscription({
          text: progress.result.text,
          timestamp: new Date().toISOString(),
          duration: progress.result.duration || 0
        })
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalSessions: prev.totalSessions + 1,
          recordingTime: prev.recordingTime + (progress.result.duration || 0),
          wordsTranscribed: prev.wordsTranscribed + (progress.result.text.split(' ').length || 0)
        }))
      }
    })

    // Get current model
    window.electronAPI?.transcription?.getCurrentModel?.().then((model: string) => {
      setActiveModel(model || 'base.en')
    })

    return () => {
      clearInterval(interval)
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Quick overview of your transcription activity
        </p>
      </div>

      {/* Stats Grid with animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                {stats.totalSessions.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+12%</span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recording Time</p>
              <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                {(stats.recordingTime / 3600).toFixed(1)}h
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+8%</span>
              </div>
            </div>
            <Mic className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Words Transcribed</p>
              <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                {(stats.wordsTranscribed / 1000).toFixed(1)}k
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-500">+15%</span>
              </div>
            </div>
            <FileText className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Duration</p>
              <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                {formatDuration(stats.avgDuration)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">per session</span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </Card>
      </div>

      {/* Live Recording Status */}
      {isRecording && (
        <Card className="p-4 bg-red-500/10 border-red-500/50 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div>
                <p className="font-semibold text-red-500">Recording in Progress</p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(recordingTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AudioLevelMeter level={audioLevel} className="w-32" />
              <Badge variant="destructive">{activeModel}</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Record Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <h2 className="text-xl font-semibold mb-4">Quick Record</h2>
          <div className="flex flex-col items-center space-y-4">
            <RecordingButton className="scale-125 hover:scale-150 transition-transform" />
            <p className="text-sm text-muted-foreground text-center">
              {isRecording 
                ? `Recording... ${formatDuration(recordingTime)}`
                : 'Click to start a new recording session'
              }
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Download className="w-3 h-3 mr-1" />
                Export Last
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.electronAPI?.window?.openMiniRecorder()}
              >
                Mini Mode
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <h2 className="text-xl font-semibold mb-4">Recent Transcription</h2>
          {recentTranscription ? (
            <TranscriptionDisplay 
              text={recentTranscription.text}
              timestamp={recentTranscription.timestamp}
              duration={recentTranscription.duration}
            />
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent transcriptions. Start recording to see results here.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Button size="sm" variant="ghost">View All</Button>
        </div>
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div 
              key={activity.id} 
              className={cn(
                "flex items-center justify-between p-3 bg-muted/50 rounded-lg",
                "hover:bg-muted transition-colors cursor-pointer",
                "animate-in slide-in-from-left duration-300"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                {activity.status === 'processing' ? (
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(activity.duration)}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {activity.wordCount.toLocaleString()} words
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={activity.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {activity.status}
                </Badge>
                <Button size="sm" variant="ghost">
                  {activity.status === 'processing' ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}