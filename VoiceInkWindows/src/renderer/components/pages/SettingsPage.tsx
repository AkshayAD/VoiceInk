import React, { useState } from 'react'
import { 
  Settings, 
  Mic, 
  Keyboard, 
  Globe, 
  Folder, 
  Shield, 
  Palette, 
  Volume2,
  Save,
  RotateCcw,
  Bell,
  Zap,
  Download
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'

interface SettingsPageProps {
  currentPage?: string
  onPageChange?: (page: string) => void
}

interface SettingsData {
  // Audio Settings
  inputDevice: string
  outputDevice: string
  sampleRate: string
  bitDepth: string
  autoGainControl: boolean
  noiseReduction: boolean
  
  // Transcription Settings
  defaultModel: string
  defaultLanguage: string
  realTimeTranscription: boolean
  punctuationEnhancement: boolean
  confidenceThreshold: number
  
  // Hotkeys
  recordingHotkey: string
  pauseHotkey: string
  stopHotkey: string
  globalHotkeys: boolean
  
  // Storage & Files
  saveLocation: string
  autoSave: boolean
  fileFormat: string
  compressionLevel: string
  retentionDays: number
  
  // Interface
  theme: string
  fontSize: string
  showNotifications: boolean
  minimizeToTray: boolean
  autoStart: boolean
  
  // Privacy & Security
  localProcessing: boolean
  cloudBackup: boolean
  encryptFiles: boolean
  anonymousUsage: boolean
}

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [activeTab, setActiveTab] = useState('audio')
  const [hasChanges, setHasChanges] = useState(false)
  
  const [settings, setSettings] = useState<SettingsData>({
    // Audio Settings
    inputDevice: 'default',
    outputDevice: 'default',
    sampleRate: '44100',
    bitDepth: '16',
    autoGainControl: true,
    noiseReduction: true,
    
    // Transcription Settings
    defaultModel: 'whisper-base',
    defaultLanguage: 'auto',
    realTimeTranscription: true,
    punctuationEnhancement: true,
    confidenceThreshold: 0.8,
    
    // Hotkeys
    recordingHotkey: 'Ctrl+Shift+R',
    pauseHotkey: 'Ctrl+Shift+P',
    stopHotkey: 'Ctrl+Shift+S',
    globalHotkeys: true,
    
    // Storage & Files
    saveLocation: '~/Documents/VoiceInk',
    autoSave: true,
    fileFormat: 'wav',
    compressionLevel: 'medium',
    retentionDays: 30,
    
    // Interface
    theme: 'system',
    fontSize: 'medium',
    showNotifications: true,
    minimizeToTray: true,
    autoStart: false,
    
    // Privacy & Security
    localProcessing: true,
    cloudBackup: false,
    encryptFiles: true,
    anonymousUsage: true
  })

  const updateSetting = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    // TODO: Save settings to storage
    console.log('Saving settings:', settings)
    setHasChanges(false)
  }

  const handleReset = () => {
    // TODO: Reset to default settings
    setHasChanges(false)
  }

  const tabs = [
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'transcription', label: 'AI & Transcription', icon: Zap },
    { id: 'hotkeys', label: 'Hotkeys', icon: Keyboard },
    { id: 'storage', label: 'Storage', icon: Folder },
    { id: 'interface', label: 'Interface', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'audio':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audio Devices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Input Device (Microphone)</label>
                  <select 
                    value={settings.inputDevice}
                    onChange={(e) => updateSetting('inputDevice', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="default">Default System Microphone</option>
                    <option value="usb-mic">USB Microphone</option>
                    <option value="headset">Headset Microphone</option>
                    <option value="built-in">Built-in Microphone</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Device (Speakers)</label>
                  <select 
                    value={settings.outputDevice}
                    onChange={(e) => updateSetting('outputDevice', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="default">Default System Speakers</option>
                    <option value="headphones">Headphones</option>
                    <option value="speakers">External Speakers</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audio Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sample Rate</label>
                    <select 
                      value={settings.sampleRate}
                      onChange={(e) => updateSetting('sampleRate', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="8000">8 kHz (Telephone)</option>
                      <option value="16000">16 kHz (Voice)</option>
                      <option value="44100">44.1 kHz (CD Quality)</option>
                      <option value="48000">48 kHz (Professional)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bit Depth</label>
                    <select 
                      value={settings.bitDepth}
                      onChange={(e) => updateSetting('bitDepth', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="16">16-bit</option>
                      <option value="24">24-bit</option>
                      <option value="32">32-bit</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.autoGainControl}
                      onChange={(e) => updateSetting('autoGainControl', e.target.checked)}
                    />
                    <span className="text-sm">Automatic Gain Control</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.noiseReduction}
                      onChange={(e) => updateSetting('noiseReduction', e.target.checked)}
                    />
                    <span className="text-sm">Noise Reduction</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'transcription':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Model</label>
                  <select 
                    value={settings.defaultModel}
                    onChange={(e) => updateSetting('defaultModel', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="whisper-tiny">Whisper Tiny (Fast)</option>
                    <option value="whisper-base">Whisper Base (Balanced)</option>
                    <option value="whisper-small">Whisper Small (Accurate)</option>
                    <option value="whisper-medium">Whisper Medium (Professional)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Language</label>
                  <select 
                    value={settings.defaultLanguage}
                    onChange={(e) => updateSetting('defaultLanguage', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transcription Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Real-time transcription</span>
                  <input
                    type="checkbox"
                    checked={settings.realTimeTranscription}
                    onChange={(e) => updateSetting('realTimeTranscription', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm">Punctuation enhancement</span>
                  <input
                    type="checkbox"
                    checked={settings.punctuationEnhancement}
                    onChange={(e) => updateSetting('punctuationEnhancement', e.target.checked)}
                  />
                </label>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={settings.confidenceThreshold}
                    onChange={(e) => updateSetting('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'hotkeys':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Hotkeys</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Enable global hotkeys</span>
                  <input
                    type="checkbox"
                    checked={settings.globalHotkeys}
                    onChange={(e) => updateSetting('globalHotkeys', e.target.checked)}
                  />
                </label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Start/Stop Recording</span>
                    <Input 
                      value={settings.recordingHotkey}
                      onChange={(e) => updateSetting('recordingHotkey', e.target.value)}
                      className="w-32 text-center"
                      placeholder="Set hotkey"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pause/Resume</span>
                    <Input 
                      value={settings.pauseHotkey}
                      onChange={(e) => updateSetting('pauseHotkey', e.target.value)}
                      className="w-32 text-center"
                      placeholder="Set hotkey"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Stop Recording</span>
                    <Input 
                      value={settings.stopHotkey}
                      onChange={(e) => updateSetting('stopHotkey', e.target.value)}
                      className="w-32 text-center"
                      placeholder="Set hotkey"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'storage':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>File Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Save Location</label>
                  <div className="flex gap-2">
                    <Input 
                      value={settings.saveLocation}
                      onChange={(e) => updateSetting('saveLocation', e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline">Browse</Button>
                  </div>
                </div>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm">Auto-save recordings</span>
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => updateSetting('autoSave', e.target.checked)}
                  />
                </label>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Format</label>
                  <select 
                    value={settings.fileFormat}
                    onChange={(e) => updateSetting('fileFormat', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="wav">WAV (Uncompressed)</option>
                    <option value="mp3">MP3 (Compressed)</option>
                    <option value="flac">FLAC (Lossless)</option>
                    <option value="ogg">OGG (Open Source)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Automatic cleanup after (days)</label>
                  <Input 
                    type="number"
                    value={settings.retentionDays}
                    onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'interface':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <select 
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Font Size</label>
                  <select 
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Show notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.showNotifications}
                    onChange={(e) => updateSetting('showNotifications', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm">Minimize to system tray</span>
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTray}
                    onChange={(e) => updateSetting('minimizeToTray', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm">Start with Windows</span>
                  <input
                    type="checkbox"
                    checked={settings.autoStart}
                    onChange={(e) => updateSetting('autoStart', e.target.checked)}
                  />
                </label>
              </CardContent>
            </Card>
          </div>
        )

      case 'privacy':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Local processing only</span>
                    <p className="text-xs text-muted-foreground">All transcription happens on your device</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.localProcessing}
                    onChange={(e) => updateSetting('localProcessing', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Cloud backup</span>
                    <p className="text-xs text-muted-foreground">Backup recordings to cloud storage</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cloudBackup}
                    onChange={(e) => updateSetting('cloudBackup', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Encrypt saved files</span>
                    <p className="text-xs text-muted-foreground">Encrypt recordings and transcriptions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.encryptFiles}
                    onChange={(e) => updateSetting('encryptFiles', e.target.checked)}
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Anonymous usage statistics</span>
                    <p className="text-xs text-muted-foreground">Help improve VoiceInk with anonymous data</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.anonymousUsage}
                    onChange={(e) => updateSetting('anonymousUsage', e.target.checked)}
                  />
                </label>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure VoiceInk to match your preferences
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw size={16} className="mr-1" />
              Reset
            </Button>
            <Button onClick={handleSave}>
              <Save size={16} className="mr-1" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Settings Navigation */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}