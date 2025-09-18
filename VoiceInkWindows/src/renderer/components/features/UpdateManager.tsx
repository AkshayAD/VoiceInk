import React, { useState, useEffect } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Settings,
  Loader2
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
  files?: Array<{ url: string; size: number }>
}

interface UpdateSettings {
  autoDownload: boolean
  checkOnStartup: boolean
  includePrerelease: boolean
  notifyOnUpdate: boolean
}

interface VersionInfo {
  version: string
  electronVersion: string
  nodeVersion: string
}

export const UpdateManager: React.FC = () => {
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<UpdateSettings>({
    autoDownload: true,
    checkOnStartup: true,
    includePrerelease: false,
    notifyOnUpdate: true
  })
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    loadCurrentVersion()
    loadSettings()
    
    // Listen for update events
    window.electronAPI?.update?.onUpdateAvailable?.((info: UpdateInfo) => {
      setUpdateInfo(info)
      setUpdateState('available')
      setError(null)
    })

    window.electronAPI?.update?.onUpdateNotAvailable?.(() => {
      setUpdateState('idle')
      setUpdateInfo(null)
    })

    window.electronAPI?.update?.onDownloadProgress?.((progress: any) => {
      setDownloadProgress(progress.percent)
      setUpdateState('downloading')
    })

    window.electronAPI?.update?.onUpdateDownloaded?.((info: UpdateInfo) => {
      setUpdateInfo(info)
      setUpdateState('downloaded')
      setDownloadProgress(100)
    })

    window.electronAPI?.update?.onUpdateError?.((error: any) => {
      setError(error.message)
      setUpdateState('error')
    })

    window.electronAPI?.update?.onChecking?.(() => {
      setUpdateState('checking')
      setError(null)
    })

    return () => {
      // Cleanup listeners
    }
  }, [])

  const loadCurrentVersion = async () => {
    try {
      const version = await window.electronAPI?.update?.getCurrentVersion()
      if (version) {
        setCurrentVersion(version)
      }
    } catch (error) {
      console.error('Failed to load current version:', error)
    }
  }

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI?.update?.getSettings()
      if (savedSettings) {
        setSettings(savedSettings)
      }
    } catch (error) {
      console.error('Failed to load update settings:', error)
    }
  }

  const handleCheckForUpdates = async () => {
    try {
      await window.electronAPI?.update?.check()
    } catch (error: any) {
      setError(error.message || 'Failed to check for updates')
      setUpdateState('error')
    }
  }

  const handleDownloadUpdate = async () => {
    try {
      const result = await window.electronAPI?.update?.download()
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to download update')
      }
    } catch (error: any) {
      setError(error.message)
      setUpdateState('error')
    }
  }

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI?.update?.install()
    } catch (error: any) {
      setError(error.message)
      setUpdateState('error')
    }
  }

  const handleSettingsChange = async (newSettings: UpdateSettings) => {
    setSettings(newSettings)
    try {
      await window.electronAPI?.update?.setSettings(newSettings)
    } catch (error) {
      console.error('Failed to save update settings:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unit = 0
    
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024
      unit++
    }
    
    return `${size.toFixed(1)} ${units[unit]}`
  }

  const getStatusIcon = () => {
    switch (updateState) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'available':
        return <Download className="w-5 h-5 text-orange-500" />
      case 'downloading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'downloaded':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />
    }
  }

  const getStatusText = () => {
    switch (updateState) {
      case 'checking':
        return 'Checking for updates...'
      case 'available':
        return `Update available: v${updateInfo?.version}`
      case 'downloading':
        return `Downloading update... ${downloadProgress.toFixed(1)}%`
      case 'downloaded':
        return `Update ready: v${updateInfo?.version}`
      case 'error':
        return 'Update check failed'
      default:
        return 'Up to date'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Version Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Current Version</h3>
            <p className="text-sm text-muted-foreground">
              VoiceInk v{currentVersion?.version}
            </p>
            <p className="text-xs text-muted-foreground">
              Electron v{currentVersion?.electronVersion} • Node v{currentVersion?.nodeVersion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{getStatusText()}</span>
          </div>
        </div>
      </Card>

      {/* Update Status */}
      {updateState !== 'idle' && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Update Info */}
            {updateInfo && (
              <div>
                <h4 className="font-medium">Version {updateInfo.version}</h4>
                <p className="text-sm text-muted-foreground">
                  Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
                </p>
                
                {updateInfo.files && updateInfo.files.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Size: {formatFileSize(updateInfo.files[0].size)}
                  </p>
                )}
              </div>
            )}

            {/* Download Progress */}
            {updateState === 'downloading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{downloadProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {updateState === 'available' && (
                <Button onClick={handleDownloadUpdate} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Update
                </Button>
              )}
              
              {updateState === 'downloaded' && (
                <Button onClick={handleInstallUpdate} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Install & Restart
                </Button>
              )}
              
              {(updateState === 'error' || updateState === 'idle') && (
                <Button 
                  onClick={handleCheckForUpdates}
                  disabled={updateState === 'checking'}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", updateState === 'checking' && "animate-spin")} />
                  Check for Updates
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Update Settings */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Update Settings
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showSettings && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-download updates</p>
                <p className="text-sm text-muted-foreground">
                  Automatically download updates when available
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoDownload}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  autoDownload: e.target.checked
                })}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Check on startup</p>
                <p className="text-sm text-muted-foreground">
                  Check for updates when the app starts
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.checkOnStartup}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  checkOnStartup: e.target.checked
                })}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Include pre-releases</p>
                <p className="text-sm text-muted-foreground">
                  Get beta versions and release candidates
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.includePrerelease}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  includePrerelease: e.target.checked
                })}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Update notifications</p>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications for updates
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifyOnUpdate}
                onChange={(e) => handleSettingsChange({
                  ...settings,
                  notifyOnUpdate: e.target.checked
                })}
                className="rounded"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Release Notes */}
      {updateInfo?.releaseNotes && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            What's New
          </h3>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {updateInfo.releaseNotes}
            </pre>
          </div>
        </Card>
      )}
    </div>
  )
}