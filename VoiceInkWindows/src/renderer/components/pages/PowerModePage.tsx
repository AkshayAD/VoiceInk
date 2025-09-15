import React, { useState } from 'react'
import { 
  Zap, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Monitor, 
  Keyboard, 
  Target,
  Settings,
  Play,
  Square,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'

interface PowerProfile {
  id: string
  name: string
  description: string
  isActive: boolean
  triggers: {
    applications: string[]
    urlPatterns: string[]
    windowTitles: string[]
  }
  actions: {
    autoStart: boolean
    autoTranscribe: boolean
    autoInsert: boolean
    targetElement?: string
    customPrompt?: string
    modelOverride?: string
  }
  statistics: {
    timesTriggered: number
    totalTime: number
    lastUsed?: Date
  }
}

interface PowerModePageProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

export const PowerModePage: React.FC<PowerModePageProps> = () => {
  const [profiles, setProfiles] = useState<PowerProfile[]>([
    {
      id: '1',
      name: 'Meeting Assistant',
      description: 'Automatically transcribe and enhance meeting notes in video conferencing apps',
      isActive: true,
      triggers: {
        applications: ['zoom.exe', 'teams.exe', 'meet.google.com'],
        urlPatterns: ['*zoom.us*', '*teams.microsoft.com*', '*meet.google.com*'],
        windowTitles: ['*Meeting*', '*Zoom*', '*Teams*']
      },
      actions: {
        autoStart: true,
        autoTranscribe: true,
        autoInsert: false,
        customPrompt: 'Format this as professional meeting notes with key points and action items',
        modelOverride: 'whisper-small'
      },
      statistics: {
        timesTriggered: 42,
        totalTime: 14520,
        lastUsed: new Date('2024-01-15T14:30:00')
      }
    },
    {
      id: '2',
      name: 'Email Composer',
      description: 'Voice-to-text for email composition with professional formatting',
      isActive: true,
      triggers: {
        applications: ['outlook.exe', 'thunderbird.exe'],
        urlPatterns: ['*gmail.com*', '*outlook.com*', '*mail.yahoo.com*'],
        windowTitles: ['*Compose*', '*New Message*', '*Email*']
      },
      actions: {
        autoStart: false,
        autoTranscribe: true,
        autoInsert: true,
        targetElement: 'textarea[role="textbox"]',
        customPrompt: 'Format as professional email with proper punctuation and structure'
      },
      statistics: {
        timesTriggered: 89,
        totalTime: 3420,
        lastUsed: new Date('2024-01-14T16:45:00')
      }
    },
    {
      id: '3',
      name: 'Code Documentation',
      description: 'Generate code comments and documentation from voice descriptions',
      isActive: false,
      triggers: {
        applications: ['code.exe', 'devenv.exe', 'idea64.exe'],
        urlPatterns: ['*github.com*', '*gitlab.com*'],
        windowTitles: ['*Visual Studio*', '*IntelliJ*', '*WebStorm*']
      },
      actions: {
        autoStart: false,
        autoTranscribe: true,
        autoInsert: true,
        customPrompt: 'Convert to technical documentation with proper formatting and code syntax'
      },
      statistics: {
        timesTriggered: 23,
        totalTime: 1890,
        lastUsed: new Date('2024-01-12T10:15:00')
      }
    }
  ])

  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleToggleProfile = (profileId: string) => {
    setProfiles(prev => prev.map(profile => 
      profile.id === profileId 
        ? { ...profile, isActive: !profile.isActive }
        : profile
    ))
  }

  const handleDeleteProfile = (profileId: string) => {
    setProfiles(prev => prev.filter(profile => profile.id !== profileId))
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const activeProfiles = profiles.filter(p => p.isActive)
  const totalTriggers = profiles.reduce((acc, p) => acc + p.statistics.timesTriggered, 0)

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Power Mode
          </h1>
          <p className="text-muted-foreground mt-1">
            Context-aware transcription that adapts to your applications and workflows
          </p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} className="mr-1" />
          Create Profile
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProfiles.length}</div>
            <p className="text-xs text-muted-foreground">
              of {profiles.length} total profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTriggers}</div>
            <p className="text-xs text-muted-foreground">
              automatic activations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(profiles.reduce((acc, p) => acc + p.statistics.totalTime, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              estimated productivity gain
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Power Mode Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <Target className="mx-auto text-blue-500" size={32} />
              <h3 className="font-semibold">Context Detection</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detects when you're in specific applications or websites
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Zap className="mx-auto text-yellow-500" size={32} />
              <h3 className="font-semibold">Smart Activation</h3>
              <p className="text-sm text-muted-foreground">
                Triggers recording and transcription based on your configured rules
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Settings className="mx-auto text-green-500" size={32} />
              <h3 className="font-semibold">Custom Actions</h3>
              <p className="text-sm text-muted-foreground">
                Automatically formats and inserts text where you need it
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Power Profiles</h2>
          {activeProfiles.length > 0 && (
            <Badge variant="success">
              {activeProfiles.length} Active
            </Badge>
          )}
        </div>

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Zap size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No profiles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Power Mode profile to get started with context-aware transcription
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus size={16} className="mr-1" />
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className={cn(
                "transition-all",
                profile.isActive && "ring-2 ring-yellow-500"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="flex items-center gap-2">
                        {profile.name}
                        {profile.isActive && (
                          <Badge variant="success">Active</Badge>
                        )}
                      </CardTitle>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleProfile(profile.id)}
                      >
                        {profile.isActive ? <Square size={16} /> : <Play size={16} />}
                        {profile.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProfile(profile.id)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {profile.description}
                  </p>

                  {/* Triggers */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Triggers</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.triggers.applications.map(app => (
                        <Badge key={app} variant="outline" className="text-xs">
                          <Monitor size={12} className="mr-1" />
                          {app}
                        </Badge>
                      ))}
                      {profile.triggers.urlPatterns.map(url => (
                        <Badge key={url} variant="outline" className="text-xs">
                          <Globe size={12} className="mr-1" />
                          {url}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.actions.autoStart && (
                        <Badge variant="secondary" className="text-xs">Auto-start recording</Badge>
                      )}
                      {profile.actions.autoTranscribe && (
                        <Badge variant="secondary" className="text-xs">Auto-transcribe</Badge>
                      )}
                      {profile.actions.autoInsert && (
                        <Badge variant="secondary" className="text-xs">Auto-insert text</Badge>
                      )}
                      {profile.actions.modelOverride && (
                        <Badge variant="secondary" className="text-xs">
                          Model: {profile.actions.modelOverride}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Triggered {profile.statistics.timesTriggered} times</span>
                      <span>Total time: {formatTime(profile.statistics.totalTime)}</span>
                      {profile.statistics.lastUsed && (
                        <span>Last used: {formatDate(profile.statistics.lastUsed)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={20} />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Privacy & Security Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Power Mode monitors application activity to provide context-aware features. 
                All processing happens locally on your device. No application data is sent to external servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}